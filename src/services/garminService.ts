/**
 * Garmin Service
 * Proxies Garmin Connect synchronization and uploads through a local/VPS bridge.
 */

const BRIDGE_URL = import.meta.env.VITE_GARMIN_BRIDGE_URL || 'http://localhost:3001';

export interface GarminActivity {
    activityId: number;
    activityName: string;
    startTimeLocal: string;
    distance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
    averageHR?: number;
    maxHR?: number;
    [key: string]: any;
}

export const garminSync = {
    /** Check bridge health */
    checkHealth: async () => {
        try {
            const res = await fetch(`${BRIDGE_URL}/health`);
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    /** Upload GPX to Garmin Connect */
    uploadToGarmin: async (gpxContent: string, fileName: string) => {
        if (!gpxContent || gpxContent.length < 100) {
            throw new Error('Le fichier GPX généré est vide ou invalide.');
        }

        console.log(`[VeloTrack] Envoi de ${fileName} au pont Garmin...`);
        const response = await fetch(`${BRIDGE_URL}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpxContent, fileName }),
        });

        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }

        return result;
    },

    /** Fetch activities from Garmin (Sync) */
    syncActivities: async (email?: string, password?: string) => {
        const response = await fetch(`${BRIDGE_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }

        // Store sync status
        localStorage.setItem('garmin_last_sync', JSON.stringify({
            timestamp: new Date().toISOString(),
            profile: result.data?.profile
        }));

        return (result.data?.activities || []) as GarminActivity[];
    },

    getLastSync: () => {
        const raw = localStorage.getItem('garmin_last_sync');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch(e) {
            return null;
        }
    },

    logout: () => {
        localStorage.removeItem('garmin_last_sync');
    }
};
