#!/usr/bin/env python3
"""Export a consistent local SQLite snapshot as MySQL 8.4 SQL plus uploads."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import tarfile
import tempfile
from datetime import datetime, timezone

from sqlalchemy import MetaData, create_engine
from sqlalchemy.dialects import mysql
from sqlalchemy.schema import CreateIndex, CreateTable
from sqlalchemy.sql.sqltypes import DateTime

ROOT = Path(__file__).resolve().parents[1]
TABLES = {'cms_content', 'cms_translation_jobs', 'inquiries'}
OPTIONAL_TABLES = {'cms_site_seo', 'site_visit_days', 'site_visit_keys'}


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        return str(value)
    # Hex UTF-8 avoids dependence on MySQL backslash escaping and SQL modes.
    return "CONVERT(X'%s' USING utf8mb4)" % str(value).encode('utf-8').hex()


def export(source, uploads, destination):
    source, uploads, destination = Path(source).resolve(), Path(uploads).resolve(), Path(destination).resolve()
    if not source.is_file() or not uploads.is_dir():
        raise ValueError('Source database or uploads directory not found')
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    os.chmod(destination, 0o700)
    manifest = {'created_at': datetime.now(timezone.utc).isoformat(), 'target': 'MySQL 8.4', 'tables': {}, 'uploads': {}}
    with tempfile.TemporaryDirectory() as temp:
        snapshot = Path(temp) / 'snapshot.db'
        with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src, sqlite3.connect(snapshot) as dst:
            src.backup(dst)
        engine = create_engine('sqlite:///' + str(snapshot))
        metadata = MetaData()
        metadata.reflect(bind=engine)
        if not TABLES <= set(metadata.tables) or set(metadata.tables) - TABLES - OPTIONAL_TABLES:
            raise ValueError('Unexpected database schema; review tables before exporting')
        with sqlite3.connect(snapshot) as db:
            db.row_factory = sqlite3.Row
            active = db.execute("SELECT COUNT(*) FROM cms_translation_jobs WHERE status IN ('queued','running')").fetchone()[0]
            if active:
                raise ValueError('Wait for queued/running translations to finish before exporting')
            with (destination / 'database.mysql.sql').open('w', encoding='utf-8') as sql:
                sql.write('-- MySQL 8.4 initial import. Requires a completely empty target database.\n')
                sql.write('-- No DROP, REPLACE, user creation or credentials are included.\nSET NAMES utf8mb4;\n')
                for table in metadata.sorted_tables:
                    table.dialect_options['mysql']['charset'] = 'utf8mb4'
                    table.dialect_options['mysql']['collate'] = 'utf8mb4_unicode_ci'
                    table.dialect_options['mysql']['engine'] = 'InnoDB'
                    for col in table.columns:
                        if isinstance(col.type, DateTime):
                            col.type = mysql.DATETIME(fsp=6)
                    sql.write(str(CreateTable(table).compile(dialect=mysql.dialect())) + ';\n')
                    for index in sorted(table.indexes, key=lambda i: i.name):
                        sql.write(str(CreateIndex(index).compile(dialect=mysql.dialect())) + ';\n')
                sql.write('START TRANSACTION;\n')
                for table in metadata.sorted_tables:
                    columns = [c.name for c in table.columns]
                    rows = db.execute('SELECT * FROM "%s" ORDER BY %s' % (table.name, ','.join('"%s"' % c.name for c in table.primary_key.columns))).fetchall()
                    manifest['tables'][table.name] = len(rows)
                    names = ','.join('`%s`' % c for c in columns)
                    for row in rows:
                        sql.write('INSERT INTO `%s` (%s) VALUES (%s);\n' % (table.name, names, ','.join(literal(row[c]) for c in columns)))
                        if table.name == 'cms_content':
                            # Include media referenced by drafts and every published language.
                            for key in ['shared', 'translations', 'published']:
                                for filename in re.findall(r'/media/([a-f0-9]{64}\.(?:png|jpg|webp))', row[key] or ''):
                                    if not (uploads / filename).is_file():
                                        raise ValueError('A referenced upload is missing: ' + filename)
                sql.write('COMMIT;\n')
        engine.dispose()
    with tarfile.open(destination / 'uploads.tar.gz', 'w:gz') as archive:
        for path in sorted(uploads.rglob('*')):
            if path.is_symlink():
                raise ValueError('Symlink in uploads; review before export')
            if path.is_file():
                relative = str(path.relative_to(uploads))
                manifest['uploads'][relative] = hashlib.sha256(path.read_bytes()).hexdigest()
                archive.add(path, arcname=relative, recursive=False)
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    files = ['database.mysql.sql', 'uploads.tar.gz', 'manifest.json']
    (destination / 'SHA256SUMS').write_text(''.join(hashlib.sha256((destination / name).read_bytes()).hexdigest() + '  ' + name + '\n' for name in files))
    for path in destination.iterdir():
        os.chmod(path, 0o600)
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default=ROOT / 'backend/.local/cms.db')
    parser.add_argument('--uploads', default=ROOT / 'backend/.local/uploads')
    parser.add_argument('--output', default=ROOT / 'backups' / ('initial-migration-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')))
    args = parser.parse_args()
    os.umask(0o077)
    result = export(args.database, args.uploads, args.output)
    print('Export:', Path(args.output).resolve())
    print('Rows:', json.dumps(result['tables']))
    print('Uploaded files:', len(result['uploads']))
