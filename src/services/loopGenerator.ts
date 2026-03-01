/**
 * Loop Generator Service
 * Generates a circular cycling route from a departure point.
 *
 * Algorithm:
 * 1. Compute a midpoint at distance/2 from departure in the chosen bearing direction
 * 2. Route departure → midpoint → departure using Valhalla
 * 3. Handles Route and Gravel costing profiles
 */

import type { Position } from 'geojson';

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Bearing angles for each compass direction */
export const COMPASS_DIRECTIONS = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
} as const;
export type CompassDirection = keyof typeof COMPASS_DIRECTIONS;

/**
 * Compute a destination point given a start position, bearing (degrees), and distance (km).
 * Uses spherical Earth approximation.
 */
export const computeDestination = (
    start: Position,
    bearingDeg: number,
    distanceKm: number
): Position => {
    const lat1 = start[1] * DEG2RAD;
    const lng1 = start[0] * DEG2RAD;
    const bearingRad = bearingDeg * DEG2RAD;
    const angularDist = distanceKm / EARTH_RADIUS_KM;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDist) +
        Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearingRad)
    );

    const lng2 = lng1 + Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1),
        Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [lng2 * RAD2DEG, lat2 * RAD2DEG];
};

/** Calculate straight-line distance between two positions in km */
export const computeDistanceKm = (p1: Position, p2: Position): number => {
    const lat1 = p1[1] * DEG2RAD;
    const lng1 = p1[0] * DEG2RAD;
    const lat2 = p2[1] * DEG2RAD;
    const lng2 = p2[0] * DEG2RAD;

    const dlat = lat2 - lat1;
    const dlng = lng2 - lng1;

    const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dlng / 2) * Math.sin(dlng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};

/** Linear interpolation between two coordinates */
export const interpolate = (p1: Position, p2: Position, fraction: number): Position => {
    return [
        p1[0] + (p2[0] - p1[0]) * fraction,
        p1[1] + (p2[1] - p1[1]) * fraction,
    ];
};

export interface LoopOptions {
    /** Departure point [lng, lat] */
    departure: Position;
    /** Target total distance in km */
    targetDistanceKm: number;
    /** Compass directions for the outbound legs */
    directions: CompassDirection[];
    /** Optional Point of Interest to pass through */
    poi?: Position;
    /** Elevation preference */
    elevation?: 'flat' | 'hilly' | 'mountain';
}

/**
 * Returns the list of waypoints for a loop route: [departure, pt1, pt2, pt3, departure]
 * We use 3 intermediate points to force the routing engine to take distinct roads
 * for the outbound and return legs, creating a "true loop".
 */
export const buildLoopWaypoints = (options: LoopOptions): Position[] => {
    const { departure, targetDistanceKm, directions, poi, elevation } = options;

    const numDirs = directions.length;
    const reachFactor = numDirs === 1 ? 3.5 : numDirs === 2 ? 4.5 : 5.5;
    const legDist = targetDistanceKm / reachFactor;

    const keyPoints: Position[] = [];

    // If POI is provided, we use it as a mandatory waypoint.
    if (poi) {
        // Validation: Verify if the POI is not further than the total distance
        // Effectively, the distance to POI + distance back should be <= targetDistanceKm * 1.2 (small buffer)
        const distToPoi = computeDistanceKm(departure, poi);
        if (distToPoi * 2 > targetDistanceKm * 1.5) {
            throw new Error(`Le lieu demandé est trop loin (${Math.round(distToPoi)}km) pour un parcours de ${targetDistanceKm}km.`);
        }
        keyPoints.push(poi);
    } else {
        directions.forEach((dir) => {
            const bearing = COMPASS_DIRECTIONS[dir];
            if (numDirs === 1) {
                // Adjust loop geometry based on elevation preference
                // Flat: very narrow loop to increase chances of staying in a single valley (15deg)
                // Mountain: wide loop to force crossing different valleys and ridges (50deg)
                const spread = elevation === 'flat' ? 15 : elevation === 'mountain' ? 50 : 35;
                
                keyPoints.push(computeDestination(departure, bearing + spread, legDist * 0.8));
                keyPoints.push(computeDestination(departure, bearing, legDist));
                keyPoints.push(computeDestination(departure, bearing - spread, legDist * 0.8));
            } else {
                keyPoints.push(computeDestination(departure, bearing, legDist));
            }
        });
    }

    keyPoints.push(departure); // End the loop

    // We no longer interpolate points every 10km. 
    // Interpolation forces Valhalla onto a geometric straight line, 
    // destroying its ability to find detours around mountains or use flat valleys.
    const wps: Position[] = [departure, ...keyPoints];

    return wps;
};
