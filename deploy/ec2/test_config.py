"""Run: python3 -m unittest discover -s deploy/ec2 -p 'test_*.py'. Needs Compose CLI, no daemon."""
import copy
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]

class ProductionConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = subprocess.check_output(['docker', 'compose', '--env-file', 'deploy/ec2/ec2.env.example', '-f', 'compose.ec2.yaml', 'config', '--format', 'json'], cwd=ROOT)
        cls.config = json.loads(raw)

    def valid_config(self):
        c = copy.deepcopy(self.config)
        web = c['services']['web']['environment']
        for key in ['ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'INTERNAL_API_KEY']:
            web[key] = 'a' * 64
        web.update(CAPTCHA_SITE_KEY='test-public-key', CAPTCHA_SECRET_KEY='test-private-key', SMTP_HOST='smtp.example.com', SMTP_FROM='sender@example.com')
        c['services']['db']['environment'].update(MYSQL_PASSWORD='b' * 64, MYSQL_ROOT_PASSWORD='c' * 64)
        return c

    def validate(self, config):
        return subprocess.run(['python3', 'deploy/ec2/validate-env.py'], input=json.dumps(config), text=True, capture_output=True, cwd=ROOT)

    def test_placeholders_are_rejected_without_disclosing_values(self):
        r = self.validate(self.config)
        self.assertNotEqual(r.returncode, 0)
        self.assertNotIn('REPLACE_WITH_64', r.stderr)

    def test_config_accepts_complete_production_values(self):
        c = self.valid_config()
        r = self.validate(c)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertNotIn('a' * 64, r.stdout + r.stderr)
        self.assertEqual(c['name'], 'alemax-official')
        self.assertEqual(c['services']['web']['ports'][0]['host_ip'], '127.0.0.1')
        for name in ['api', 'db', 'worker']:
            self.assertFalse(c['services'][name].get('ports'))

    def test_public_api_or_web_binding_is_rejected(self):
        for name in ['api', 'web']:
            c = self.valid_config()
            c['services'][name]['ports'] = [{'host_ip': '0.0.0.0', 'published': '8000', 'target': 8000}]
            self.assertNotEqual(self.validate(c).returncode, 0)

    def test_missing_mail_captcha_bad_origin_and_password_are_rejected(self):
        for key, value in [('SMTP_HOST', ''), ('CAPTCHA_SECRET_KEY', ''), ('SITE_ORIGINS', 'http://example.com/path'), ('ADMIN_PASSWORD', 'short')]:
            c = self.valid_config()
            c['services']['web']['environment'][key] = value
            self.assertNotEqual(self.validate(c).returncode, 0, key)

if __name__ == '__main__':
    unittest.main()
