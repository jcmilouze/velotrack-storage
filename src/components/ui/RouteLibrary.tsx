import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, MapPin, Clock, Mountain, Download, ChevronRight } from 'lucide-react';
import { routeLibrary, type SavedRoute } from '../../services/routeLibrary';
import { useRouteStore } from '../../store/useRouteStore';
import { downloadGpx } from '../../services/gpxExport';
import { formatDistance, formatDuration } from '../../services/routingService';

interface Props {
    onClose: () => void;
    isDark: boolean;
}

const RouteLibrary: React.FC<Props> = ({ onClose, isDark }) => {
    const [routes, setRoutes] = useState<SavedRoute[]>([]);
    const store = useRouteStore();

    useEffect(() => {
        setRoutes(routeLibrary.getAll());
    }, []);

    const handleLoad = useCallback((route: SavedRoute) => {
        store.clearRoute();
        store.setRouteName(route.name);
        store.setRouteType(route.routeType);
        if (route.routeGeometry) store.setRouteGeometry(route.routeGeometry);
        if (route.summary) store.setRouteSummary(route.summary);
        store.setManeuvers(route.maneuvers);
        if (route.elevationProfile) store.setElevationProfile(route.elevationProfile);
        if (route.coordinates) store.setRouteCoordinates(route.coordinates);
        store.setIsBottomSheetOpen(true);
        onClose();
    }, [store, onClose]);

    const handleDelete = useCallback((id: string) => {
        routeLibrary.delete(id);
        setRoutes(routeLibrary.getAll());
    }, []);

    const handleExport = useCallback((route: SavedRoute) => {
        downloadGpx({
            routeName: route.name,
            coordinates: route.coordinates,
            summary: route.summary,
            elevationProfile: route.elevationProfile,
            routeType: route.routeType,
        });
    }, []);

    const brutalSheet = isDark
        ? 'bg-slate-900 border-[3px] border-slate-700 text-slate-100 shadow-[-8px_8px_0px_rgba(0,0,0,0.5)] rounded-l-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[-8px_8px_0px_#1e293b] rounded-l-[1.5rem]';
    const subtle = isDark ? 'text-slate-400' : 'text-slate-600';
    const itemBg = isDark ? 'bg-slate-800 border-2 border-slate-700 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]' : 'bg-white border-2 border-slate-800 shadow-[4px_4px_0px_#1e293b]';
    const btnHover = isDark ? 'hover:bg-slate-700 active:translate-y-0.5 border-2 border-transparent hover:border-slate-600' : 'hover:bg-slate-200 active:translate-y-0.5 border-2 border-transparent hover:border-slate-800';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-start justify-end bg-black/40 backdrop-blur-sm p-4 md:p-5"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`${brutalSheet} w-full max-w-sm h-full max-h-[90vh] flex flex-col font-bold`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-3">
                    <h2 className="text-xl font-bold uppercase tracking-tight">📁 Mes parcours</h2>
                    <button onClick={onClose} className={`p-2 transition-colors ${btnHover}`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Route list */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {routes.length === 0 ? (
                        <div className={`text-center py-12 ${subtle}`}>
                            <p className="text-4xl mb-2">🗂️</p>
                            <p className="text-lg font-bold">Aucun parcours sauvegardé</p>
                            <p className="text-sm mt-1 uppercase">Calculez un itinéraire et cliquez sur "Sauver"</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {routes.map((route) => (
                                <div key={route.id} className={`${itemBg} p-4 transition-colors`}>
                                    {/* Title + type badge */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-lg truncate uppercase">{route.name}</p>
                                            <p className={`text-xs ${subtle} mt-0.5 font-bold`}>
                                                {new Date(route.savedAt).toLocaleDateString('fr-FR', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-[0.5rem] border-[2px] shadow-[2px_2px_0px_#1e293b] border-slate-800 ${route.routeType === 'gravel'
                                            ? 'bg-amber-400 text-slate-900'
                                            : 'bg-brand-primary text-white'
                                            }`}>
                                            {route.routeType === 'gravel' ? '🚵' : '🚴'}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    {route.summary && (
                                        <div className={`flex gap-3 text-sm font-bold ${subtle} mb-3 uppercase tracking-tighter`}>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {formatDistance(route.summary.length)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatDuration(route.summary.time)}
                                            </span>
                                            {route.elevationProfile && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <Mountain className="w-4 h-4" />
                                                    +{route.elevationProfile.ascent}m
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleLoad(route)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-[3px] shadow-[4px_4px_0px_#1e293b] transition-transform active:translate-y-1 active:shadow-none uppercase font-bold text-xs ${isDark ? 'bg-slate-200 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-800 text-white hover:bg-slate-700'}`}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            Charger
                                        </button>
                                        <button
                                            onClick={() => handleExport(route)}
                                            className={`p-2 rounded-xl border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] bg-amber-400 text-slate-900 hover:bg-amber-300 transition-transform active:translate-y-1 active:shadow-none text-xs`}
                                            title="Exporter GPX"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(route.id)}
                                            className={`p-2 rounded-xl border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] bg-red-500 text-white hover:bg-red-600 transition-transform active:translate-y-1 active:shadow-none text-xs`}
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default RouteLibrary;
