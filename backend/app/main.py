import hashlib
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings
from sqlalchemy import Boolean, DateTime, String, Text, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

class Settings(BaseSettings):
    database_url: str = 'mysql+pymysql://alemax:alemax@localhost:3306/alemax'
    internal_api_key: str = ''
    captcha_secret_key: str = ''
    captcha_site_key: str = ''
    environment: str = 'development'

settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class Inquiry(Base):
    __tablename__ = 'inquiries'
    id: Mapped[int] = mapped_column(primary_key=True)
    region: Mapped[str] = mapped_column(String(8))
    company: Mapped[str] = mapped_column(String(160))
    name: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(254))
    message: Mapped[str] = mapped_column(Text)
    locale: Mapped[str] = mapped_column(String(2))
    privacy: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class InquiryInput(BaseModel):
    region: Literal['EMEA', 'AMER', 'APAC']
    company: str = Field(min_length=1, max_length=160)
    name: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=200)
    email: EmailStr = Field(max_length=254)
    message: str = Field(min_length=1, max_length=5000)
    locale: Literal['en','es'] = 'en'
    privacy: Literal[True]
    captcha_token: str = Field(default='', max_length=4096)
    website: str = Field(default='', max_length=200)

    @field_validator('company','name','subject','message', mode='before')
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

@asynccontextmanager
async def lifespan(app):
    if settings.environment == 'production' and not settings.internal_api_key:
        raise RuntimeError('INTERNAL_API_KEY is required in production')
    Base.metadata.create_all(engine)
    yield

app = FastAPI(title='ALEMAX inquiry API', lifespan=lifespan)
recent = defaultdict(deque)

@app.get('/health')
def health():
    with Session() as session:
        session.execute(text('SELECT 1'))
    return {'status':'ok'}

@app.post('/api/inquiries', status_code=201)
async def create_inquiry(payload: InquiryInput, request: Request):
    if not settings.internal_api_key or not secrets.compare_digest(request.headers.get('X-Internal-Key',''), settings.internal_api_key):
        raise HTTPException(403, 'Invalid internal key')
    if payload.website:
        raise HTTPException(400, 'Unable to verify submission')
    now = time.monotonic()
    # Limit each email without trusting client-supplied forwarding headers.
    for key in list(recent):
        while recent[key] and recent[key][0] < now - 600:
            recent[key].popleft()
        if not recent[key]:
            del recent[key]
    key = hashlib.sha256(str(payload.email).lower().encode()).hexdigest()
    if len(recent[key]) >= 5:
        raise HTTPException(429, 'Too many inquiries. Please try again later.')
    recent[key].append(now)
    if settings.captcha_secret_key:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                result = await client.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',data={'secret':settings.captcha_secret_key,'response':payload.captcha_token})
                data = result.json()
            if not data.get('success') or data.get('action') != 'inquiry':
                raise HTTPException(400, 'Verification failed. Please retry.')
        except httpx.HTTPError:
            raise HTTPException(503, 'Verification unavailable. Please retry.')
    elif settings.environment == 'production':
        raise HTTPException(503, 'Inquiry verification has not been configured')
    record = Inquiry(**payload.model_dump(exclude={'captcha_token','website'}))
    with Session() as session:
        session.add(record)
        session.commit()
        session.refresh(record)
        return {'id':record.id,'message':'Inquiry received'}
