# Utilisation d'une image Node légère
FROM node:20-slim

# Installation de Python et des dépendances système
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances Node
COPY package*.json ./
RUN npm install

# Installation des dépendances Python (garminconnect, garth)
# Utilisation de --break-system-packages car nous sommes dans un container isolé
RUN pip3 install --no-cache-dir garminconnect garth --break-system-packages

# Copie du reste du code
COPY . .

# Exposition du port (celui défini par GARMIN_PORT, sinon 3001)
EXPOSE 3001

# Lancement du serveur
CMD ["node", "server.js"]
