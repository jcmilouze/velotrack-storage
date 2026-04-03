import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Minus, Navigation, Sun, Moon, RotateCcw, Undo2, MapPin,
    RefreshCw, FolderOpen, Layers, AlertTriangle, Upload, Sparkles, ArrowLeftRight
} from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { useMapContext } from '../../context/MapContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { parseGpxFile } from '../../services/gpxImport';
import { decodeRouteFromUrl } from '../../services/urlSharing';
import SearchBar from './SearchBar';
import LoopModal from './LoopModal';
import RouteLibrary from './RouteLibrary';
import LayerSelector from './LayerSelector';
import AiAssistant from './AiAssistant';

const OverlayUI: React.FC = () => {
    const {
        theme, setTheme,
        waypoints, clearRoute, setPointA,
        routeSummary, routeType, setRouteType,
        setClickMode, setRouteName,
        setRouteGeometry, setRouteSummary, setManeuvers,
        setElevationProfile, setRouteCoordinates,
        setIsBottomSheetOpen, addWaypoint, undoWaypoint,
        showLayers, isBottomSheetOpen,
        showLoop, setShowLoop,
        reverseWaypoints
    } = useRouteStore();

    const { zoomIn, zoomOut, flyTo, fitBounds } = useMapContext();
    const { locate, isLocating } = useGeolocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLibrary, setShowLibrary] = useState(false);
    const [showLayerSelector, setShowLayerSelector] = useState(false);
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [gpxError, setGpxError] = useState<string | null>(null);

    const isDark = theme === 'dark';

    const brutalBox = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[4px_4px_0px_#1e293b]';

    const btn = `p-3 transition-transform duration-75 active:translate-x-1 active:translate-y-1 active:shadow-none ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} font-bold`;

    useEffect(() => {
        const state = decodeRouteFromUrl();
        if (!state) return;
        setRouteName(state.routeName);
        setRouteType(state.routeType);
        // Important: addWaypoint triggers the MapView effect
        state.waypoints.forEach((w) => addWaypoint(w.position, w.name));
        
        window.history.replaceState({}, '', window.location.pathname);
    }, [addWaypoint, setRouteName, setRouteType]);

    // Note: Auto-recalculate now handled by MapView reactive effect

    const handleLocate = useCallback(() => {
        locate();
        navigator.geolocation?.getCurrentPosition((pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            flyTo(lng, lat, 15);
            if (useRouteStore.getState().waypoints.length === 0) {
                setPointA([lng, lat]);
                setClickMode('setB');
            }
        });
    }, [locate, flyTo, setPointA, setClickMode]);

    // F4 — GPX Import
    const handleGpxImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setGpxError(null);

        try {
            const imported = await parseGpxFile(file);
            clearRoute();
            setRouteName(imported.name);
            setRouteGeometry(imported.geometry);
            setRouteSummary(null);
            setManeuvers([]);
            setElevationProfile(null);
            setRouteCoordinates(imported.coordinates);

            // Set waypoints
            imported.waypoints.forEach((w) => addWaypoint(w.position, w.name));

            // Fit map to route
            if (imported.coordinates.length) {
                fitBounds(imported.coordinates);
            }

            setIsBottomSheetOpen(true);
        } catch (err) {
            setGpxError(err instanceof Error ? err.message : 'Erreur import GPX');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [clearRoute, setRouteName, setRouteGeometry, setRouteSummary, setManeuvers, setElevationProfile, setRouteCoordinates, addWaypoint, fitBounds, setIsBottomSheetOpen]);

    return (
        <>
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 md:p-5 justify-between">

                {/* ── TOP ── */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="w-full max-w-md mx-auto pointer-events-auto space-y-2 px-2 md:px-0"
                >
                    {/* Search */}
                    <SearchBar isDark={isDark} />

                    {/* Route type + options */}
                    <div className="flex items-center gap-1.5 md:gap-2">
                        {/* Road/Gravel toggle */}
                        <div className={`${brutalBox} flex p-1 gap-1 flex-1 rounded-xl md:rounded-lg`}>
                            <button
                                onClick={() => setRouteType('road')}
                                className={`flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-tight transition-transform active:translate-y-[2px] rounded-lg md:rounded-md ${routeType === 'road' ? (isDark ? 'bg-slate-200 text-slate-900 border-2 border-slate-800' : 'bg-slate-800 text-white border-2 border-transparent') : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-200'}`}
                            >🚴 Route</button>
                            <button
                                onClick={() => setRouteType('gravel')}
                                className={`flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-tight transition-transform active:translate-y-[2px] rounded-lg md:rounded-md ${routeType === 'gravel' ? 'bg-amber-400 text-slate-900 border-2 border-slate-800' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-200'}`}
                            >🚵 Gravel</button>
                        </div>

                        {/* Undo & Reset */}
                        {waypoints.length > 0 && (
                            <div className="flex gap-1.5 md:gap-2 h-full">
                                <button onClick={undoWaypoint} className={`${brutalBox} p-2.5 md:p-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform rounded-xl md:rounded-lg`} title="Annuler le dernier point">
                                    <Undo2 className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                {waypoints.length >= 2 && (
                                    <button onClick={reverseWaypoints} className={`${brutalBox} p-2.5 md:p-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform rounded-xl md:rounded-lg`} title="Inverser le tracé">
                                        <ArrowLeftRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                )}
                                <button onClick={clearRoute} className={`${brutalBox} p-2.5 md:p-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform text-red-500 rounded-xl md:rounded-lg`} title="Tout effacer">
                                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* GPX error */}
                    {gpxError && (
                        <div className="bg-red-500 text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] px-3 py-2 text-xs font-bold flex items-center gap-2 mt-2 rounded-lg">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {gpxError}
                        </div>
                    )}
                </motion.div>

                {/* ── BOTTOM RIGHT: controls ── */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className={`flex flex-col gap-2 md:gap-3 pointer-events-auto self-end transition-all duration-300 ${isBottomSheetOpen ? 'mb-[45vh] md:mb-0' : 'mb-0 pb-16 md:pb-0'}`}
                >
                    {/* Zoom Tools - Hidden on Small Mobile to save space */}
                    <div className={`${brutalBox} hidden md:flex flex-col p-1 rounded-xl`}>
                        <button onClick={zoomIn} className={btn} title="Zoom avant"><Plus className="w-5 h-5 md:w-6 md:h-6" /></button>
                        <div className={`h-0.5 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                        <button onClick={zoomOut} className={btn} title="Zoom arrière"><Minus className="w-5 h-5 md:w-6 md:h-6" /></button>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 items-end justify-end">
                        {/* Map Management Group */}
                        <div className={`${brutalBox} flex flex-row md:flex-col p-1 rounded-xl md:rounded-2xl`}>
                            {/* Library */}
                            <button onClick={() => setShowLibrary(true)} className={btn} title="Mes parcours">
                                <FolderOpen className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <div className={`hidden md:block h-0.5 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            <div className={`md:hidden w-0.5 my-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            {/* Layers */}
                            <button
                                onClick={() => setShowLayerSelector(true)}
                                className={`${btn} ${showLayers ? (isDark ? 'text-amber-400' : 'text-amber-500') : ''}`}
                                title="Fonds de carte et Couches"
                            >
                                <Layers className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Quick Access Actions */}
                        {!routeSummary && (
                            <div className={`${brutalBox} flex flex-row md:flex-col p-1 rounded-xl md:rounded-2xl`}>
                                <button onClick={() => setShowLoop(true)} className={btn} title="Générer une boucle">
                                    <RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-brand-primary" />
                                </button>
                                <div className={`hidden md:block h-0.5 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                                <div className={`md:hidden w-0.5 my-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                                <button onClick={() => fileInputRef.current?.click()} className={btn} title="Importer un GPX">
                                    <Upload className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                                </button>
                            </div>
                        )}

                        {/* System Controls Group */}
                        <div className={`${brutalBox} flex flex-row md:flex-col p-1 rounded-xl md:rounded-2xl`}>
                            {/* AI Assistant */}
                            <button onClick={() => setShowAiAssistant(true)} className={btn} title="Assistant IA">
                                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 font-black" />
                            </button>
                            <div className={`hidden md:block h-0.5 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            <div className={`md:hidden w-0.5 my-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            {/* Theme */}
                            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={btn} title="Thème">
                                {isDark ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6 text-slate-800" />}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {/* Geoloc */}
                            <button onClick={handleLocate} className={`${brutalBox} ${btn} rounded-xl md:rounded-2xl p-4 md:p-5 ${isLocating ? 'animate-pulse bg-blue-50/50' : ''}`} title="Ma position">
                                <Navigation className={`w-6 h-6 md:w-7 md:h-7 ${isLocating ? 'text-blue-500' : ''}`} />
                            </button>

                            {/* Open/Close sheet Toggle */}
                            {routeSummary && (
                                <motion.button
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
                                    className="bg-brand-primary text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] p-4 md:p-5 flex items-center justify-center font-bold uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all relative rounded-xl md:rounded-2xl"
                                    title={isBottomSheetOpen ? "Masquer les statistiques" : "Afficher les statistiques"}
                                >
                                    <MapPin className="w-6 h-6 md:w-7 md:h-7" />
                                    {!isBottomSheetOpen && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-red rounded-full border-2 border-slate-800 animate-pulse" />
                                    )}
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Modals & Hidden Inputs */}
            <input id="gpx-import-input" ref={fileInputRef} type="file" accept=".gpx" className="hidden" onChange={handleGpxImport} />

            <AnimatePresence>
                {showLoop && <LoopModal isDark={isDark} onClose={() => setShowLoop(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showLibrary && <RouteLibrary isDark={isDark} onClose={() => setShowLibrary(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showLayerSelector && <LayerSelector isDark={isDark} onClose={() => setShowLayerSelector(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showAiAssistant && <AiAssistant isDark={isDark} onClose={() => setShowAiAssistant(false)} />}
            </AnimatePresence>
        </>
    );
};

export default OverlayUI;
