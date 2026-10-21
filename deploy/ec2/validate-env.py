#!/usr/bin/env python3
"""Validate resolved Compose JSON from stdin without printing any secret values."""
import json
import re
import sys
from urllib.parse import urlparse

config = json.load(sys.stdin)
services = config['services']
web = services['web']['environment']
api = services['api']['environment']
db = services['db']['environment']
errors = []
for key, minimum in [('ADMIN_PASSWORD', 8), ('ADMIN_SESSION_SECRET', 32), ('INTERNAL_API_KEY', 32)]:
    value = web.get(key) or ''
    if len(value) < minimum or 'REPLACE_' in value or value.startswith('replace_'):
        errors.append(f'{key}: replace placeholder and use at least {minimum} characters')
for key in ['MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD']:
    if not re.fullmatch(r'[a-fA-F0-9]{32,}', db.get(key) or ''):
        errors.append(f'{key}: use an independently generated hex secret of at least 32 characters')
if web.get('VISIT_HASH_SECRET') and len(web['VISIT_HASH_SECRET']) < 32:
    errors.append('VISIT_HASH_SECRET: use at least 32 characters or leave empty')
if web.get('ENVIRONMENT') != 'production':
    errors.append('ENVIRONMENT must be production')
origins = (web.get('SITE_ORIGINS') or '').split(',')
for origin in origins:
    u = urlparse(origin.strip())
    if u.scheme != 'https' or not u.netloc or u.path or u.query or u.fragment:
        errors.append('SITE_ORIGINS: use exact HTTPS origins without paths')
for key in ['CAPTCHA_SITE_KEY', 'CAPTCHA_SECRET_KEY', 'SMTP_HOST', 'SMTP_FROM']:
    if not web.get(key):
        errors.append(f'{key}: required for production inquiries')
if api.get('DEEPL_API_URL') not in ['https://api-free.deepl.com/v2/translate', 'https://api.deepl.com/v2/translate']:
    errors.append('DEEPL_API_URL: use an official DeepL endpoint')
if api.get('DEEPL_GLOSSARY_ID') and not api.get('DEEPL_API_KEY'):
    errors.append('DEEPL_GLOSSARY_ID requires DEEPL_API_KEY')
for service in ['api', 'db', 'worker']:
    if services[service].get('ports'):
        errors.append(f'{service}: must not publish host ports')
for port in services['web'].get('ports', []):
    if port.get('host_ip') != '127.0.0.1':
        errors.append('web: must bind only to loopback')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('Production configuration validated (secret values omitted).')
