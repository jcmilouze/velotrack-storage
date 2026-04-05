import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Check } from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import { useMapContext } from '../../context/MapContext';
import { buildLoopWaypoints, type CompassDirection } from '../../services/loopGenerator';

interface Props {
    onClose: () => void;
    isDark: boolean;
}

const DIRECTION_GRID: (CompassDirection | null)[][] = [
    ['NW', 'N', 'NE'],
    ['W', null, 'E'],
    ['SW', 'S', 'SE'],
];

const DIRECTION_LABELS: Record<CompassDirection, string> = {
    N: '↑', NE: '↗', E: '→', SE: '↘',
    S: '↓', SW: '↙', W: '←', NW: '↖',
};

const LoopModal: React.FC<Props> = ({ onClose, isDark }) => {
    const [distance, setDistance] = useState(50);
    const [directions, setDirections] = useState<CompassDirection[]>(['N']);
    const [rotationOffset, setRotationOffset] = useState(0);
    const [isGenerated, setIsGenerated] = useState(false);
    const { waypoints, clearRoute } = useRouteStore();
    const { mapRef } = useMapContext();

    const brutalModal = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-[1.5rem]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[8px_8px_0px_#1e293b] rounded-[1.5rem]';
    const subtle = isDark ? 'text-slate-400' : 'text-slate-600';
    const cardBg = isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-[#f1f1eb] border-2 border-slate-800';
    const btnHover = isDark ? 'hover:bg-slate-600 active:translate-y-0.5 border-2 border-transparent hover:border-slate-500' : 'hover:bg-slate-100 active:translate-y-0.5 border-2 border-transparent hover:border-slate-800';

    const departure = waypoints[0]?.position ?? (() => {
        const map = mapRef.current;
        if (!map) return null;
        const c = map.getCenter();
        return [c.lng, c.lat] as [number, number];
    })();

    // Auto-focus on departure point for context
    const { flyTo } = useMapContext();
    React.useEffect(() => {
        if (departure) {
            flyTo(departure[0], departure[1], 13);
        }
    }, [departure, flyTo]);

    const generate = useCallback((rotation: number) => {
        if (!departure) return;
        clearRoute();

        const loopWaypoints = buildLoopWaypoints({
            departure,
            targetDistanceKm: distance,
            directions,
            rotationDeg: rotation,
        });

        const store = useRouteStore.getState();
        store.setPointA(loopWaypoints[0]);

        loopWaypoints.slice(1, -1).forEach((pos, i) => {
            store.addWaypoint(pos, `Étape ${i + 1}`);
        });

        store.addWaypoint(loopWaypoints[loopWaypoints.length - 1], 'Retour départ');

        setIsGenerated(true);
    }, [departure, distance, directions, clearRoute]);

    const handleGenerate = useCallback(() => {
        setRotationOffset(0);
        generate(0);
    }, [generate]);

    const handleRegenerate = useCallback(() => {
        const nextRotation = rotationOffset + 30;
        setRotationOffset(nextRotation);
        generate(nextRotation);
    }, [generate, rotationOffset]);

    const toggleDirection = (dir: CompassDirection) => {
        setDirections(prev => {
            if (prev.includes(dir)) {
                if (prev.length === 1) return prev; // Must have 1
                return prev.filter(d => d !== dir);
            }
            if (prev.length >= 3) return prev; // Limit to 3
            return [...prev, dir];
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`${brutalModal} w-full max-w-sm mx-4 p-6 font-bold`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">🔄 Boucle auto</h2>
                        <p className={`text-xs ${subtle} mt-0.5 font-bold uppercase`}>Depuis : {departure ? `${departure[1].toFixed(4)}, ${departure[0].toFixed(4)}` : 'centre de la carte'}</p>
                    </div>
                    <button onClick={onClose} className={`p-2 transition-colors ${btnHover}`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Distance slider */}
                <div className={`${cardBg} p-4 mb-4 shadow-[4px_4px_0px_#1e293b]`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold uppercase tracking-tight">Distance cible</span>
                        <span className="text-3xl font-black text-brand-primary">{distance} km</span>
                    </div>
                    <input
                        type="range"
                        min={10} max={200} step={5}
                        value={distance}
                        onChange={(e) => setDistance(Number(e.target.value))}
                        className={`w-full h-3 appearance-none rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} border-[2px] border-slate-800 outline-none`}
                        style={{ accentColor: isDark ? '#FC4C02' : '#FC4C02' }}
                    />
                    <div className={`flex justify-between text-xs font-bold ${subtle} mt-2 uppercase`}>
                        <span>10 km</span>
                        <span>200 km</span>
                    </div>
                </div>

                {/* Direction picker */}
                <div className={`${cardBg} p-4 mb-5 shadow-[4px_4px_0px_#1e293b]`}>
                    <p className="text-sm font-bold uppercase tracking-tight mb-3">Direction</p>
                    <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto">
                        {DIRECTION_GRID.map((row, ri) =>
                            row.map((dir, ci) => (
                                dir === null ? (
                                    <div key={`${ri}-${ci}`} className="w-12 h-12 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-slate-800 opacity-20" />
                                    </div>
                                ) : (
                                    <button
                                        key={dir}
                                        onClick={() => toggleDirection(dir)}
                                        className={`w-12 h-12 text-xl font-bold transition-transform active:translate-y-1 active:shadow-none border-[2px] border-slate-800 shadow-[2px_2px_0px_#1e293b] rounded-xl ${directions.includes(dir)
                                            ? 'bg-brand-primary text-white'
                                            : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-50'
                                            }`}
                                        title={dir}
                                    >
                                        {DIRECTION_LABELS[dir]}
                                    </button>
                                )
                            ))
                        )}
                    </div>
                    <p className={`text-center text-xs font-bold ${subtle} mt-3 uppercase`}>
                        {directions.length} direction{directions.length > 1 ? 's' : ''} : <strong>{directions.join(' → ')}</strong>
                    </p>
                </div>

                {/* Buttons */}
                {!isGenerated ? (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        className="w-full py-4 rounded-2xl bg-brand-primary text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 transition-transform active:translate-y-1 active:shadow-none"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Générer la boucle
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleRegenerate}
                            className={`flex-1 py-4 rounded-2xl border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:translate-y-1 active:shadow-none ${isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Autre boucle
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-brand-primary text-white border-[3px] border-slate-800 shadow-[4px_4px_0px_#1e293b] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 transition-transform active:translate-y-1 active:shadow-none"
                        >
                            <Check className="w-4 h-4" />
                            Valider
                        </button>
                    </div>
                )}

                <p className={`text-[10px] font-bold uppercase ${subtle} text-center mt-3`}>
                    {isGenerated ? `Variante ${rotationOffset / 30 + 1} · rotation ${rotationOffset}°` : 'La distance finale dépendra des routes existantes.'}
                </p>
            </motion.div>
        </motion.div>
    );
};

export default LoopModal;
