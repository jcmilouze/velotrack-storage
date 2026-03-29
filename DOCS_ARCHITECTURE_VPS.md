# 🏗️ Blueprint de Migration : BRouter VPS + n8n API Gateway

## 1. Executive Verdict (Décision du Tech Lead)
**Approuvé avec haut niveau de confiance.**
Ce schéma est une architecture de grade production excellente pour VeloTrack. Il permet de centraliser la charge CPU/RAM du routage sur le VPS, d'éliminer le besoin de lancer BRouter localement (finis les problèmes de port/Java en local), et utilise **n8n** comme un middleware intelligent pour le throttling, le fallback, la sécurité, et les logs.

---

## 2. Reality Check (Contraintes & Risques)

| Risque | Impact | Mitigation (Solution) |
| :--- | :--- | :--- |
| **Latence n8n** | Léger overhead (50-200ms) par requête. | Webhook synchronisé : `Respond to Webhook: When Last Node Finishes`. L'utilisateur ne verra qu'un léger délai. |
| **Stockage .rd5 (Osm Data)** | Volumineux (France = ~1Go+). Coolify draine son stockage si les containers sont redéployés sans volumes. | Les segments `e0_n45` etc. **DOIVENT** être montés sur un *Shared Volume* (Bind Mount) Coolify pour ne pas être perdus. |
| **Sécurité de l'Endpoint** | DDOS ou abus du webhook (CPU exhaust). | n8n devra intégrer un bloc de validation de Header (CORS VeloTrack ou Bearer Token) avant de passer la requête à BRouter. |
| **Profils Custom** | `gravel-master.br` doit être connu du BRouter distant. | Mapper un volume `/brouter/profiles` dans Coolify pour injecter nos propres règles YAML/BR. |

---

## 3. Recommended Path (L'Architecture Cible)

### A. Le Conteneur BRouter (Coolify)
- **Image Docker** : `ghcr.io/woltapp/brouter:latest` (ou approche custom Java).
- **Réseau** : Protégé/Privé. BRouter n'expose *aucun* port au public. Il est exposé uniquement au réseau interne Coolify (Docker Network).
- **Volumes** :
  - `v-brouter-data:/brouter/segments`
  - `v-brouter-profiles:/brouter/profiles`

### B. L'API Gateway (n8n sur le VPS)
L'orchestrateur n8n (qui est sur le même réseau privé Coolify/VPS) interceptera les requêtes du frontend VeloTrack.
1. **Webhook In** : Reçoit `GET /webhook/routing?lonlats=...&profile=gravel-master`.
2. **Switch/Validation** : Vérifie l'origine (Protection basique).
3. **HTTP Node (BRouter)** : Fait la requête interne `http://brouter:17777/brouter...`.
4. **Fallback Routier (Optionnel)** : Si le BRouter plante ou ne trouve pas de route (fichier rd5 manquant), n8n tente automatiquement l'API Valhalla pour ne jamais casser l'UX.
5. **Webhook Out** : Renvoie le GeoJSON propre au Frontend VeloTrack.

### C. Le Frontend VeloTrack (Ton App Vercel/Netlify)
- **Modification** : Remplacer l'URL locale (`http://localhost...`) par ton domaine n8n (`https://n8n.tondomaine.com/webhook/routing`).

---

## 4. Execution Plan (Séquençage Atomique)

Si tu veux qu'on lance la production, voici le séquencement d'implémentation :

*   [ ] **Étape 1 (Infra / @devsecops)** : Rédiger le `docker-compose.yml` BRouter optimisé pour Coolify (mapping des volumes, limites CPU/RAM).
*   [ ] **Étape 2 (Données)** : Script pour télécharger les tronçons géographiques (France, etc.) directement dans le volume du VPS.
*   [ ] **Étape 3 (n8n / @automation-chief)** : Construire le workflow n8n (Webhook -> Requête au service docker interne `http://brouter:17777` -> Réponse GeoJSON).
*   [ ] **Étape 4 (Frontend / @frontend-lead)** : Brancher `routingService.ts` sur le Webhook distant de manière sécurisée.

*Gouverneur d'Exécution Antigravity — Prêt à déléguer.*
