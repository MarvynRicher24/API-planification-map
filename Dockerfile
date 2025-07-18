FROM node:18-alpine AS builder
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

FROM node:18-alpine AS runner
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/src/utils ./src/utils
COPY --from=builder /usr/src/app/src/routes ./src/routes

RUN npm ci --only=production

EXPOSE 5000

CMD ["node", "src/index.js"]