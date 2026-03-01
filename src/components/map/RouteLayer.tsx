import React, { useEffect } from 'react';
import { useRouteStore } from '../../store/useRouteStore';
import maplibregl from 'maplibre-gl';

interface Props {
    map: maplibregl.Map;
}

const ROUTE_COLOR = '#FC4C02';
const ROUTE_OUTLINE_COLOR = '#B83501';

const RouteLayer: React.FC<Props> = ({ map }) => {
    const { routeGeometry } = useRouteStore();

    // Initialize sources & layers once
    useEffect(() => {
        const addLayers = () => {
            // --- Route source ---
            if (!map.getSource('route-source')) {
                map.addSource('route-source', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });

                // Outline (casing) for contrast
                map.addLayer({
                    id: 'route-line-outline',
                    type: 'line',
                    source: 'route-source',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': ROUTE_OUTLINE_COLOR,
                        'line-width': 8,
                        'line-opacity': 0.6,
                    },
                });

                // Main route line
                map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route-source',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': ROUTE_COLOR,
                        'line-width': 5,
                    },
                });
            }
        };

        if (map.isStyleLoaded()) {
            addLayers();
        } else {
            map.once('load', addLayers);
        }

        // Re-add layers when the style changes (e.g. light/dark switch)
        map.on('styledata', addLayers);
        return () => { map.off('styledata', addLayers); };
    }, [map]);

    // Update route data reactively
    useEffect(() => {
        if (!map.isStyleLoaded()) return;

        const routeSource = map.getSource('route-source') as maplibregl.GeoJSONSource | undefined;
        if (routeSource) {
            routeSource.setData(routeGeometry ?? { type: 'FeatureCollection', features: [] });
        }
    }, [map, routeGeometry]);

    return null;
};

export default RouteLayer;
