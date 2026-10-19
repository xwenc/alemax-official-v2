"""Persistent translation worker: python -m app.translation."""
import copy
import html
import logging
import re
import time
import xml.etree.ElementTree as ET

import httpx
from sqlalchemy import or_, select, update
from sqlalchemy.orm.exc import StaleDataError
from .cms import Content, TranslationJob, now
from .database import Session, settings

logger = logging.getLogger('alemax.translation')

# Lock identifiers, formulas, numbers/units, brands and local terminology before translation.
TERMS = {'Calcium Stearate': 'Estearato de calcio', 'Silicon Dioxide': 'Dióxido de silicio', 'Potassium Sorbate': 'Sorbato de potasio'}
PROTECTED = re.compile(r'https?://[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]+|\bALEMAX\b|\b[A-Z]{1,6}\d+[A-Za-z0-9-]*\b|\b(?:[A-Z][a-z]?\d*){2,}\b|\b[A-Z]{2,}\b|\b\d+(?:[.,-]\d+)*(?:\s?(?:%|mg|kg|g|ml|mL|L|°C|ppm|mm|µm))?', re.UNICODE)


def protect(text):
    terms = re.compile('|'.join(re.escape(t) for t in sorted(TERMS, key=len, reverse=True)) + '|' + PROTECTED.pattern)
    return '<text>' + ''.join('<keep>' + html.escape(TERMS.get(m.group(), m.group())) + '</keep>' if protected else html.escape(m) for protected, m in tokenize(text, terms)) + '</text>'

def tokenize(text, pattern):
    last = 0
    for match in pattern.finditer(text):
        yield False, text[last:match.start()]
        yield True, match
        last = match.end()
    yield False, text[last:]


def translate_fields(fields):
    if not settings.deepl_api_key:
        raise RuntimeError('Translation unavailable: configure DEEPL_API_KEY on the API and worker.')
    if settings.deepl_api_url not in ['https://api-free.deepl.com/v2/translate', 'https://api.deepl.com/v2/translate']:
        raise RuntimeError('DEEPL_API_URL must be an official DeepL HTTPS endpoint.')
    result = copy.deepcopy(fields)
    refs = [(result, key) for key in ['title','summary','seo_title','seo_description','image_alt'] if result.get(key)]
    if result.get('body'):
        def collect(node):
            if node.get('type') == 'text' and node.get('text'):
                refs.append((node, 'text'))
            for child in node.get('content', []):
                collect(child)
        collect(result['body'])
        # Plain blocks are a legacy fallback only. Rich content is authoritative.
        result['blocks'] = []
    else:
        refs += [(block, 'text') for block in result.get('blocks', []) if block.get('text')]
    with httpx.Client(timeout=90) as client:
        # Both the number of texts and the encoded request size stay below provider limits.
        batch = []
        size = 0
        def submit(items):
            if not items:
                return
            payload = {'text': [protect(obj[key]) for obj, key in items], 'source_lang': 'EN', 'target_lang': 'ES', 'tag_handling': 'xml', 'ignore_tags': ['keep'], 'preserve_formatting': True}
            if settings.deepl_glossary_id:
                payload['glossary_id'] = settings.deepl_glossary_id
            logger.info('DeepL request: glossary_id=%s text_count=%d encoded_size=%d',
                        settings.deepl_glossary_id or '(none)', len(items), len(str(payload).encode('utf-8')))
            response = client.post(settings.deepl_api_url, headers={'Authorization': f'DeepL-Auth-Key {settings.deepl_api_key}'}, json=payload)
            logger.info('DeepL response: HTTP %d', response.status_code)
            # Do not persist provider response bodies, which can contain confidential source text.
            if response.status_code != 200:
                if response.status_code == 400 and settings.deepl_glossary_id:
                    raise RuntimeError('Translation provider returned HTTP 400. Check that DEEPL_GLOSSARY_ID contains an EN-to-ES dictionary and that the translation parameters are valid.')
                if response.status_code == 404 and settings.deepl_glossary_id:
                    raise RuntimeError('Translation provider returned HTTP 404. The configured DEEPL_GLOSSARY_ID may not exist for this API key. Correct it or leave it empty, restart the API and worker, then retry.')
                if response.status_code == 404:
                    raise RuntimeError('Translation provider returned HTTP 404. Check DEEPL_API_URL and any proxy configuration, then retry.')
                raise RuntimeError(f'Translation provider returned HTTP {response.status_code}. Check credentials/quota and retry.')
            translations = response.json().get('translations', [])
            if len(translations) != len(items):
                raise RuntimeError('Translation provider returned an incomplete response.')
            for (obj, key), translation in zip(items, translations):
                before = protect(obj[key])
                translated = ET.fromstring(translation['text'])
                if [e.text for e in ET.fromstring(before).iter('keep')] != [e.text for e in translated.iter('keep')]:
                    raise RuntimeError('Protected identifiers changed. Review source and retry.')
                obj[key] = ''.join(translated.itertext())
        for ref in refs:
            encoded_size = len(protect(ref[0][ref[1]]).encode('utf-8')) * 2
            if batch and (len(batch) >= 40 or size + encoded_size > 90000):
                submit(batch)
                batch, size = [], 0
            batch.append(ref)
            size += encoded_size
        submit(batch)
    return result


def run_once():
    with Session() as db:
        # Claim atomically. Expired leases survive a worker crash/restart.
        job = db.scalar(select(TranslationJob).where(or_(TranslationJob.status == 'queued', (TranslationJob.status == 'running') & (TranslationJob.claimed_at < now() - 900))).order_by(TranslationJob.created_at).limit(1))
        if not job:
            return False
        job_id, old_status, old_claim = job.id, job.status, job.claimed_at
        claim = db.execute(update(TranslationJob).where(TranslationJob.id == job_id, TranslationJob.status == old_status, TranslationJob.claimed_at == old_claim).values(status='running', claimed_at=now(), attempts=TranslationJob.attempts + 1))
        db.commit()
        if claim.rowcount != 1:
            return True
        db.expire_all()
        job = db.get(TranslationJob, job_id)
        row = db.get(Content, job.content_id)
        if not row or row.version != job.version:
            job.status = 'superseded'
            db.commit()
            return True
        source = copy.deepcopy(row.translations['en']['fields'])
        source_spanish = copy.deepcopy(row.translations.get("es"))
        lease_token = job.claimed_at
    try:
        fields = translate_fields(source)
        with Session() as db:
            job = db.get(TranslationJob, job_id)
            row = db.get(Content, job.content_id)
            if job.status != 'running' or job.claimed_at != lease_token:
                return True
            if not row or row.version != job.version or row.translations.get("es") != source_spanish:
                job.status = 'superseded'
            else:
                translations = copy.deepcopy(row.translations)
                translations['es'] = {'fields': fields, 'source_version': row.version, 'status': 'review'}
                row.translations = translations
                job.status, job.error = 'completed', ''
            try:
                db.commit()
            except StaleDataError:
                db.rollback()
                job = db.get(TranslationJob, job_id)
                job.status = 'superseded'
                db.commit()
    except Exception as error:
        with Session() as db:
            job = db.get(TranslationJob, job_id)
            if job.status == 'running' and job.claimed_at == lease_token:
                job.status = 'failed'
                job.error = str(error) if isinstance(error, RuntimeError) else 'Translation failed. Check worker connectivity and retry.'
                db.commit()
    return True

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logger.info('Translation worker started; waiting for queued jobs.')
    while True:
        try:
            if not run_once():
                time.sleep(3)
        except Exception as error:
            # Database may not be ready during deployment. The durable queue will be retried.
            logger.error('Worker iteration failed (%s); retrying in 5 seconds.', type(error).__name__)
            time.sleep(5)
