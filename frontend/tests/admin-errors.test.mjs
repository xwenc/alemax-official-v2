import test from 'node:test';
import assert from 'node:assert/strict';
import { adminErrorMessage } from '../lib/admin-errors.ts';

test('FastAPI validation arrays display field locations without submitted values', () => {
  const result = {detail: [{loc: ['body', 'shared', 'images'], msg: 'Invalid image path', input: 'private-value'}]};
  assert.equal(adminErrorMessage(result, 422), 'shared.images: Invalid image path');
  assert.equal(adminErrorMessage({detail: 'Stale revision'}, 409), 'Stale revision');
  assert.match(adminErrorMessage({}, 503), /HTTP 503/);
});
