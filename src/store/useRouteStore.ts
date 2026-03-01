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
    theme: Theme;
    clickMode: ClickMode;
    isBottomSheetOpen: boolean;
    showLayers: boolean;         // F8 — display cycling network

    addWaypoint: (pos: Position, name?: string) => void;
    removeWaypoint: (id: string) => void;
    updateWaypointPosition: (id: string, pos: Position) => void;
    undoWaypoint: () => void;
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
    setClickMode: (mode: ClickMode) => void;
    setIsBottomSheetOpen: (open: boolean) => void;
    setShowLayers: (show: boolean) => void;
    closeLoop: () => void;
    clearRoute: () => void;

    // Compat shims
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

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
    theme: 'light',
    clickMode: 'setA',
    isBottomSheetOpen: false,
    showLayers: false,

    get pointA() { return get().waypoints[0]?.position ?? null; },
    get pointB() {
        const wps = get().waypoints;
        return wps.length >= 2 ? wps[wps.length - 1].position : null;
    },

    setPointA: (pos) => set((state) => {
        if (!pos) return { waypoints: state.waypoints.slice(1) };
        const wps = [...state.waypoints];
        const wp: Waypoint = { id: generateId(), position: pos, label: 'A' };
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
        const label = LABELS[wps.length] ?? 'B';
        const wp: Waypoint = { id: generateId(), position: pos, label };
        if (wps.length < 2) return { waypoints: [...wps, wp] };
        wps[wps.length - 1] = wp;
        return { waypoints: wps };
    }),

    addWaypoint: (pos, name) => set((state) => {
        const label = LABELS[state.waypoints.length] ?? `WP${state.waypoints.length}`;
        return { waypoints: [...state.waypoints, { id: generateId(), position: pos, label, name }] };
    }),

    removeWaypoint: (id) => set((state) => {
        const newWps = state.waypoints
            .filter((w) => w.id !== id)
            .map((w, i) => ({ ...w, label: LABELS[i] ?? `WP${i}` }));
        if (newWps.length < 2) {
            return {
                waypoints: newWps, routeGeometry: null, routeSummary: null,
                maneuvers: [], elevationProfile: null, routeCoordinates: []
            };
        }
        return { waypoints: newWps };
    }),

    updateWaypointPosition: (id, pos) => set((state) => ({
        waypoints: state.waypoints.map((w) => w.id === id ? { ...w, position: pos } : w)
    })),

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
    setClickMode: (mode) => set({ clickMode: mode }),
    setIsBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
    setShowLayers: (show) => set({ showLayers: show }),

    closeLoop: () => set((state) => {
        const { waypoints } = state;
        if (waypoints.length < 2) return state;
        const start = waypoints[0];
        const end = waypoints[waypoints.length - 1];

        // If distance is very small, assume already closed
        const dx = start.position[0] - end.position[0];
        const dy = start.position[1] - end.position[1];
        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return state;

        const label = LABELS[waypoints.length] ?? `B`;
        const wp: Waypoint = { id: generateId(), position: start.position, label, name: 'Retour départ' };
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
}));
