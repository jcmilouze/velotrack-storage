# 🛡️ Plan d'Audit - VeloTrack Application

## 🎯 OBJECTIFS
Vérifier l'intégrité de toutes les fonctionnalités, identifier les bugs latents (CORS, perfs, UI), valider l'expérience mobile vs PC, et proposer des corrections ultra-rapides.

## 📊 CHECKLIST D'AUDIT

### 1. 🗺️ Moteur de Cartographie & Waypoints
- [ ] **Ajout de points** : Est-ce que le premier clic pose bien un départ ? Est-ce que les suivants ajoutent des étapes ?
- [ ] **Drag & Drop** : Est-ce qu'on peut déplacer un point ? Le tracé se met-il à jour ?
- [ ] **Suppression** : Utiliser le clic droit ou double-clic ? Est-ce stable ?
- [ ] **Réinitialisation** : Le bouton `clearRoute` vide-t-il vraiment tout ? (Markers, store, geometry).
- [ ] **Inversion** : Le parcours s'inverse-t-il sans casser la logique de navigation ?

### 2. 🛣️ Routage & Statistiques (Routing engine)
- [ ] **Road vs Gravel** : Est-ce que le changement de mode recalcule bien ?
- [ ] **Éviter autoroutes** : L'option influence-t-elle le tracé ?
- [ ] **Précision Stats** : Distance km vs Durée (vitesse moyenne réaliste selon le profil).
- [ ] **Turn-by-Turn** : Les instructions s'affichent-elles correctement dans le panneau ?

### 3. ⛰️ Services de Données (Elevation & Weather)
- [ ] **Profil Altimatrique** : Le graphique est-il fluide ? (Vérifier si trop de points ralentissent l'UI).
- [ ] **CORS Errors** : Vérifier les appels d'élévation (Open-Meteo, Google Tiles...).
- [ ] **Météo** : Vérifier que les icônes et le vent correspondent au lieu.

### 4. 📂 Gestion de Fichiers & Stockage (GPX / Strava)
- [ ] **Export GPX** : Le fichier s'ouvre-t-il dans Garmin Connect ou Strava sans erreur ?
- [ ] **Import GPX** : Que se passe-t-il si j'importe un fichier corrompu ou trop gros ?
- [ ] **Bibliothèque** : Est-ce que mes tracés favoris persistent après un rafraîchissement ?
- [ ] **Strava Auth** : Flux OAuth complet (consentement, refresh, upload).

### 5. 📱 UI/UX & Responsive (Brutal Aesthetic)
- [ ] **Mode Sombre** : Tout est-il lisible ? (Vérifier les contrastes des graphs d'élévation).
- [ ] **BottomSheet** : Est-il facile à manipuler sur iOS ? Ne cache-t-il pas de boutons ?
- [ ] **Performances Store** : Rechercher d'éventuelles boucles infinies de re-calcul de route.

---

## 🛠️ STRATÉGIE D'AUDIT
1. **Analyse de code** : Scan des services via **Ollama (Qwen3.5:35B)** pour la robustesse.
2. **Audit Dynamique** : Tests de bout en bout simulant des tracés complexes.
3. **Rapport & Correction** : Correction immédiate des "Quick Wins" et planification des refactors.

---
*Gouverneur Antigravity — Status: [██░░░] 20% Initialisation.*
