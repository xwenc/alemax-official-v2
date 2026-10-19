"""First-party daily IP-deduplicated visits. Only keyed hashes enter storage."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import Date, Integer, String, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from .database import Base, Session
from .cms import authorize

class VisitDay(Base):
    __tablename__ = 'site_visit_days'
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    visits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

class VisitKey(Base):
    __tablename__ = 'site_visit_keys'
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    visitor_hash: Mapped[str] = mapped_column(String(64), primary_key=True)

class VisitInput(BaseModel):
    day: date
    visitor_hash: str = Field(pattern=r'^[a-f0-9]{64}$')

def today():
    return datetime.now(ZoneInfo('Europe/Madrid')).date()

router = APIRouter(prefix='/cms/analytics', dependencies=[Depends(authorize)])

@router.post('/visits')
def record_visit(payload: VisitInput):
    if payload.day != today():
        return {'recorded': False}
    with Session() as db:
        db.add(VisitKey(day=payload.day, visitor_hash=payload.visitor_hash))
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            return {'recorded': False}
        insert = mysql_insert if db.get_bind().dialect.name == 'mysql' else sqlite_insert
        statement = insert(VisitDay).values(day=payload.day, visits=1)
        if db.get_bind().dialect.name == 'mysql':
            statement = statement.on_duplicate_key_update(visits=VisitDay.visits + 1)
        else:
            statement = statement.on_conflict_do_update(index_elements=['day'], set_={'visits': VisitDay.visits + 1})
        db.execute(statement)
        db.commit()
        # Cleanup in a separate transaction so concurrent new IPs cannot deadlock
        # by holding the aggregate counter lock while scanning deduplication keys.
        db.execute(delete(VisitKey).where(VisitKey.day < payload.day - timedelta(days=1)))
        db.commit()
        return {'recorded': True}

@router.get('/visits')
def visit_summary():
    end = today()
    start = end - timedelta(days=29)
    with Session() as db:
        db.execute(delete(VisitKey).where(VisitKey.day < end - timedelta(days=1)))
        db.commit()
        counts = dict(db.execute(select(VisitDay.day, VisitDay.visits).where(VisitDay.day >= start)).all())
        total = db.scalar(select(func.coalesce(func.sum(VisitDay.visits), 0)))
        return {
            'timezone': 'Europe/Madrid', 'today': counts.get(end, 0),
            'last_7_days': sum(counts.get(end - timedelta(days=i), 0) for i in range(7)),
            'last_30_days': sum(counts.get(end - timedelta(days=i), 0) for i in range(30)),
            'total': total,
            'daily': [{'day': (start + timedelta(days=i)).isoformat(), 'visits': counts.get(start + timedelta(days=i), 0)} for i in range(30)]
        }
