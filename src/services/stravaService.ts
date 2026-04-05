/**
 * Strava Service
 * Handles OAuth2 authentication and route upload to Strava.
 */

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT_URI = window.location.origin; // Redirect back to the app
const STRAVA_PROXY_URL = import.meta.env.VITE_STRAVA_PROXY_URL;

export const stravaAuth = {
    /** Redirect to Strava OAuth page */
    login: () => {
        if (!CLIENT_ID) {
            alert("Strava Client ID non configuré (VITE_STRAVA_CLIENT_ID)");
            return;
        }
        const scope = 'activity:write,read';
        const url = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
        window.location.href = url;
    },

    /** Exchange authorization code for access token */
    exchangeToken: async (code: string) => {
        // PRIORITY: Use backend proxy if configured (SECURE)
        if (STRAVA_PROXY_URL) {
            const response = await fetch(`${STRAVA_PROXY_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            if (!response.ok) throw new Error('Échec du proxy Strava');
            const data = await response.json();
            stravaAuth.saveToken(data);
            return data;
        }

        // FALLBACK: Client-side exchange (INSECURE - DEV ONLY)
        if (import.meta.env.PROD) {
            throw new Error(
                "L'échange de token Strava direct est désactivé en production. " +
                "Utilisez VITE_STRAVA_PROXY_URL pour sécuriser le flux."
            );
        }

        const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
        if (!clientSecret) {
            throw new Error("Proxy Strava non configuré et Client Secret absent (VITE_STRAVA_CLIENT_SECRET).");
        }

        console.warn(
            '[VeloTrack] ⚠️ Flux OAuth Strava non sécurisé (Client Side). ' +
            'Configurez VITE_STRAVA_PROXY_URL pour la production.'
        );

        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
            }),
        });

        if (!response.ok) throw new Error('Échec de l\'échange de token Strava');
        const data = await response.json();
        stravaAuth.saveToken(data);
        return data;
    },

    saveToken: (data: any) => {
        localStorage.setItem('strava_token', JSON.stringify({
            accessToken: data.access_token || data.accessToken,
            refreshToken: data.refresh_token || data.refreshToken,
            expiresAt: data.expires_at || data.expiresAt,
            athlete: data.athlete
        }));
    },

    getToken: () => {
        const raw = localStorage.getItem('strava_token');
        if (!raw) return null;
        return JSON.parse(raw);
    },

    logout: () => {
        localStorage.removeItem('strava_token');
    },

    /** F1: Refresh token automatically if expired */
    refreshIfNeeded: async () => {
        const tokenData = stravaAuth.getToken();
        if (!tokenData) return null;

        const now = Math.floor(Date.now() / 1000);
        // Refresh if expiring in less than 5 minutes
        if (tokenData.expiresAt && tokenData.expiresAt > now + 300) {
            return tokenData.accessToken;
        }

        console.log('[VeloTrack] Strava token expired or expiring soon, refreshing...');
        
        try {
            if (STRAVA_PROXY_URL) {
                const response = await fetch(`${STRAVA_PROXY_URL}/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: tokenData.refreshToken }),
                });
                if (!response.ok) throw new Error('Refresh proxy failed');
                const data = await response.json();
                stravaAuth.saveToken(data);
                return data.access_token || data.accessToken;
            }

            const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
            if (!clientSecret) throw new Error('No secret for refresh');

            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: tokenData.refreshToken,
                }),
            });

            if (!response.ok) throw new Error('Direct refresh failed');
            const data = await response.json();
            stravaAuth.saveToken(data);
            return data.access_token;
        } catch (err) {
            console.error('[VeloTrack] Strava refresh failed:', err);
            stravaAuth.logout();
            throw new Error('Votre session Strava a expiré, merci de vous reconnecter.');
        }
    }
};

export const uploadToStrava = async (gpxBlob: Blob, name: string) => {
    // F1: Ensure token is fresh before upload
    const accessToken = await stravaAuth.refreshIfNeeded();
    if (!accessToken) {
        throw new Error("Non connecté à Strava");
    }

    const formData = new FormData();
    formData.append('file', gpxBlob, `${name}.gpx`);
    formData.append('data_type', 'gpx');
    formData.append('name', name);
    formData.append('activity_type', 'ride'); // Default to ride

    const response = await fetch('https://www.strava.com/api/v3/uploads', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Erreur lors de l'upload Strava");
    }

    return await response.json();
};
