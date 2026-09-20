import test from 'node:test';
import assert from 'node:assert/strict';
import { getTodayWIB, getCurrentTimeWIB, formatDateWIB } from '../src/lib/date-utils.ts';

test('Date Utils - WIB Timezone Handling', async (t) => {
  await t.test('converts UTC midnight (01:00 UTC) to correct WIB date (08:00 WIB)', () => {
    // 2026-09-20 01:00:00 UTC = 2026-09-20 08:00:00 WIB
    const utcMorning = new Date('2026-09-20T01:00:00Z');
    assert.equal(getTodayWIB(utcMorning), '2026-09-20');
    assert.equal(getCurrentTimeWIB(utcMorning), '08:00:00');
  });

  await t.test('converts UTC evening (20:00 UTC) to NEXT DAY in WIB (03:00 WIB)', () => {
    // 2026-09-19 20:00:00 UTC = 2026-09-20 03:00:00 WIB
    const utcPrevNight = new Date('2026-09-19T20:00:00Z');
    assert.equal(getTodayWIB(utcPrevNight), '2026-09-20');
    assert.equal(getCurrentTimeWIB(utcPrevNight), '03:00:00');
  });

  await t.test('formats Indonesian date correctly', () => {
    const d = new Date('2026-09-20T05:00:00Z');
    const formatted = formatDateWIB(d);
    assert.match(formatted, /20 September 2026/);
  });
});
