# 1) Builder stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copier les manifestes et installer TOUTES les dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copier le code source
COPY . .

# 2) Runner stage
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Copier uniquement ce qu'il faut pour exécuter
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/src ./src
# Vous pouvez copier aussi utils si besoin :
COPY --from=builder /usr/src/app/src/utils ./src/utils
COPY --from=builder /usr/src/app/src/routes ./src/routes

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Exposer le port utilisé
EXPOSE 5000

# Démarrer l’API
CMD ["node", "src/index.js"]
