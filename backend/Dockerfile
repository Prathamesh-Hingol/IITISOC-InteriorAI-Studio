# ─── Stage 1: Build TypeScript & Prisma ─────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY src ./src
RUN npm run build

# ─── Stage 2: Production API Server ──────────────────────────
FROM node:20-alpine AS backend

WORKDIR /app


COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client and built JS
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "run", "start"]

# ─── Stage 3: BullMQ AI Worker ──────────────────────────────
FROM node:20-alpine AS worker

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client and built JS
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

CMD ["npm", "run", "worker"]
