FROM oven/bun:1

WORKDIR /app

# Healthcheck용 curl (debian 기반 — claude-code glibc binary 직접 실행 가능)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

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

# Phase 3 활성화: Claude Code CLI — D2 hallucination guard용 spawn 대상
# 인증은 호스트 ~/.claude bind mount (docker-compose.yml volumes)
RUN bun add -g @anthropic-ai/claude-code

CMD ["bun", "--hot", "src/index.ts"]
