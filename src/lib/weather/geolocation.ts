/**
 * Geolocation Utilities
 *
 * Helper functions for obtaining device location.
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Get current device position using browser Geolocation API.
 *
 * Prompts user for permission if not already granted.
 *
 * @returns Promise resolving to latitude/longitude
 * @throws Error if geolocation is not supported or permission denied
 */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out'));
            break;
          default:
            reject(new Error('Unknown geolocation error'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Get the device's timezone.
 *
 * @returns IANA timezone string (e.g., "Australia/Sydney")
 */
export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
