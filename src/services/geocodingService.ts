/**
 * Geocoding Service using Nominatim (OpenStreetMap)
 * Free, no API key required, rate-limited to 1 req/s.
 */

export interface GeocodingResult {
    displayName: string;
    shortName: string;
    lat: number;
    lng: number;
    type: string;
    importance: number;
}

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 300;

const throttle = async (): Promise<void> => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
};

export const searchAddress = async (
    query: string,
    signal?: AbortSignal
): Promise<GeocodingResult[]> => {
    if (!query.trim() || query.length < 3) return [];

    await throttle();

    const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        'accept-language': 'fr',
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
            signal,
            headers: { 'User-Agent': 'VeloTrack/1.0 (cycling route planner)' },
        }
    );

    if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

    const data = await response.json();

    return data.map((item: any): GeocodingResult => {
        const addr = item.address ?? {};
        const parts = [
            addr.road ?? addr.pedestrian ?? addr.footway,
            addr.village ?? addr.town ?? addr.city_district ?? addr.city ?? addr.municipality,
            addr.country,
        ].filter(Boolean);

        return {
            displayName: item.display_name,
            shortName: parts.slice(0, 2).join(', ') || item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type ?? 'place',
            importance: parseFloat(item.importance ?? '0'),
        };
    });
};
