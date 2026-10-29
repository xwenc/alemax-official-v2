"""Versioned bilingual content. Drafts never mutate the published snapshot."""
import copy
import hashlib
import json
import re
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import JSON, BigInteger, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm.exc import StaleDataError
from sqlalchemy.exc import IntegrityError
from .database import Base, Session, settings
from .rich_text import validate_document

class Content(Base):
    __tablename__ = 'cms_content'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(24), index=True)
    slug: Mapped[str] = mapped_column(String(191))
    identity: Mapped[str] = mapped_column(String(220), unique=True)
    shared: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    translations: Mapped[dict] = mapped_column(JSON, default=dict)
    published: Mapped[dict] = mapped_column(JSON, default=dict)
    __mapper_args__ = {'version_id_col': revision}

class TranslationJob(Base):
    __tablename__ = 'cms_translation_jobs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    content_id: Mapped[str] = mapped_column(String(36), index=True)
    version: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default='queued', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[int] = mapped_column(BigInteger)
    claimed_at: Mapped[int] = mapped_column(Integer, default=0)

DEFAULT_SEO_SUFFIX = {'en': 'ALEMAX Global Ingredients', 'es': 'ALEMAX Global Ingredients'}

class SiteSeo(Base):
    __tablename__ = 'cms_site_seo'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title_suffix: Mapped[dict] = mapped_column(JSON)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {'version_id_col': revision}

class SeoInput(BaseModel):
    title_suffix: dict[Literal['en', 'es'], str]
    revision: int = Field(ge=0)

    @field_validator('title_suffix')
    @classmethod
    def validate_suffix(cls, value):
        if set(value) != {'en', 'es'} or any(not v.strip() or len(v) > 200 for v in value.values()):
            raise ValueError('Provide an English and Spanish suffix of 1–200 characters')
        return {key: text.strip() for key, text in value.items()}

def site_seo(db):
    row = db.get(SiteSeo, 1)
    return {'title_suffix': row.title_suffix if row else DEFAULT_SEO_SUFFIX, 'revision': row.revision if row else 0}


def now():
    return int(datetime.now(timezone.utc).timestamp())

def authorize(request: Request):
    if not settings.internal_api_key or not secrets.compare_digest(request.headers.get('X-Internal-Key', ''), settings.internal_api_key):
        raise HTTPException(403, 'Invalid internal key')

router = APIRouter(prefix='/cms', dependencies=[Depends(authorize)])

@router.get('/settings/seo')
def read_site_seo():
    with Session() as db:
        return site_seo(db)

@router.put('/settings/seo')
def save_site_seo(payload: SeoInput):
    with Session() as db:
        row = db.get(SiteSeo, 1)
        if payload.revision != (row.revision if row else 0):
            raise HTTPException(409, 'Global SEO settings changed. Reload before saving.')
        if row:
            row.title_suffix = payload.title_suffix
            row.revision += 1
        else:
            db.add(SiteSeo(id=1, title_suffix=payload.title_suffix, revision=1))
        commit(db)
        return site_seo(db)
Kind = Literal['product', 'category', 'production-base', 'page', 'article']
Locale = Literal['en', 'es']

class Block(BaseModel):
    tag: Literal['p', 'h2', 'h3', 'li'] = 'p'
    text: str = Field(max_length=15000)

class Fields(BaseModel):
    body: Optional[dict] = None

    @field_validator("body")
    @classmethod
    def rich_text_document(cls, value):
        return validate_document(value)

    title: str = Field(min_length=1, max_length=300)
    summary: str = Field(default='', max_length=5000)
    blocks: list[Block] = Field(default_factory=list, max_length=200)
    seo_title: str = Field(default='', max_length=300)
    seo_description: str = Field(default='', max_length=1000)
    image_alt: str = Field(default='', max_length=500)

    @field_validator('title')
    @classmethod
    def title_not_blank(cls, value):
        if not value.strip():
            raise ValueError('Title is required')
        return value.strip()

class Shared(BaseModel):
    code: str = Field(default='', max_length=200)
    category_slug: str = Field(default='', max_length=191)
    origin_slug: str = Field(default='', max_length=191)
    images: list[str] = Field(default_factory=list, max_length=32)
    sort_order: int = 0
    feature: bool = False

    @field_validator('images', mode='before')
    @classmethod
    def legacy_placeholder(cls, images):
        # Imported catalogs used a placeholder path that was never deployed.
        if isinstance(images, list):
            return ['/images/product-placeholder.jpg' if image == '/assets/images/product-default.jpg' else image for image in images]
        return images

    @field_validator('images')
    @classmethod
    def safe_images(cls, images):
        for image in images:
            if len(image) > 2000 or not (image.startswith('https://') or (image.startswith(('/images/', '/media/')) and '..' not in image and '\\' not in image)):
                raise ValueError('Images must use HTTPS or a local /images/ or /media/ path')
        return images

class ContentInput(BaseModel):
    kind: Kind
    slug: str = Field(min_length=1, max_length=191, pattern=r'^[a-zA-Z0-9][a-zA-Z0-9-]*$')
    shared: Shared = Field(default_factory=Shared)
    fields: Fields
    revision: Optional[int] = None

class TranslationInput(BaseModel):
    fields: Fields
    revision: int
    source_version: int

class RevisionInput(BaseModel):
    revision: int

class PublishInput(RevisionInput):
    locale: Locale


def get_row(db, id):
    row = db.get(Content, id)
    if row is None:
        raise HTTPException(404, 'Content not found')
    return row

def match_revision(row, revision):
    if revision != row.revision:
        raise HTTPException(409, 'This content changed. Reload before saving.')

def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This content identity already exists. Reload before creating it again.')
    except StaleDataError:
        db.rollback()
        raise HTTPException(409, 'Content changed during this operation. Reload and retry.')

def describe(row):
    return {key: getattr(row, key) for key in ['id','kind','slug','shared','version','revision','translations','published']}

def queue(db, row):
    # Supersede pending jobs. Running jobs verify the source version and revision before writing.
    for job in db.scalars(select(TranslationJob).where(TranslationJob.content_id == row.id, TranslationJob.status == 'queued')):
        job.status = 'superseded'
    job = TranslationJob(id=str(uuid.uuid4()), content_id=row.id, version=row.version, status='queued', attempts=0, error='', created_at=time.time_ns(), claimed_at=0)
    db.add(job)
    return job

@router.get('/content')
def list_content():
    with Session() as db:
        rows = db.scalars(select(Content).order_by(Content.kind, Content.slug)).all()
        jobs = db.scalars(select(TranslationJob).order_by(TranslationJob.created_at, TranslationJob.id)).all()
        result = []
        for row in rows:
            item = describe(row)
            item['job'] = next(({'id': j.id, 'status': j.status, 'error': j.error, 'attempts': j.attempts} for j in reversed(jobs) if j.content_id == row.id), None)
            result.append(item)
        return {'items': result, 'translation_configured': bool(settings.deepl_api_key)}

@router.post('/content', status_code=201)
def create_content(payload: ContentInput):
    with Session() as db:
        identity = f'{payload.kind}:{payload.slug}'
        if db.scalar(select(Content).where(Content.identity == identity)):
            raise HTTPException(409, 'This slug already exists')
        if payload.kind == 'page' and payload.slug not in ['home','products','production-bases','about','activity','contact','privacy','cookie','terms']:
            raise HTTPException(422, 'Use an existing page slug or create an article')
        row = Content(id=str(uuid.uuid4()), kind=payload.kind, slug=payload.slug, identity=identity, shared=payload.shared.model_dump(), version=1, translations={'en': {'fields': payload.fields.model_dump(), 'source_version': 1, 'status': 'draft'}}, published={})
        db.add(row)
        queue(db, row)
        commit(db)
        return describe(row)

@router.put('/content/{id}')
def update_content(id: str, payload: ContentInput):
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        if (row.kind, row.slug) != (payload.kind, payload.slug):
            raise HTTPException(422, 'Kind and slug are permanent; create another item for a different URL')
        fields = payload.fields.model_dump()
        changed = fields != row.translations['en']['fields'] or payload.shared.model_dump() != row.shared
        if changed:
            row.version += 1
            row.shared = payload.shared.model_dump()
            translations = copy.deepcopy(row.translations)
            translations['en'] = {'fields': fields, 'source_version': row.version, 'status': 'draft'}
            if 'es' in translations:
                translations['es']['status'] = 'outdated'
            row.translations = translations
            queue(db, row)
        commit(db)
        return describe(row)

@router.put('/content/{id}/spanish')
def save_spanish(id: str, payload: TranslationInput):
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        if payload.source_version != row.version:
            raise HTTPException(409, 'English source changed. Reload the translation.')
        translations = copy.deepcopy(row.translations)
        translations['es'] = {'fields': payload.fields.model_dump(), 'source_version': row.version, 'status': 'review'}
        row.translations = translations
        # A manual edit must not be replaced by a pending translation job.
        for job in db.scalars(select(TranslationJob).where(TranslationJob.content_id == id, TranslationJob.status.in_(['queued','running']))):
            job.status = 'superseded'
        commit(db)
        return describe(row)

@router.post('/content/{id}/translate', status_code=202)
def retry_translation(id: str, payload: RevisionInput):
    if not settings.deepl_api_key:
        raise HTTPException(503, 'Configure DEEPL_API_KEY on the API and worker before translating')
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        if db.scalar(select(TranslationJob).where(TranslationJob.content_id == id, TranslationJob.status.in_(['queued', 'running']))):
            raise HTTPException(409, 'A translation is already queued or running')
        queue(db, row)
        # Make the retry conflict with concurrent translation edits.
        row.revision += 1
        commit(db)
        return describe(row)

@router.post('/content/{id}/review')
def approve_spanish(id: str, payload: RevisionInput):
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        translation = row.translations.get('es')
        if not translation or translation['source_version'] != row.version or translation['status'] not in ['review', 'approved']:
            raise HTTPException(409, 'Save a current Spanish translation before approval')
        translations = copy.deepcopy(row.translations)
        translations['es']['status'] = 'approved'
        row.translations = translations
        commit(db)
        return describe(row)

@router.post('/content/{id}/publish')
def publish(id: str, payload: PublishInput):
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        translation = row.translations.get(payload.locale)
        if not translation or translation['source_version'] != row.version or (payload.locale == 'es' and translation['status'] != 'approved'):
            raise HTTPException(409, 'Spanish must be current and approved before publishing')
        published = copy.deepcopy(row.published)
        published[payload.locale] = {'fields': translation['fields'], 'shared': row.shared, 'source_version': row.version, 'published_at': now()}
        row.published = published
        commit(db)
        return describe(row)

@router.post('/content/{id}/unpublish')
def unpublish(id: str, payload: PublishInput):
    with Session() as db:
        row = get_row(db, id)
        match_revision(row, payload.revision)
        published = copy.deepcopy(row.published)
        published.pop(payload.locale, None)
        row.published = published
        commit(db)
        return describe(row)

@router.get('/catalog/{locale}')
def catalog(locale: Locale):
    with Session() as db:
        rows = db.scalars(select(Content)).all()
        localized = []
        for row in rows:
            snapshot = row.published.get(locale)
            if snapshot:
                localized.append({'id': row.id, 'kind': row.kind, 'slug': row.slug, **snapshot})
        localized.sort(key=lambda x: (x['shared'].get('sort_order', 0), x['slug']))
        # Only an English link is exposed for unavailable Spanish versions, never an English body.
        unavailable = [{'kind': row.kind, 'slug': row.slug} for row in rows if locale == 'es' and 'en' in row.published and 'es' not in row.published]
        return {'items': localized, 'unavailable': unavailable, 'seo': {'title_suffix': site_seo(db)['title_suffix'][locale]}}

@router.post('/media', status_code=201)
async def upload(request: Request):
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(413, 'Images must be 10 MB or smaller')
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        extension = 'png'
    elif data.startswith(b'\xff\xd8\xff'):
        extension = 'jpg'
    elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        extension = 'webp'
    else:
        raise HTTPException(422, 'Upload a PNG, JPEG or WebP image')
    directory = Path(settings.uploads_dir)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f'{hashlib.sha256(data).hexdigest()}.{extension}'
    (directory / filename).write_bytes(data)
    return {'url': f'/media/{filename}'}

@router.get('/media/{filename}')
def media(filename: str):
    if not re.fullmatch(r'[a-f0-9]{64}\.(png|jpg|webp)', filename):
        raise HTTPException(404)
    file = Path(settings.uploads_dir) / filename
    if not file.is_file():
        raise HTTPException(404)
    return FileResponse(file)


def seed_content():
    """Import both existing languages once. Restarting never overwrites edited content."""
    file = Path(__file__).with_name('seed-content.json')
    if not file.exists():
        return
    with Session() as db:
        if db.scalar(select(Content.id).limit(1)):
            return
        for item in json.loads(file.read_text()):
            translations = {locale: {'fields': fields, 'source_version': 1, 'status': 'approved' if locale == 'es' else 'draft'} for locale, fields in item.pop('languages').items()}
            published = {locale: {'fields': translation['fields'], 'shared': item['shared'], 'source_version': 1, 'published_at': now()} for locale, translation in translations.items()}
            db.add(Content(**item, identity=f"{item['kind']}:{item['slug']}", version=1, translations=translations, published=published))
        db.commit()
