import { useState, useCallback } from 'react';

export interface GeoPosition {
    lat: number;
    lng: number;
    accuracy: number;
}

interface UseGeolocationReturn {
    locate: () => void;
    position: GeoPosition | null;
    isLocating: boolean;
    error: string | null;
}

export const useGeolocation = (): UseGeolocationReturn => {
    const [position, setPosition] = useState<GeoPosition | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const locate = useCallback(() => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur.');
            return;
        }

        setIsLocating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
                setIsLocating(false);
            },
            (err) => {
                const messages: Record<number, string> = {
                    1: 'Permission de localisation refusée.',
                    2: 'Position indisponible.',
                    3: 'Délai de localisation dépassé.',
                };
                setError(messages[err.code] ?? 'Erreur de géolocalisation.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    return { locate, position, isLocating, error };
};
