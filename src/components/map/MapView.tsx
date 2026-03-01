import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapContext } from '../../context/MapContext';
import { useRouteStore } from '../../store/useRouteStore';
import { calculateRoute } from '../../services/routingService';
import RouteLayer from './RouteLayer';
import CyclingLayer from './CyclingLayer';

const MARKER_COLORS: Record<string, string> = {
    '1': '#78BE20', // Vert pour le départ
    default: '#FC4C02', // Orange pour les étapes/arrivée
};

const MapView: React.FC = () => {
    const waypoints = useRouteStore((s) => s.waypoints);
    const addWaypoint = useRouteStore((s) => s.addWaypoint);
    const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
    const updateWaypointPosition = useRouteStore((s) => s.updateWaypointPosition);
    const hoveredPosition = useRouteStore((s) => s.hoveredPosition);
    const isLoading = useRouteStore((s) => s.isLoading);
    const error = useRouteStore((s) => s.error);
    const routeType = useRouteStore((s) => s.routeType);

    const { mapRef, isLoaded } = useMapContext();

    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const hoverMarkerRef = useRef<maplibregl.Marker | null>(null);

    const createMarkerEl = useCallback((label: string, id: string) => {
        const color = MARKER_COLORS[label] ?? MARKER_COLORS.default;
        const el = document.createElement('div');
        el.className = 'route-point-marker';
        // Let MapLibre handle positioning (anchor: center)
        el.style.cssText = `
            width: 44px; height: 44px;
            border-radius: 50%;
            background: ${color};
            border: 4px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.5), 4px 4px 0px #1e293b;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            user-select: none;
        `;
        const text = document.createElement('span');
        text.className = 'marker-label';
        text.textContent = label.length > 1 ? label.charAt(0) : label;
        text.style.cssText = `
            color: white; font-weight: 900;
            font-size: ${label.length > 1 ? '12px' : '16px'}; font-family: Inter, sans-serif;
            pointer-events: none;
            user-select: none;
        `;
        el.appendChild(text);
        el.title = "Glisser pour déplacer. Clic-droit pour supprimer.";

        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('dblclick', (e) => e.stopPropagation());

        // Handle quick deletion
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeWaypoint(id);
        });

        return el;
    }, [removeWaypoint, mapRef]);

    // Sync DOM markers with waypoints
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        const currentIds = new Set(waypoints.map((w) => w.id));

        // Remove markers for deleted waypoints
        markersRef.current.forEach((marker, id) => {
            if (!currentIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // Add/update markers for current waypoints
        waypoints.forEach((wp) => {
            const existingMarker = markersRef.current.get(wp.id);
            if (existingMarker) {
                existingMarker.setLngLat([wp.position[0], wp.position[1]]);
                // Update label text and color if store state changed (e.g. re-indexing)
                const el = existingMarker.getElement();
                const span = el.querySelector('.marker-label');
                if (span) span.textContent = wp.label;
                el.style.background = MARKER_COLORS[wp.label] ?? MARKER_COLORS.default;
            } else {
                const marker = new maplibregl.Marker({
                    element: createMarkerEl(wp.label, wp.id),
                    anchor: 'center',
                    draggable: true,
                })
                    .setLngLat([wp.position[0], wp.position[1]])
                    .addTo(map);

                marker.on('dragend', () => {
                    const lngLat = marker.getLngLat();
                    updateWaypointPosition(wp.id, [lngLat.lng, lngLat.lat]);
                });

                markersRef.current.set(wp.id, marker);
            }
        });
    }, [waypoints, isLoaded, createMarkerEl, mapRef, updateWaypointPosition]);

    // Update hover marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        if (hoveredPosition) {
            if (!hoverMarkerRef.current) {
                const el = document.createElement('div');
                el.style.cssText = `
                    width: 16px; height: 16px;
                    background: white;
                    border: 3px solid #FC4C02;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    pointer-events: none;
                `;
                hoverMarkerRef.current = new maplibregl.Marker({
                    element: el,
                    anchor: 'center'
                }).setLngLat(hoveredPosition).addTo(map);
            } else {
                hoverMarkerRef.current.setLngLat(hoveredPosition);
            }
        } else {
            if (hoverMarkerRef.current) {
                hoverMarkerRef.current.remove();
                hoverMarkerRef.current = null;
            }
        }
    }, [hoveredPosition, isLoaded, mapRef]);

    // Click handler — add waypoint
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        const handleClick = (e: maplibregl.MapMouseEvent) => {
            console.log('Map clicked at:', e.lngLat);
            if (isLoading) return;
            addWaypoint([e.lngLat.lng, e.lngLat.lat]);
        };

        map.on('click', handleClick);
        return () => { map.off('click', handleClick); };
    }, [mapRef, isLoading, addWaypoint, isLoaded]);

    // Auto-calculate route when we have ≥2 waypoints
    useEffect(() => {
        if (waypoints.length >= 2) {
            calculateRoute(waypoints.map((w) => w.position), routeType);
        }
    }, [waypoints, routeType]);

    // Cursor
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;
        map.getCanvas().style.cursor = isLoading ? 'wait' : 'crosshair';
    }, [isLoading, isLoaded, mapRef]);

    return (
        <>
            {isLoaded && mapRef.current && (
                <>
                    <CyclingLayer map={mapRef.current!} />
                    <RouteLayer map={mapRef.current!} />
                </>
            )}
            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg backdrop-blur-md max-w-xs text-center">
                    ⚠️ {error}
                </div>
            )}
        </>
    );
};

export default MapView;
