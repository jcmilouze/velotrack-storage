# 🚴 VeloTrack

**VeloTrack** est une application web moderne de planification d'itinéraires cyclistes (Route & Gravel) conçue pour offrir une expérience fluide, visuelle et hautement interactive.

![Style VeloTrack](https://img.shields.io/badge/Style-Neo--Brutalist-FC4C02?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20TS%20%7C%20MapLibre-3B82F6?style=for-the-badge)

## ✨ Fonctionnalités Clés

### 🗺️ Cartographie & Routage
- **Moteur Multi-Profils** : Routage intelligent optimisé pour la **Route** (bitume) ou le **Gravel** (sentiers, routes blanches) via les API Valhalla et OSRM.
- **Édition Dynamique** : Glissez-déposez n'importe quel point du tracé, ajoutez des étapes intermédiaires ou supprimez des points d'un simple clic-droit.
- **Réseau Cyclable** : Overlay dédié affichant les itinéraires cyclables officiels (Waymarked Trails) pour une navigation sécurisée.

### 🔄 Générateur de Boucles (Loop Generator)
- **Algorithme "Kite-Shape"** : Génère de véritables boucles circulaires à partir d'une distance cible, en évitant au maximum les aller-retours sur le même chemin.
- **Personnalisation** : Choisissez votre distance et la direction cardonale souhaitée pour votre sortie dominicale.

### 📊 Analyse & Statistiques
- **Profil Altimétrique** : Graphique interactif affichant le dénivelé (D+ / D-).
- **Estimation de Calories** : Calculateur physique basé sur le poids total, la vitesse, la pente et le type de surface rencontré.
- **Météo en Temps Réel** : Visualisation de la température, des conditions et de la direction du vent (boussole dynamique) au point de départ.

### 💾 Bibliothèque & Partage
- **Bibliothèque Locale** : Sauvegardez vos parcours favoris directement dans votre navigateur.
- **Import/Export GPX** : Importez vos fichiers existants ou exportez vos créations pour votre compteur GPS.
- **Partage par URL** : Partagez votre itinéraire en un clic via une URL compressée contenant tous vos points de passage.

## 🎨 Design System : Earthy Brutalism
L'interface utilise un style **Néo-Brutaliste** sophistiqué, optimisé pour la visibilité en extérieur :
- **Palette Parchemin & Ardoise** : Contraste élevé sans fatigue visuelle.
- **Accents Sportifs** : Orange "Strava" pour les actions clés et les points d'intérêt.
- **Micro-interactions** : Animations fluides via Framer Motion et boutons tactiles avec ombres portées.

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
- **Styles** : Tailwind CSS
