import test from 'node:test';
import assert from 'node:assert/strict';
import {madridDay, dailyVisitorHash} from '../lib/visit-stats.ts';
const secret = 'test-secret-'.repeat(4);
test('Madrid calendar day includes DST and midnight', () => {
  assert.equal(madridDay(new Date('2026-10-19T22:30:00Z')), '2026-10-20');
  assert.equal(madridDay(new Date('2026-12-19T22:30:00Z')), '2026-12-19');
});
test('same IP/day has same keyed hash; new day and key differ', () => {
  const hash=dailyVisitorHash('203.0.113.1','2026-10-19',secret);
  assert.match(hash,/^[a-f0-9]{64}$/);
  assert.equal(hash,dailyVisitorHash('::ffff:203.0.113.1','2026-10-19',secret));
  assert.notEqual(hash,dailyVisitorHash('203.0.113.1','2026-10-20',secret));
  assert.notEqual(hash,dailyVisitorHash('203.0.113.1','2026-10-19',secret+'x'));
  assert.equal(dailyVisitorHash('2001:db8::1','2026-10-19',secret),dailyVisitorHash('2001:0db8:0:0:0:0:0:1','2026-10-19',secret));
});
test('invalid and missing IPs or weak keys are not recorded', () => {
  for(const ip of [null,'','unknown','203.0.113.1, 127.0.0.1']) assert.equal(dailyVisitorHash(ip,'2026-10-19',secret),null);
  assert.equal(dailyVisitorHash('203.0.113.1','2026-10-19','short'),null);
});
