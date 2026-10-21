"""Backup preparation checks require no Docker daemon or production database."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prepare_backup', Path(__file__).with_name('prepare-database-backup.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BackupTests(unittest.TestCase):
    def test_plain_and_compressed_backups_with_counts(self):
        for compressed in [False, True]:
            with self.subTest(compressed=compressed), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                source = root / ('database.sql.gz' if compressed else 'database.sql')
                content = b'CREATE TABLE cms_content (id INT);\n'
                source.write_bytes(gzip.compress(content) if compressed else content)
                digest = hashlib.sha256(source.read_bytes()).hexdigest()
                (root / 'SHA256SUMS').write_text(f'{digest}  {source.name}\n')
                (root / 'manifest.json').write_text(json.dumps({'tables': {'cms_content': 4}}))
                dest = root / 'out'
                dest.mkdir()
                module.prepare(source, dest)
                self.assertEqual(gzip.decompress((dest / 'database.sql.gz').read_bytes()), content)
                self.assertEqual((dest / 'expected-counts.tsv').read_text(), 'cms_content\t4\n')

    def test_corrupt_checksum_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'database.sql'
            source.write_text('SELECT 1;')
            (root / 'SHA256SUMS').write_text('0' * 64 + '  database.sql\n')
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                module.prepare(source, root)

    def test_backup_without_metadata_does_not_invent_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'source.sql'
            source.write_text('SELECT 1;')
            module.prepare(source, root)
            self.assertFalse((root / 'counts.sql').exists())


if __name__ == '__main__':
    unittest.main()
