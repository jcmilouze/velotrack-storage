import { useEffect, useState } from 'react';
import { stravaAuth } from '../services/stravaService';

/**
 * Hook to handle Strava OAuth callback and connection state
 */
export const useStravaAuth = () => {
    const [isConnected, setIsConnected] = useState(!!stravaAuth.getToken());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
            setError(`Strava: ${errorParam}`);
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (code) {
            // Nettoyer l'URL immédiatement pour éviter un double-échange si le composant re-render
            window.history.replaceState({}, '', window.location.pathname);
            setIsLoading(true);
            stravaAuth.exchangeToken(code)
                .then(() => setIsConnected(true))
                .catch((err) => {
                    console.error(err);
                    setError(err.message);
                })
                .finally(() => setIsLoading(false));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        isConnected, isLoading, error, login: stravaAuth.login, logout: () => {
            stravaAuth.logout();
            setIsConnected(false);
        }
    };
};
