/**
 * URL Sharing Service
 * Encodes/decodes route state into URL query parameters for easy sharing.
 *
 * Format: ?wps=lng1,lat1,name1|lng2,lat2,name2&type=road|gravel&name=Mon%20parcours
 */

import type { RouteType } from '../store/useRouteStore';

export interface SharedRouteState {
    waypoints: Array<{ position: [number, number]; label: string; name?: string }>;
    routeType: RouteType;
    routeName: string;
}

const PRECISION = 6; // decimal places for coordinates

export const encodeRouteToUrl = (state: SharedRouteState): string => {
    const url = new URL(window.location.href);
    url.search = ''; // clear existing params

    const wps = state.waypoints
        .map((w) => {
            const parts = [
                w.position[0].toFixed(PRECISION),
                w.position[1].toFixed(PRECISION),
                encodeURIComponent(w.name ?? w.label),
            ];
            return parts.join(',');
        })
        .join('|');

    url.searchParams.set('wps', wps);
    url.searchParams.set('type', state.routeType);
    url.searchParams.set('name', state.routeName);

    return url.toString();
};

export const decodeRouteFromUrl = (): SharedRouteState | null => {
    const params = new URLSearchParams(window.location.search);
    const wpsRaw = params.get('wps');
    const type = params.get('type') as RouteType | null;
    const name = params.get('name');

    if (!wpsRaw) return null;

    try {
        const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const waypoints = wpsRaw.split('|').map((part, i) => {
            const [lng, lat, rawName] = part.split(',');
            return {
                position: [parseFloat(lng), parseFloat(lat)] as [number, number],
                label: LABELS[i] ?? `WP${i}`,
                name: rawName ? decodeURIComponent(rawName) : undefined,
            };
        });

        if (waypoints.length < 2) return null;

        return {
            waypoints,
            routeType: type ?? 'road',
            routeName: name ?? 'Parcours partagé',
        };
    } catch {
        return null;
    }
};

export const copyUrlToClipboard = async (state: SharedRouteState): Promise<void> => {
    const url = encodeRouteToUrl(state);
    await navigator.clipboard.writeText(url);
};
