import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const useMap = (containerId: string, theme: 'light' | 'dark' = 'light') => {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!containerId || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerId,
            style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
            center: [2.3522, 48.8566],
            zoom: 12,
        });

        map.on('load', () => setIsLoaded(true));
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId]);

    // Switch style on theme change without recreating the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;
        map.setStyle(theme === 'dark' ? DARK_STYLE : LIGHT_STYLE);
    }, [theme, isLoaded]);

    // Zoom helpers
    const zoomIn = useCallback(() => {
        mapRef.current?.zoomIn({ duration: 250 });
    }, []);

    const zoomOut = useCallback(() => {
        mapRef.current?.zoomOut({ duration: 250 });
    }, []);

    // Fly to a position
    const flyTo = useCallback((lng: number, lat: number, zoom = 15) => {
        mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1000 });
    }, []);

    return { mapRef, isLoaded, zoomIn, zoomOut, flyTo };
};
