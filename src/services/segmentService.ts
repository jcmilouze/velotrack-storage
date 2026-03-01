/**
 * Segment Service
 * For now, handles a local database of iconic segments.
 * In a production app, this would connect to Strava API.
 */

export interface Segment {
    id: string;
    name: string;
    distanceKm: number;
    avgGrade: number; // percentage
    climbCategory: number; // 0-4 + HC
    coordinates: [number, number]; // [lng, lat]
    city: string;
}

export const ICONIC_SEGMENTS: Segment[] = [
    {
        id: 's1',
        name: "Pont d'Arc - Montée de Gaud",
        distanceKm: 4.2,
        avgGrade: 5.8,
        climbCategory: 3,
        coordinates: [4.4172, 44.3821],
        city: "Vallon-Pont-d'Arc"
    },
    {
        id: 's2',
        name: "Col de l'Escrinet",
        distanceKm: 14.1,
        avgGrade: 4.2,
        climbCategory: 1,
        coordinates: [4.4912, 44.7175],
        city: "Privas"
    },
    {
        id: 's3',
        name: "Mont Ventoux (via Bédoin)",
        distanceKm: 21.4,
        avgGrade: 7.5,
        climbCategory: 5, // HC
        coordinates: [5.2785, 44.1736],
        city: "Bédoin"
    },
    {
        id: 's4',
        name: "Alpe d'Huez 21 Virages",
        distanceKm: 13.8,
        avgGrade: 8.1,
        climbCategory: 5, // HC
        coordinates: [6.0621, 45.0906],
        city: "Bourg d'Oisans"
    }
];

export const getNearSegments = (lat: number, lng: number, radiusKm: number = 50): Segment[] => {
    // Basic distance filtering
    return ICONIC_SEGMENTS.filter(seg => {
        const dist = computeDist(lat, lng, seg.coordinates[1], seg.coordinates[0]);
        return dist <= radiusKm;
    });
};

export const findSegmentByName = (name: string): Segment | undefined => {
    const n = name.toLowerCase();
    return ICONIC_SEGMENTS.find(s => s.name.toLowerCase().includes(n) || s.city.toLowerCase().includes(n));
};

const computeDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              // @ts-ignore
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};
