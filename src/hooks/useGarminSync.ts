import { useState, useCallback } from 'react';
import { garminSync } from '../services/garminService';

/**
 * Hook to handle Garmin synchronization state through the local bridge.
 */
export const useGarminSync = () => {
    const [lastSync, setLastSync] = useState(garminSync.getLastSync());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const performSync = useCallback(async (email?: string, password?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const activities = await garminSync.syncActivities(email, password);
            setLastSync(garminSync.getLastSync());
            return activities;
        } catch (err: any) {
            const msg = err.message || 'Erreur de synchronisation Garmin';
            setError(msg);
            console.error('[VeloTrack] Garmin Sync Error:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        lastSync,
        isConnected: !!lastSync,
        isLoading,
        error,
        sync: performSync,
        logout: () => {
            garminSync.logout();
            setLastSync(null);
        }
    };
};
