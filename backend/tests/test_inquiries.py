from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app, Session, Inquiry, recent, settings

payload = {'region':'EMEA','company':'Example Company','name':'Test Contact','subject':'Ingredients','email':'contact@example.com','message':'Please share specifications.','privacy':True,'locale':'en'}
headers = {'X-Internal-Key':'test-service-key'}

def test_persists_inquiry_and_consent():
    recent.clear()
    with TestClient(app) as client:
        result = client.post('/api/inquiries',json=payload,headers=headers)
        assert result.status_code == 201
        with Session() as db:
            row = db.get(Inquiry,result.json()['id'])
            assert row.company == payload['company']
            assert row.privacy is True
            assert row.created_at is not None
        assert client.get('/health').status_code == 200

def test_invalid_email_missing_consent_and_blank_field():
    with TestClient(app) as client:
        for change in [{'email':'invalid'},{'privacy':False},{'company':'  '},{'region':'UNKNOWN'},{'message':'x'*5001}]:
            assert client.post('/api/inquiries',json={**payload,**change},headers=headers).status_code == 422

def test_internal_authorization_and_honeypot():
    with TestClient(app) as client:
        assert client.post('/api/inquiries',json=payload).status_code == 403
        assert client.post('/api/inquiries',json={**payload,'website':'spam'},headers=headers).status_code == 400

def test_production_fails_closed_without_captcha():
    recent.clear()
    with TestClient(app) as client:
        previous = settings.environment
        settings.environment = 'production'
        try:
            assert client.post('/api/inquiries',json=payload,headers=headers).status_code == 503
        finally:
            settings.environment = previous

def test_rate_limit():
    recent.clear()
    with TestClient(app) as client:
        for _ in range(5):
            assert client.post('/api/inquiries',json=payload,headers=headers).status_code == 201
        assert client.post('/api/inquiries',json=payload,headers=headers).status_code == 429

def test_unsupported_locale_is_rejected():
    with TestClient(app) as client:
        assert client.post('/api/inquiries', json={**payload, 'locale': 'xx'}, headers=headers).status_code == 422
