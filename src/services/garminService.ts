/**
 * Garmin Service
 * Proxies Garmin Connect synchronization through a local bridge.
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

    /** Execute synchronization */
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

        // Store sync status and basic profile if needed
        localStorage.setItem('garmin_last_sync', JSON.stringify({
            timestamp: new Date().toISOString(),
            profile: result.data.profile
        }));

        return result.data.activities as GarminActivity[];
    },

    getLastSync: () => {
        const raw = localStorage.getItem('garmin_last_sync');
        if (!raw) return null;
        return JSON.parse(raw);
    },

    logout: () => {
        localStorage.removeItem('garmin_last_sync');
    }
};

/**
 * Note: Garmin bridge doesn't support direct GPX upload via this unofficial API easily.
 * Recommendation: Use bridge for pulling activities, and manual GPX export for pushing to Garmin Connect.
 */
