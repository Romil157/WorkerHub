/**
 * Geolocation utility
 * Uses browser Geolocation API + OpenStreetMap Nominatim (free, no API key required)
 * to resolve lat/lng → city name.
 */

/**
 * Get the user's current geographic city using browser GPS + reverse geocoding.
 * @returns {Promise<{city: string, lat: number, lng: number}>}
 */
export const getCurrentCity = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'WorkerHub/1.0' } }
          );
          const data = await res.json();
          const address = data.address || {};

          // Nominatim returns city/town/village/county in different fields depending on area
          const city =
            address.city ||
            address.town ||
            address.state_district ||
            address.county ||
            address.village ||
            'Unknown';
            
          const postcode = address.postcode || '';
          const state = address.state || '';
          const building = address.building || address.neighbourhood || address.suburb || '';
          const fullAddress = data.display_name || '';

          resolve({ city, lat, lng, postcode, state, building, fullAddress });
        } catch {
          // If reverse geocoding fails, resolve with coords only
          resolve({ city: '', lat, lng, postcode: '', state: '', building: '', fullAddress: '' });
        }
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Please enter your city manually.',
          3: 'Location request timed out. Please enter your city manually.',
        };
        reject(new Error(messages[error.code] || 'Could not get your location.'));
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
};

/**
 * Simplified helper that just returns the city name string.
 * @returns {Promise<string>}
 */
export const getCityName = async () => {
  const { city } = await getCurrentCity();
  return city;
};
