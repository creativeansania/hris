/**
 * Haversine Formula & Geofencing Utilities for HRIS Attendance
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface OfficeLocationGeo {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface ClosestOfficeResult {
  office: OfficeLocationGeo | null;
  distanceMeters: number;
  isWithinRadius: boolean;
}

/**
 * Calculates the great-circle distance between two points on the earth's surface
 * using the Haversine formula in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the closest active office location from a given user coordinate
 * and evaluates if user is inside the geofence radius.
 */
export function findClosestOffice(
  userCoord: GeoCoordinate,
  officeLocations: OfficeLocationGeo[]
): ClosestOfficeResult {
  if (!officeLocations || officeLocations.length === 0) {
    return {
      office: null,
      distanceMeters: Infinity,
      isWithinRadius: false,
    };
  }

  let closestOffice: OfficeLocationGeo | null = null;
  let minDistance = Infinity;

  for (const office of officeLocations) {
    if (!office.is_active) continue;

    const dist = calculateHaversineDistanceMeters(
      userCoord.latitude,
      userCoord.longitude,
      Number(office.latitude),
      Number(office.longitude)
    );

    if (dist < minDistance) {
      minDistance = dist;
      closestOffice = office;
    }
  }

  if (!closestOffice) {
    return {
      office: null,
      distanceMeters: Infinity,
      isWithinRadius: false,
    };
  }

  const isWithinRadius = minDistance <= closestOffice.radius_meters;

  return {
    office: closestOffice,
    distanceMeters: minDistance,
    isWithinRadius,
  };
}

/**
 * Checks whether the reported GPS accuracy is acceptable.
 * Accuracy > 100 meters is rejected as too coarse or prone to drift/mocking.
 */
export function isGpsAccuracyAcceptable(accuracyMeters: number): boolean {
  return accuracyMeters <= 100;
}
