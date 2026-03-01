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

        if (code && !isConnected) {
            setIsLoading(true);
            stravaAuth.exchangeToken(code)
                .then(() => {
                    setIsConnected(true);
                    window.history.replaceState({}, '', window.location.pathname);
                })
                .catch((err) => {
                    console.error(err);
                    setError(err.message);
                })
                .finally(() => setIsLoading(false));
        }
    }, [isConnected]);

    return {
        isConnected, isLoading, error, login: stravaAuth.login, logout: () => {
            stravaAuth.logout();
            setIsConnected(false);
        }
    };
};
