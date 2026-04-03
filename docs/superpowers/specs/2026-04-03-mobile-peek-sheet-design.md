# Design — BottomSheet Peek Mobile + Inverser le tracé

**Date :** 2026-04-03  
**Scope :** Responsive mobile uniquement (breakpoint `< md`)

---

## Problème

Sur smartphone, le BottomSheet s'ouvre à 85vh et cache la carte, rendant le tracé de route inutilisable. L'UI mobile doit laisser la carte visible en priorité.

---

## Comportement cible

### 3 états du BottomSheet (mobile uniquement)

| État | Hauteur | Condition de déclenchement |
|------|---------|---------------------------|
| `hidden` | 0 | Aucun waypoint |
| `peek` | ~90px (1 ligne) | Dès le 1er waypoint posé |
| `expanded` | 85vh | Swipe up ou tap sur le chevron ↑ |

**Desktop (`md+`) : inchangé.** Le panneau latéral droit conserve son comportement actuel.

---

## Contenu du bandeau Peek (90px)

```
[ 📍 12.4km   ⏱ 45min   ↑ 230m ]   [↑ chevron]
```

- Pendant le tracé (pas de route calculée) : `"N points"` à la place des stats
- Tap n'importe où sur le bandeau → passe en `expanded`
- En `expanded`, tap sur le handle ou chevron ↓ → repasse en `peek`

---

## Fonction "Inverser le tracé"

### Dans le store (`useRouteStore.ts`)
Nouvelle action `reverseWaypoints()` :
1. Inverse l'ordre du tableau `waypoints`
2. Déclenche le recalcul de route (même mécanique que l'ajout/suppression de waypoint)

### Exposition dans l'UI
- **Boutons flottants droits (mobile)** : icône `ArrowLeftRight` ajoutée dans le groupe Undo/Reset, visible dès que `waypoints.length >= 2`
- **Sheet étendu** : bouton "Inverser le tracé" dans la section actions (entre "Optimiser les points" et "Fermer la boucle")

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/store/useRouteStore.ts` | Ajouter `reverseWaypoints()` |
| `src/components/ui/BottomSheet.tsx` | Logique peek/expanded, contenu peek, bouton inverser |
| `src/components/ui/OverlayUI.tsx` | Bouton inverser dans les contrôles flottants droits |

---

## Hors scope

- Desktop inchangé
- Contenu du sheet étendu inchangé (météo, stats, GPX export, Strava, élévation)
- Aucun changement au routage ou au store au-delà de `reverseWaypoints()`
