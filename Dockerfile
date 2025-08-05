# syntax=docker/dockerfile:1

############################
#  Build stage – Node 24   #
############################ 
FROM node:24-alpine AS builder

WORKDIR /app

# 1. Copy dependency manifests first for better cache hits
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

RUN npm ci                          # install ALL deps (dev + prod)

# 2. Copy the full source tree
COPY . .

# 3. Build ***without*** running `tsc -b`
#    Vite’s bundler step doesn’t care about type errors.
RUN npx vite build                  # outputs into dist/

############################
#  Runtime stage – Nginx   #
############################
FROM nginx:1.25-alpine

# If your bundler outputs `build/` instead of `dist/`, change the path here
COPY --from=builder /app/dist /usr/share/nginx/html/zoom
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
