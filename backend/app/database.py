from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

class Settings(BaseSettings):
    database_url: str = 'mysql+pymysql://alemax:alemax@localhost:3306/alemax'
    internal_api_key: str = ''
    captcha_secret_key: str = ''
    captcha_site_key: str = ''
    environment: str = 'development'
    deepl_api_key: str = ''
    deepl_api_url: str = 'https://api-free.deepl.com/v2/translate'
    deepl_glossary_id: str = ''
    uploads_dir: str = './uploads'
    cms_seed_on_start: bool = True

settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
class Base(DeclarativeBase):
    pass
