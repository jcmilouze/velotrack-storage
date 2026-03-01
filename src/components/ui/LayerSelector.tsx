import React from 'react';
import { motion } from 'framer-motion';
import { X, Layers, Map as MapIcon, Satellite } from 'lucide-react';
import { useRouteStore, type MapStyle } from '../../store/useRouteStore';

interface Props {
    onClose: () => void;
    isDark: boolean;
}

const LayerSelector: React.FC<Props> = ({ onClose, isDark }) => {
    const { mapStyle, setMapStyle, showLayers, setShowLayers } = useRouteStore();

    const brutalModal = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[8px_8px_0px_#1e293b] rounded-[1.5rem]';
    const subtle = isDark ? 'text-slate-400' : 'text-slate-600';
    const cardBg = isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-[#f1f1eb] border-2 border-slate-800';
    const btnHover = isDark ? 'hover:bg-slate-600 active:translate-y-0.5 border-2 border-transparent hover:border-slate-500' : 'hover:bg-slate-100 active:translate-y-0.5 border-2 border-transparent hover:border-slate-800';

    const renderStyleButton = (id: MapStyle, label: string, icon: React.ReactNode) => {
        const isActive = mapStyle === id;
        return (
            <button
                onClick={() => setMapStyle(id)}
                className={`py-3 px-2 flex flex-col items-center justify-center gap-2 border-[2px] shadow-[2px_2px_0px_#1e293b] rounded-xl transition-transform active:translate-y-1 active:shadow-none
                    ${isActive
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : isDark ? 'bg-slate-800 text-slate-300 border-slate-800 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-800 hover:bg-slate-50'}`}
            >
                {icon}
                <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
            </button>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`${brutalModal} w-full max-w-sm mx-4 p-6 font-bold flex flex-col`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">🗺️ Fonds de Carte</h2>
                    </div>
                    <button onClick={onClose} className={`p-2 transition-colors rounded-full ${btnHover}`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Base Maps */}
                <div className={`${cardBg} p-4 mb-4 shadow-[4px_4px_0px_#1e293b]`}>
                    <p className="text-sm font-bold uppercase tracking-tight mb-3">Style de base</p>
                    <div className="grid grid-cols-2 gap-3">
                        {renderStyleButton('auto', 'Défaut', <MapIcon className="w-6 h-6" />)}
                        {renderStyleButton('outdoors', 'Gravel / Topo', <MapIcon className="w-6 h-6 text-emerald-500" />)}
                        {renderStyleButton('satellite', 'Satellite HD', <Satellite className="w-6 h-6 text-blue-500" />)}
                    </div>
                </div>

                {/* Overlays */}
                <div className={`${cardBg} p-4 shadow-[4px_4px_0px_#1e293b]`}>
                    <p className="text-sm font-bold uppercase tracking-tight mb-3">Couches Spécifiques (Overlays)</p>
                    <button
                        onClick={() => setShowLayers(!showLayers)}
                        className={`w-full py-4 rounded-xl border-[2px] border-slate-800 shadow-[2px_2px_0px_#1e293b] font-black text-sm uppercase tracking-wider flex items-center justify-between px-4 transition-all active:translate-y-1 active:shadow-none
                            ${showLayers
                                ? 'bg-amber-400 text-slate-900'
                                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-900'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            Pistes Cyclables
                        </div>
                        <div className={`w-10 h-6 rounded-full flex items-center px-1 ${showLayers ? 'bg-slate-900' : 'bg-slate-300'} transition-colors`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showLayers ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>
                    <p className={`text-[10px] font-bold uppercase ${subtle} mt-3`}>
                        Affiche le réseau cyclable officiel mondial (Waymarked Trails) par-dessus la carte.
                    </p>
                </div>

            </motion.div>
        </motion.div>
    );
};

export default LayerSelector;
