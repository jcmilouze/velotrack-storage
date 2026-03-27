import { create } from 'zustand';
import type { Position } from 'geojson';
import type { ElevationProfile } from '../services/elevationService';

export interface RouteSummary {
    length: number;   // km
    time: number;     // seconds
    cost: number;
}

export interface RouteManeuver {
    instruction: string;
    length: number;
    time: number;
    type: number;
}

export type RouteType = 'road' | 'gravel';
export type Theme = 'light' | 'dark';
export type MapStyle = 'auto' | 'light' | 'dark' | 'satellite' | 'outdoors';
export type ClickMode = 'setA' | 'setB';

export interface Waypoint {
    id: string;
    position: Position;
    label: string;
    name?: string;
}

interface RouteState {
    waypoints: Waypoint[];
    routeGeometry: any | null;
    routeSummary: RouteSummary | null;
    maneuvers: RouteManeuver[];
    elevationProfile: ElevationProfile | null;
    routeCoordinates: number[][];
    routeType: RouteType;
    routeName: string;
    avoidHighways: boolean;      // F1 — évitement grands axes
    isLoading: boolean;
    error: string | null;
    hoveredPosition: [number, number] | null;
    theme: Theme;
    mapStyle: MapStyle;
    clickMode: ClickMode;
    isBottomSheetOpen: boolean;
    showLayers: boolean;         // F8 — display cycling network
    showLoop: boolean;

    addWaypoint: (pos: Position, name?: string) => void;
    removeWaypoint: (id: string) => void;
    updateWaypointPosition: (id: string, pos: Position) => void;
    snapWaypoints: (snappedLocations: [number, number][]) => void;
    undoWaypoint: () => void;
    setHoveredPosition: (pos: [number, number] | null) => void;
    setRouteGeometry: (geo: any | null) => void;
    setRouteSummary: (summary: RouteSummary | null) => void;
    setManeuvers: (maneuvers: RouteManeuver[]) => void;
    setElevationProfile: (profile: ElevationProfile | null) => void;
    setRouteCoordinates: (coords: number[][]) => void;
    setRouteType: (type: RouteType) => void;
    setRouteName: (name: string) => void;
    setAvoidHighways: (avoid: boolean) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setTheme: (theme: Theme) => void;
    setMapStyle: (style: MapStyle) => void;
    setClickMode: (mode: ClickMode) => void;
    setIsBottomSheetOpen: (open: boolean) => void;
    setShowLayers: (show: boolean) => void;
    setShowLoop: (show: boolean) => void;
    closeLoop: () => void;
    clearRoute: () => void;
    cleanupWaypoints: () => void;

    // Helpers
    get isLoopClosed(): boolean;
    get pointA(): Position | null;
    get pointB(): Position | null;
    setPointA: (pos: Position | null) => void;
    setPointB: (pos: Position | null) => void;
}

const generateId = () => {
    try {
        return crypto.randomUUID();
    } catch {
        // Fallback for non-secure contexts (HTTP) or old browsers
        return Math.random().toString(36).substring(2, 11);
    }
};

const LABELS = Array.from({ length: 100 }, (_, i) => (i + 1).toString());

const getIsClosed = (wps: Waypoint[]) => {
    if (wps.length < 3) return false;
    const start = wps[0].position;
    const end = wps[wps.length - 1].position;
    return Math.abs(start[0] - end[0]) < 0.0001 && Math.abs(start[1] - end[1]) < 0.0001;
};

const reLabelWaypoints = (wps: Waypoint[]) => wps.map((wp, i) => ({
    ...wp,
    label: LABELS[i] ?? (i + 1).toString()
}));

export const useRouteStore = create<RouteState>((set, get) => ({
    waypoints: [],
    routeGeometry: null,
    routeSummary: null,
    maneuvers: [],
    elevationProfile: null,
    routeCoordinates: [],
    routeType: 'road',
    routeName: 'Mon parcours',
    avoidHighways: true,    // default ON — safest for cyclists
    isLoading: false,
    error: null,
    hoveredPosition: null,
    theme: 'light',
    mapStyle: 'auto',
    clickMode: 'setA',
    isBottomSheetOpen: false,
    showLayers: false,
    showLoop: false,

    get isLoopClosed() {
        return getIsClosed(get().waypoints);
    },

    get pointA() { return get().waypoints[0]?.position ?? null; },
    get pointB() {
        const wps = get().waypoints;
        return wps.length >= 2 ? wps[wps.length - 1].position : null;
    },

    setPointA: (pos) => set((state) => {
        if (!pos) return { waypoints: state.waypoints.slice(1) };
        const wps = [...state.waypoints];
        const wp: Waypoint = { id: generateId(), position: pos, label: '1' };
        if (!wps.length) return { waypoints: [wp] };
        wps[0] = wp;
        return { waypoints: wps };
    }),

    setPointB: (pos) => set((state) => {
        if (!pos) {
            const wps = state.waypoints.length >= 2 ? state.waypoints.slice(0, -1) : state.waypoints;
            return { waypoints: wps };
        }
        const wps = [...state.waypoints];
        const label = LABELS[wps.length] ?? '2';
        const wp: Waypoint = { id: generateId(), position: pos, label };
        if (wps.length < 2) return { waypoints: [...wps, wp] };
        wps[wps.length - 1] = wp;
        return { waypoints: wps };
    }),

    addWaypoint: (pos, name) => set((state) => {
        const wps = [...state.waypoints];
        
        if (getIsClosed(wps)) {
            // Insert just before the final point
            wps.splice(wps.length - 1, 0, { id: generateId(), position: pos, label: '', name });
        } else {
            // Append at the end
            wps.push({ id: generateId(), position: pos, label: '', name });
        }

        return { waypoints: reLabelWaypoints(wps) };
    }),

    removeWaypoint: (id) => set((state) => {
        const filtered = state.waypoints.filter((w) => w.id !== id);
        if (filtered.length < 2) {
            return {
                waypoints: reLabelWaypoints(filtered), routeGeometry: null, routeSummary: null,
                maneuvers: [], elevationProfile: null, routeCoordinates: []
            };
        }
        return { waypoints: reLabelWaypoints(filtered) };
    }),

    updateWaypointPosition: (id, pos) => set((state) => {
        const wps = [...state.waypoints];
        const index = wps.findIndex(w => w.id === id);
        if (index === -1) return state;

        wps[index] = { ...wps[index], position: pos };

        if (getIsClosed(wps)) {
            if (index === 0) {
                wps[wps.length - 1] = { ...wps[wps.length - 1], position: pos };
            } else if (index === wps.length - 1) {
                wps[0] = { ...wps[0], position: pos };
            }
        }

        return { waypoints: wps };
    }),

    snapWaypoints: (snappedLocations) => set((state) => {
        const wps = [...state.waypoints];
        let changed = false;
        
        snappedLocations.forEach((snappedPos, i) => {
            const wp = wps[i];
            if (!wp) return;
            const dx = Math.abs(wp.position[0] - snappedPos[0]);
            const dy = Math.abs(wp.position[1] - snappedPos[1]);
            // Tolerance de ~1.1m pour éviter les micro-sauts invisibles
            if (dx > 0.00001 || dy > 0.00001) {
                wps[i] = { ...wp, position: snappedPos };
                changed = true;
            }
        });

        if (!changed) return state;

        if (getIsClosed(wps)) {
            const snappedStart = wps[0].position;
            wps[wps.length - 1] = { ...wps[wps.length - 1], position: snappedStart };
        }

        return { waypoints: wps };
    }),

    undoWaypoint: () => set((state) => {
        if (state.waypoints.length === 0) return state;
        const newWps = state.waypoints.slice(0, -1);
        if (newWps.length < 2) {
            return {
                waypoints: newWps, routeGeometry: null, routeSummary: null,
                maneuvers: [], elevationProfile: null, routeCoordinates: []
            };
        }
        return { waypoints: newWps };
    }),

    setHoveredPosition: (pos) => set({ hoveredPosition: pos }),

    setRouteGeometry: (geo) => set({ routeGeometry: geo }),
    setRouteSummary: (summary) => set({ routeSummary: summary }),
    setManeuvers: (maneuvers) => set({ maneuvers }),
    setElevationProfile: (profile) => set({ elevationProfile: profile }),
    setRouteCoordinates: (coords) => set({ routeCoordinates: coords }),
    setRouteType: (type) => set({ routeType: type }),
    setRouteName: (name) => set({ routeName: name }),
    setAvoidHighways: (avoid) => set({ avoidHighways: avoid }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setTheme: (theme) => set({ theme }),
    setMapStyle: (style) => set({ mapStyle: style }),
    setClickMode: (mode) => set({ clickMode: mode }),
    setIsBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
    setShowLayers: (show) => set({ showLayers: show }),
    setShowLoop: (show) => set({ showLoop: show }),

    closeLoop: () => set((state) => {
        const { waypoints } = state;
        if (waypoints.length < 2) return state;
        const start = waypoints[0];
        const end = waypoints[waypoints.length - 1];

        // If distance is very small, assume already closed
        const dx = start.position[0] - end.position[0];
        const dy = start.position[1] - end.position[1];
        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return state;

        const label = LABELS[waypoints.length] ?? (waypoints.length + 1).toString();
        const wp: Waypoint = { 
            id: generateId(), 
            position: [...start.position] as [number, number], 
            label, 
            name: `Retour vers ${start.name || 'le départ'}` 
        };
        return { waypoints: [...waypoints, wp] };
    }),

    clearRoute: () => set({
        waypoints: [],
        routeGeometry: null,
        routeSummary: null,
        maneuvers: [],
        elevationProfile: null,
        routeCoordinates: [],
        isLoading: false,
        error: null,
        isBottomSheetOpen: false,
        clickMode: 'setA',
        routeName: 'Mon parcours',
    }),

    cleanupWaypoints: () => set((state) => {
        if (state.waypoints.length < 3 || state.routeCoordinates.length === 0) return state;

        const { waypoints, routeCoordinates } = state;
        const cleanedWps: Waypoint[] = [waypoints[0]]; // Always keep start
        const isClosed = (state as any).isLoopClosed; // Accessing the helper via cast if needed or state
        const endIdx = isClosed ? waypoints.length - 2 : waypoints.length - 1;

        for (let i = 1; i <= endIdx; i++) {
            const wp = waypoints[i];
            const pos = wp.position;
            
            // On cherche la distance minimale de ce point par rapport au tracé RÉEL
            let minDist = Infinity;
            for (const coord of routeCoordinates) {
                const dx = pos[0] - coord[0];
                const dy = pos[1] - coord[1];
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < minDist) minDist = d;
            }

            // Seuil de ~200m pour détecter un point "orphelin" qui dévie trop du tracé fluide
            if (minDist < 0.002) {
                cleanedWps.push(wp);
            } else {
                console.log(`[VeloTrack] Cleanup: Removing redundant Waypoint ${wp.label} (U-turn detected)`);
            }
        }

        if (isClosed) {
            cleanedWps.push(waypoints[waypoints.length - 1]);
        } else if (endIdx < waypoints.length - 1) {
             cleanedWps.push(waypoints[waypoints.length - 1]);
        }

        if (cleanedWps.length === waypoints.length) return state;
        return { waypoints: reLabelWaypoints(cleanedWps) };
    }),
}));

