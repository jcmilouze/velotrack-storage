import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { searchAddress, type GeocodingResult } from '../../services/geocodingService';
import { useRouteStore } from '../../store/useRouteStore';
import { useMapContext } from '../../context/MapContext';

interface SearchBarProps {
    isDark: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ isDark }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { flyTo } = useMapContext();
    const { waypoints, addWaypoint, setClickMode } = useRouteStore();

    const brutalBox = isDark
        ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[4px_4px_0px_#1e293b]';

    const dropdownBg = isDark ? 'bg-slate-800 border-[3px] border-slate-700 text-slate-100 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]' : 'bg-[#fdfbf7] border-[3px] border-slate-800 text-slate-900 shadow-[4px_4px_0px_#1e293b]';
    const itemHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';
    const subtleText = isDark ? 'text-slate-400' : 'text-slate-500';


    // Debounced search
    useEffect(() => {
        if (!query.trim() || query.length < 3) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            setIsSearching(true);
            try {
                const res = await searchAddress(query, abortRef.current.signal);
                setResults(res);
                setIsOpen(res.length > 0);
            } catch {
                // Ignore abort errors
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const handleSelect = useCallback((result: GeocodingResult) => {
        flyTo(result.lng, result.lat, 14);

        // Add as waypoint if not just browsing
        addWaypoint([result.lng, result.lat], result.shortName);

        // Advance clickMode
        const wps = useRouteStore.getState().waypoints;
        if (wps.length >= 2) setClickMode('setA');

        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.blur();
    }, [flyTo, addWaypoint, setClickMode]);

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const waypointCount = waypoints.length;
    const nextLabel = waypointCount === 0 ? 'Départ' : waypointCount === 1 ? 'Arrivée' : `Étape ${waypointCount - 1}`;

    return (
        <div className="relative w-full">
            {/* Search input */}
            <div className={`${brutalBox} flex items-center px-4 py-3 gap-3 transition-all font-bold`}>
                {isSearching
                    ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                    : <Search className={`w-4 h-4 flex-shrink-0 ${subtleText}`} />
                }
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={`Rechercher ${nextLabel}...`}
                    className="bg-transparent border-none outline-none flex-1 text-sm font-medium placeholder:opacity-50 min-w-0"
                />
                {query && (
                    <button onClick={handleClear} className={`flex-shrink-0 ${subtleText} hover:opacity-80`}>
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown results */}
            {isOpen && results.length > 0 && (
                <div className={`absolute top-full mt-2 left-0 right-0 z-50 ${dropdownBg} overflow-hidden font-bold`}>
                    {results.map((result, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelect(result)}
                            className={`w-full text-left px-4 py-3 ${itemHover} flex items-start gap-3 transition-colors border-b-2 last:border-b-0 ${isDark ? 'border-slate-700' : 'border-slate-800'}`}
                        >
                            <MapPin className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{result.shortName}</p>
                                <p className={`text-xs truncate ${subtleText}`}>{result.displayName}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
