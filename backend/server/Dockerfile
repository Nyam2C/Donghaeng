FROM oven/bun:1-alpine

WORKDIR /app

# Healthcheck용 curl
RUN apk add --no-cache curl

# Workspace 구조 복사 (bun workspaces hoist)
COPY package.json bun.lock ./
COPY backend/server/package.json ./backend/server/
COPY backend/ai-tts/package.json ./backend/ai-tts/
COPY frontend/mobile-web/package.json ./frontend/mobile-web/
COPY shared/types/package.json ./shared/types/

# 의존성 설치 (root에 hoisted)
RUN bun install --frozen-lockfile

# 소스 복사
COPY tsconfig.base.json ./
COPY backend/server ./backend/server
COPY shared ./shared

WORKDIR /app/backend/server

EXPOSE 3000

# Phase 3+ : Claude Code CLI 설치 추가
# RUN bun add -g @anthropic-ai/claude-code
# 인증은 호스트 ~/.claude bind mount (docker-compose.yml volumes)

CMD ["bun", "--hot", "src/index.ts"]
