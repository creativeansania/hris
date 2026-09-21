import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceMeters,
  findClosestOffice,
  isGpsAccuracyAcceptable,
  type OfficeLocationGeo,
} from '../src/lib/geo/haversine.ts';

test('Haversine & GPS Geofencing Utilities', async (t) => {
  await t.test('calculates 0 meters for identical coordinates', () => {
    const lat = -6.2088;
    const lon = 106.8456;
    const distance = calculateHaversineDistanceMeters(lat, lon, lat, lon);
    assert.equal(distance, 0);
  });

  await t.test('calculates accurate distance between known Jakarta coordinates', () => {
    // Monas Jakarta: -6.175392, 106.827153
    // Bundaran HI Jakarta: -6.195045, 106.823026
    // Approximate distance ~2,230 meters
    const dist = calculateHaversineDistanceMeters(
      -6.175392,
      106.827153,
      -6.195045,
      106.823026
    );
    assert.ok(dist >= 2150 && dist <= 2350, `Distance ${dist} is within expected range`);
  });

  await t.test('handles empty office list gracefully', () => {
    const result = findClosestOffice(
      { latitude: -6.2, longitude: 106.8 },
      []
    );
    assert.equal(result.office, null);
    assert.equal(result.distanceMeters, Infinity);
    assert.equal(result.isWithinRadius, false);
  });

  await t.test('ignores inactive office locations', () => {
    const offices: OfficeLocationGeo[] = [
      {
        id: 'office-1',
        name: 'Kantor Lama (Non-aktif)',
        latitude: -6.2,
        longitude: 106.8,
        radius_meters: 100,
        is_active: false,
      },
    ];

    const result = findClosestOffice(
      { latitude: -6.2, longitude: 106.8 },
      offices
    );
    assert.equal(result.office, null);
    assert.equal(result.distanceMeters, Infinity);
    assert.equal(result.isWithinRadius, false);
  });

  await t.test('identifies closest active office and validates within radius', () => {
    const offices: OfficeLocationGeo[] = [
      {
        id: 'office-hq',
        name: 'Kantor Pusat Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
        radius_meters: 150,
        is_active: true,
      },
      {
        id: 'office-branch',
        name: 'Kantor Cabang Bandung',
        latitude: -6.9175,
        longitude: 107.6191,
        radius_meters: 200,
        is_active: true,
      },
    ];

    // User is located 20 meters from HQ
    const insideResult = findClosestOffice(
      { latitude: -6.2089, longitude: 106.8456 },
      offices
    );
    assert.equal(insideResult.office?.id, 'office-hq');
    assert.ok(insideResult.distanceMeters < 50);
    assert.equal(insideResult.isWithinRadius, true);

    // User is 5 km away from HQ
    const outsideResult = findClosestOffice(
      { latitude: -6.2500, longitude: 106.8456 },
      offices
    );
    assert.equal(outsideResult.office?.id, 'office-hq');
    assert.ok(outsideResult.distanceMeters > 4000);
    assert.equal(outsideResult.isWithinRadius, false);
  });

  await t.test('evaluates GPS accuracy thresholds', () => {
    assert.equal(isGpsAccuracyAcceptable(10), true);
    assert.equal(isGpsAccuracyAcceptable(50), true);
    assert.equal(isGpsAccuracyAcceptable(100), true);
    assert.equal(isGpsAccuracyAcceptable(101), false);
    assert.equal(isGpsAccuracyAcceptable(350), false);
  });
});
