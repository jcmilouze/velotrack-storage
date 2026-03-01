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

const getValhallaCostingOptions = (routeType: RouteType, avoidHighways: boolean) => {
    // Features to exclude from any route
    const avoid_features = avoidHighways ? ['motorway', 'trunk', 'toll'] : ['motorway'];

    if (routeType === 'gravel') {
        /**
         * Gravel profile : routes asphaltées OK, chemins praticables privilégiés
         * - bicycle_type Cross = géométrie gravel (pneus larges, confort chemins)
         * - use_roads 0.5 = roads acceptées mais non prioritaires
         * - use_trails 0.5 = chemins et pistes forestières acceptés
         * - avoid_bad_surfaces 0.25 = accepte gravel/compacted, évite boue/impraticable
         * - use_hills 0.5 = accepte le relief naturel
         */
        return {
            costing: 'bicycle',
            costing_options: {
                bicycle: {
                    bicycle_type: 'Cross',
                    use_roads: 0.5,
                    use_hills: 0.5,
                    use_trails: 0.5,
                    avoid_bad_surfaces: 0.25,
                },
            },
            avoid_features,
        };
    }

    /**
     * Route profile : uniquement bitume strict
     * - bicycle_type Road = vélo de route (pneus fins)
     * - use_roads 1.0 = routes asphaltées UNIQUEMENT
     * - avoid_bad_surfaces 1.0 = fuit toute surface non asphaltée
     * - use_trails 0.0 = jamais de chemins/sentiers
     * - use_hills 0.3 = préfère éviter les cols
     */
    return {
        costing: 'bicycle',
        costing_options: {
            bicycle: {
                bicycle_type: 'Road',
                use_roads: 1.0,
                use_hills: 0.3,
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
    avoidHighways: boolean
) => {
    const query = {
        locations: waypoints.map((p) => ({ lat: p[1], lon: p[0] })),
        ...getValhallaCostingOptions(routeType, avoidHighways),
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

    return {
        routeGeometry: {
            type: 'Feature', properties: { summary },
            geometry: { type: 'LineString', coordinates: allCoords },
        },
        summary, maneuvers: allManeuvers, coordinates: allCoords,
    };
};

// ─── OSRM Fallback ────────────────────────────────────────────────────────

const fetchFromOSRM = async (pointA: Position, pointB: Position) => {
    if (!OSRM_FALLBACK_URL) throw new Error('No OSRM URL configured');
    const url = `${OSRM_FALLBACK_URL}/route/v1/cycling/${pointA[0]},${pointA[1]};${pointB[0]},${pointB[1]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM: ${res.status}`);
    return res.json();
};

const parseOSRMResponse = (data: any) => {
    if (!data?.routes?.length) throw new Error('No route in OSRM response');
    const route = data.routes[0];
    const coords: number[][] = route.geometry.coordinates;
    const summary: RouteSummary = { length: route.distance / 1000, time: route.duration, cost: 0 };
    return {
        routeGeometry: { type: 'Feature', properties: { summary }, geometry: { type: 'LineString', coordinates: coords } },
        summary,
        maneuvers: (route.legs?.[0]?.steps ?? []).map((s: any) => ({
            instruction: s.maneuver.type.replace(/_/g, ' '),
            length: s.distance / 1000, time: s.duration, type: 2,
        })),
        coordinates: coords,
    };
};

// ─── Public API ───────────────────────────────────────────────────────────

export const calculateRoute = async (
    waypoints: Position[],
    routeType: RouteType = 'road',
    avoidHighways?: boolean
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
            const data = await fetchFromValhalla(waypoints, routeType, avoid);
            result = parseValhallaResponse(data);
        } catch (err) {
            console.warn('Valhalla failed, trying OSRM...', err);
            const data = await fetchFromOSRM(waypoints[0], waypoints[waypoints.length - 1]);
            result = parseOSRMResponse(data);
        }

        store.setRouteGeometry(result.routeGeometry);
        store.setRouteSummary(result.summary);
        store.setManeuvers(result.maneuvers);
        store.setRouteCoordinates(result.coordinates);
        store.setIsBottomSheetOpen(true);

        fetchElevationProfile(result.coordinates).then((profile) => {
            if (profile) store.setElevationProfile(profile);
        });

    } catch (error) {
        store.setError(error instanceof Error ? error.message : 'Erreur de calcul d\'itinéraire');
    } finally {
        store.setIsLoading(false);
    }
};
