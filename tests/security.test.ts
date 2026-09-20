import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeText,
  sanitizeFileName,
  isValidUuid,
  sanitizePostgrestSearch,
} from '../src/lib/security.ts';

test('Security & Input Sanitization Utilities', async (t) => {
  await t.test('sanitizes dangerous XSS HTML tags and javascript protocols', () => {
    const malicious = '<script>alert("hack")</script><img src="x" onerror="alert(1)">Hello World';
    const cleaned = sanitizeText(malicious);
    assert.equal(cleaned, 'Hello World');
  });

  await t.test('prevents path traversal in uploaded file names', () => {
    const pathTraversal = '../../../../etc/passwd.jpg';
    const safeName = sanitizeFileName(pathTraversal);
    assert.equal(safeName, 'passwd.jpg');
  });

  await t.test('validates UUIDs correctly', () => {
    assert.equal(isValidUuid('c7c9e2bd-fc30-4bcb-9f50-80d2987ce088'), true);
    assert.equal(isValidUuid('invalid-uuid-string'), false);
    assert.equal(isValidUuid(null), false);
  });

  await t.test('sanitizes PostgREST search characters to prevent filter injection', () => {
    const injection = 'admin,role.eq.admin)%';
    const sanitized = sanitizePostgrestSearch(injection);
    assert.equal(sanitized, 'adminroleeqadmin');
    assert.ok(!sanitized.includes(','));
    assert.ok(!sanitized.includes('('));
    assert.ok(!sanitized.includes(')'));
    assert.ok(!sanitized.includes('.'));
    assert.ok(!sanitized.includes('%'));
  });
});
