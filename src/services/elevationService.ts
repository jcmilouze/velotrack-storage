/**
 * Elevation Service — fetches elevation data for a route using Valhalla /height API
 * and computes ascent/descent + a normalized elevation profile for the chart.
 */

const VALHALLA_BASE = import.meta.env.VITE_VALHALLA_URL?.replace('/route', '') ?? 'https://valhalla1.openstreetmap.de';

export interface ElevationProfile {
    /** Elevation values in meters, sampled every ~50m along the route */
    samples: number[];
    minElevation: number;
    maxElevation: number;
    /** Total ascent in meters */
    ascent: number;
    /** Total descent in meters */
    descent: number;
}

/**
 * Sample coordinates evenly along a route (max ~100 points to stay within API limits).
 */
const sampleCoordinates = (coords: number[][], maxSamples = 100): number[][] => {
    if (coords.length <= maxSamples) return coords;
    const step = Math.ceil(coords.length / maxSamples);
    return coords.filter((_, i) => i % step === 0);
};

export const fetchElevationProfile = async (
    coordinates: number[][]
): Promise<ElevationProfile | null> => {
    try {
        const sampled = sampleCoordinates(coordinates);

        // Valhalla /height expects { shape: [{lat, lon}] }
        const body = {
            shape: sampled.map(([lng, lat]) => ({ lat, lon: lng })),
            resample_distance: 50, // resample every 50m
            height_precision: 1,
        };

        const response = await fetch(`${VALHALLA_BASE}/height`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Elevation API error: ${response.status}`);

        const data = await response.json();
        const heights: number[] = data.height ?? data.heights ?? [];

        if (!heights.length) return null;

        // Compute stats
        let ascent = 0;
        let descent = 0;
        for (let i = 1; i < heights.length; i++) {
            const diff = heights[i] - heights[i - 1];
            if (diff > 0) ascent += diff;
            else descent += Math.abs(diff);
        }

        return {
            samples: heights,
            minElevation: Math.min(...heights),
            maxElevation: Math.max(...heights),
            ascent: Math.round(ascent),
            descent: Math.round(descent),
        };
    } catch (err) {
        console.warn('Elevation fetch failed:', err);
        return null;
    }
};
