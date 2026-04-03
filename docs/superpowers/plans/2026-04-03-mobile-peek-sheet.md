# Mobile Peek Sheet + Inverser le tracé — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur mobile, le BottomSheet reste en mode "peek" (bandeau 90px) par défaut au lieu de cacher la carte, et une nouvelle action "Inverser le tracé" est disponible.

**Architecture:** Ajout d'un état `peekState` local dans BottomSheet (hidden/peek/expanded) géré uniquement côté composant. La logique de routage et le store ne changent pas, sauf l'ajout de `reverseWaypoints()`. Sur desktop (`md+`) tout reste identique.

**Tech Stack:** React, TypeScript, Zustand, Framer Motion, Tailwind CSS, Lucide React

---

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/store/useRouteStore.ts` | Ajouter `reverseWaypoints()` dans le store |
| `src/components/ui/BottomSheet.tsx` | Logique peek/expanded, contenu du bandeau peek |
| `src/components/ui/OverlayUI.tsx` | Bouton "Inverser" dans les contrôles flottants droits (mobile) |

---

## Task 1 : `reverseWaypoints()` dans le store

**Files:**
- Modify: `src/store/useRouteStore.ts`

- [ ] **Step 1 : Ajouter la signature dans l'interface**

Dans `src/store/useRouteStore.ts`, dans l'interface `RouteState` (après `cleanupWaypoints: () => void;` ligne 74) :

```typescript
    reverseWaypoints: () => void;
```

- [ ] **Step 2 : Implémenter l'action dans le store**

Dans le corps du store (après le bloc `cleanupWaypoints`, avant la fermeture `}));`), ajouter :

```typescript
    reverseWaypoints: () => set((state) => {
        if (state.waypoints.length < 2) return state;
        const reversed = reLabelWaypoints([...state.waypoints].reverse());
        return { waypoints: reversed };
    }),
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
cd C:\Users\mimilouze\.gemini\antigravity\scratch\velotrack
npx tsc --noEmit
```

Expected : aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add src/store/useRouteStore.ts
git commit -m "feat: add reverseWaypoints action to store"
```

---

## Task 2 : Bouton "Inverser" dans les contrôles flottants (OverlayUI)

**Files:**
- Modify: `src/components/ui/OverlayUI.tsx`

- [ ] **Step 1 : Importer l'icône et l'action**

En haut de `OverlayUI.tsx`, ajouter `ArrowLeftRight` dans l'import lucide :

```typescript
import {
    Plus, Minus, Navigation, Sun, Moon, RotateCcw, Undo2, MapPin,
    RefreshCw, FolderOpen, Layers, AlertTriangle, Upload, Sparkles, ArrowLeftRight
} from 'lucide-react';
```

Dans le destructuring du store (ligne ~21), ajouter `reverseWaypoints` :

```typescript
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
```

- [ ] **Step 2 : Ajouter le bouton dans la zone Undo/Reset**

Remplacer le bloc conditionnel `{waypoints.length > 0 && (` (lignes ~132-141) par :

```tsx
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
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/ui/OverlayUI.tsx
git commit -m "feat: add reverse route button in floating controls"
```

---

## Task 3 : BottomSheet — logique peek/expanded + contenu peek

**Files:**
- Modify: `src/components/ui/BottomSheet.tsx`

### 3a — État et logique peek

- [ ] **Step 1 : Ajouter l'état peekState et imports**

Après les imports existants, ajouter `ArrowLeftRight` et `ArrowUp` dans l'import lucide :

```typescript
import {
    ChevronDown, MapPin, Clock, RotateCcw, ArrowUpCircle, ArrowDownCircle,
    Download, CheckCircle2, Edit3, Flame,
    CornerDownRight, Navigation, RefreshCw, Layers, Upload, Activity, Loader2,
    ArrowLeftRight, ArrowUp
} from 'lucide-react';
```

Ajouter `reverseWaypoints` dans le destructuring du store (après `clearRoute,`) :

```typescript
    const {
        isBottomSheetOpen, setIsBottomSheetOpen,
        theme, elevationProfile, routeCoordinates,
        routeType, routeName, setRouteName,
        waypoints, closeLoop, setShowLoop,
        routeSummary, clearRoute,
        reverseWaypoints,
    } = useRouteStore();
```

Ajouter l'état local après les useState existants (après ligne `const [weather, ...]`) :

```typescript
    // Mobile peek state: 'peek' = bandeau 90px, 'expanded' = 85vh
    const [mobileExpanded, setMobileExpanded] = useState(false);
```

- [ ] **Step 2 : Auto-collapse vers peek quand le sheet s'ouvre**

Remplacer l'effet météo existant (lignes ~47-51) par deux effets séparés :

```typescript
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
```

### 3b — Visibilité : le sheet est visible dès le 1er waypoint sur mobile

- [ ] **Step 3 : Adapter la condition d'affichage**

Actuellement le composant retourne `null` quand `!isBottomSheetOpen`. Il faut que sur mobile le bandeau peek soit visible dès qu'il y a des waypoints.

Remplacer le `return (` et `<AnimatePresence>` autour du `motion.div` principal pour gérer les deux cas :

La logique de visibilité devient :
- **Mobile** : visible si `waypoints.length > 0` (peek) ou `isBottomSheetOpen && mobileExpanded` (expanded)
- **Desktop** : visible si `isBottomSheetOpen` (comportement inchangé)

Modifier la condition de l'`AnimatePresence` :

```tsx
    // Le sheet est visible sur mobile dès qu'il y a des waypoints (peek)
    // Sur desktop, uniquement quand isBottomSheetOpen
    const isMobileVisible = waypoints.length > 0;
    const isVisible = isBottomSheetOpen || isMobileVisible;

    return (
        <AnimatePresence>
            {isVisible && (
```

### 3c — Hauteur dynamique selon l'état

- [ ] **Step 4 : Gérer la hauteur mobile**

Remplacer le `style={{ maxHeight: '85vh' }}` et les classes du `motion.div` principal :

```tsx
<motion.div
    initial={{ y: '100%', opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: '100%', opacity: 0 }}
    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
    className={`
        absolute bottom-0 left-0 right-0 z-20 pointer-events-auto
        md:bottom-5 md:left-auto md:right-20 md:w-96
        ${brutalSheet} flex flex-col font-bold
    `}
    style={{
        maxHeight: mobileExpanded ? '85vh' : undefined,
        height: !mobileExpanded ? '90px' : undefined,
    }}
>
```

Note : sur desktop (`md+`), les styles inline sont ignorés par Tailwind — le comportement desktop reste géré par la classe `md:` et `isBottomSheetOpen`.

### 3d — Contenu du bandeau Peek

- [ ] **Step 5 : Afficher le bandeau peek (remplacer le header)**

Remplacer le bloc `{/* Mobile handle & Header (Non-scrolling) */}` (lignes ~149-174) par :

```tsx
{/* ── PEEK BAND (mobile only, non-scrollable) ── */}
{!mobileExpanded && (
    <div
        className="flex-shrink-0 px-4 h-[90px] flex flex-col justify-center gap-2 cursor-pointer md:hidden"
        onClick={() => setMobileExpanded(true)}
    >
        {/* Stats row */}
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

        {/* Action row (contextual) */}
        <div className="flex gap-2">
            {waypoints.length >= 2 && (
                <button
                    onClick={(e) => { e.stopPropagation(); reverseWaypoints(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black rounded-lg ${cardBg}`}
                >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Inverser
                </button>
            )}
            {canCloseLoop && (
                <button
                    onClick={(e) => { e.stopPropagation(); closeLoop(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black rounded-lg bg-brand-primary text-white border-2 border-slate-800"
                >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Fermer boucle
                </button>
            )}
        </div>
    </div>
)}

{/* ── DESKTOP HEADER / EXPANDED HEADER ── */}
{(mobileExpanded || true) && (
    <div className={`flex-shrink-0 px-5 pt-3 ${!mobileExpanded ? 'hidden md:block' : ''}`}>
        <div className="flex justify-center mb-3 md:hidden">
            <button
                onClick={() => setMobileExpanded(false)}
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
)}
```

- [ ] **Step 6 : Conditionner le contenu scrollable**

Entourer le `{/* Scrollable Content */}` existant d'une condition pour qu'il ne s'affiche qu'en mode expanded sur mobile :

```tsx
{/* Scrollable Content — hidden on mobile peek */}
{(mobileExpanded || typeof window !== 'undefined' && window.innerWidth >= 768) && (
    <div className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar md:block">
        {/* ... tout le contenu existant inchangé ... */}
    </div>
)}
```

Note : Tailwind ne peut pas conditionner côté JS — utiliser une classe CSS à la place :

```tsx
<div className={`flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar ${mobileExpanded ? 'block' : 'hidden md:block'}`}>
```

- [ ] **Step 7 : Ajouter le bouton "Inverser le tracé" dans le sheet étendu**

Dans le bloc `{/* Action buttons row (Cleanup & Close Loop) */}` (après le bouton "Optimiser les points"), ajouter avant "Fermer la boucle" :

```tsx
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
```

- [ ] **Step 8 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur TypeScript.

- [ ] **Step 9 : Lancer le dev server et tester manuellement**

```bash
npm run dev
```

Vérifier sur mobile (DevTools → iPhone SE) :
1. Aucun waypoint → carte pleine, aucun bandeau
2. 1er waypoint posé → bandeau peek 90px apparaît avec "1 point"
3. Route calculée → bandeau peek affiche distance + temps + D+
4. Tap sur le bandeau → s'étend à 85vh
5. Drag du handle → repasse en peek
6. Bouton "Inverser" dans peek → inverse les waypoints sans ouvrir le sheet
7. Desktop → comportement inchangé

- [ ] **Step 10 : Commit**

```bash
git add src/components/ui/BottomSheet.tsx
git commit -m "feat: mobile peek sheet with 3-state behavior and reverse route action"
```

---

## Self-Review

**Spec coverage :**
- ✅ Bandeau peek 90px sur mobile dès le 1er waypoint
- ✅ Stats : distance + temps + D+ dans le peek
- ✅ Pendant tracé : compteur de points dans le peek
- ✅ Swipe/tap pour étendre à 85vh
- ✅ `reverseWaypoints()` dans le store
- ✅ Bouton inverser dans peek (contextuel)
- ✅ Bouton inverser dans sheet étendu
- ✅ Bouton inverser dans les contrôles flottants (OverlayUI)
- ✅ "Fermer la boucle" dans le peek (contextuel)
- ✅ Desktop inchangé

**Consistance des types :**
- `reverseWaypoints` défini en Task 1, utilisé en Task 2 et Task 3 — noms identiques ✅
- `mobileExpanded: boolean` utilisé de façon cohérente dans tout Task 3 ✅
- `canCloseLoop` déjà défini dans BottomSheet.tsx (ligne ~127) — réutilisé dans le peek ✅
