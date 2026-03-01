import polyline from '@mapbox/polyline';
import type { Position } from 'geojson';
import { useRouteStore } from '../store/useRouteStore';
import type { RouteSummary, RouteManeuver, RouteType } from '../store/useRouteStore';
import { fetchElevationProfile } from './elevationService';

const VALHALLA_URL = import.meta.env.VITE_VALHALLA_URL;
const OSRM_FALLBACK_URL = import.meta.env.VITE_OSRM_URL;

// ─── Formatters ───────────────────────────────────────────────────────────

export const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
    return `${m} min`;
};

const MANEUVER_ICONS: Record<number, string> = {
    0: '🏁', 1: '🚦', 2: '⬆️', 3: '⬆️', 4: '↗️', 5: '🔄', 6: '↗️',
    7: '↩️', 8: '↗️', 9: '↖️', 10: '↖️', 11: '↩️', 12: '↩️', 24: '🏁',
};
export const getManeuverIcon = (type: number): string => MANEUVER_ICONS[type] ?? '➡️';

// ─── Valhalla costing profiles ────────────────────────────────────────────

const getValhallaCostingOptions = (routeType: RouteType, avoidHighways: boolean, elevation?: 'flat' | 'hilly' | 'mountain') => {
    // Features to exclude from any route
    const avoid_features = avoidHighways ? ['motorway', 'trunk', 'toll'] : ['motorway'];

    // Map elevation preference to Valhalla's use_hills (0.0 to 1.0)
    let use_hills = 0.5; // Default: Hilly
    if (elevation === 'flat') use_hills = 0.1;
    if (elevation === 'mountain') use_hills = 1.0;
    // For road specifically, if no preference, we used 0.3 before. Let's keep a sane default.
    if (!elevation && routeType === 'road') use_hills = 0.3;

    if (routeType === 'gravel') {
        return {
            costing: 'bicycle',
            costing_options: {
                bicycle: {
                    bicycle_type: 'Cross',
                    use_roads: 0.5,
                    use_hills,
                    use_trails: 0.5,
                    avoid_bad_surfaces: 0.25,
                },
            },
            avoid_features,
        };
    }

    return {
        costing: 'bicycle',
        costing_options: {
            bicycle: {
                bicycle_type: 'Road',
                use_roads: 1.0,
                use_hills,
                use_trails: 0.0,
                avoid_bad_surfaces: 1.0,
            },
        },
        avoid_features,
    };
};

// ─── Valhalla fetch & parse ───────────────────────────────────────────────

const fetchFromValhalla = async (
    waypoints: Position[],
    routeType: RouteType,
    avoidHighways: boolean,
    elevation?: 'flat' | 'hilly' | 'mountain'
) => {
    const query = {
        locations: waypoints.map((p, index) => {
            const isEndpoint = index === 0 || index === waypoints.length - 1;
            return {
                lat: p[1],
                lon: p[0],
                // "through" force l'algorithme à passer à travers sans s'arrêter, 
                // interdisant les demi-tours. Cela évite totalement les petites
                // impasses ou culs-de-sac (qui créent des "spurs" ou aller-retours).
                type: isEndpoint ? 'break' : 'through',
                // Rayon de recherche généreux pour s'accrocher à la route principale la plus proche
                radius: 2000
            };
        }),
        ...getValhallaCostingOptions(routeType, avoidHighways, elevation),
        units: 'kilometers',
    };

    const url = `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(query))}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Valhalla: ${response.status}`);
    return response.json();
};

const parseValhallaResponse = (data: any) => {
    if (!data?.trip?.legs?.length) throw new Error('No route in Valhalla response');

    const allCoords: number[][] = [];
    const allManeuvers: RouteManeuver[] = [];
    const summary: RouteSummary = data.trip.summary;

    for (const leg of data.trip.legs) {
        const coords = polyline.decode(leg.shape, 6).map((c) => [c[1], c[0]]);
        if (allCoords.length > 0) coords.shift();
        allCoords.push(...coords);
        for (const m of (leg.maneuvers ?? [])) {
            allManeuvers.push({ instruction: m.instruction, length: m.length, time: m.time, type: m.type });
        }
    }

    const snappedLocations = data.trip.locations?.map((loc: any) => [loc.lon, loc.lat] as [number, number]);

    return {
        routeGeometry: {
            type: 'Feature', properties: { summary },
            geometry: { type: 'LineString', coordinates: allCoords },
        },
        summary, maneuvers: allManeuvers, coordinates: allCoords,
        snappedLocations
    };
};

// ─── OSRM Fallback ────────────────────────────────────────────────────────

const fetchFromOSRM = async (waypoints: Position[]) => {
    if (!OSRM_FALLBACK_URL) throw new Error('No OSRM URL configured');
    const coordsStr = waypoints.map(p => `${p[0]},${p[1]}`).join(';');
    const url = `${OSRM_FALLBACK_URL}/route/v1/cycling/${coordsStr}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM: ${res.status}`);
    return res.json();
};

const parseOSRMResponse = (data: any) => {
    if (!data?.routes?.length) throw new Error('No route in OSRM response');
    const route = data.routes[0];
    const coords: number[][] = route.geometry.coordinates;
    const summary: RouteSummary = { length: route.distance / 1000, time: route.duration, cost: 0 };
    const snappedLocations = data.waypoints?.map((wp: any) => wp.location as [number, number]);

    const allManeuvers: RouteManeuver[] = [];
    route.legs.forEach((leg: any) => {
        (leg.steps ?? []).forEach((s: any) => {
            allManeuvers.push({
                instruction: s.maneuver.type.replace(/_/g, ' '),
                length: s.distance / 1000, time: s.duration, type: 2,
            });
        });
    });

    return {
        routeGeometry: { type: 'Feature', properties: { summary }, geometry: { type: 'LineString', coordinates: coords } },
        summary,
        maneuvers: allManeuvers,
        coordinates: coords,
        snappedLocations
    };
};

// ─── Public API ───────────────────────────────────────────────────────────

export const calculateRoute = async (
    waypoints: Position[],
    routeType: RouteType = 'road',
    avoidHighways?: boolean,
    elevation?: 'flat' | 'hilly' | 'mountain'
): Promise<void> => {
    if (waypoints.length < 2) return;

    const store = useRouteStore.getState();
    const avoid = avoidHighways ?? store.avoidHighways;

    store.setIsLoading(true);
    store.setError(null);
    store.setElevationProfile(null);

    try {
        let result;
        try {
            const data = await fetchFromValhalla(waypoints, routeType, avoid, elevation);
            result = parseValhallaResponse(data);
        } catch (err) {
            console.warn('Valhalla failed, trying OSRM...', err);
            const data = await fetchFromOSRM(waypoints);
            result = parseOSRMResponse(data);
        }

        store.setRouteGeometry(result.routeGeometry);
        store.setRouteSummary(result.summary);
        store.setManeuvers(result.maneuvers);
        store.setRouteCoordinates(result.coordinates);
        store.setIsBottomSheetOpen(true);

        // Snap markers to the road if Valhalla/OSRM returns distinct snapped locations
        if (result.snappedLocations) {
            const currentWaypoints = store.waypoints;
            result.snappedLocations.forEach((snappedPos: [number, number], i: number) => {
                const currentWp = currentWaypoints[i];
                if (currentWp) {
                    const dx = Math.abs(currentWp.position[0] - snappedPos[0]);
                    const dy = Math.abs(currentWp.position[1] - snappedPos[1]);
                    // Only update if difference > ~1 meter to avoid infinite update loops
                    if (dx > 0.00001 || dy > 0.00001) {
                        store.updateWaypointPosition(currentWp.id, snappedPos);
                    }
                }
            });
        }

        fetchElevationProfile(result.coordinates).then((profile) => {
            if (profile) store.setElevationProfile(profile);
        });

    } catch (error) {
        store.setError(error instanceof Error ? error.message : 'Erreur de calcul d\'itinéraire');
    } finally {
        store.setIsLoading(false);
    }
};
