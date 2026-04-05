# VeloTrack — Application de planification de parcours cyclistes

Application web React/TypeScript déployée sur VPS via Coolify. Permet de planifier, générer et exporter des parcours cyclistes (route et gravel) avec calcul de route, profil altimétrique, assistant IA et génération de boucles automatiques.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Carte | MapLibre GL JS (tiles CartoDB/OpenTopoMap/Esri) |
| Routage principal | BRouter (Docker, VPS) |
| Routage fallback | Valhalla (public), OSRM (public) |
| Géocodage | Nominatim (OpenStreetMap) |
| Météo | Open-Meteo |
| POI/Aménités | Overpass API |
| Assistant IA | n8n webhook → Groq |
| Déploiement | Coolify (auto-deploy sur push `main`) |

---

## Variables d'environnement

Fichier `.env` local (non commité) :

```env
VITE_VALHALLA_URL=https://valhalla1.openstreetmap.de/route
VITE_OSRM_URL=https://router.project-osrm.org
VITE_N8N_WEBHOOK_URL=https://n8n.bessacvps.fr/webhook/velotrack-ai
VITE_N8N_ROUTING_URL=https://n8n.bessacvps.fr/webhook/velotrack/routing
VITE_GARMIN_BRIDGE_URL=http://localhost:3001
```

Dans Coolify, ces variables sont configurées dans les paramètres de l'application (onglet Environment).

---

## Architecture du routage

```
Utilisateur (carte) → BRouter via n8n proxy → GeoJSON → affichage carte
                    ↓ si timeout/erreur
                    Valhalla public
                    ↓ si timeout/erreur
                    OSRM public
```

BRouter tourne en Docker sur le VPS (`brouter-engine`, port 17777 interne). Le workflow n8n agit comme proxy et traduit les requêtes frontend vers le format BRouter.

### Profils BRouter disponibles

| Profil | Usage | Fichier |
|---|---|---|
| `fastbike` | Route (asphalte) | profil natif BRouter |
| `gravel-master` | Gravel/chemins | `brouter-infra/profiles/gravel-master.brf` |

---

## Fonctionnalités

### Planification de parcours
- Clic sur la carte pour poser des points (départ, étapes, arrivée)
- Drag & drop des marqueurs pour ajuster le tracé
- Clic droit sur un marqueur pour le supprimer
- Recherche d'adresse (Nominatim) pour poser un point
- Import GPX (piste et points de passage)
- Profils Route / Gravel
- Toggle "Éviter les grands axes" (autoroutes, voies rapides)

### Génération de boucle automatique
- Distance cible (10–200 km) au slider
- Direction(s) avec rose des vents (1 à 3 directions)
- Bouton "Autre boucle" : pivote l'apex de +30° pour proposer une variante
- Bouton "Valider" : confirme la boucle, ferme le modal
- La barre post-génération affiche la distance réelle calculée vs la cible

### Tableau de bord (BottomSheet)
- Distance, temps estimé, D+, D-, kcal, VAM
- Météo en temps réel au point de départ
- Profil altimétrique interactif (hover synchronisé avec un point orange sur la carte)
- Instructions turn-by-turn (si Valhalla fournit les manœuvres)
- Toggle avoid highways
- Export GPX
- Bouton Sync (grisé — synchronisation plateforme à venir)

### Assistant IA
- Langage naturel : "une boucle gravel de 60km au sud avec une pause café"
- Types supportés : `loop` et `point-to-point`
- Résolution des POI via base de données segments + Nominatim + Overpass
- Contexte météo injecté automatiquement
- Requiert `VITE_N8N_WEBHOOK_URL` configuré

### Bibliothèque de parcours
- Sauvegarde locale (localStorage, max 50 parcours)
- Chargement, export GPX, suppression

### Raccourcis clavier

| Touche | Action |
|---|---|
| `Z` | Annuler le dernier point |
| `R` | Réinitialiser le parcours |
| `Esc` | Fermer le modal actif |

---

## Données d'élévation

Récupérées via l'API `/height` de Valhalla après chaque calcul de route. Rééchantillonnage tous les 50m, calcul du D+ / D-.

---

## Déploiement VPS

### BRouter (Docker)

```bash
# Vérifier que le moteur tourne
docker logs -f brouter-engine

# Segments cartographiques France (à placer dans /brouter-infra/data/)
wget http://brouter.de/brouter/segments4/E0_N45.rd5
wget http://brouter.de/brouter/segments4/W5_N45.rd5
wget http://brouter.de/brouter/segments4/E5_N45.rd5
wget http://brouter.de/brouter/segments4/E0_N40.rd5
wget http://brouter.de/brouter/segments4/W5_N40.rd5
wget http://brouter.de/brouter/segments4/E5_N40.rd5
```

### Frontend (Coolify)

- Auto-deploy sur push `main`
- Build : `npm run build` → Nginx sert `dist/`
- Variables d'environnement à configurer dans Coolify (onglet Environment)

---

## Développement local

```bash
npm install
npm run dev
```

L'app tourne sur `http://localhost:5173`.

---

## Structure du projet

```
src/
  components/
    map/          # MapView, RouteLayer, CyclingLayer, SegmentLayer
    ui/           # OverlayUI, BottomSheet, LoopModal, AiAssistant,
                  # SearchBar, ElevationChart, RouteLibrary, LayerSelector
  context/        # MapContext (MapLibre init, flyTo, fitBounds)
  hooks/          # useGeolocation, useStravaAuth, useGarminSync
  services/       # routingService, loopGenerator, gpxExport/Import,
                  # elevationService, geocodingService, weatherService,
                  # overpassService, segmentService, garminService,
                  # routeLibrary, urlSharing
  store/          # useRouteStore (Zustand — état global)
brouter-infra/    # Profils BRouter (.brf), docker-compose
docs/             # Documentation complémentaire
```

---

## Intégrations futures prévues

- Synchronisation Garmin Connect (service implémenté, UI à connecter)
- Segments dynamiques OSM/Strava (remplacement des 4 segments hardcodés)
- Navigation temps réel (géolocalisation continue sur tracé)
