# Multi-stage Dockerfile cho SimpliFey V2 Pro trên Google Cloud Run (05 Mục 3, D-64, D-68, D-70)

# Stage 1: Cài đặt dependencies (05 Mục 3, D-68)
FROM node:22-slim AS deps
WORKDIR /app

# Chỉ chép package.json và package-lock.json để tận dụng Docker cache layer
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build ứng dụng Next.js standalone (05 Mục 3, D-68, D-70)
FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next ghi cứng các biến NEXT_PUBLIC_* vào bundle lúc build, nên mỗi môi trường
# (staging, production) build image riêng với Supabase và DEMO_MODE của mình (D-72)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE

# Không khai báo ARG/ENV cho bí mật (DATABASE_URL, Gemini...) vì chỉ cấp runtime trên Cloud Run
RUN npm run build

# Stage 3: Runner production tối giản và bảo mật (05 Mục 3, D-64, D-68, D-70)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Tạo nhóm nodejs và người dùng nextjs không root trên Debian slim (UID/GID 1001)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Chép public (chứa grammar wasm), queries (scm) và kết quả standalone từ builder (D-70)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/queries ./queries
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs:nodejs

CMD ["node", "server.js"]
