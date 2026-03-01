import type { Position } from 'geojson';
import { computeDistanceKm } from './loopGenerator';

export type AmenityType = 'cafe' | 'bakery' | 'drinking_water' | 'viewpoint' | 'restaurant' | 'bicycle_parking' | 'toilets';

const AMENITY_QUERIES: Record<AmenityType, string> = {
    cafe: 'node["amenity"="cafe"]',
    bakery: 'node["shop"="bakery"]',
    drinking_water: 'node["amenity"="drinking_water"]',
    viewpoint: 'node["tourism"="viewpoint"]',
    restaurant: 'node["amenity"="restaurant"]',
    bicycle_parking: 'node["amenity"="bicycle_parking"]',
    toilets: 'node["amenity"="toilets"]'
};

export const AMENITY_LABELS: Record<AmenityType, string> = {
    cafe: 'Café',
    bakery: 'Boulangerie',
    drinking_water: "Point d'eau",
    viewpoint: 'Point de vue panoramique',
    restaurant: 'Restaurant',
    bicycle_parking: 'Parking vélo',
    toilets: 'Toilettes publiques'
};

export interface AmenityResult {
    name: string;
    type: AmenityType;
    position: Position;
    distanceKm: number;
}

/**
 * Interroge l'API publique Overpass pour trouver un type de POI autour d'un point géographique précis.
 */
export const fetchNearestAmenity = async (
    center: Position,
    type: AmenityType,
    radiusMeters: number = 10000 // 10km search radius max
): Promise<AmenityResult | null> => {
    const lat = center[1];
    const lon = center[0];
    const nodeQuery = AMENITY_QUERIES[type];

    if (!nodeQuery) return null;

    // Overpass QL query: Find nodes within radius, output as json.
    const query = `
        [out:json][timeout:15];
        (
            ${nodeQuery}(around:${radiusMeters},${lat},${lon});
        );
        out body 20;
    `;

    try {
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur Overpass API");

        const data = await response.json();
        
        if (!data.elements || data.elements.length === 0) {
            return null;
        }

        // Parse elements and compute real distance to find the absolute closest
        const elements = data.elements.map((el: any) => {
            const pos: Position = [el.lon, el.lat];
            const name = el.tags?.name || AMENITY_LABELS[type];
            return {
                name,
                type,
                position: pos,
                distanceKm: computeDistanceKm(center, pos)
            };
        });

        // Sort by closest distance
        elements.sort((a: AmenityResult, b: AmenityResult) => a.distanceKm - b.distanceKm);

        return elements[0];
    } catch (error) {
        console.error("Overpass Fetch Error:", error);
        return null;
    }
};
