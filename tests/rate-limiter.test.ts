import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  checkClockInRateLimit,
  checkFileUploadRateLimit,
  checkAuthRateLimit,
  checkOdooSyncRateLimit,
} from '../src/lib/rate-limiter.ts';

test('Sliding Window Rate Limiter Utilities', async (t) => {
  await t.test('allows requests within limit and decrements remaining', () => {
    const key = `test_key_${Date.now()}_1`;
    const limit = 3;
    const windowMs = 5000;

    const res1 = checkRateLimit(key, limit, windowMs);
    assert.equal(res1.success, true);
    assert.equal(res1.limit, 3);
    assert.equal(res1.remaining, 2);

    const res2 = checkRateLimit(key, limit, windowMs);
    assert.equal(res2.success, true);
    assert.equal(res2.remaining, 1);

    const res3 = checkRateLimit(key, limit, windowMs);
    assert.equal(res3.success, true);
    assert.equal(res3.remaining, 0);

    // 4th request exceeds limit
    const res4 = checkRateLimit(key, limit, windowMs);
    assert.equal(res4.success, false);
    assert.equal(res4.remaining, 0);
    assert.ok(res4.message && res4.message.includes('Terlalu banyak permintaan'));
  });

  await t.test('isolates rate limits by distinct keys', () => {
    const keyA = `user_a_${Date.now()}`;
    const keyB = `user_b_${Date.now()}`;
    const limit = 1;

    // Key A exhausts limit
    const resA1 = checkRateLimit(keyA, limit, 5000);
    assert.equal(resA1.success, true);

    const resA2 = checkRateLimit(keyA, limit, 5000);
    assert.equal(resA2.success, false);

    // Key B is unaffected
    const resB1 = checkRateLimit(keyB, limit, 5000);
    assert.equal(resB1.success, true);
  });

  await t.test('enforces specialized helper rate limits', () => {
    const testId = `helper_${Date.now()}`;

    const clockInRes = checkClockInRateLimit(testId);
    assert.equal(clockInRes.limit, 10);
    assert.equal(clockInRes.success, true);

    const uploadRes = checkFileUploadRateLimit(testId);
    assert.equal(uploadRes.limit, 15);
    assert.equal(uploadRes.success, true);

    const authRes = checkAuthRateLimit(testId);
    assert.equal(authRes.limit, 5);
    assert.equal(authRes.success, true);

    const odooRes = checkOdooSyncRateLimit(testId);
    assert.equal(odooRes.limit, 5);
    assert.equal(odooRes.success, true);
  });

  await t.test('resets when sliding window elapses', async () => {
    const key = `expiry_test_${Date.now()}`;
    const limit = 1;
    const windowMs = 30; // 30ms

    const res1 = checkRateLimit(key, limit, windowMs);
    assert.equal(res1.success, true);

    const res2 = checkRateLimit(key, limit, windowMs);
    assert.equal(res2.success, false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 40));

    const res3 = checkRateLimit(key, limit, windowMs);
    assert.equal(res3.success, true);
  });
});
