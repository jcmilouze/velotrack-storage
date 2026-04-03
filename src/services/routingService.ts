import polyline from '@mapbox/polyline';
import type { Position } from 'geojson';
import { useRouteStore } from '../store/useRouteStore';
import type { RouteSummary, RouteManeuver, RouteType } from '../store/useRouteStore';
import { fetchElevationProfile } from './elevationService';

const VALHALLA_URL = import.meta.env.VITE_VALHALLA_URL;
const OSRM_FALLBACK_URL = import.meta.env.VITE_OSRM_URL;

// --- CONFIGURATION MOTEURS DE CALCUL ---
// Webhook n8n servant de passerelle vers le container BRouter sur le VPS
const VPS_BROUTER_URL = import.meta.env.VITE_N8N_ROUTING_URL || 'https://n8n.bessacvps.fr/webhook/velotrack/routing';
// Fallback local optionnel
const LOCAL_BROUTER_URL = 'http://localhost:17777/brouter';

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
        locations: waypoints.map((p) => {
            return {
                lat: p[1],
                lon: p[0],
                // Utilisation de 'break' pour tous les points afin d'autoriser les demi-tours
                // en cas d'impasse (évite l'erreur 400 Bad Request si 'through' échoue)
                type: 'break',
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

    const snappedLocations: [number, number][] = [];
    if (data.trip.legs.length > 0) {
        // The first location is the start of the first leg
        const firstCoords = polyline.decode(data.trip.legs[0].shape, 6);
        snappedLocations.push([firstCoords[0][1], firstCoords[0][0]]);
        
        // Subsequent locations are the ends of each leg
        for (const leg of data.trip.legs) {
            const coords = polyline.decode(leg.shape, 6);
            snappedLocations.push([coords[coords.length - 1][1], coords[coords.length - 1][0]]);
        }
    }

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

// ─── BRouter ──────────────────────────────────────────────────────────────

const getBRouterProfile = (routeType: RouteType) => {
    // Profil custom "gravel-master" (priorité graviers/chemins) ou "fastbike" (route)
    return routeType === 'gravel' ? 'gravel-master' : 'fastbike';
};

const fetchFromBRouter = async (waypoints: Position[], routeType: RouteType) => {
    const profile = getBRouterProfile(routeType);
    const lonlats = waypoints.map((p) => `${p[0]},${p[1]}`).join('|');
    const query = `?lonlats=${lonlats}&profile=${profile}&format=geojson`;

    // 1. Essai sur le VPS (n8n + BRouter Docker)
    try {
        console.debug(`[VeloTrack] Tentative Routage VPS...`, { profile });
        const response = await fetch(`${VPS_BROUTER_URL}${query}`);
        if (response.ok) return response.json();
        throw new Error(`VPS Status: ${response.status}`);
    } catch (vpsErr) {
        console.warn(`[VeloTrack] VPS BRouter indisponible, repli LOCAL...`, vpsErr);
        
        // 2. Repli sur le BRouter Local (localhost)
        try {
            const localResponse = await fetch(`${LOCAL_BROUTER_URL}${query}`);
            if (localResponse.ok) return localResponse.json();
            throw new Error(`Local Status: ${localResponse.status}`);
        } catch (localErr) {
            console.error(`[VeloTrack] Échec de tous les moteurs BRouter.`, { vps: vpsErr, local: localErr });
            throw new Error('Moteur BRouter (VPS & Local) hors-ligne.');
        }
    }
};

const parseBRouterResponse = (data: any) => {
    if (!data?.features?.length) throw new Error('No route in BRouter response');

    const feature = data.features[0];
    
    // BRouter can return LineString or MultiLineString
    let coords: number[][] = [];
    if (feature.geometry.type === 'MultiLineString') {
        // Flatten array of arrays of coordinates
        coords = feature.geometry.coordinates.flat();
    } else {
        coords = feature.geometry.coordinates; // [lng, lat][]
    }
    
    const trackProps = feature.properties || {};

    const distanceKm = (parseInt(trackProps['track-length']) || 0) / 1000;
    const timeSecs = parseInt(trackProps['total-time']) || 0;
    const cost = parseInt(trackProps['cost']) || 0;

    const summary: RouteSummary = { length: distanceKm, time: timeSecs, cost };

    return {
        routeGeometry: feature,
        summary,
        maneuvers: [], // BRouter GeoJSON doesn't provide rich text maneuvers natively via /brouter
        coordinates: coords,
        snappedLocations: undefined,
    };
};

// ─── Public API ───────────────────────────────────────────────────────────

export const getRouteData = async (
    waypoints: Position[],
    routeType: RouteType,
    avoidHighways: boolean,
    elevation?: 'flat' | 'hilly' | 'mountain'
) => {
    let lastError: any = null;

    // 1. Priorité BRouter (Gravel Master !)
    // Utilisé en priorité pour le mode 'gravel' via VPS ou Local
    if (routeType === 'gravel') {
        try {
            console.log(`[VeloTrack] BRouter: Routage GRAVEL local...`);
            const data = await fetchFromBRouter(waypoints, routeType);
            return parseBRouterResponse(data);
        } catch (err) {
            lastError = err;
            console.warn('[VeloTrack] BRouter failed, trying Valhalla fallback...', err);
        }
    }

    // 2. Fallback Valhalla (ou priorité Road)
    try {
        console.log(`[VeloTrack] Valhalla: Routage ${routeType.toUpperCase()}...`);
        const data = await fetchFromValhalla(waypoints, routeType, avoidHighways, elevation);
        return parseValhallaResponse(data);
    } catch (err) {
        lastError = err;
        console.warn(`[VeloTrack] Valhalla failed or blocked, trying OSRM...`, err);
    }

    // 3. Fallback OSRM (Dernier recours, routage basique)
    try {
        console.log(`[VeloTrack] OSRM: Routage de secours...`);
        const data = await fetchFromOSRM(waypoints);
        return parseOSRMResponse(data);
    } catch (err) {
        console.error('[VeloTrack] All routing engines failed', { valhalla: lastError, osrm: err });
        throw new Error('Impossible de calculer l\'itinéraire (Serveurs saturés ou hors-ligne)');
    }
};

export const commitRouteData = async (result: any) => {
    const store = useRouteStore.getState();
    
    store.setRouteGeometry(result.routeGeometry);
    store.setRouteSummary(result.summary);
    store.setManeuvers(result.maneuvers);
    store.setRouteCoordinates(result.coordinates);
    
    // Optional: Snap markers to the road if the engine provides refined locations
    if (result.snappedLocations) {
        store.snapWaypoints(result.snappedLocations);
    }

    // Fetch elevation asynchronously
    try {
        const profile = await fetchElevationProfile(result.coordinates);
        if (profile) store.setElevationProfile(profile);
    } catch (e) {
        console.warn('[VeloTrack] Elevation sync failed:', e);
    }
};

/**
 * Main entry point for route calculation.
 * Derives parameters from store if not provided.
 */
export const calculateRoute = async (
    waypoints: Position[],
    overrides?: {
        routeType?: RouteType;
        avoidHighways?: boolean;
        elevation?: 'flat' | 'hilly' | 'mountain';
    }
): Promise<void> => {
    if (waypoints.length < 2) return;

    const store = useRouteStore.getState();
    const type = overrides?.routeType ?? store.routeType;
    const avoid = overrides?.avoidHighways ?? store.avoidHighways;
    const elevation = overrides?.elevation; // Optional

    store.setIsLoading(true);
    store.setError(null);

    try {
        const result = await getRouteData(waypoints, type, avoid, elevation);
        await commitRouteData(result);
    } catch (error) {
        store.setError(error instanceof Error ? error.message : 'Erreur de calcul d\'itinéraire');
    } finally {
        store.setIsLoading(false);
    }
};
