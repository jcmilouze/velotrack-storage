import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { useRouteStore } from '../../store/useRouteStore';

interface Props {
    map: maplibregl.Map;
}

const CyclingLayer: React.FC<Props> = ({ map }) => {
    const showLayers = useRouteStore((s) => s.showLayers);

    useEffect(() => {
        const addLayer = () => {
            if (!map.getSource('cycling-network')) {
                map.addSource('cycling-network', {
                    type: 'raster',
                    tiles: ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; Waymarked Trails'
                });

                map.addLayer({
                    id: 'cycling-layer',
                    type: 'raster',
                    source: 'cycling-network',
                    minzoom: 0,
                    maxzoom: 20,
                    paint: { 'raster-opacity': 0.8 }
                });
            }
        };

        if (map.isStyleLoaded()) {
            addLayer();
        } else {
            map.once('load', addLayer);
        }

        // Re-add on style Change
        map.on('styledata', addLayer);
        return () => { map.off('styledata', addLayer); };
    }, [map]);

    useEffect(() => {
        if (!map.isStyleLoaded()) return;
        if (map.getLayer('cycling-layer')) {
            map.setLayoutProperty('cycling-layer', 'visibility', showLayers ? 'visible' : 'none');
        }
    }, [map, showLayers]);

    return null;
};

export default CyclingLayer;
