import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Minus, Navigation, Sun, Moon, RotateCcw, Undo2, MapPin,
    RefreshCw, FolderOpen, Upload, Layers, AlertTriangle
} from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { useMapContext } from '../../context/MapContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateRoute } from '../../services/routingService';
import { parseGpxFile } from '../../services/gpxImport';
import { decodeRouteFromUrl } from '../../services/urlSharing';
import SearchBar from './SearchBar';
import LoopModal from './LoopModal';
import RouteLibrary from './RouteLibrary';

const OverlayUI: React.FC = () => {
    const {
        theme, setTheme,
        waypoints, clearRoute, setPointA,
        routeSummary, routeType, setRouteType,
        setClickMode, setRouteName,
        setRouteGeometry, setRouteSummary, setManeuvers,
        setElevationProfile, setRouteCoordinates,
        setIsBottomSheetOpen, addWaypoint, undoWaypoint,
        showLayers, setShowLayers, routeCoordinates, isBottomSheetOpen,
    } = useRouteStore();

    const { zoomIn, zoomOut, flyTo } = useMapContext();
    const { locate, isLocating } = useGeolocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLoop, setShowLoop] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [gpxError, setGpxError] = useState<string | null>(null);

    const isDark = theme === 'dark';

    const brutalBox = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[4px_4px_0px_#1e293b]';

    const btn = `p-3 transition-transform duration-75 active:translate-x-1 active:translate-y-1 active:shadow-none ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} font-bold`;

    // Restore route from shared URL on mount
    useEffect(() => {
        const state = decodeRouteFromUrl();
        if (!state) return;
        setRouteName(state.routeName);
        setRouteType(state.routeType);
        const positions = state.waypoints.map((w) => w.position);
        state.waypoints.forEach((w) => addWaypoint(w.position, w.name));
        if (positions.length >= 2) {
            calculateRoute(positions, state.routeType);
        }
        // Clean URL params without reload
        window.history.replaceState({}, '', window.location.pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-recalculate when routeType changes
    useEffect(() => {
        if (waypoints.length >= 2) {
            calculateRoute(waypoints.map((w) => w.position), routeType);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeType]);

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
                useMapContext().fitBounds(imported.coordinates);
            }

            setIsBottomSheetOpen(true);
        } catch (err) {
            setGpxError(err instanceof Error ? err.message : 'Erreur import GPX');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [clearRoute, setRouteName, setRouteGeometry, setRouteSummary, setManeuvers, setElevationProfile, setRouteCoordinates, addWaypoint, flyTo, setIsBottomSheetOpen]);

    // F8 — Toggle Waymarked Trails overlay
    const handleLayersToggle = () => setShowLayers(!showLayers);

    return (
        <>
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 md:p-5 justify-between">

                {/* ── TOP ── */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="w-full max-w-md mx-auto pointer-events-auto space-y-2"
                >
                    {/* Search */}
                    <SearchBar isDark={isDark} />

                    {/* Route type + options */}
                    <div className="flex items-center gap-2">
                        {/* Road/Gravel toggle */}
                        <div className={`${brutalBox} flex p-1 gap-1 flex-1`}>
                            <button
                                onClick={() => setRouteType('road')}
                                className={`flex-1 py-1.5 text-xs font-bold transition-transform active:translate-y-[2px] ${routeType === 'road' ? (isDark ? 'bg-slate-200 text-slate-900 border-2 border-slate-800' : 'bg-slate-800 text-white border-2 border-transparent') : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-200'}`}
                            >🚴 Route</button>
                            <button
                                onClick={() => setRouteType('gravel')}
                                className={`flex-1 py-1.5 text-xs font-bold transition-transform active:translate-y-[2px] ${routeType === 'gravel' ? 'bg-amber-400 text-slate-900 border-2 border-slate-800' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-200'}`}
                            >🚵 Gravel</button>
                        </div>

                        {/* Respan to fill the gap if needed, but road/gravel is flex-1 */}

                        {/* Undo & Reset */}
                        {waypoints.length > 0 && (
                            <div className="flex gap-2 h-full">
                                <button onClick={undoWaypoint} className={`${brutalBox} p-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform`} title="Annuler le dernier point">
                                    <Undo2 className="w-5 h-5" />
                                </button>
                                <button onClick={clearRoute} className={`${brutalBox} p-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform text-red-500`} title="Tout effacer">
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* GPX error */}
                    {gpxError && (
                        <div className="bg-red-500 text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] px-3 py-2 text-xs font-bold flex items-center gap-2 mt-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {gpxError}
                        </div>
                    )}
                </motion.div>

                {/* ── BOTTOM RIGHT: controls ── */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className={`flex flex-col gap-3 pointer-events-auto self-end transition-all duration-300 ${isBottomSheetOpen ? 'mb-[50vh] md:mb-0' : 'mb-0'}`}
                >
                    {/* Action group */}
                    <div className={`${brutalBox} flex flex-col p-1`}>
                        {/* Loop generator */}
                        <button onClick={() => setShowLoop(true)} className={btn} title="Générer une boucle (Auto-Route)">
                            <RefreshCw className="w-6 h-6 text-brand-primary" />
                        </button>
                        <div className={`h-1 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                        {/* Library */}
                        <button onClick={() => setShowLibrary(true)} className={btn} title="Mes parcours">
                            <FolderOpen className="w-6 h-6" />
                        </button>
                        <div className={`h-1 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                        {/* Import GPX */}
                        <button onClick={() => fileInputRef.current?.click()} className={btn} title="Importer un GPX">
                            <Upload className="w-6 h-6" />
                        </button>
                        <input ref={fileInputRef} type="file" accept=".gpx" className="hidden" onChange={handleGpxImport} />
                        <div className={`h-1 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                        {/* Layers */}
                        <button
                            onClick={handleLayersToggle}
                            className={`${btn} ${showLayers ? (isDark ? 'bg-amber-400 text-slate-900 border-[2px] border-slate-800 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]' : 'bg-amber-400 text-slate-900 border-[2px] border-slate-800 shadow-[2px_2px_0px_#1e293b]') : ''}`}
                            title="Couches carte"
                        >
                            <Layers className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Zoom & Fit */}
                    <div className={`${brutalBox} flex flex-col p-1`}>
                        <button onClick={zoomIn} className={btn} title="Zoom avant"><Plus className="w-6 h-6" /></button>
                        <div className={`h-1 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                        {routeCoordinates.length > 0 && (
                            <>
                                <button onClick={() => useMapContext().fitBounds(routeCoordinates)} className={btn} title="Centrer sur le parcours">
                                    <Layers className="w-6 h-6 text-blue-500" />
                                </button>
                                <div className={`h-1 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-800'}`} />
                            </>
                        )}
                        <button onClick={zoomOut} className={btn} title="Zoom arrière"><Minus className="w-6 h-6" /></button>
                    </div>

                    {/* Geoloc */}
                    <button onClick={handleLocate} className={`${brutalBox} ${btn} p-4 ${isLocating ? 'animate-pulse' : ''}`} title="Ma position">
                        <Navigation className={`w-6 h-6 ${isLocating ? 'text-blue-500' : ''}`} />
                    </button>

                    {/* Theme */}
                    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`${brutalBox} ${btn} p-4`} title="Thème">
                        {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-800" />}
                    </button>

                    {/* Open sheet */}
                    {routeSummary && (
                        <motion.button
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            onClick={() => setIsBottomSheetOpen(true)}
                            className="bg-brand-primary text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] p-4 flex items-center justify-center font-bold uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                            title="Voir les étapes"
                        >
                            <MapPin className="w-6 h-6" />
                        </motion.button>
                    )}
                </motion.div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showLoop && <LoopModal isDark={isDark} onClose={() => setShowLoop(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showLibrary && <RouteLibrary isDark={isDark} onClose={() => setShowLibrary(false)} />}
            </AnimatePresence>
        </>
    );
};

export default OverlayUI;
