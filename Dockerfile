# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY swagger.yaml ./
RUN npm run build

# Stage 2: Run stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger.yaml ./swagger.yaml
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
