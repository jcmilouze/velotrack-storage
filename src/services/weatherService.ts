/**
 * Weather Service — Open-Meteo (free, no API key)
 * Fetches current weather conditions at a given location.
 */

export interface WeatherData {
    temperature: number;       // °C
    windSpeed: number;         // km/h
    windDirection: number;     // degrees
    weatherCode: number;
    isDay: boolean;
}

const WMO_CODES: Record<number, { label: string; icon: string }> = {
    0: { label: 'Ciel dégagé', icon: '☀️' },
    1: { label: 'Peu nuageux', icon: '🌤️' },
    2: { label: 'Partiellement nuageux', icon: '⛅' },
    3: { label: 'Couvert', icon: '☁️' },
    45: { label: 'Brouillard', icon: '🌫️' },
    48: { label: 'Brouillard givrant', icon: '🌫️' },
    51: { label: 'Bruine légère', icon: '🌦️' },
    53: { label: 'Bruine modérée', icon: '🌦️' },
    55: { label: 'Bruine dense', icon: '🌧️' },
    61: { label: 'Pluie légère', icon: '🌧️' },
    63: { label: 'Pluie modérée', icon: '🌧️' },
    65: { label: 'Pluie forte', icon: '🌧️' },
    71: { label: 'Neige légère', icon: '🌨️' },
    73: { label: 'Neige modérée', icon: '❄️' },
    75: { label: 'Neige forte', icon: '❄️' },
    80: { label: 'Averses légères', icon: '🌦️' },
    81: { label: 'Averses modérées', icon: '🌧️' },
    82: { label: 'Averses fortes', icon: '⛈️' },
    95: { label: 'Orage', icon: '⛈️' },
    96: { label: 'Orage avec grêle', icon: '⛈️' },
    99: { label: 'Orage violent avec grêle', icon: '⛈️' },
};

export const getWeatherDescription = (code: number) =>
    WMO_CODES[code] ?? { label: 'Inconnu', icon: '🌡️' };

/** Cardinal wind direction from degrees */
export const getWindDirection = (deg: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return dirs[((Math.round(deg / 45) % 8) + 8) % 8];
};

export const fetchWeather = async (
    lat: number,
    lng: number
): Promise<WeatherData | null> => {
    try {
        const params = new URLSearchParams({
            latitude: lat.toFixed(4),
            longitude: lng.toFixed(4),
            current: 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day',
            wind_speed_unit: 'kmh',
            forecast_days: '1',
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);

        const data = await res.json();
        const cur = data.current;

        return {
            temperature: Math.round(cur.temperature_2m),
            windSpeed: Math.round(cur.wind_speed_10m),
            windDirection: cur.wind_direction_10m,
            weatherCode: cur.weather_code,
            isDay: cur.is_day === 1,
        };
    } catch (err) {
        console.warn('Weather fetch failed:', err);
        return null;
    }
};
