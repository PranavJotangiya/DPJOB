# Single-service image: builds the frontend and runs the Node server that
# serves both the API and the built SPA. SQLite lives on a mounted volume.
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
# file: path -> plain on-disk SQLite (the volume is mounted at /data)
ENV TURSO_DATABASE_URL="file:/data/app.db"

EXPOSE 8080
CMD ["node", "server/index.js"]
