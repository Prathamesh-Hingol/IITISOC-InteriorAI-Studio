# ─── Stage 1: Build React/Vite App ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build static production bundle
RUN npm run build

# ─── Stage 2: Serve static bundle via Nginx ──────────────────
FROM nginx:alpine AS runner

# Copy built distribution files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
