import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_MAX_AGE, CONSENT_VERSION, consentCookie, parseConsent, readConsentCookie } from '../lib/cookie-consent.ts';
const now = 1_800_000_000_000;
test('no choice, malformed, obsolete, future and expired choices never grant consent', () => {
  for (const value of [undefined, '%', 'null', 'bad', encodeURIComponent(JSON.stringify({ version: 0, choice: 'accepted', timestamp: now })), encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, choice: 'accepted', timestamp: now + 1 })), encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, choice: 'accepted', timestamp: now - CONSENT_MAX_AGE * 1000 }))]) {
    assert.equal(parseConsent(value, now), null);
  }
  assert.equal(readConsentCookie('unrelated=accepted', now), null);
});
test('accept and reject have identical lifetime, scope and secure attributes', () => {
  for (const choice of ['accepted', 'rejected']) {
    const cookie = consentCookie(choice, true, now);
    const stored = readConsentCookie(`other=x; ${cookie.split(';')[0]}`, now);
    assert.equal(stored.choice, choice);
    assert.equal(stored.timestamp, now);
    assert.match(cookie, /Path=\/; Max-Age=15552000; SameSite=Lax; Secure$/);
  }
});
test('withdrawal replaces acceptance with rejection and old versions prompt again', () => {
  assert.equal(readConsentCookie(consentCookie('accepted', false, now), now).choice, 'accepted');
  assert.equal(readConsentCookie(consentCookie('rejected', false, now + 1), now + 1).choice, 'rejected');
  assert.equal(readConsentCookie(consentCookie('accepted', false, now), now + CONSENT_MAX_AGE * 1000), null);
});
