FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false

COPY . .

RUN npm run build

FROM node:22-slim AS production

RUN useradd -m nestuser

WORKDIR /app

COPY --chown=nestuser:nestuser --from=builder /app/dist ./dist
COPY --chown=nestuser:nestuser --from=builder /app/node_modules ./node_modules
COPY --chown=nestuser:nestuser --from=builder /app/package*.json ./

USER nestuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
    