import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseUserAgent, formatDeviceInfo } from '../src/lib/device-parser.ts';

describe('Device Parser Utilities', () => {
  it('parses Android Chrome Mobile user agent correctly', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';
    const parsed = parseUserAgent(ua);
    assert.strictEqual(parsed.os, 'Android 10');
    assert.strictEqual(parsed.browser, 'Chrome Mobile');
    assert.strictEqual(parsed.isMobile, true);
    assert.strictEqual(formatDeviceInfo(ua), 'Android 10 • Chrome Mobile');
  });

  it('parses iPhone Safari user agent correctly', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const parsed = parseUserAgent(ua);
    assert.strictEqual(parsed.os, 'iOS 17.4');
    assert.strictEqual(parsed.browser, 'Mobile Safari');
    assert.strictEqual(parsed.isMobile, true);
  });

  it('parses Windows desktop Chrome user agent correctly', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    const parsed = parseUserAgent(ua);
    assert.strictEqual(parsed.os, 'Windows 10/11');
    assert.strictEqual(parsed.browser, 'Chrome');
    assert.strictEqual(parsed.isMobile, false);
  });

  it('handles null, undefined or empty gracefully', () => {
    assert.strictEqual(formatDeviceInfo(null), 'Perangkat Tidak Tercatat');
    assert.strictEqual(formatDeviceInfo(''), 'Perangkat Tidak Tercatat');
    assert.strictEqual(formatDeviceInfo(undefined), 'Perangkat Tidak Tercatat');
  });

  it('preserves already-formatted device summaries', () => {
    const formatted = 'Android 10 • Chrome Mobile (PWA)';
    assert.strictEqual(formatDeviceInfo(formatted), formatted);
  });
});
