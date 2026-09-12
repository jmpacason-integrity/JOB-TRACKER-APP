FROM node:22-slim AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY backend ./backend

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --filter backend... --frozen-lockfile=false

WORKDIR /app/backend
RUN pnpm prisma:generate
RUN pnpm build

EXPOSE 4000
CMD ["sh", "-c", "pnpm prisma:deploy && pnpm start"]
