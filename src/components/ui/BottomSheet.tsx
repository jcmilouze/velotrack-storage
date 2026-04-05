import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, MapPin, Clock, RotateCcw, ArrowUpCircle, ArrowDownCircle,
    Download, CheckCircle2, Edit3, Flame,
    CornerDownRight, Navigation, RefreshCw, Layers, Upload, Activity,
    ArrowLeftRight, ArrowUp
} from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { formatDistance, formatDuration } from '../../services/routingService';
import { downloadGpx } from '../../services/gpxExport';
import { fetchWeather, getWeatherDescription } from '../../services/weatherService';
import { useMapContext } from '../../context/MapContext';
import ElevationChart from './ElevationChart';

const BottomSheet: React.FC = () => {
    const {
        isBottomSheetOpen, setIsBottomSheetOpen,
        theme, elevationProfile, routeCoordinates,
        routeType, routeName, setRouteName,
        waypoints, closeLoop, setShowLoop,
        routeSummary, clearRoute,
        reverseWaypoints,
    } = useRouteStore();

    const { fitBounds } = useMapContext();

    const [isExported, setIsExported] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [weather, setWeather] = useState<Awaited<ReturnType<typeof fetchWeather>>>(null);
    const [mobileExpanded, setMobileExpanded] = useState(false);

    const isDark = theme === 'dark';
    const brutalSheet = isDark
        ? 'bg-slate-900 border-[3px] border-b-0 border-slate-700 text-slate-100 shadow-[0px_-8px_0px_rgba(0,0,0,0.3)] rounded-t-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-b-0 border-slate-800 text-slate-900 shadow-[0px_-8px_0px_#1e293b] rounded-t-[1.5rem]';
    const subtle = isDark ? 'text-slate-400' : 'text-slate-600';
    const cardBg = isDark
        ? 'bg-slate-800 border-2 border-slate-700 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        : 'bg-white border-2 border-slate-800 shadow-[4px_4px_0px_#1e293b]';
    const btnHover = isDark ? 'hover:bg-slate-700 active:translate-y-0.5' : 'hover:bg-slate-200 active:translate-y-0.5 border-2 border-transparent hover:border-slate-800';

    // Fetch weather when route opens
    useEffect(() => {
        if (!isBottomSheetOpen || !waypoints[0]) return;
        const [lng, lat] = waypoints[0].position;
        fetchWeather(lat, lng).then(setWeather);
    }, [isBottomSheetOpen, waypoints]);

    // Reset to peek each time the sheet opens
    useEffect(() => {
        if (isBottomSheetOpen) setMobileExpanded(false);
    }, [isBottomSheetOpen]);

    // F6 — Calorie estimation
    const kcal = (() => {
        if (!routeSummary) return null;
        const totalWeight = 85;
        const distanceKm = routeSummary.length;
        const timeHours = routeSummary.time / 3600;
        if (timeHours <= 0) return 0;
        const speedKmh = distanceKm / timeHours;
        const elevationAc = elevationProfile?.ascent ?? 0;
        const speedMs = speedKmh / 3.6;
        const aeroPower = 0.5 * 1.2 * 0.4 * Math.pow(speedMs, 3);
        const rollingPower = totalWeight * 9.81 * 0.005 * speedMs;
        const elevationPower = (elevationAc > 0 && routeSummary.time > 0) ? (totalWeight * 9.81 * elevationAc) / routeSummary.time : 0;
        const surfaceMultiplier = routeType === 'gravel' ? 1.2 : 1.0;
        const totalWatts = (aeroPower + rollingPower + elevationPower) * surfaceMultiplier;
        const caloriesPerHour = totalWatts * 4;
        return Math.round(caloriesPerHour * timeHours);
    })();

    const vam = routeSummary && elevationProfile && elevationProfile.ascent > 0 && routeSummary.time > 0
        ? Math.round((elevationProfile.ascent / (routeSummary.time / 3600)))
        : null;


    // F4 — Export GPX
    const handleExportGpx = () => {
        if (!routeCoordinates.length) return;
        let finalName = routeName;
        // Prompt for name if it's the default or empty
        if (!routeName || routeName === 'Mon parcours' || routeName.trim() === '') {
            const promptName = prompt('Nommez votre parcours pour l\'export GPX :', routeName || 'Mon parcours');
            if (promptName && promptName.trim() !== '') {
                finalName = promptName;
                setRouteName(promptName);
            } else {
                // User cancelled or entered empty string, use default but don't save it
                finalName = 'Parcours VeloTrack';
            }
        }
        downloadGpx({ routeName: finalName, coordinates: routeCoordinates, summary: routeSummary, elevationProfile, routeType });
        setIsExported(true);
        setTimeout(() => setIsExported(false), 3000);
    };




    const canCloseLoop = waypoints.length >= 2 && (() => {
        const start = waypoints[0]?.position;
        const end = waypoints[waypoints.length - 1]?.position;
        if (!start || !end) return false;
        // Check if points are distinct enough (at least ~1m) to offer closing the loop
        return Math.abs(start[0] - end[0]) > 0.00001 || Math.abs(start[1] - end[1]) > 0.00001;
    })();

    const isMobileVisible = waypoints.length > 0;
    const isVisible = isBottomSheetOpen || isMobileVisible;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className={`
                        absolute bottom-0 left-0 right-0 z-20 pointer-events-auto
                        md:bottom-5 md:left-auto md:right-20 md:w-96 md:h-auto md:max-h-[85vh]
                        ${!mobileExpanded ? 'h-[90px]' : 'max-h-[85vh]'}
                        ${brutalSheet} flex flex-col font-bold
                    `}
                >
                    {/* ── PEEK BAND (mobile only) ── */}
                    {!mobileExpanded && (
                        <div
                            className="flex-shrink-0 px-4 h-[90px] flex flex-col justify-center gap-2 cursor-pointer md:hidden"
                            onClick={() => setMobileExpanded(true)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {routeSummary ? (
                                        <>
                                            <span className="font-black text-sm">{formatDistance(routeSummary.length)}</span>
                                            <span className={`text-sm font-bold ${subtle}`}>·</span>
                                            <span className="font-black text-sm">{formatDuration(routeSummary.time)}</span>
                                            {elevationProfile && (
                                                <>
                                                    <span className={`text-sm font-bold ${subtle}`}>·</span>
                                                    <span className="font-black text-sm text-emerald-500">↑{elevationProfile.ascent}m</span>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <span className={`font-black text-sm ${subtle}`}>{waypoints.length} point{waypoints.length > 1 ? 's' : ''}</span>
                                    )}
                                </div>
                                <ArrowUp className="w-5 h-5 opacity-50" />
                            </div>
                            <div className="flex gap-2">
                                {waypoints.length >= 2 && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); reverseWaypoints(); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black rounded-lg ${cardBg}`}
                                    >
                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                        Inverser
                                    </button>
                                )}
                                {canCloseLoop && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); closeLoop(); useRouteStore.getState().cleanupWaypoints(); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black rounded-lg bg-brand-primary text-white border-2 border-slate-800"
                                    >
                                        <CornerDownRight className="w-3.5 h-3.5" />
                                        Fermer boucle
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── HEADER (desktop always, mobile only when expanded) ── */}
                    <div className={`flex-shrink-0 px-5 pt-3 ${!mobileExpanded ? 'hidden md:block' : ''}`}>
                        <div className="flex justify-center mb-3 md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileExpanded(false)}
                                aria-label="Réduire le panneau"
                                className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                            />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            {isEditingName ? (
                                <input autoFocus value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    onBlur={() => setIsEditingName(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                    className="flex-1 bg-transparent border-b-[3px] border-brand-primary outline-none text-xl font-bold py-0.5 min-w-0"
                                />
                            ) : (
                                <button onClick={() => setIsEditingName(true)} className="flex-1 flex items-center gap-2 text-left group min-w-0" title="Renommer">
                                    <span className="text-xl font-black truncate border-b-2 border-transparent group-hover:border-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-1 -ml-1 transition-colors">{routeName}</span>
                                    <Edit3 className={`w-4 h-4 transition-opacity flex-shrink-0 ${subtle}`} />
                                </button>
                            )}
                            <div className="flex gap-1">
                                <button onClick={clearRoute} className={`p-2 ${btnHover} rounded-full`} title="Réinitialiser"><RotateCcw className="w-5 h-5 text-red-500" /></button>
                                <button onClick={() => { setMobileExpanded(false); setIsBottomSheetOpen(false); }} className={`p-2 ${btnHover} rounded-full`} title="Fermer"><ChevronDown className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className={`flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar ${mobileExpanded ? 'block' : 'hidden md:block'}`}>
                        {/* Quick Action Bar */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <button onClick={() => setShowLoop(true)} className={`py-3 ${cardBg} flex flex-col items-center justify-center gap-1 text-[10px] md:text-[11px] uppercase font-black hover:bg-brand-primary hover:text-white transition-all rounded-xl`}>
                                <RefreshCw className="w-5 h-5" />
                                Boucle
                            </button>
                            <button onClick={() => routeCoordinates.length ? fitBounds(routeCoordinates) : alert('Aucun tracé à centrer')} className={`py-3 ${cardBg} flex flex-col items-center justify-center gap-1 text-[10px] md:text-[11px] uppercase font-black hover:bg-blue-500 hover:text-white transition-all rounded-xl`}>
                                <Layers className="w-5 h-5" />
                                Centrer
                            </button>
                            <button onClick={() => document.getElementById('gpx-import-input')?.click()} className={`py-3 ${cardBg} flex flex-col items-center justify-center gap-1 text-[10px] md:text-[11px] uppercase font-black hover:bg-emerald-500 hover:text-white transition-all rounded-xl`}>
                                <Upload className="w-5 h-5" />
                                Import
                            </button>
                        </div>

                        {/* F7 — Weather Centered */}
                        {weather && (
                            <div className={`${cardBg} px-4 py-3 flex flex-col items-center gap-2 mb-4 rounded-2xl`}>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Météo au départ</p>
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl filter drop-shadow-sm">{getWeatherDescription(weather.weatherCode).icon}</span>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black text-3xl leading-none">{weather.temperature}°C</span>
                                        <span className={`text-[10px] font-bold uppercase mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{getWeatherDescription(weather.weatherCode).label}</span>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-3 mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`} style={{ transform: `rotate(${weather.windDirection}deg)` }}>
                                        <Navigation className="w-4 h-4 text-brand-primary" fill="currentColor" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">VENT {weather.windSpeed} km/h</span>
                                </div>
                            </div>
                        )}

                        {/* Bento Stats Grid */}
                        {routeSummary && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className={`${cardBg} col-span-2 p-3 flex flex-col justify-between rounded-xl`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-brand-primary" />
                                        <span className={`text-[9px] uppercase font-black tracking-widest ${subtle}`}>Distance</span>
                                    </div>
                                    <span className="font-black text-2xl leading-none">{formatDistance(routeSummary.length)}</span>
                                </div>
                                <div className={`${cardBg} col-span-2 p-3 flex flex-col justify-between rounded-xl`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        <span className={`text-[9px] uppercase font-black tracking-widest ${subtle}`}>Temps Est.</span>
                                    </div>
                                    <span className="font-black text-2xl leading-none">{formatDuration(routeSummary.time)}</span>
                                </div>
                                {elevationProfile && (
                                    <>
                                        <div className={`${cardBg} col-span-1 p-2 flex flex-col items-center justify-center text-center rounded-xl`}>
                                            <ArrowUpCircle className="w-5 h-5 mb-1 text-emerald-500" />
                                            <span className="font-bold text-sm leading-none">{elevationProfile.ascent}m</span>
                                            <span className={`text-[8px] uppercase font-bold mt-1 ${subtle}`}>D+</span>
                                        </div>
                                        <div className={`${cardBg} col-span-1 p-2 flex flex-col items-center justify-center text-center rounded-xl`}>
                                            <ArrowDownCircle className="w-5 h-5 mb-1 text-orange-500" />
                                            <span className="font-bold text-sm leading-none">{elevationProfile.descent}m</span>
                                            <span className={`text-[8px] uppercase font-bold mt-1 ${subtle}`}>D-</span>
                                        </div>
                                    </>
                                )}
                                {kcal && (
                                    <div className={`${cardBg} col-span-1 p-2 flex flex-col items-center justify-center text-center rounded-xl`}>
                                        <Flame className="w-5 h-5 mb-1 text-neo-red" />
                                        <span className="font-bold text-sm leading-none">{kcal}</span>
                                        <span className={`text-[8px] uppercase font-bold mt-1 ${subtle}`}>Kcal</span>
                                    </div>
                                )}
                                {vam && (
                                    <div className={`${cardBg} col-span-1 p-2 flex flex-col items-center justify-center text-center rounded-xl`}>
                                        <Activity className="w-5 h-5 mb-1 text-brand-primary" />
                                        <span className="font-bold text-sm leading-none">{vam}</span>
                                        <span className={`text-[8px] uppercase font-bold mt-1 ${subtle}`}>VAM</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons row */}
                        {routeCoordinates.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <motion.button onClick={handleExportGpx} whileTap={{ scale: 0.95 }}
                                    className={`py-3 px-1 font-black text-xs flex items-center justify-center gap-2 transition-all border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] rounded-xl ${isExported ? 'bg-emerald-400 text-slate-900' : 'bg-brand-primary text-white hover:brightness-110 active:translate-y-1 active:shadow-none'}`}>
                                    {isExported ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                                    <span className="uppercase tracking-tight">GPX</span>
                                </motion.button>
                                <button
                                    disabled
                                    title="Synchronisation plateforme — bientôt disponible"
                                    className="py-3 px-1 font-black text-xs flex items-center justify-center gap-2 border-[3px] border-slate-400 rounded-xl opacity-40 cursor-not-allowed bg-slate-300 text-slate-500 select-none"
                                >
                                    <Upload className="w-5 h-5" />
                                    <span className="uppercase tracking-tight">Sync</span>
                                </button>
                            </div>
                        )}

                        {/* Action buttons row (Cleanup & Close Loop) */}
                        <div className="flex flex-col gap-2 mb-4">
                            {waypoints.length >= 2 && (
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={reverseWaypoints}
                                    className={`w-full flex items-center justify-center gap-2 py-3 border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] text-xs uppercase font-black transition-all active:translate-y-1 active:shadow-none bg-white text-slate-900 hover:bg-slate-100 rounded-xl`}
                                    title="Inverser le sens du parcours"
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                    Inverser le tracé
                                </motion.button>
                            )}
                            {canCloseLoop && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => { closeLoop(); useRouteStore.getState().cleanupWaypoints(); }}
                                    className={`w-full flex items-center justify-center gap-2 py-4 border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] text-sm uppercase font-black transition-all active:translate-y-1 active:shadow-none bg-brand-primary text-white hover:brightness-110 rounded-xl`}
                                >
                                    <CornerDownRight className="w-5 h-5" />
                                    Fermer la boucle
                                </motion.button>
                            )}
                        </div>

                        {/* Elevation Chart Section */}
                        {elevationProfile && (
                            <div className="mb-4">
                                <div className={`${cardBg} p-3 rounded-2xl overflow-hidden`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className={`text-[10px] uppercase font-black tracking-widest ${subtle}`}>Profil Altimétrique</p>
                                        <div className="flex gap-3">
                                            <span className="text-[10px] font-black uppercase">Max: {elevationProfile.maxElevation}m</span>
                                        </div>
                                    </div>
                                    <ElevationChart profile={elevationProfile} isDark={isDark} />
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
