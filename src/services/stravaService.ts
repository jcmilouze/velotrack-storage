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
    }
};

export const uploadToStrava = async (gpxBlob: Blob, name: string) => {
    const tokenData = stravaAuth.getToken();
    if (!tokenData || !tokenData.accessToken) {
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
            'Authorization': `Bearer ${tokenData.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Erreur lors de l'upload Strava");
    }

    return await response.json();
};
