#!/usr/bin/env python3
"""Freeze a SQL backup and validate companion checksum/count metadata, if present."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import sys


def prepare(source: Path, dest: Path):
    checksum = source.parent / 'SHA256SUMS'
    if checksum.is_file():
        for line in checksum.read_text().splitlines():
            parts = line.split(maxsplit=1)
            if len(parts) == 2 and parts[1].lstrip('*') == source.name:
                with source.open('rb') as stream:
                    digest = hashlib.sha256()
                    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                        digest.update(chunk)
                    actual = digest.hexdigest()
                if actual != parts[0]:
                    raise ValueError('Database backup checksum mismatch')
                break
        else:
            raise ValueError('SHA256SUMS does not include the selected database backup')
    opener = gzip.open if source.name.endswith('.gz') else open
    with opener(source, 'rb') as src, gzip.open(dest / 'database.sql.gz', 'wb') as out:
        first = src.read(1)
        if not first:
            raise ValueError('Database backup is empty')
        out.write(first)
        shutil.copyfileobj(src, out)
    (dest / 'source.txt').write_text(str(source) + '\n')
    manifest = source.parent / 'manifest.json'
    if manifest.is_file():
        tables = json.loads(manifest.read_text())['tables']
        allowed = {'cms_content', 'cms_translation_jobs', 'inquiries', 'cms_site_seo', 'site_visit_days', 'site_visit_keys'}
        if not tables or set(tables) - allowed:
            raise ValueError('Unexpected tables in backup manifest')
        sql, expected = [], []
        for table, count in sorted(tables.items()):
            if type(count) is not int or count < 0:
                raise ValueError('Invalid row count in backup manifest')
            sql.append(f"SELECT '{table}', COUNT(*) FROM `{table}`;\n")
            expected.append(f'{table}\t{count}\n')
        (dest / 'counts.sql').write_text(''.join(sql))
        (dest / 'expected-counts.tsv').write_text(''.join(expected))
        shutil.copyfile(manifest, dest / 'manifest.json')


if __name__ == '__main__':
    prepare(Path(sys.argv[1]), Path(sys.argv[2]))
