import React, { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapContextValue {
    mapRef: React.MutableRefObject<maplibregl.Map | null>;
    isLoaded: boolean;
    zoomIn: () => void;
    zoomOut: () => void;
    flyTo: (lng: number, lat: number, zoom?: number) => void;
    fitBounds: (coords: number[][]) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
    children: ReactNode;
    theme: 'light' | 'dark';
}

export const MapProvider: React.FC<MapProviderProps> = ({ children, theme }) => {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Ensure DOM element is modern/mounted
        const container = document.getElementById('map-container');
        if (!container || mapRef.current) return;

        const map = new maplibregl.Map({
            container: 'map-container',
            style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
            center: [2.3522, 48.8566],
            zoom: 12,
            trackResize: true,
        });

        const handleResize = () => {
            if (mapRef.current) mapRef.current.resize();
        };
        window.addEventListener('resize', handleResize);

        map.on('load', () => {
            setIsLoaded(true);
            setTimeout(() => map.resize(), 100); // multiple resize checks to be safe
        });
        mapRef.current = map;

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            setIsLoaded(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;
        map.setStyle(theme === 'dark' ? DARK_STYLE : LIGHT_STYLE);
    }, [theme, isLoaded]);

    const zoomIn = useCallback(() => mapRef.current?.zoomIn({ duration: 250 }), []);
    const zoomOut = useCallback(() => mapRef.current?.zoomOut({ duration: 250 }), []);
    const flyTo = useCallback((lng: number, lat: number, zoom = 15) => {
        mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1000 });
    }, []);

    const fitBounds = useCallback((coords: number[][]) => {
        const map = mapRef.current;
        if (!map || coords.length === 0) return;

        const bounds = new maplibregl.LngLatBounds();
        coords.forEach((coord) => bounds.extend(coord as [number, number]));

        map.fitBounds(bounds, {
            padding: { top: 100, bottom: 350, left: 50, right: 50 },
            duration: 1000
        });
    }, []);

    return (
        <MapContext.Provider value={{ mapRef, isLoaded, zoomIn, zoomOut, flyTo, fitBounds }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = (): MapContextValue => {
    const ctx = useContext(MapContext);
    if (!ctx) throw new Error('useMapContext must be used inside <MapProvider>');
    return ctx;
};
