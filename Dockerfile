# 1. Builder stage pour installer toutes les dépendances
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copier uniquement les fichiers de dépendances pour profiter du cache Docker
COPY package.json package-lock.json ./

# Installer toutes les dépendances (inclut les devDependencies pour les tests, si besoin)
RUN npm ci

# Copier le code source
COPY . .

# 2. Production stage pour alléger l’image
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Copier uniquement ce dont on a besoin pour exécuter l’API
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/src ./src
# Si vous avez besoin des utils ou d’autres dossiers :
COPY --from=builder /usr/src/app/.env .env

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Exposer le port
EXPOSE 5000

# Démarrer l’API
CMD ["node", "src/index.js"]
