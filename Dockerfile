# Construction de l'application Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Optimisation du cache Docker : on installe d'abord les dépendances
COPY package*.json ./
RUN npm ci

# Copie du reste des fichiers et build
COPY . .
RUN npm run build

# Étape serveur Nginx pour servir les fichiers statiques de la SPA
FROM nginx:alpine

# Copie de la configuration Nginx optimisée pour le routage SPA (try_files)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers générés par Vite ('dist') vers le dossier root de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
