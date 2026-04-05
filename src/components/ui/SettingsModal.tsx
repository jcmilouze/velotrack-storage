import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Languages, Info } from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';
import type { Language } from '../../store/useRouteStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { language, setLanguage, theme } = useRouteStore();
    const isDark = theme === 'dark';

    const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-[#fdfbf7] border-slate-800';
    const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
    const subtleText = isDark ? 'text-slate-400' : 'text-slate-600';

    const languages: { code: Language; name: string; flag: string }[] = [
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className={`relative w-full max-w-md ${modalBg} border-[4px] rounded-[2rem] p-8 shadow-[8px_8px_0px_#1e293b]`}
                >
                    <button
                        onClick={onClose}
                        title="Fermer les paramètres"
                        className={`absolute top-6 right-6 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${textColor}`}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-brand-primary rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                            <Languages className="w-6 h-6 text-white" />
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Paramètres</h2>
                    </div>

                    <div className="space-y-8">
                        {/* Language Selection */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Globe className={`w-4 h-4 ${subtleText}`} />
                                <h3 className={`text-xs font-black uppercase tracking-widest ${subtleText}`}>Langue de l'application</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-[3px] transition-all font-bold text-sm
                                            ${language === lang.code 
                                                ? 'border-brand-primary bg-brand-primary/10 scale-[1.02] shadow-[4px_4px_0px_#FC4C02]' 
                                                : `border-transparent bg-slate-100 dark:bg-slate-800 opacity-60 hover:opacity-100 ${textColor}`
                                            }`}
                                    >
                                        <span className="text-xl">{lang.flag}</span>
                                        <span>{lang.name}</span>
                                    </button>
                                ))}
                            </div>
                            <p className={`text-[10px] font-bold mt-4 leading-relaxed ${subtleText}`}>
                                Note : Le changement de langue affecte les instructions de navigation (Turn-by-Turn) lors du prochain calcul d'itinéraire.
                            </p>
                        </section>

                        {/* About / Info */}
                        <section className={`pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Info className={`w-4 h-4 ${subtleText}`} />
                                <h3 className={`text-xs font-black uppercase tracking-widest ${subtleText}`}>À propos</h3>
                            </div>
                            <p className={`text-[11px] font-bold ${textColor}`}>
                                VeloTrack v1.4.2 — Built for adventurous cyclists.
                            </p>
                            <div className="flex gap-4 mt-4">
                                <a href="#" className="text-[10px] font-black uppercase text-brand-primary hover:underline">Confidentialité</a>
                                <a href="#" className="text-[10px] font-black uppercase text-brand-primary hover:underline">Conditions</a>
                            </div>
                        </section>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-10 py-4 bg-slate-900 dark:bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                        Enregistrer
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SettingsModal;
