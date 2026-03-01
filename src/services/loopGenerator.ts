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

export interface LoopOptions {
    /** Departure point [lng, lat] */
    departure: Position;
    /** Target total distance in km */
    targetDistanceKm: number;
    /** Compass directions for the outbound legs */
    directions: CompassDirection[];
}

/**
 * Returns the list of waypoints for a loop route: [departure, pt1, pt2, pt3, departure]
 * We use 3 intermediate points to force the routing engine to take distinct roads
 * for the outbound and return legs, creating a "true loop".
 */
export const buildLoopWaypoints = (options: LoopOptions): Position[] => {
    const { departure, targetDistanceKm, directions } = options;

    // We insert 1 intermediate point per direction.
    // To maintain the target distance, we scale the leg distances.
    const numDirs = directions.length;

    // Theoretical max distance reach from departure based on total distance
    // For a single direction loop, it was 3.5. 
    // If we have 3 directions (e.g. N -> E -> S), we are doing a larger arc.
    const reachFactor = numDirs === 1 ? 3.5 : numDirs === 2 ? 4.5 : 5.5;
    const legDist = targetDistanceKm / reachFactor;

    const wps: Position[] = [departure];

    directions.forEach((dir) => {
        const bearing = COMPASS_DIRECTIONS[dir];
        // If it's the only direction, add lateral points for a wider loop
        if (numDirs === 1) {
            wps.push(computeDestination(departure, bearing + 40, legDist * 0.7));
            wps.push(computeDestination(departure, bearing, legDist));
            wps.push(computeDestination(departure, bearing - 40, legDist * 0.7));
        } else {
            // Sequential directions
            wps.push(computeDestination(departure, bearing, legDist));
        }
    });

    wps.push(departure);
    return wps;
};
