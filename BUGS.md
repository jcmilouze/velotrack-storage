# VeloTrack — Bug Tracker

> Audit initial : 2026-04-03  
> Stratégie : deepseek-r1:14b (analyse) + qwen3.5:35b (review)

---

## 🔴 CRITIQUE

| # | Fichier | Ligne | Description | Statut |
|---|---------|-------|-------------|--------|
| C1 | `stravaService.ts` | 25 | `VITE_STRAVA_CLIENT_SECRET` exposé en frontend — OAuth2 secret ne doit JAMAIS être côté client | ⚠️ PARTIAL — bloqué en prod, backend proxy requis |
| C2 | `routingService.ts` | 244 | `parseBRouterResponse()` ne retourne pas `snappedLocations` → crash si BRouter utilisé | ⬜ OPEN |
| C3 | `gpxExport.ts` | 28 | Division par zéro si `totalPoints === 1` (`index / (totalPoints - 1)`) | ⬜ OPEN |
| C4 | `weatherService.ts` | 44 | Modulo wind direction : `Math.round(350/45) = 8`, `dirs[8] = undefined`. Fix : `((Math.round(deg/45) % 8) + 8) % 8` | ⬜ OPEN |
| C5 | `geocodingService.ts` | 15 | Race condition throttling : `lastRequestTime` non-atomique, appels parallèles bypasse rate limit | ⬜ OPEN |
| C6 | `MapView.tsx` | 104 | Distance flicker prevention utilise Manhattan distance au lieu d'Euclidienne — marqueurs mal positionnés | ⬜ OPEN |
| C7 | `useRouteStore.ts` | 95 | `getIsClosed` compare degrés décimaux absolus (0.0001°) : tolérance latitude-dépendante (~11m équateur, ~5m à 60°N) | ⬜ OPEN |
| C8 | `AiAssistant.tsx` | 100 | Double `JSON.parse` non sécurisée sur réponse API — XSS possible si serveur compromis | ⬜ OPEN |

---

## 🟠 MAJEUR

### Services

| # | Fichier | Ligne | Description | Statut |
|---|---------|-------|-------------|--------|
| M1 | `elevationService.ts` | 28 | Edge case : division possible si `coords.length === 0` dans `sampleCoordinates()` | ⬜ OPEN |
| M2 | `elevationService.ts` | 52 | `data.height ?? data.heights` fragile — si les deux absents, retourne array vide sans erreur | ⬜ OPEN |
| M3 | `elevationService.ts` | 73 | Fallback `sampled` au lieu de données Valhalla — coords d'élévation ne correspondent pas aux hauteurs | ⬜ OPEN |
| M4 | `gpxExport.ts` | 119 | Memory leak : `setTimeout(1000)` pour Blob URL — délai insuffisant sur navigateurs lents | ⬜ OPEN |
| M5 | `gpxExport.ts` | 20 | Échappement XML incomplet : manque `'` (apostrophe) et caractères de contrôle | ⬜ OPEN |
| M6 | `gpxImport.ts` | 60 | `coordinates = points as number[][]` : perte élévation (3e élément) lors création GeoJSON | ⬜ OPEN |
| M7 | `gpxImport.ts` | 20 | `parseFloat(...?? '0')` peut générer `[NaN, NaN]` sans validation | ⬜ OPEN |
| M8 | `loopGenerator.ts` | 120 | Jitter `Math.random()` non maîtrisé : waypoints peuvent être trop proches si directions voisines | ⬜ OPEN |
| M9 | `loopGenerator.ts` | 143 | Doublon de waypoint départ : `keyPoints` contient déjà le premier point | ⬜ OPEN |
| M10 | `overpassService.ts` | 49 | Pas d'`AbortController` côté fetch — requête continue après timeout API OverPass | ⬜ OPEN |
| M11 | `overpassService.ts` | 57 | URL `encodeURIComponent` peut dépasser 2000 chars → rejetée par proxies/navigateurs | ⬜ OPEN |
| M12 | `routeLibrary.ts` | 15 | `routeGeometry: any | null` — perte totale de typage, source de bugs en aval | ⬜ OPEN |
| M13 | `routeLibrary.ts` | 52 | `persist(routes.slice(0, 50))` : troncage silencieux sans alerte utilisateur | ⬜ OPEN |
| M14 | `routingService.ts` | 263 | Fallback engines (gravel) sans ordre de priorité clair — pas de fallback si Valhalla et BRouter échouent | ⬜ OPEN |
| M15 | `routingService.ts` | 165 | OSRM retourne `[lng, lat]` — parsing `wp.location` peut être dans mauvais ordre | ⬜ OPEN |
| M16 | `segmentService.ts` | 59 | Paramètres `[lng, lat]` potentiellement inversés par convention vs GeoJSON | ⬜ OPEN |
| M17 | `segmentService.ts` | 75 | `@ts-ignore` sur `Math.sin()` qui n'a aucun problème de type — cache un vrai bug | ⬜ OPEN |
| M18 | `stravaService.ts` | 31 | Requêtes directes à `strava.com` depuis navigateur → CORS likely à échouer | ⬜ OPEN |
| M19 | `stravaService.ts` | 56 | Pas de token refresh automatique — token expiré sans recours après ~hours | ⬜ OPEN |
| M20 | `urlSharing.ts` | 24 | URL sharing perd les données d'élévation — divergence avec gpxImport à la réimport | ⬜ OPEN |
| M21 | `urlSharing.ts` | 37 | Longueur URL non validée — peut dépasser 2048 chars avec 20+ waypoints | ⬜ OPEN |

### Composants & Store

| # | Fichier | Ligne | Description | Statut |
|---|---------|-------|-------------|--------|
| M22 | `MapView.tsx` | 98 | Marker drag bloque toutes les mises à jour du store — état incohérent possible | ⬜ OPEN |
| M23 | `MapView.tsx` | 133 | `setTimeout(50ms)` pour re-projection marker — solution fragile sur mobile/lent | ⬜ OPEN |
| M24 | `MapView.tsx` | 91 | Check `Math.abs(lng) < 0.0001` invalide les positions proches du méridien d'Afrique centrale | ⬜ OPEN |
| M25 | `MapView.tsx` | 199 | Pas de throttling sur mises à jour massives pendant drag multi-marker | ⬜ OPEN |
| M26 | `RouteLayer.tsx` | 58 | Race condition sur `styledata` handler : style change rapide peut corrompre la source `route-source` | ⬜ OPEN |
| M27 | `SegmentLayer.tsx` | 12 | Memory leak : markers et popups recréés à chaque render sans nettoyage explicite | ⬜ OPEN |
| M28 | `CyclingLayer.tsx` | 40 | Duplicate `addLayer()` sur style change → erreur MapLibre "Layer already exists" | ⬜ OPEN |
| M29 | `OverlayUI.tsx` | 48 | `decodeRouteFromUrl()` sans validation de structure — crash silencieux sur URL malformée | ⬜ OPEN |
| M30 | `OverlayUI.tsx` | 61 | Race condition `handleLocate` + `setPointA` : état incohérent si clic pendant géoloc async | ⬜ OPEN |
| M31 | `BottomSheet.tsx` | 72 | VAM : division par zéro si `routeSummary.time === 0` → `Infinity` affiché | ⬜ OPEN |
| M32 | `BottomSheet.tsx` | 49 | `fetchWeather()` sans `.catch()` — composant peut casser si API météo échoue | ⬜ OPEN |
| M33 | `SearchBar.tsx` | 40 | Race condition : requête lente overwrite résultats d'une requête plus récente | ⬜ OPEN |
| M34 | `SearchBar.tsx` | 69 | `setClickMode` bascule vers `setA` au lieu de `setB` après ajout waypoint | ⬜ OPEN |
| M35 | `ElevationChart.tsx` | 26 | Division par zéro si `samples.length === 1` : `i / (samples.length - 1)` | ⬜ OPEN |
| M36 | `AiAssistant.tsx` | 114 | Validation `distanceKm` insuffisante : pas de range check, valeurs négatives ou énormes acceptées | ⬜ OPEN |
| M37 | `AiAssistant.tsx` | 128 | Requêtes `searchAddress()` / `fetchNearestAmenity()` sans timeout — UI peut se bloquer | ⬜ OPEN |
| M38 | `AiAssistant.tsx` | 200 | Tableau `directions` de l'IA non validé — valeurs invalides acceptées silencieusement | ⬜ OPEN |
| M39 | `useRouteStore.ts` | 184 | `updateWaypointPosition` : sync start/end de boucle fermée incomplète selon l'index | ⬜ OPEN |
| M40 | `useRouteStore.ts` | 208 | `snapWaypoints` : tolérance 0.00001° en degrés absolus — latitude-dépendant | ⬜ OPEN |
| M41 | `useRouteStore.ts` | 322 | `cleanupWaypoints` : distance `minDist < 0.002` en degrés, pas en mètres — incohérent | ⬜ OPEN |
| M42 | `MapContext.tsx` | 115 | Comparaison style par référence (`!==`) au lieu de par valeur — `setStyle()` appelé inutilement | ⬜ OPEN |
| M43 | `LoopModal.tsx` | 37 | Race condition : `departure` peut être null si `mapRef.current` est null | ⬜ OPEN |
| M44 | `useStravaAuth.ts` | 23 | URL params nettoyés AVANT confirmation succès `exchangeToken()` | ⬜ OPEN |

---

## 🟡 MINEUR

| # | Fichier | Ligne | Description | Statut |
|---|---------|-------|-------------|--------|
| m1 | `elevationService.ts` | 28 | `getElevationForIndex` : `Math.round()` peut dépasser `profile.samples.length - 1` | ⬜ OPEN |
| m2 | `gpxExport.ts` | 29 | Dernier point élévation dupliqué si profile plus court que coordinates | ⬜ OPEN |
| m3 | `loopGenerator.ts` | 103 | Si `numDirs === 0`, boucle ne génère que le retour au départ sans warning | ⬜ OPEN |
| m4 | `overpassService.ts` | 80 | Pas de déduplication amenities au même endroit | ⬜ OPEN |
| m5 | `routeLibrary.ts` | 22 | Pas de versioning/migration localStorage si structure `SavedRoute` change | ⬜ OPEN |
| m6 | `weatherService.ts` | 67 | `Math.round()` : perte de précision (18.4°C → 18°C) | ⬜ OPEN |
| m7 | `MapView.tsx` | 168 | `handleMouseMove` déclarée vide — code mort | ⬜ OPEN |
| m8 | `MapView.tsx` | 155 | `createMarkerEl` manque `useCallback` — force re-render inutile | ⬜ OPEN |
| m9 | `RouteLayer.tsx` | 70 | Listener `styledata` pas nettoyé dans tous les cas de remontage | ⬜ OPEN |
| m10 | `SegmentLayer.tsx` | 39 | SVG injecté via `innerHTML` — pattern XSS risqué si données externes | ⬜ OPEN |
| m11 | `OverlayUI.tsx` | 77 | `gpxError` jamais clearée au succès d'un second import GPX | ⬜ OPEN |
| m12 | `BottomSheet.tsx` | 156 | Blur sur input sauvegarde le nom sans validation — comportement inattendu | ⬜ OPEN |
| m13 | `ElevationChart.tsx` | 49 | `getBoundingClientRect()` bugué sur contenu scrollable ou avec CSS transforms | ⬜ OPEN |
| m14 | `RouteLibrary.tsx` | 22 | Routes chargées sans validation des propriétés requises | ⬜ OPEN |
| m15 | `LoopModal.tsx` | 77 | Direction toggle bloqué sans feedback UI (impossible de désélectionner l'unique direction) | ⬜ OPEN |
| m16 | `useRouteStore.ts` | 234 | `undoWaypoint` garde la route calculée même si < 2 points — route "fantôme" | ⬜ OPEN |
| m17 | `useRouteStore.ts` | 276 | `closeLoop` peut créer label "5" manquant (1, 2, 3, 5) — confus pour l'utilisateur | ⬜ OPEN |
| m18 | `MapContext.tsx` | 135 | `fitBounds` padding évalué une seule fois — pas de recalcul si resize après | ⬜ OPEN |
| m19 | `useGeolocation.ts` | 21 | `getCurrentPosition` callback sur composant unmounted → warning React + memory leak | ⬜ OPEN |
| m20 | `useMap.ts` | 1 | Doublon presque exact de `MapContext` — à clarifier ou supprimer | ⬜ OPEN |
| m21 | `useStravaAuth.ts` | 36 | `[isConnected]` comme dépendance peut créer une boucle fragile | ⬜ OPEN |
| m22 | `AiAssistant.tsx` | 233 | `responseMsg` jamais clearée à la réouverture du modal — ancien message visible | ⬜ OPEN |

---

## 📊 Résumé

| Sévérité | Nombre | Fichiers principaux |
|----------|--------|---------------------|
| 🔴 Critique | 8 | stravaService, routingService, MapView, useRouteStore, AiAssistant |
| 🟠 Majeur | 44 | MapView, useRouteStore, AiAssistant, services (routing, gpx, urlSharing) |
| 🟡 Mineur | 22 | hooks, composants UI, OverlayUI |
| **Total** | **74** | |

---

## 🚀 Priorités de correction

### Patch immédiat
- [ ] **C1** — Secret Strava en frontend
- [ ] **C4** — Wind direction modulo
- [ ] **C2** — BRouter crash (snappedLocations)
- [ ] **C6** — Flickering marqueurs (distance incorrecte)
- [ ] **C7** — getIsClosed latitude-dépendant

### Court terme
- [ ] **C3, M35** — Divisions par zéro (gpxExport, ElevationChart)
- [ ] **M33** — Race condition SearchBar
- [ ] **M30** — Race condition géolocalisation
- [ ] **M41, M40** — Distances en degrés au lieu de mètres (useRouteStore)
- [ ] **M31** — VAM Infinity (BottomSheet)

### Moyen terme
- [ ] Standardiser `[lng, lat]` vs `[lat, lng]` dans tous les services
- [ ] Backend proxy Strava (CORS + secret)
- [ ] Token refresh Strava
- [ ] Valider toutes les réponses API (AiAssistant, overpassService)
