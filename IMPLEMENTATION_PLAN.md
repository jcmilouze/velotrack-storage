# 📄 Plan d'Implémentation Technique - VeloTrack

Ce document détaille les choix architecturaux et algorithmiques au cœur de VeloTrack.

## 🎨 1. Design System : Néo-Brutalisme "Earthy"
Le choix du Néo-Brutalisme n'est pas seulement esthétique mais fonctionnel pour le cyclisme :
- **Shadows & Borders** : Utilisation de bordures de 3px et d'ombres dures pour une lisibilité maximale en plein soleil.
- **Palette** : Substitution du jaune fluo par un Parchemin (`#fdfbf7`) et de l'ardoise (`slate-800`) pour une harmonie avec les couleurs naturelles de la carte (Forêts, Champs).
- **Radius** : Coins arrondis de `1.5rem` sur les panneaux principaux pour une sensation "App moderne" tout en gardant des angles vifs sur les sous-composants.

## 🔄 2. Algorithme de Génération de Boucles
Contrairement à une simple boucle triangle, VeloTrack utilise un modèle de **polygone à 5 points (Kite shape)** :
1. **Départ (D)**
2. **Point Latéral 1 (L1)** : 30% de la distance à 30-45° du cap.
3. **Sommet (S)** : Point le plus éloigné.
4. **Point Latéral 2 (L2)** : 30% de la distance à -30-45° du cap.
5. **Retour (D)**
Cette structure force le moteur de routage (Valhalla) à trouver des routes distinctes pour l'aller et le retour, minimisant les sections communes.

## ⚡ 3. Modèle Physique des Calories
Calcul basé sur la puissance instantanée estimée :
- **Aérodynamisme** : $P_{aero} = 0.5 \cdot \rho \cdot C_d \cdot A \cdot v^3$ (Impact majeur à haute vitesse).
- **Roulage** : $P_{roll} = m \cdot g \cdot C_{rr} \cdot v$.
- **Gravité** : $P_{grav} = (m \cdot g \cdot \Delta h) / t$ (Uniquement sur les ascensions).
- **Efficience Humaine** : Facteur de ~21% appliqué pour convertir les Watts-heures en kCal consommées.
- **Surface** : Multiplicateur de 1.2x pour le profil Gravel (résistance accrue).

## 🗺️ 4. State Management & Persistance
- **Zustand** : Gestion centralisée du parcours. Pas de duplication de données, chaque mise à jour déclenche le recalcul du GeoJSON.
- **URL Sharing** : Les points de passage sont encodés en base64 dans le fragment d'URL. Cela permet de partager un itinéraire complet sans base de données côté serveur (Stateless sharing).
- **LocalStorage** : La bibliothèque de parcours utilise le stockage local pour une rapidité d'accès immédiate sans compte utilisateur.

## 📡 5. Services API
- **Valhalla** : Utilisé pour ses capacités de routage avec "costinging profiles" avancés (avoid_highways, surface preference).
- **Open-Meteo** : Fournit les données vent et température pour le point de départ calculé au chargement du BottomSheet.
- **GPX Parser** : Transformation personnalisée de fichiers XML GPX en structures GeoJSON/Waypoints compatibles avec le store.
