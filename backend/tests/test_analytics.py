from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from app.main import app
from app.database import Session
from app import analytics
from app.analytics import VisitDay, VisitKey

HEADERS = {'X-Internal-Key': 'test-service-key'}
@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(analytics, 'today', lambda: date(2026, 10, 19))
    with TestClient(app) as c:
        with Session() as db:
            db.execute(delete(VisitKey)); db.execute(delete(VisitDay)); db.commit()
        yield c

def post(client, digest='a' * 64, day='2026-10-19'):
    return client.post('/cms/analytics/visits', headers=HEADERS, json={'day':day, 'visitor_hash':digest})

def summary(client):
    return client.get('/cms/analytics/visits', headers=HEADERS).json()

def test_auth_and_repeated_daily_ip(client):
    assert client.get('/cms/analytics/visits').status_code == 403
    assert client.post('/cms/analytics/visits', json={}).status_code == 403
    assert post(client).json()['recorded'] is True
    for _ in range(5): assert post(client).json()['recorded'] is False
    assert post(client, 'b' * 64).json()['recorded'] is True
    data = summary(client)
    assert data['today'] == data['last_7_days'] == data['total'] == 2
    assert len(data['daily']) == 30
    assert data['daily'][-1] == {'day':'2026-10-19','visits':2}
    assert 'visitor_hash' not in str(data)

def test_new_day_and_retention(client, monkeypatch):
    assert post(client).json()['recorded'] is True
    monkeypatch.setattr(analytics, 'today', lambda: date(2026,10,20))
    assert post(client, day='2026-10-20').json()['recorded'] is True
    assert summary(client)['total'] == 2
    monkeypatch.setattr(analytics, 'today', lambda: date(2026,10,22))
    data = summary(client)
    assert data['today'] == 0 and data['last_7_days'] == 2
    with Session() as db: assert not db.scalars(select(VisitKey)).all()
    assert data['total'] == 2

def test_rejects_raw_ip_bad_hash_and_other_day(client):
    assert post(client, '203.0.113.1').status_code == 422
    assert post(client, day='2026-10-18').json()['recorded'] is False
    assert summary(client)['total'] == 0

def test_windows_and_zero_fill(client):
    with Session() as db:
        db.add_all([VisitDay(day=date(2026,10,19),visits=3), VisitDay(day=date(2026,10,13),visits=2), VisitDay(day=date(2026,9,20),visits=5), VisitDay(day=date(2026,9,19),visits=7)])
        db.commit()
    data=summary(client)
    assert (data['today'],data['last_7_days'],data['last_30_days'],data['total']) == (3,5,10,17)
    assert data['daily'][1]['visits'] == 0

def test_concurrent_duplicates_increment_only_once_per_hash(client):
    from concurrent.futures import ThreadPoolExecutor
    from hashlib import sha256
    digests = [sha256(str(i % 8).encode()).hexdigest() for i in range(40)]
    def record(digest):
        return analytics.record_visit(analytics.VisitInput(day=date(2026,10,19), visitor_hash=digest))
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(record, digests))
    assert sum(result['recorded'] for result in results) == 8
    assert summary(client)['today'] == 8
