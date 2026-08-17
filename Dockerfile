# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# python3/make/g++ needed to build the better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV DATA_DIR=/app/data

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 8080
CMD ["node", "./dist/server/entry.mjs"]
