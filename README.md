# 🚴 VeloTrack — Planificateur d'Itinéraires Cyclistes

**VeloTrack** est une application web haute performance de planification d'itinéraires cyclistes (Route & Gravel), conçue avec une approche **Mobile-First** et une esthétique **Néo-Brutaliste** percutante.

![Optimized for Mobile](https://img.shields.io/badge/Mobile--Optimized-YES-78BE20?style=for-the-badge)
![Style VeloTrack](https://img.shields.io/badge/Style-Neo--Brutalist-FC4C02?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20TS%20%7C%20MapLibre-3B82F6?style=for-the-badge)

## ✨ Nouvelles Fonctionnalités & Optimisations

### 📱 Architecture Mobile-First (v2.0)
L'interface a été entièrement repensée pour une utilisation fluide sur smartphone, même en plein effort :
- **Smart Bottom Sheet** : Une fiche de statistiques rétractable et scrollable pour consulter distance, dénivelé et météo sans masquer la carte.
- **Contrôles Adaptatifs** : Les boutons de zoom et de calques se réorganisent dynamiquement pour un accès facile au pouce.
- **Smart Zoom Auto** : La carte ajuste automatiquement son cadrage (zoom et position) lors de la génération d'une boucle ou de l'ajout d'étapes.

### 🔄 Générateur de Boucles Stricte ("Closed Loop")
L'algorithme de génération de boucle a été durci pour garantir des parcours circulaires réels :
- **Fusion Atomique** : Le point de départ et d'arrivée sont fusionnés visuellement et logiquement pour une boucle parfaite.
- **Nettoyage Intelligent** : Suppression automatique des points orphelins et des demi-tours inutiles via `cleanupWaypoints`.
- **Ready Focus** : Mise au point automatique sur le point de départ dès l'ouverture du menu de génération.

### 🗺️ Cartographie & Résilience
- **Moteur Hybride** : Routage prioritaire via **Valhalla** avec bascule automatique sur **OSRM** en cas d'indisponibilité, garantissant une planification sans interruption.
- **Analyse Avancée** : Calcul de VAM (Vitesse d'Ascension Moyenne), estimation calorique physique et profil altimétrique dynamique.
- **Réseau Cyclable Mondial** : Overlay superposé affichant les itinéraires cyclables officiels (Waymarked Trails).

## 📊 Analyse & Statistiques
- **Profil Altimétrique** : Graphique interactif SVG optimisé pour le responsive.
- **Météo Dynamique** : Vent (vitesse et direction via boussole), température et conditions au point de départ.

## 🎨 Design System : Earthy Brutalism
L'interface utilise un style **Néo-Brutaliste** sophistiqué :
- **Palette Parchemin & Ardoise** : Contraste élevé pour une lisibilité maximale en extérieur.
- **Accents Sportifs** : Orange "Strava" pour les points d'intérêt et Vert "Cycling" pour le départ.
- **Micro-interactions** : Animations fluides via `framer-motion` et boutons tactiles avec ombres portées.

## 🚀 Installation & Lancement

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev
```

## 🛠️ Stack Technique
- **Framework** : React 18 + Vite
- **Langage** : TypeScript
- **Cartographie** : MapLibre GL JS
- **State Management** : Zustand
- **Animations** : Framer Motion
- **Icônes** : Lucide React
- **Styles** : Tailwind CSS v4

---
*Développé avec passion pour les cyclistes exigeants.* 🚴‍♂️💎
