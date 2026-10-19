import os
import tempfile
from pathlib import Path
os.environ['DATABASE_URL'] = os.environ.get('CMS_TEST_DATABASE_URL') or 'sqlite:///' + str(Path(tempfile.mkdtemp()) / 'test.db')
os.environ['INTERNAL_API_KEY'] = 'test-service-key'
os.environ['ENVIRONMENT'] = 'development'
os.environ['CMS_SEED_ON_START'] = 'false'
