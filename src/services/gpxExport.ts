/**
 * GPX Export Service
 * Generates a GPX 1.1 file compatible with Garmin Edge and other GPS devices.
 * Includes track points with elevation data when available.
 */

import type { RouteSummary } from '../store/useRouteStore';
import type { ElevationProfile } from './elevationService';
import { formatDistance, formatDuration } from './routingService';

interface GpxExportOptions {
    routeName: string;
    coordinates: number[][];          // [lng, lat] pairs
    summary: RouteSummary | null;
    elevationProfile: ElevationProfile | null;
    routeType: 'road' | 'gravel';
}

const escapeXml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const getElevationForIndex = (
    index: number,
    totalPoints: number,
    profile: ElevationProfile | null
): string => {
    if (!profile?.samples?.length) return '';
    if (totalPoints <= 1 || profile.samples.length <= 1) {
        const ele = profile.samples[0] ?? 0;
        return `\n        <ele>${ele.toFixed(1)}</ele>`;
    }
    const sampleIndex = Math.round((index / (totalPoints - 1)) * (profile.samples.length - 1));
    const ele = profile.samples[Math.min(sampleIndex, profile.samples.length - 1)];
    return `\n        <ele>${ele.toFixed(1)}</ele>`;
};

export const generateGpx = (options: GpxExportOptions): string => {
    const { routeName, coordinates, summary, elevationProfile, routeType } = options;

    const now = new Date().toISOString();
    const safeName = escapeXml(routeName || 'VeloTrack Route');
    const description = summary
        ? escapeXml(`${formatDistance(summary.length)} · ${formatDuration(summary.time)} · ${routeType === 'gravel' ? 'Gravel' : 'Route'}`)
        : escapeXml('VeloTrack cycling route');

    // --- Track points (continuous GPS trace for Garmin Course) ---
    const trkpts = coordinates.map((coord, i) => {
        const [lng, lat] = coord;
        const ele = getElevationForIndex(i, coordinates.length, elevationProfile);
        return `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">${ele}
      </trkpt>`;
    }).join('\n');

    // --- Route waypoints (key turning points — every ~500m for readability) ---
    const step = Math.max(1, Math.floor(coordinates.length / 50));
    const waypointIndices = new Set<number>();
    for (let i = 0; i < coordinates.length; i += step) waypointIndices.add(i);
    waypointIndices.add(0);
    waypointIndices.add(coordinates.length - 1);

    const rtepts = Array.from(waypointIndices).sort((a, b) => a - b).map((i) => {
        const [lng, lat] = coordinates[i];
        const ele = getElevationForIndex(i, coordinates.length, elevationProfile);
        const label = i === 0 ? 'Départ' : i === coordinates.length - 1 ? 'Arrivée' : `WP${i}`;
        return `    <rtept lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">
      <name>${escapeXml(label)}</name>${ele}
    </rtept>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="VeloTrack — https://velotrack.app"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">

  <metadata>
    <name>${safeName}</name>
    <desc>${description}</desc>
    <author><name>VeloTrack</name></author>
    <time>${now}</time>
    <keywords>cycling,${routeType},garmin,gpx</keywords>
  </metadata>

  <!-- Route: key waypoints (Garmin navigation) -->
  <rte>
    <name>${safeName}</name>
    <desc>${description}</desc>
${rtepts}
  </rte>

  <!-- Track: full GPS trace (Garmin course / breadcrumb) -->
  <trk>
    <name>${safeName}</name>
    <desc>${description}</desc>
    <type>${routeType === 'gravel' ? 'Gravel Cycling' : 'Road Cycling'}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>

</gpx>`;
};

export const downloadGpx = (options: GpxExportOptions): void => {
    const gpxContent = generateGpx(options);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safeName = (options.routeName || 'velotrack-route')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
