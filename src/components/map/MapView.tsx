import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapContext } from '../../context/MapContext';
import { useRouteStore } from '../../store/useRouteStore';
import { calculateRoute } from '../../services/routingService';
import RouteLayer from './RouteLayer';
import CyclingLayer from './CyclingLayer';
import SegmentLayer from './SegmentLayer';

const getMarkerColor = (index: number, total: number) => {
    if (index === 0) return '#10b981'; // Start: Green
    if (index === total - 1) return '#ef4444'; // End: Red
    return '#3b82f6'; // Intermediate: Blue
};

const MapView: React.FC = () => {
    const {
        waypoints,
        addWaypoint,
        updateWaypointPosition,
        removeWaypoint,
        setRouteGeometry,
        isLoading,
        routeType,
        avoidHighways,
        theme,
        hoveredPosition,
    } = useRouteStore();

    const { mapRef, isLoaded } = useMapContext();
    const [mapInstance, setMapInstance] = React.useState<maplibregl.Map | null>(null);

    useEffect(() => {
        if (isLoaded && mapRef.current) {
            setMapInstance(mapRef.current);
        } else {
            setMapInstance(null);
        }
    }, [isLoaded, mapRef]);

    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const draggingMarkersRef = useRef<Set<string>>(new Set());
    const markerPositionsRef = useRef<Map<string, [number, number]>>(new Map());
    const hoverMarkerRef = useRef<maplibregl.Marker | null>(null);

    // F1 — Fix Cursor: Mouse should be a crosshair for precise clicking, not a hand (pointer)
    useEffect(() => {
        if (!mapInstance) return;

        const canvas = mapInstance.getCanvas();
        const setCrosshair = () => { canvas.style.cursor = 'crosshair'; };
        const setGrabbing = () => { canvas.style.cursor = 'grabbing'; };

        setCrosshair();

        mapInstance.on('mousedown', setGrabbing);
        mapInstance.on('mouseup', setCrosshair);
        mapInstance.on('mouseenter', setCrosshair);

        return () => {
            mapInstance.off('mousedown', setGrabbing);
            mapInstance.off('mouseup', setCrosshair);
            mapInstance.off('mouseenter', setCrosshair);
            canvas.style.cursor = '';
        };
    }, [mapInstance]);

    const createMarkerEl = useCallback((label: string, id: string, color: string) => {
        const el = document.createElement('div');
        el.className = 'custom-marker route-point-marker';
        el.style.position = 'absolute'; // Ensure it's not in flow
        el.innerHTML = `
            <div style="
                background: ${color};
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 0 10px ${color}88;
                border: 2px solid white;
                cursor: grab;
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            ">${label}</div>
        `;

        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });

        // Prevention of context menu on right click to allow waypoint removal
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            removeWaypoint(id);
        });

        return el;
    }, [removeWaypoint]);

    // Update markers when waypoints change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        // Current waypoint IDs
        const currentIds = new Set(waypoints.map(wp => wp.id));

        // Remove markers for deleted waypoints
        markersRef.current.forEach((marker, id) => {
            if (!currentIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
                markerPositionsRef.current.delete(id);
            }
        });

        // Marker Synchronization
            waypoints.forEach((wp, index) => {
            const [lng, lat] = wp.position;
            if (isNaN(lng) || isNaN(lat)) return;

            const existingMarker = markersRef.current.get(wp.id);
            const color = getMarkerColor(index, waypoints.length);
            const label = wp.label || String(index + 1);

            if (existingMarker) {
                if (draggingMarkersRef.current.has(wp.id)) return;

                try {
                    // Only move marker if store position actually changed vs what we last set
                    const lastPos = markerPositionsRef.current.get(wp.id);
                    const storeChanged = !lastPos || lastPos[0] !== lng || lastPos[1] !== lat;
                    if (storeChanged) {
                        existingMarker.setLngLat({ lng, lat });
                        markerPositionsRef.current.set(wp.id, [lng, lat]);
                    }

                    // Update DOM content
                    const inner = existingMarker.getElement().querySelector('div');
                    if (inner) {
                        inner.innerText = label;
                        inner.style.background = color;
                        inner.style.boxShadow = `0 4px 6px rgba(0,0,0,0.1), 0 0 10px ${color}88`;
                    }
                } catch (e) {
                    console.debug('[VeloTrack] Marker sync deferred:', e);
                }
            } else {
                try {
                    const el = createMarkerEl(label, wp.id, color);
                    const marker = new maplibregl.Marker({
                        element: el,
                        draggable: true,
                        anchor: 'center'
                    })
                    .setLngLat([lng, lat])
                    .addTo(map);

                    // Record position so subsequent effect runs don't re-set it
                    markerPositionsRef.current.set(wp.id, [lng, lat]);

                    marker.on('dragstart', () => {
                        draggingMarkersRef.current.add(wp.id);
                        if (el.firstChild instanceof HTMLElement) el.firstChild.style.cursor = 'grabbing';
                    });

                    marker.on('dragend', () => {
                        draggingMarkersRef.current.delete(wp.id);
                        if (el.firstChild instanceof HTMLElement) el.firstChild.style.cursor = 'grab';
                        const newPos = marker.getLngLat();
                        updateWaypointPosition(wp.id, [newPos.lng, newPos.lat]);
                    });

                    markersRef.current.set(wp.id, marker);
                } catch (e) {
                    console.error('[VeloTrack] Failed to create marker:', e);
                }
            }
        });
    }, [waypoints, isLoaded, createMarkerEl, updateWaypointPosition, mapRef]);

    // Hover marker synced with elevation chart
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        if (!hoveredPosition) {
            hoverMarkerRef.current?.remove();
            hoverMarkerRef.current = null;
            return;
        }

        const [lng, lat] = hoveredPosition;
        if (hoverMarkerRef.current) {
            hoverMarkerRef.current.setLngLat([lng, lat]);
        } else {
            const el = document.createElement('div');
            el.style.cssText = `
                width: 12px; height: 12px; border-radius: 50%;
                background: #FC4C02; border: 2px solid white;
                box-shadow: 0 0 6px rgba(252,76,2,0.8);
                pointer-events: none;
            `;
            hoverMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([lng, lat])
                .addTo(map);
        }
    }, [hoveredPosition, isLoaded, mapRef]);

    // Handle map clicks & hover
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;

        const handleClick = (e: maplibregl.MapMouseEvent) => {
            console.log('Map clicked at:', e.lngLat);
            if (isLoading) return;
            addWaypoint([e.lngLat.lng, e.lngLat.lat]);
        };

        map.on('click', handleClick);

        return () => {
            map.off('click', handleClick);
        };
    }, [addWaypoint, isLoaded, isLoading, mapRef]);

    // Auto-calculate route when waypoints or preferences change
    useEffect(() => {
        if (waypoints.length < 2) {
            setRouteGeometry(null);
            return;
        }

        const triggerRecalculate = async () => {
            try {
                // positions are extracted correctly
                const positions = waypoints.map(wp => wp.position);
                // No need to pass routeType/avoidHighways as calculateRoute now gets them from store
                await calculateRoute(positions);
            } catch (error) {
                console.error('[VeloTrack] Route calculation failed:', error);
            }
        };

        const timeout = setTimeout(triggerRecalculate, 400); // debounce to avoid spamming APIs during drag
        return () => clearTimeout(timeout);
    }, [waypoints, routeType, avoidHighways, setRouteGeometry]);

    // Handle hover states from elsewhere (e.g. waypoint list)
    // Removed direct hoveredPosition store access to simplify,
    // in a real app, this would use a more sophisticated hover system.

    const isDark = theme === 'dark';
    const hasStart = waypoints.length > 0;

    return (
        <>
            {mapInstance && (
                <>
                    <RouteLayer map={mapInstance} />
                    <CyclingLayer map={mapInstance} />
                    <SegmentLayer map={mapInstance} />
                </>
            )}
            {/* Click mode indicator - moved higher on mobile to avoid iOS overlap issues */}
            {!isLoading && (
                <div className="absolute bottom-40 md:bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] transition-all ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800'}`}>
                        {!hasStart ? '📍 Cliquez pour poser le départ' : '➕ Cliquez pour ajouter une étape'}
                    </div>
                </div>
            )}
        </>
    );
};

export default MapView;
