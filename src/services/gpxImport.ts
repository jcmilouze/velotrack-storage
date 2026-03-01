/**
 * GPX Import Service — parses GPX 1.1 files into GeoJSON + waypoints
 */

import type { Waypoint } from '../store/useRouteStore';

export interface ImportedRoute {
    name: string;
    waypoints: Omit<Waypoint, 'id'>[];
    coordinates: number[][]; // [lng, lat(, ele)]
    geometry: GeoJSON.Feature<GeoJSON.LineString>;
    hasElevation: boolean;
}

const getText = (el: Element, tag: string): string =>
    el.querySelector(tag)?.textContent?.trim() ?? '';

const parsePoints = (elements: NodeListOf<Element>): Array<[number, number, number?]> =>
    Array.from(elements).map((pt) => {
        const lat = parseFloat(pt.getAttribute('lat') ?? '0');
        const lon = parseFloat(pt.getAttribute('lon') ?? '0');
        const ele = pt.querySelector('ele');
        return ele ? [lon, lat, parseFloat(ele.textContent ?? '0')] : [lon, lat];
    });

export const parseGpxFile = (file: File): Promise<ImportedRoute> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const xml = new DOMParser().parseFromString(
                    e.target?.result as string,
                    'application/xml'
                );

                if (xml.querySelector('parsererror')) {
                    throw new Error('Fichier GPX invalide ou corrompu.');
                }

                const name =
                    getText(xml.documentElement, 'metadata > name') ||
                    getText(xml.documentElement, 'trk > name') ||
                    getText(xml.documentElement, 'rte > name') ||
                    file.name.replace(/\.gpx$/i, '');

                // Prefer track points (continuous GPS trace) over route points
                let points = parsePoints(xml.querySelectorAll('trkpt'));
                const hasElevation = !!xml.querySelector('trkpt > ele');

                // Fallback to route points
                if (!points.length) {
                    points = parsePoints(xml.querySelectorAll('rtept'));
                }

                if (!points.length) {
                    throw new Error('Aucun point GPS trouvé dans le fichier GPX.');
                }

                const coordinates = points as number[][];

                const geometry: GeoJSON.Feature<GeoJSON.LineString> = {
                    type: 'Feature',
                    properties: { name },
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates.map(([lng, lat]) => [lng, lat]),
                    },
                };

                // Extract named route points
                const rtePoints = Array.from(xml.querySelectorAll('rtept'));
                const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                const waypoints: Omit<Waypoint, 'id'>[] = rtePoints.length
                    ? rtePoints.map((pt, i) => ({
                        position: [
                            parseFloat(pt.getAttribute('lon') ?? '0'),
                            parseFloat(pt.getAttribute('lat') ?? '0'),
                        ] as [number, number],
                        label: LABELS[i] ?? `WP${i}`,
                        name: getText(pt, 'name') || undefined,
                    }))
                    : [
                        { position: coordinates[0] as [number, number], label: 'A', name: 'Départ' },
                        { position: coordinates[coordinates.length - 1] as [number, number], label: 'B', name: 'Arrivée' },
                    ];

                resolve({ name, waypoints, coordinates, geometry, hasElevation });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
        reader.readAsText(file, 'UTF-8');
    });
};
