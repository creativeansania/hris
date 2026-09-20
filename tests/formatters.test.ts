import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIDR,
  formatCompactIDR,
  formatPercent,
  formatNumber,
} from '../src/lib/formatters.ts';

test('Formatters Utilities', async (t) => {
  await t.test('formats IDR currency correctly', () => {
    assert.match(formatIDR(5000000), /Rp\s?5\.000\.000/);
    assert.match(formatIDR(0), /Rp\s?0/);
    assert.match(formatIDR(null), /Rp\s?0/);
  });

  await t.test('formats compact IDR numbers', () => {
    assert.equal(formatCompactIDR(15500000), 'Rp 15,5 Jt');
    assert.equal(formatCompactIDR(2500000000), 'Rp 2,5 M');
    assert.equal(formatCompactIDR(50000), 'Rp 50 Rb');
  });

  await t.test('formats percentage and standard numbers', () => {
    assert.equal(formatPercent(95.5), '95,5%');
    assert.equal(formatNumber(12500), '12.500');
  });
});
