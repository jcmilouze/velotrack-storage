import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { buildLoopWaypoints, computeDestination, COMPASS_DIRECTIONS, type CompassDirection } from '../../services/loopGenerator';
import { getRouteData, commitRouteData } from '../../services/routingService';
import { searchAddress } from '../../services/geocodingService';
import { fetchWeather, getWeatherDescription } from '../../services/weatherService';
import { findSegmentByName } from '../../services/segmentService';
import { fetchNearestAmenity, type AmenityType } from '../../services/overpassService';

interface Props {
    onClose: () => void;
    isDark: boolean;
}

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

interface AiResponse {
    type: 'loop' | 'point-to-point';
    routeType: 'road' | 'gravel';
    distanceKm: number;
    elevation: 'flat' | 'hilly' | 'mountain';
    directions: CompassDirection[];
    poi?: string | null;
    amenity?: AmenityType | null;
    avoidHighways: boolean;
    reply: string;
}

const AiAssistant: React.FC<Props> = ({ onClose, isDark }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [responseMsg, setResponseMsg] = useState('');
    const [isWaitingForStart, setIsWaitingForStart] = useState(false);
    const [pendingPrompt, setPendingPrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { waypoints, clearRoute, setRouteType } = useRouteStore();

    const brutalModal = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[8px_8px_0px_#1e293b] rounded-[1.5rem]';
    const inputBg = isDark ? 'bg-slate-700' : 'bg-white';

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Watch for start point creation if we were waiting for it
    useEffect(() => {
        if (isWaitingForStart && waypoints.length > 0) {
            setIsWaitingForStart(false);
            const savedPrompt = pendingPrompt;
            setPendingPrompt('');
            processRequest(savedPrompt);
        }
    }, [waypoints.length, isWaitingForStart, pendingPrompt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !WEBHOOK_URL) return;
        await processRequest(prompt);
    };

    const processRequest = async (userPrompt: string) => {
        setIsLoading(true);
        setResponseMsg('');

        try {
            // Check if we have a starting point
            if (waypoints.length === 0) {
                setPendingPrompt(userPrompt);
                setIsWaitingForStart(true);
                setResponseMsg("Super ! Indique-moi maintenant ton point de départ sur la carte (clic long ou clic droit).");
                setIsLoading(false);
                return;
            }

            const departure = waypoints[0].position;

            // Fetch weather for the starting point
            const weather = await fetchWeather(departure[1], departure[0]);
            const weatherContext = weather
                ? `${getWeatherDescription(weather.weatherCode).label}, ${weather.temperature}°C, vent ${weather.windSpeed}km/h de direction ${weather.windDirection}°`
                : "Non disponible";

            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    lat: departure[1],
                    lng: departure[0],
                    currentWeather: weatherContext
                })
            });

            if (!res.ok) throw new Error('Erreur de communication avec l\'IA');

            const responseText = await res.text();
            if (!responseText) throw new Error('Le serveur a renvoyé une réponse vide.');

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Raw response:", responseText);
                throw new Error('La réponse du serveur n\'est pas au format JSON.');
            }

            // Désérialisation défensive : data.response peut être une string JSON (n8n double-encode parfois)
            // On parse dans un try/catch pour éviter un crash ou une injection si le backend est compromis.
            let aiData: AiResponse;
            try {
                const raw = typeof data.response === 'string' ? JSON.parse(data.response) : (data.response || data);
                // Validation structurelle minimale avant d'utiliser les données
                if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                    throw new Error('Structure inattendue');
                }
                aiData = raw as AiResponse;
            } catch {
                throw new Error("La réponse de l'IA est invalide ou mal formée.");
            }

            // Validation des champs critiques
            if (!aiData.distanceKm || isNaN(aiData.distanceKm)) {
                throw new Error("Désolé, je n'ai pas pu déterminer la distance du parcours.");
            }

            setResponseMsg(aiData.reply || 'Parcours généré !');
            setRouteType(aiData.routeType);

            if (aiData.type === 'point-to-point') {
                if (!aiData.poi) {
                    throw new Error("Désolé, je n'ai pas pu identifier la destination de ton parcours.");
                }

                let destinationPosition: [number, number] | undefined = undefined;

                // Try segment database first
                const knownSegment = findSegmentByName(aiData.poi);
                if (knownSegment) {
                    destinationPosition = knownSegment.coordinates;
                    setResponseMsg(`${aiData.reply} (Cible : ${knownSegment.name})`);
                } else {
                    try {
                        const results = await searchAddress(aiData.poi);
                        if (results.length > 0) {
                            destinationPosition = [results[0].lng, results[0].lat];
                            setResponseMsg(`${aiData.reply} (Cible : ${results[0].shortName})`);
                        }
                    } catch (err) {
                        console.error("Geocoding failed for POI:", err);
                    }
                }

                if (!destinationPosition) {
                    throw new Error(`Je n'ai pas trouvé de lieu nommé "${aiData.poi}" sur la carte.`);
                }

                const finalWaypoints: [number, number][] = [departure as [number, number], destinationPosition];
                const resultData = await getRouteData(finalWaypoints, aiData.routeType, aiData.avoidHighways, aiData.elevation);

                const store = useRouteStore.getState();
                store.clearRoute();
                store.setPointA(finalWaypoints[0]);
                store.setPointB(finalWaypoints[1]);
                store.setRouteName(aiData.poi);

                await commitRouteData(resultData);
            } else if (aiData.type === 'loop') {
                clearRoute();

                let poiPosition: [number, number] | undefined = undefined;

                if (aiData.amenity) {
                    // Calcul du point central théorique pour chercher l'établissement
                    const dir = aiData.directions?.length ? aiData.directions[0] : 'N';
                    const bearing = COMPASS_DIRECTIONS[dir];
                    // On cherche à la distance cible / 2 (le point le plus éloigné de la boucle)
                    const midPoint = computeDestination(departure, bearing, aiData.distanceKm / 2.5);
                    const amenityResult = await fetchNearestAmenity(midPoint, aiData.amenity, 15000); // 15km rayon

                    if (amenityResult) {
                        poiPosition = [amenityResult.position[0], amenityResult.position[1]];
                        setResponseMsg(`${aiData.reply} (Étape : ${amenityResult.name} sélectionné)`);
                    } else {
                        console.warn("Overpass API found no amenity");
                    }
                } else if (aiData.poi) {
                    // Try segment database first
                    const knownSegment = findSegmentByName(aiData.poi);
                    if (knownSegment) {
                        poiPosition = knownSegment.coordinates;
                        setResponseMsg(`${aiData.reply} (Segment détecté : ${knownSegment.name})`);
                    } else {
                        try {
                            const results = await searchAddress(aiData.poi);
                            if (results.length > 0) {
                                poiPosition = [results[0].lng, results[0].lat];
                                setResponseMsg(`${aiData.reply} (Trouvé: ${results[0].shortName})`);
                            }
                        } catch (err) {
                            console.error("Geocoding failed for POI:", err);
                        }
                    }
                }

                let finalWaypoints = buildLoopWaypoints({
                    departure,
                    targetDistanceKm: aiData.distanceKm || 50,
                    directions: aiData.directions?.length ? aiData.directions : ['N'],
                    poi: poiPosition,
                    elevation: aiData.elevation
                });

                let resultData = await getRouteData(finalWaypoints, aiData.routeType, aiData.avoidHighways, aiData.elevation);

                // --- SANITY CHECK : Auto-Correction des Détours ---
                // Si le routeur s'est perdu à cause d'un point tombé derrière une montage/rivière, 
                // la route sera affreusement longue (ex: 90km au lieu de 40).
                if (resultData.summary.length > aiData.distanceKm * 1.4 && finalWaypoints.length > 3) {
                    console.warn(`[AI CHECK] Anomalie détectée : ${Math.round(resultData.summary.length)}km générés au lieu de ${aiData.distanceKm}km. Tentative de correction...`);
                    setResponseMsg((prev) => prev + " (Correction du tracé...)");

                    // On supprime un point intermédiaire généré géométriquement (pour libérer le routeur)
                    // On laisse le départ, l'arrivée, et on enlève le point du milieu
                    const midIndex = Math.floor(finalWaypoints.length / 2);
                    finalWaypoints = finalWaypoints.filter((_, i) => i !== midIndex);

                    // Recalcul avec le point limitant en moins
                    resultData = await getRouteData(finalWaypoints, aiData.routeType, aiData.avoidHighways, aiData.elevation);
                }

                const store = useRouteStore.getState();
                store.setPointA(finalWaypoints[0]);
                finalWaypoints.slice(1, -1).forEach((pos, i) => store.addWaypoint(pos, `Étape ${i + 1}`));
                store.addWaypoint(finalWaypoints[finalWaypoints.length - 1], 'Retour départ');

                await commitRouteData(resultData);
            } else {
                throw new Error("Type de parcours non supporté par l'IA.");
            }

            setTimeout(onClose, 4000);

        } catch (error: any) {
            console.error(error);
            setResponseMsg(error.message || "Oups... l'IA est indisponible ou mal configurée.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 flex items-center justify-center p-4 transition-colors ${isWaitingForStart ? 'bg-black/20 pointer-events-none' : 'bg-black/50 backdrop-blur-md'}`}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className={`${brutalModal} w-full max-w-lg p-6 flex flex-col pointer-events-auto`}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-[2px_2px_0px_#1e293b] border-2 border-slate-900">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight leading-none">VeloTrack AI</h2>
                            <p className="text-xs uppercase font-bold text-indigo-400 mt-1">Propulsé par Groq</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {!WEBHOOK_URL && (
                    <div className="bg-amber-100 text-amber-900 border-2 border-amber-300 p-3 mb-4 rounded-xl text-sm font-bold">
                        ⚠️ L'URL du Webhook n8n (VITE_N8N_WEBHOOK_URL) n'est pas configurée dans le fichier .env.
                    </div>
                )}

                <div className={`flex-1 min-h-[100px] mb-4 p-4 rounded-xl border-2 border-slate-800 shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)] ${inputBg} flex items-center justify-center text-center`}>
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3 text-indigo-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm uppercase font-bold tracking-widest animate-pulse">Consultation de la carte...</span>
                        </div>
                    ) : responseMsg ? (
                        <p className="font-bold text-lg">{responseMsg}</p>
                    ) : (
                        <p className="text-slate-400 font-bold uppercase text-sm tracking-wide">
                            "Une boucle gravel de 60km au sud avec une pause café."
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading || !!responseMsg}
                        placeholder="Demande-moi n'importe quel parcours..."
                        className={`flex-1 p-4 rounded-2xl border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] font-bold outline-none focus:border-indigo-500 transition-colors
                            ${isDark ? 'bg-slate-900 text-white placeholder-slate-600' : 'bg-white text-slate-900 placeholder-slate-400'}`}
                    />
                    <button
                        type="submit"
                        disabled={!prompt.trim() || isLoading || !!responseMsg || !WEBHOOK_URL}
                        className="w-14 shrink-0 rounded-2xl border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] bg-indigo-500 text-white flex items-center justify-center hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_#1e293b]"
                    >
                        <Send className="w-6 h-6 ml-1" />
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AiAssistant;
