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
db = services['db-client']['environment']
errors = []
for key, minimum in [('ADMIN_PASSWORD', 8), ('ADMIN_SESSION_SECRET', 32), ('INTERNAL_API_KEY', 32)]:
    value = web.get(key) or ''
    if len(value) < minimum or 'REPLACE_' in value or value.startswith('replace_'):
        errors.append(f'{key}: replace placeholder and use at least {minimum} characters')
if not re.fullmatch(r'[a-fA-F0-9]{32,}', db.get('MYSQL_PWD') or ''):
    errors.append('MYSQL_PASSWORD: use an independently generated hex secret of at least 32 characters')
# A dedicated schema/account prevents site migrations from touching CRM tables.
for key in ['MYSQL_DATABASE', 'MYSQL_USER']:
    if db.get(key) != 'alemaxsite':
        errors.append(f'{key}: must be alemaxsite (dedicated website schema/account)')
expected_url = f"mysql+pymysql://alemaxsite:{db.get('MYSQL_PWD')}@{db.get('MYSQL_HOST')}:3306/alemaxsite?charset=utf8mb4"
if any(services[name]['environment'].get('DATABASE_URL') != expected_url for name in ['api', 'worker']):
    errors.append('api/worker: database connection must match the dedicated shared MySQL account')
if 'db' in services:
    errors.append('Remove the standalone website db service')
if services['db-client'].get('profiles') != ['maintenance']:
    errors.append('db-client must only run under the maintenance profile')
for name in ['api', 'worker', 'db-client']:
    if 'crm_database' not in services[name].get('networks', {}):
        errors.append(f'{name}: must join the CRM database network')
if not config.get('networks', {}).get('crm_database', {}).get('external'):
    errors.append('CRM database network must be external')
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
for service in ['api', 'db-client', 'worker']:
    if services[service].get('ports'):
        errors.append(f'{service}: must not publish host ports')
for port in services['web'].get('ports', []):
    if port.get('host_ip') != '127.0.0.1':
        errors.append('web: must bind only to loopback')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('Production configuration validated (secret values omitted).')
