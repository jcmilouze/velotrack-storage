/**
 * Route Library Service — LocalStorage CRUD for saved cycling routes
 */

import type { RouteType } from '../store/useRouteStore';
import type { RouteSummary, RouteManeuver } from '../store/useRouteStore';
import type { ElevationProfile } from './elevationService';

export interface SavedRoute {
    id: string;
    name: string;
    routeType: RouteType;
    savedAt: string;           // ISO timestamp
    waypoints: Array<{ position: [number, number]; name?: string; label: string }>;
    routeGeometry: any | null;
    summary: RouteSummary | null;
    maneuvers: RouteManeuver[];
    elevationProfile: ElevationProfile | null;
    coordinates: number[][];   // for GPX re-export
}

const STORAGE_KEY = 'velotrack_library_v1';

const load = (): SavedRoute[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const persist = (routes: SavedRoute[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch {
        console.warn('LocalStorage quota exceeded');
    }
};

export const routeLibrary = {
    getAll: (): SavedRoute[] => load(),

    save: (route: Omit<SavedRoute, 'id' | 'savedAt'>): SavedRoute => {
        const routes = load();
        const saved: SavedRoute = {
            ...route,
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
        };
        routes.unshift(saved);          // newest first
        persist(routes.slice(0, 50));   // cap at 50 routes
        return saved;
    },

    delete: (id: string): void => {
        const routes = load().filter((r) => r.id !== id);
        persist(routes);
    },

    rename: (id: string, name: string): void => {
        const routes = load().map((r) => r.id === id ? { ...r, name } : r);
        persist(routes);
    },

    clear: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },
};
