/**
 * Calculates distance between two GPS coordinates in kilometers using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Calculates speed in km/h based on two consecutive tracking points.
 * Applies safety filters:
 * - If speed < 0, set to 0.
 * - If speed > 120 km/h, ignores as GPS anomaly and uses previous speed (or 0).
 */
export function calculateSpeed(
  prevLat: number,
  prevLon: number,
  prevTime: number | Date,
  currLat: number,
  currLon: number,
  currTime: number | Date,
  prevSpeed: number = 0
): number {
  const time1 = new Date(prevTime).getTime();
  const time2 = new Date(currTime).getTime();

  const timeDiffHours = (time2 - time1) / (1000 * 60 * 60);

  // If time difference is invalid or too small (< 1 second)
  if (timeDiffHours <= 0) {
    return 0;
  }

  const distanceKm = calculateHaversineDistance(prevLat, prevLon, currLat, currLon);
  let speedKmH = distanceKm / timeDiffHours;

  // Speed Filtering logic:
  if (speedKmH < 0) {
    speedKmH = 0;
  } else if (speedKmH > 120) {
    // GPS jitter artifact / anomaly: use previous speed or fallback to 0
    speedKmH = prevSpeed > 0 && prevSpeed <= 120 ? prevSpeed : 0;
  }

  return Math.round(speedKmH * 10) / 10; // Rounded to 1 decimal place
}
