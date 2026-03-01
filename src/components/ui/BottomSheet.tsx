import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, MapPin, Clock, RotateCcw, ArrowUpCircle, ArrowDownCircle,
    Download, CheckCircle2, Edit3, BookmarkPlus, Share2, Copy, Flame, Wind,
    CornerDownRight, Navigation
} from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { formatDistance, formatDuration } from '../../services/routingService';
import { downloadGpx } from '../../services/gpxExport';
import { routeLibrary } from '../../services/routeLibrary';
import { copyUrlToClipboard } from '../../services/urlSharing';
import { fetchWeather, getWeatherDescription, getWindDirection } from '../../services/weatherService';
import ElevationChart from './ElevationChart';

const BottomSheet: React.FC = () => {
    const {
        isBottomSheetOpen, setIsBottomSheetOpen,
        routeSummary, maneuvers, clearRoute, theme,
        elevationProfile, routeCoordinates,
        routeType, routeName, setRouteName,
        waypoints, closeLoop,
    } = useRouteStore();

    const [isExported, setIsExported] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [weather, setWeather] = useState<Awaited<ReturnType<typeof fetchWeather>>>(null);

    const isDark = theme === 'dark';
    const brutalSheet = isDark
        ? 'bg-slate-900 border-[3px] border-b-0 border-slate-700 text-slate-100 shadow-[0px_-8px_0px_rgba(0,0,0,0.3)] rounded-t-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-b-0 border-slate-800 text-slate-900 shadow-[0px_-8px_0px_#1e293b] rounded-t-[1.5rem]';
    const subtle = isDark ? 'text-slate-400' : 'text-slate-600';
    const divider = isDark ? 'bg-slate-700' : 'bg-slate-800';
    const cardBg = isDark
        ? 'bg-slate-800 border-2 border-slate-700 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        : 'bg-white border-2 border-slate-800 shadow-[4px_4px_0px_#1e293b]';
    const btnHover = isDark ? 'hover:bg-slate-700 active:translate-y-0.5' : 'hover:bg-slate-200 active:translate-y-0.5 border-2 border-transparent hover:border-slate-800';

    // F7 — Fetch weather when route opens
    useEffect(() => {
        if (!isBottomSheetOpen || !waypoints[0]) return;
        const [lng, lat] = waypoints[0].position;
        fetchWeather(lat, lng).then(setWeather);
    }, [isBottomSheetOpen, waypoints]);

    // F6 — Calorie estimation (more accurate physical model)
    // Constants: Rider ~75kg, Bike ~10kg, Efficiency ~21%
    const kcal = (() => {
        if (!routeSummary) return null;
        const totalWeight = 85;
        const distanceKm = routeSummary.length;
        const timeHours = routeSummary.time / 3600;
        if (timeHours <= 0) return 0;

        const speedKmh = distanceKm / timeHours;
        const elevationAc = elevationProfile?.ascent ?? 0;

        // Base rolling + aero drag power estimate based on average speed
        const speedMs = speedKmh / 3.6;
        const aeroPower = 0.5 * 1.2 * 0.4 * Math.pow(speedMs, 3); // ~ CdA * v^3
        const rollingPower = totalWeight * 9.81 * 0.005 * speedMs; // ~ Crr * v

        // Elevation power estimate
        const elevationPower = elevationAc > 0 ? (totalWeight * 9.81 * elevationAc) / routeSummary.time : 0;

        // Apply routeType multiplier (Gravel is less efficient = more calories)
        const surfaceMultiplier = routeType === 'gravel' ? 1.2 : 1.0;

        const totalWatts = (aeroPower + rollingPower + elevationPower) * surfaceMultiplier;

        // Convert Watts to kCal/hour (incorporating ~21% human efficiency factor)
        // 1 Watt = 3.6 kJ/hr. With 21% efficiency, 1 Watt ~ 4 kcal/hr
        const caloriesPerHour = totalWatts * 4;

        return Math.round(caloriesPerHour * timeHours);
    })();

    const vam = routeSummary && elevationProfile && elevationProfile.ascent > 0
        ? Math.round((elevationProfile.ascent / (routeSummary.time / 3600)))
        : null;

    // F3 — Save route
    const handleSave = () => {
        routeLibrary.save({
            name: routeName,
            routeType,
            waypoints: waypoints.map((w) => ({
                position: w.position as [number, number],
                label: w.label,
                name: w.name,
            })),
            routeGeometry: useRouteStore.getState().routeGeometry,
            summary: routeSummary,
            maneuvers,
            elevationProfile,
            coordinates: routeCoordinates,
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    // F4 — Export GPX
    const handleExportGpx = () => {
        if (!routeCoordinates.length) return;
        downloadGpx({ routeName, coordinates: routeCoordinates, summary: routeSummary, elevationProfile, routeType });
        setIsExported(true);
        setTimeout(() => setIsExported(false), 3000);
    };

    // F5 — Share URL
    const handleShare = async () => {
        await copyUrlToClipboard({ waypoints: waypoints.map((w) => ({ position: w.position as [number, number], label: w.label, name: w.name })), routeType, routeName });
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    // Check if loop is closure-friendly
    const canCloseLoop = waypoints.length >= 2 && (() => {
        const start = waypoints[0]?.position;
        const end = waypoints[waypoints.length - 1]?.position;
        if (!start || !end) return false;
        return Math.abs(start[0] - end[0]) > 0.0001 || Math.abs(start[1] - end[1]) > 0.0001;
    })();

    return (
        <AnimatePresence>
            {isBottomSheetOpen && (
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className={`
                        absolute bottom-0 left-0 right-0 z-20 pointer-events-auto
                        md:bottom-5 md:left-auto md:right-20 md:w-96
                        ${brutalSheet} overflow-hidden font-bold
                    `}
                    style={{ maxHeight: '82vh' }}
                >
                    {/* Mobile handle */}
                    <div className="flex justify-center pt-3 pb-1 md:hidden">
                        <div className={`w-12 h-2 rounded-full border-[2px] ${isDark ? 'bg-slate-700 border-slate-700' : 'bg-slate-800 border-slate-800'}`} />
                    </div>

                    {/* Header — Route name */}
                    <div className="px-5 pt-4 pb-0">
                        <div className="flex items-center gap-2 mb-3">
                            {isEditingName ? (
                                <input autoFocus value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    onBlur={() => setIsEditingName(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                    className="flex-1 bg-transparent border-b-[3px] border-brand-primary outline-none text-xl font-bold py-0.5 min-w-0"
                                />
                            ) : (
                                <button onClick={() => setIsEditingName(true)} className="flex-1 flex items-center gap-2 text-left group min-w-0" title="Renommer">
                                    <span className="text-xl font-bold truncate">{routeName}</span>
                                    <Edit3 className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${subtle}`} />
                                </button>
                            )}
                            <span className={`px-2 py-0.5 border-2 border-slate-800 text-xs font-bold flex-shrink-0 shadow-[2px_2px_0px_#1e293b] ${routeType === 'gravel' ? 'bg-amber-400 text-slate-900' : 'bg-brand-primary text-white'}`}>
                                {routeType === 'gravel' ? '🚵 Gravel' : '🚴 Route'}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                                <button onClick={clearRoute} className={`p-2 ${btnHover}`} title="Réinitialiser"><RotateCcw className="w-5 h-5" /></button>
                                <button onClick={() => setIsBottomSheetOpen(false)} className={`p-2 ${btnHover}`} title="Fermer"><ChevronDown className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* F7 — Weather */}
                        {weather && (
                            <div className={`${cardBg} px-3 py-2 flex items-center gap-3 mb-3`}>
                                <span className="text-2xl">{getWeatherDescription(weather.weatherCode).icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{getWeatherDescription(weather.weatherCode).label}</p>
                                    <div className={`mt-1 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <span className="font-bold text-sm">{weather.temperature}°C</span>
                                        <span className="opacity-40">·</span>
                                        <span className="text-sm font-semibold flex items-center gap-1.5">
                                            Vent {weather.windSpeed} km/h
                                            {/* Wind direction icon, rotated accordingly */}
                                            <div
                                                className={`flex items-center justify-center p-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                                                style={{ transform: `rotate(${weather.windDirection}deg)` }}
                                                title={`Direction: ${getWindDirection(weather.windDirection)}`}
                                            >
                                                <Navigation className="w-4 h-4 text-brand-primary" strokeWidth={3} />
                                            </div>
                                        </span>
                                    </div>
                                </div>
                                <Wind className={`w-4 h-4 ${subtle} flex-shrink-0`} />
                            </div>
                        )}

                        {/* Stats grid */}
                        {routeSummary && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                <div className={`${cardBg} p-2 flex flex-col items-center text-center`}>
                                    <MapPin className="w-5 h-5 mb-1" />
                                    <span className="font-bold text-sm leading-none">{formatDistance(routeSummary.length)}</span>
                                    <span className={`text-[10px] uppercase font-bold mt-1 ${subtle}`}>Dist.</span>
                                </div>
                                <div className={`${cardBg} p-2 flex flex-col items-center text-center`}>
                                    <Clock className="w-5 h-5 mb-1" />
                                    <span className="font-bold text-sm leading-none">{formatDuration(routeSummary.time)}</span>
                                    <span className={`text-[10px] uppercase font-bold mt-1 ${subtle}`}>Temps</span>
                                </div>
                                {kcal && (
                                    <div className={`${cardBg} p-2 flex flex-col items-center text-center`}>
                                        <Flame className="w-5 h-5 mb-1 text-orange-500" />
                                        <span className="font-bold text-sm leading-none">{kcal}</span>
                                        <span className={`text-[10px] uppercase font-bold mt-1 ${subtle}`}>Kcal</span>
                                    </div>
                                )}
                                {vam && (
                                    <div className={`${cardBg} p-2 flex flex-col items-center text-center`}>
                                        <ArrowUpCircle className="w-5 h-5 mb-1 text-emerald-500" />
                                        <span className="font-bold text-sm leading-none">{vam}</span>
                                        <span className={`text-[10px] uppercase font-bold mt-1 ${subtle}`}>VAM</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons row */}
                        {routeCoordinates.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {/* GPX Export */}
                                <motion.button onClick={handleExportGpx} whileTap={{ scale: 0.95 }}
                                    className={`py-2 px-1 font-bold text-xs flex flex-col items-center gap-1 transition-all border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] ${isExported ? 'bg-emerald-400 text-slate-900' : 'bg-brand-primary text-white hover:brightness-110 active:translate-y-1 active:shadow-none'}`}>
                                    {isExported ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                                    <span className="uppercase tracking-tight">{isExported ? 'Téléchargé !' : 'GPX'}</span>
                                </motion.button>

                                {/* Save to library */}
                                <motion.button onClick={handleSave} whileTap={{ scale: 0.95 }}
                                    className={`py-2 px-1 font-bold text-xs flex flex-col items-center gap-1 transition-all border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] ${isSaved ? 'bg-emerald-400 text-slate-900' : isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:translate-y-1 active:shadow-none' : 'bg-white text-slate-900 hover:bg-slate-100 active:translate-y-1 active:shadow-none'}`}>
                                    {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
                                    <span className="uppercase tracking-tight">{isSaved ? 'Sauvé !' : 'Sauver'}</span>
                                </motion.button>

                                {/* Share URL */}
                                <motion.button onClick={handleShare} whileTap={{ scale: 0.95 }}
                                    className={`py-2 px-1 font-bold text-xs flex flex-col items-center gap-1 transition-all border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] ${isCopied ? 'bg-emerald-400 text-slate-900' : isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:translate-y-1 active:shadow-none' : 'bg-white text-slate-900 hover:bg-slate-100 active:translate-y-1 active:shadow-none'}`}>
                                    {isCopied ? <Copy className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                    <span className="uppercase tracking-tight">{isCopied ? 'Copié !' : 'Partager'}</span>
                                </motion.button>
                            </div>
                        )}

                        {/* Close loop button */}
                        {canCloseLoop && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={closeLoop}
                                className={`w-full mb-3 flex items-center justify-center gap-2 py-3 border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] text-sm uppercase font-bold transition-all active:translate-y-1 active:shadow-none bg-[#f1f1eb] text-slate-800 hover:brightness-95`}
                            >
                                <CornerDownRight className="w-5 h-5" />
                                Fermer la boucle
                            </motion.button>
                        )}

                        {/* Elevation */}
                        <AnimatePresence>
                            {elevationProfile && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
                                    <div className="flex gap-2 mb-2">
                                        <div className={`${cardBg} flex-1 px-3 py-2 flex items-center gap-2`}>
                                            <ArrowUpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                            <div><p className="font-bold text-sm leading-none">{elevationProfile.ascent} m</p><p className={`text-[10px] uppercase font-bold ${subtle}`}>D+ </p></div>
                                        </div>
                                        <div className={`${cardBg} flex-1 px-3 py-2 flex items-center gap-2`}>
                                            <ArrowDownCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                            <div><p className="font-bold text-sm leading-none">{elevationProfile.descent} m</p><p className={`text-[10px] uppercase font-bold ${subtle}`}>D- </p></div>
                                        </div>
                                    </div>
                                    <div className={`${cardBg} p-3`}>
                                        <p className={`text-[10px] uppercase font-bold mb-2 ${subtle}`}>Profil Altimétrique</p>
                                        <ElevationChart profile={elevationProfile} isDark={isDark} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className={`h-[3px] ${divider} mb-3`} />
                    </div>

                    {/* Removed maneuvers section */}
                    <div className="pb-6" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
