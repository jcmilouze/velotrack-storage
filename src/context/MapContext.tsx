import React, { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const SATELLITE_STYLE = {
    version: 8,
    sources: {
        'esri-satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri World Imagery'
        }
    },
    layers: [{
        id: 'satellite',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22
    }]
};

const OUTDOORS_STYLE = {
    version: 8,
    sources: {
        'opentopo': {
            type: 'raster',
            tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenTopoMap'
        }
    },
    layers: [{
        id: 'outdoors',
        type: 'raster',
        source: 'opentopo',
        minzoom: 0,
        maxzoom: 22
    }]
};

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
    mapStyle?: 'auto' | 'light' | 'dark' | 'satellite' | 'outdoors';
}

const getStyle = (theme: 'light' | 'dark', mapStyle: 'auto' | 'light' | 'dark' | 'satellite' | 'outdoors') => {
    if (mapStyle === 'satellite') return SATELLITE_STYLE as maplibregl.StyleSpecification;
    if (mapStyle === 'outdoors') return OUTDOORS_STYLE as maplibregl.StyleSpecification;
    if (mapStyle === 'light') return LIGHT_STYLE;
    if (mapStyle === 'dark') return DARK_STYLE;
    return theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
};

export const MapProvider: React.FC<MapProviderProps> = ({ children, theme, mapStyle = 'auto' }) => {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const lastStyleRef = useRef<string | maplibregl.StyleSpecification>(getStyle(theme, mapStyle));

    useEffect(() => {
        // Ensure DOM element is modern/mounted
        const container = document.getElementById('map-container');
        if (!container || mapRef.current) return;

        const map = new maplibregl.Map({
            container: 'map-container',
            style: getStyle(theme, mapStyle),
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
        
        const newStyle = getStyle(theme, mapStyle);
        if (newStyle !== lastStyleRef.current) {
            map.setStyle(newStyle);
            lastStyleRef.current = newStyle;
        }
    }, [theme, mapStyle, isLoaded]);

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

        const isMobile = window.innerWidth < 768;
        map.fitBounds(bounds, {
            padding: {
                top: 80,
                bottom: isMobile ? 120 : 380,
                left: isMobile ? 40 : 80,
                right: isMobile ? 40 : 80
            },
            duration: 1200
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
