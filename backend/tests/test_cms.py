import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from app.main import app
from app.database import Session, settings
from app.cms import Content, TranslationJob, SiteSeo, seed_content
from app import translation

HEADERS = {'X-Internal-Key':'test-service-key'}
FIELDS = {'title':'Calcium Stearate','summary':'ALEMAX E470a with 25 kg bags, CAS 1592-23-0.','blocks':[{'tag':'p','text':'Contact info@alemaxglobal.com for KOH.'}],'seo_title':'Calcium Stearate','seo_description':'Ingredients','image_alt':'Production'}
@pytest.fixture
def client():
    with TestClient(app) as c:
        with Session() as db:
            db.execute(delete(TranslationJob)); db.execute(delete(Content)); db.execute(delete(SiteSeo)); db.commit()
        yield c

def create(c):
    r=c.post('/cms/content',headers=HEADERS,json={'kind':'product','slug':'calcium-stearate','fields':FIELDS,'shared':{'code':'E470a'}})
    assert r.status_code==201,r.text
    return r.json()
def mutate(c,row,action,**extra):
    return c.post(f"/cms/content/{row['id']}/{action}",headers=HEADERS,json={'revision':row['revision'],**extra})
def catalog(c,locale): return c.get(f'/cms/catalog/{locale}',headers=HEADERS).json()
def update(c,row,fields):
    return c.put(f"/cms/content/{row['id']}",headers=HEADERS,json={'kind':row['kind'],'slug':row['slug'],'revision':row['revision'],'fields':fields,'shared':row['shared']})
def spanish(c,row,title='Estearato de calcio'):
    return c.put(f"/cms/content/{row['id']}/spanish",headers=HEADERS,json={'revision':row['revision'],'source_version':row['version'],'fields':{**FIELDS,'title':title}})

def test_auth_draft_isolation_and_stale_editor(client):
    assert client.get('/cms/content').status_code==403
    assert client.post('/cms/content',json={}).status_code==403
    row=create(client)
    assert not catalog(client,'en')['items']
    live=mutate(client,row,'publish',locale='en').json()
    assert update(client,live,{**FIELDS,'title':'Updated name'}).status_code==200
    assert catalog(client,'en')['items'][0]['fields']['title']==FIELDS['title']
    assert update(client,row,FIELDS).status_code==409

def test_spanish_review_publish_and_outdated(client):
    row=mutate(client,create(client),'publish',locale='en').json()
    assert catalog(client,'es')['unavailable']==[{'kind':'product','slug':row['slug']}]
    assert mutate(client,row,'publish',locale='es').status_code==409
    row=spanish(client,row).json()
    assert mutate(client,row,'publish',locale='es').status_code==409
    row=mutate(client,row,'review').json()
    row=mutate(client,row,'publish',locale='es').json()
    assert catalog(client,'es')['items'][0]['fields']['title']=='Estearato de calcio'
    row=update(client,row,{**FIELDS,'summary':'New source'}).json()
    assert row['translations']['es']['status']=='outdated'
    assert mutate(client,row,'review').status_code==409
    assert mutate(client,row,'publish',locale='es').status_code==409
    assert catalog(client,'es')['items'][0]['fields']['title']=='Estearato de calcio'
    row=mutate(client,row,'unpublish',locale='es').json()
    assert not catalog(client,'es')['items']
    assert catalog(client,'en')['items']

def test_durable_failure_retry(client,monkeypatch):
    monkeypatch.setattr(settings,'deepl_api_key','')
    create(client)
    assert translation.run_once()
    row=client.get('/cms/content',headers=HEADERS).json()['items'][0]
    assert row['job']['status']=='failed' and 'DEEPL_API_KEY' in row['job']['error']
    assert mutate(client,row,'translate').status_code==503
    monkeypatch.setattr(settings,'deepl_api_key','test')
    monkeypatch.setattr(translation,'translate_fields',lambda f:{**f,'title':'Estearato de calcio'})
    assert mutate(client,row,'translate').status_code==202
    assert translation.run_once()
    row=client.get('/cms/content',headers=HEADERS).json()['items'][0]
    assert row['job']['status']=='completed' and row['translations']['es']['status']=='review'
    assert not row['published']

def test_manual_edit_is_not_overwritten(client,monkeypatch):
    row=create(client)
    def during(fields):
        assert spanish(client,row,'Manual translation').status_code==200
        return {**fields,'title':'Machine translation'}
    monkeypatch.setattr(translation,'translate_fields',during)
    assert translation.run_once()
    row=client.get('/cms/content',headers=HEADERS).json()['items'][0]
    assert row['translations']['es']['fields']['title']=='Manual translation'
    assert row['job']['status']=='superseded'

def test_source_change_during_translation(client,monkeypatch):
    row=create(client)
    def during(fields):
        assert update(client,row,{**FIELDS,'title':'Changed source'}).status_code==200
        return fields
    monkeypatch.setattr(translation,'translate_fields',during)
    assert translation.run_once()
    with Session() as db:
        item=db.get(Content,row['id']); assert 'es' not in item.translations and item.version==2

def test_migration_idempotent_preserves_languages(client):
    seed_content()
    with Session() as db:
        rows=db.scalars(select(Content)).all()
        assert len(rows)==88 and all('en' in r.published and 'es' in r.published for r in rows)
        row=rows[0]; id=row.id
        row.translations={**row.translations,'en':{**row.translations['en'],'fields':{**row.translations['en']['fields'],'title':'Edited'}}}; db.commit()
    seed_content()
    with Session() as db:
        assert len(db.scalars(select(Content)).all())==88
        assert db.get(Content,id).translations['en']['fields']['title']=='Edited'

def test_translation_protects_identifiers_and_provider_errors(client,monkeypatch):
    import json
    monkeypatch.setattr(settings,'deepl_api_key','test-key')
    original=httpx.Client
    def provider(request):
        payload=json.loads(request.content)
        assert request.url.host=='api-free.deepl.com' and payload['target_lang']=='ES'
        return httpx.Response(200,json={'translations':[{'text':s.replace('Contact ','Contacte ')} for s in payload['text']]})
    monkeypatch.setattr(translation.httpx,'Client',lambda **kwargs:original(transport=httpx.MockTransport(provider),**kwargs))
    result=translation.translate_fields(FIELDS)
    assert result['title']=='Estearato de calcio'
    assert all(s in result['summary'] for s in ['ALEMAX','E470a','25 kg','1592-23-0'])
    assert 'info@alemaxglobal.com' in result['blocks'][0]['text']
    monkeypatch.setattr(translation.httpx,'Client',lambda **kwargs:original(transport=httpx.MockTransport(lambda req:httpx.Response(429)),**kwargs))
    with pytest.raises(RuntimeError,match='HTTP 429'): translation.translate_fields(FIELDS)

def test_upload_and_validation(client,tmp_path,monkeypatch):
    monkeypatch.setattr(settings,'uploads_dir',str(tmp_path))
    assert client.post('/cms/media',headers=HEADERS,content=b'<svg/>').status_code==422
    r=client.post('/cms/media',headers=HEADERS,content=b'\x89PNG\r\n\x1a\nimage'); assert r.status_code==201
    assert client.get('/cms'+r.json()['url'],headers=HEADERS).status_code==200
    assert client.post('/cms/content',headers=HEADERS,json={'kind':'product','slug':'../bad','fields':FIELDS}).status_code==422
    assert client.post('/cms/content',headers=HEADERS,json={'kind':'product','slug':'okay','fields':FIELDS,'shared':{'images':['javascript:alert(1)']}}).status_code==422

def test_worker_recovers_expired_lease(client,monkeypatch):
    row=create(client)
    with Session() as db:
        job=db.scalar(select(TranslationJob).where(TranslationJob.content_id==row['id']))
        job.status='running';job.claimed_at=1;db.commit()
    monkeypatch.setattr(translation,'translate_fields',lambda f:{**f,'title':'Recovered translation'})
    assert translation.run_once()
    item=client.get('/cms/content',headers=HEADERS).json()['items'][0]
    assert item['translations']['es']['fields']['title']=='Recovered translation'

def test_publishing_english_does_not_cancel_translation(client,monkeypatch):
    row=create(client)
    def during(fields):
        assert mutate(client,row,'publish',locale='en').status_code==200
        return {**fields,'title':'Translated after English publication'}
    monkeypatch.setattr(translation,'translate_fields',during)
    assert translation.run_once()
    item=client.get('/cms/content',headers=HEADERS).json()['items'][0]
    assert item['translations']['es']['status']=='review'
    assert item['published']['en'] and 'es' not in item['published']

def rich_body():
    return {'type':'doc','content':[
        {'type':'heading','attrs':{'level':2},'content':[{'type':'text','text':'Technical specifications','marks':[{'type':'bold'}]}]},
        {'type':'paragraph','content':[{'type':'text','text':'Contact ','marks':[{'type':'italic'}]},{'type':'text','text':'ALEMAX E470a 25 kg','marks':[{'type':'link','attrs':{'href':'https://www.alemaxglobal.com/contact'}}]}]},
        {'type':'orderedList','attrs':{'start':3},'content':[{'type':'listItem','content':[{'type':'paragraph','content':[{'type':'text','text':'Food grade','marks':[{'type':'underline'}]}]}]}]},
        {'type':'blockquote','content':[{'type':'paragraph','content':[{'type':'text','text':'Reliable supply'}]}]},
    ]}

def test_rich_text_persists_published_formatting(client):
    row=create(client); body=rich_body()
    r=update(client,row,{**FIELDS,'body':body})
    assert r.status_code==200,r.text
    row=r.json()
    assert row['translations']['en']['fields']['body']==body
    assert mutate(client,row,'publish',locale='en').status_code==200
    assert catalog(client,'en')['items'][0]['fields']['body']==body

def test_rich_text_rejects_executable_content(client):
    row=create(client)
    for body in [
        {'type':'doc','content':[{'type':'script','text':'alert(1)'}]},
        {'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Bad link','marks':[{'type':'link','attrs':{'href':'javascript:alert(1)'}}]}]}]},
        {'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Bad link','marks':[{'type':'link','attrs':{'href':'//untrusted.example'}}]}]}]},
        {'type':'doc','content':[{'type':'paragraph','content':[{'type':'heading','attrs':{'level':2}}]}]},
        {'type':'doc','content':[{'type':'text','text':'Invalid root text'}]},
        {'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Bad attrs','marks':[{'type':'link','attrs':['invalid']}]}]}]},
    ]:
        assert update(client,row,{**FIELDS,'body':body}).status_code==422
    body=rich_body(); body['content'][0]['attrs']['onclick']='alert(1)'
    result=update(client,row,{**FIELDS,'body':body})
    assert result.status_code==200
    assert 'onclick' not in str(result.json()['translations']['en']['fields']['body'])

def test_translation_retains_rich_text_structure_and_links(client,monkeypatch):
    import json
    monkeypatch.setattr(settings,'deepl_api_key','test-key')
    original=httpx.Client
    def provider(request):
        payload=json.loads(request.content)
        return httpx.Response(200,json={'translations':[{'text':s.replace('Technical specifications','Especificaciones técnicas').replace('Contact ','Contacte ').replace('Food grade','Grado alimentario')} for s in payload['text']]})
    monkeypatch.setattr(translation.httpx,'Client',lambda **kwargs:original(transport=httpx.MockTransport(provider),**kwargs))
    result=translation.translate_fields({**FIELDS,'body':rich_body()}); body=result['body']
    assert body['content'][0]['content'][0]['text']=='Especificaciones técnicas'
    assert body['content'][0]['content'][0]['marks']==[{'type':'bold'}]
    assert body['content'][1]['content'][1]['marks'][0]['attrs']['href']=='https://www.alemaxglobal.com/contact'
    assert body['content'][2]['attrs']['start']==3
    assert body['content'][2]['content'][0]['content'][0]['content'][0]['text']=='Grado alimentario'
    assert result['blocks']==[]

@pytest.mark.parametrize('glossary, expected', [('missing-glossary', 'DEEPL_GLOSSARY_ID'), ('', 'DEEPL_API_URL')])
def test_translation_404_has_actionable_safe_message(client, monkeypatch, glossary, expected):
    monkeypatch.setattr(settings, 'deepl_api_key', 'secret-test-key')
    monkeypatch.setattr(settings, 'deepl_glossary_id', glossary)
    original = httpx.Client
    monkeypatch.setattr(translation.httpx, 'Client', lambda **kwargs: original(
        transport=httpx.MockTransport(lambda request: httpx.Response(404, text='confidential provider body')),
        **kwargs))
    with pytest.raises(RuntimeError, match=expected) as error:
        translation.translate_fields(FIELDS)
    assert 'confidential' not in str(error.value)
    assert 'secret-test-key' not in str(error.value)


def test_optional_glossary_is_omitted_when_unconfigured(client, monkeypatch):
    import json
    monkeypatch.setattr(settings, 'deepl_api_key', 'test-key')
    monkeypatch.setattr(settings, 'deepl_glossary_id', '')
    original = httpx.Client
    def provider(request):
        payload = json.loads(request.content)
        assert 'glossary_id' not in payload
        return httpx.Response(200, json={'translations': [{'text': text} for text in payload['text']]})
    monkeypatch.setattr(translation.httpx, 'Client', lambda **kwargs: original(
        transport=httpx.MockTransport(provider), **kwargs))
    assert translation.translate_fields(FIELDS)['title'] == 'Estearato de calcio'

@pytest.mark.parametrize('kind', ['page', 'product', 'category', 'production-base', 'article'])
def test_seo_copy_persists_by_locale_and_only_changes_live_after_publish(client, kind):
    en = {**FIELDS, 'seo_title': 'English search title', 'seo_description': 'English search description'}
    response = client.post('/cms/content', headers=HEADERS,
        json={'kind': kind, 'slug': 'home' if kind == 'page' else 'seo-example', 'fields': en})
    assert response.status_code == 201
    row = response.json()
    # Read through a new request/session to prove these fields were persisted.
    saved = next(i for i in client.get('/cms/content', headers=HEADERS).json()['items'] if i['id'] == row['id'])
    assert saved['translations']['en']['fields']['seo_title'] == en['seo_title']
    assert saved['translations']['en']['fields']['seo_description'] == en['seo_description']
    assert not catalog(client, 'en')['items']
    row = mutate(client, row, 'publish', locale='en').json()
    es = {**FIELDS, 'seo_title': 'Título para buscadores', 'seo_description': 'Descripción en español'}
    response = client.put(f"/cms/content/{row['id']}/spanish", headers=HEADERS,
        json={'revision': row['revision'], 'source_version': row['version'], 'fields': es})
    assert response.status_code == 200
    row = mutate(client, response.json(), 'review').json()
    row = mutate(client, row, 'publish', locale='es').json()
    assert catalog(client, 'en')['items'][0]['fields']['seo_title'] == en['seo_title']
    assert catalog(client, 'es')['items'][0]['fields']['seo_description'] == es['seo_description']
    updated = {**en, 'seo_description': 'Revised search description'}
    response = update(client, row, updated)
    assert response.status_code == 200
    assert catalog(client, 'en')['items'][0]['fields']['seo_description'] == en['seo_description']
    row = mutate(client, response.json(), 'publish', locale='en').json()
    assert catalog(client, 'en')['items'][0]['fields']['seo_description'] == updated['seo_description']


def test_article_inline_image_upload_save_publish(client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'uploads_dir', str(tmp_path))
    r = client.post('/cms/media', headers=HEADERS, content=b'\x89PNG\r\n\x1a\ninline-image')
    assert r.status_code == 201
    src = r.json()['url']
    body = {'type': 'doc', 'content': [
        {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Before image'}]},
        {'type': 'image', 'attrs': {'src': src, 'alt': 'Factory equipment', 'title': ''}},
        {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'After image'}]}]}
    r = client.post('/cms/content', headers=HEADERS, json={'kind': 'article', 'slug': 'inline-image', 'fields': {**FIELDS, 'body': body}})
    assert r.status_code == 201, r.text
    row = r.json()
    saved = next(i for i in client.get('/cms/content', headers=HEADERS).json()['items'] if i['id'] == row['id'])
    assert saved['translations']['en']['fields']['body'] == body
    assert not catalog(client, 'en')['items']
    assert mutate(client, row, 'publish', locale='en').status_code == 200
    assert catalog(client, 'en')['items'][0]['fields']['body'] == body
    assert client.get('/cms' + src, headers=HEADERS).status_code == 200


@pytest.mark.parametrize('src', ['javascript:alert(1)', 'data:image/png;base64,abc', '//example.com/a.png', 'http://example.com/a.png', '/admin/a', '/media/../secret', 'https://user:pass@example.com/a.jpg'])
def test_inline_image_rejects_unsafe_source(client, src):
    row = create(client)
    body = {'type': 'doc', 'content': [{'type': 'image', 'attrs': {'src': src}}]}
    assert update(client, row, {**FIELDS, 'body': body}).status_code == 422


def test_inline_image_attributes_and_nesting(client):
    row = create(client)
    image = {'type': 'image', 'attrs': {'src': '/images/plant.jpg', 'alt': 'Plant', 'title': '', 'onerror': 'alert(1)'}}
    r = update(client, row, {**FIELDS, 'body': {'type': 'doc', 'content': [image]}})
    assert r.status_code == 200
    assert 'onerror' not in r.json()['translations']['en']['fields']['body']['content'][0]['attrs']
    row = r.json()
    for content in [[{**image, 'content': [{'type': 'paragraph'}]}], [{'type': 'paragraph', 'content': [image]}]]:
        assert update(client, row, {**FIELDS, 'body': {'type': 'doc', 'content': content}}).status_code == 422


def test_translation_keeps_inline_image_url_and_translates_alt(client, monkeypatch):
    import json
    monkeypatch.setattr(settings, 'deepl_api_key', 'test-key')
    original = httpx.Client
    def provider(request):
        payload = json.loads(request.content)
        assert all('/media/' not in text for text in payload['text'])
        return httpx.Response(200, json={'translations': [{'text': text.replace('Factory equipment', 'Equipos de fábrica')} for text in payload['text']]})
    monkeypatch.setattr(translation.httpx, 'Client', lambda **kwargs: original(transport=httpx.MockTransport(provider), **kwargs))
    body = {'type': 'doc', 'content': [{'type': 'image', 'attrs': {'src': '/media/' + 'a' * 64 + '.jpg', 'alt': 'Factory equipment', 'title': ''}}]}
    result = translation.translate_fields({**FIELDS, 'body': body})
    assert result['body']['content'][0]['attrs']['src'] == body['content'][0]['attrs']['src']
    assert result['body']['content'][0]['attrs']['alt'] == 'Equipos de fábrica'


def test_global_seo_saved_in_database_and_localized_for_all_catalogs(client):
    assert client.get('/cms/settings/seo').status_code == 403
    assert client.put('/cms/settings/seo', json={}).status_code == 403
    initial = client.get('/cms/settings/seo', headers=HEADERS).json()
    assert initial['revision'] == 0
    row = create(client)
    suffix = {'en': 'ALEMAX | Global ingredients supplier', 'es': 'ALEMAX | Proveedor de ingredientes'}
    response = client.put('/cms/settings/seo', headers=HEADERS, json={'title_suffix': suffix, 'revision': 0})
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved['revision'] == 1
    assert client.get('/cms/settings/seo', headers=HEADERS).json() == saved
    with Session() as db:
        assert db.get(SiteSeo, 1).title_suffix == suffix
        assert db.get(Content, row['id']).version == row['version']
    assert catalog(client, 'en')['seo']['title_suffix'] == suffix['en']
    assert catalog(client, 'es')['seo']['title_suffix'] == suffix['es']
    assert client.put('/cms/settings/seo', headers=HEADERS, json={'title_suffix': suffix, 'revision': 0}).status_code == 409
    response = client.put('/cms/settings/seo', headers=HEADERS, json={'title_suffix': {**suffix, 'en': 'New global suffix'}, 'revision': 1})
    assert response.status_code == 200
    assert response.json()['revision'] == 2
    assert catalog(client, 'en')['seo']['title_suffix'] == 'New global suffix'


@pytest.mark.parametrize('suffix', [{}, {'en': 'English'}, {'en': '', 'es': 'Español'}, {'en': '   ', 'es': 'Spanish'}, {'en': 'x' * 201, 'es': 'Spanish'}])
def test_global_seo_rejects_invalid_suffixes(client, suffix):
    assert client.put('/cms/settings/seo', headers=HEADERS, json={'title_suffix': suffix, 'revision': 0}).status_code == 422


def test_imported_production_base_placeholder_can_be_saved(client):
    payload = {
        'kind': 'production-base', 'slug': 'factory-emulsifiers-DATEM-PGPR-GMS',
        'fields': {**FIELDS, 'title': 'Emulsifiers'},
        'shared': {'images': ['/assets/images/product-default.jpg'] * 19},
    }
    response = client.post('/cms/content', headers=HEADERS, json=payload)
    assert response.status_code == 201, response.text
    row = response.json()
    assert row['shared']['images'] == ['/images/product-placeholder.jpg'] * 19
    assert update(client, row, {**FIELDS, 'title': 'Emulsifiers updated'}).status_code == 200
    payload['slug'] = 'unsafe-images'
    payload['shared']['images'] = ['/assets/images/../../secret']
    assert client.post('/cms/content', headers=HEADERS, json=payload).status_code == 422


def test_translation_accepts_reordered_protected_identifiers(monkeypatch):
    import json
    monkeypatch.setattr(settings, 'deepl_api_key', 'test-key')
    original = httpx.Client
    def provider(request):
        assert json.loads(request.content)['text'] == ['<text>Contact <keep>ALEMAX</keep> for <keep>E470a</keep></text>']
        return httpx.Response(200, json={'translations': [{'text': '<text>Para <keep>E470a</keep>, contacte con <keep>ALEMAX</keep></text>'}]})
    monkeypatch.setattr(translation.httpx, 'Client', lambda **kwargs: original(transport=httpx.MockTransport(provider), **kwargs))
    result = translation.translate_fields({'title': 'Contact ALEMAX for E470a'})
    assert result['title'] == 'Para E470a, contacte con ALEMAX'


@pytest.mark.parametrize('translated', [
    '<text><keep>ALEMAX</keep> <keep>E471</keep></text>',
    '<text><keep>ALEMAX</keep></text>',
    '<text><keep>ALEMAX</keep> <keep>E470a</keep> <keep>E470a</keep></text>',
    '<text><keep>E470a</keep> <keep>E470a</keep></text>',
])
def test_translation_still_rejects_changed_missing_or_duplicated_identifiers(monkeypatch, translated):
    monkeypatch.setattr(settings, 'deepl_api_key', 'test-key')
    original = httpx.Client
    monkeypatch.setattr(translation.httpx, 'Client', lambda **kwargs: original(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json={'translations': [{'text': translated}]})), **kwargs))
    with pytest.raises(RuntimeError, match='Protected identifiers changed in title'):
        translation.translate_fields({'title': 'Contact ALEMAX for E470a'})


def test_product_feature_is_persisted_and_only_changes_live_after_publish(client):
    row = create(client)
    assert row['shared']['feature'] is False
    row = mutate(client, row, 'publish', locale='en').json()
    response = client.put(f"/cms/content/{row['id']}", headers=HEADERS, json={
        'kind': row['kind'], 'slug': row['slug'], 'revision': row['revision'],
        'fields': FIELDS, 'shared': {**row['shared'], 'feature': True},
    })
    assert response.status_code == 200, response.text
    row = response.json()
    assert row['shared']['feature'] is True
    assert catalog(client, 'en')['items'][0]['shared']['feature'] is False
    row = mutate(client, row, 'publish', locale='en').json()
    assert catalog(client, 'en')['items'][0]['shared']['feature'] is True
    response = client.put(f"/cms/content/{row['id']}", headers=HEADERS, json={
        'kind': row['kind'], 'slug': row['slug'], 'revision': row['revision'],
        'fields': FIELDS, 'shared': {**row['shared'], 'feature': False},
    })
    row = response.json()
    assert mutate(client, row, 'publish', locale='en').status_code == 200
    assert catalog(client, 'en')['items'][0]['shared']['feature'] is False
    assert len(catalog(client, 'en')['items']) == 1  # Still in the full product catalog.
