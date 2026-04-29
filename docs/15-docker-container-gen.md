# Docker 개발 환경 컨테이너 구성 계획

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-04-27 | 최초 작성 — 4컨테이너(Nginx + Frontend + Backend + 기존 DB) Bind Mount 기반 dev 환경 |
| 1.1 | 2026-04-28 | open-webui (§4.5) + searxng (§4.6) 컨테이너 추가 — AI 버틀러 "찰떡"의 일반 질문 경로(웹검색 + gemma4:26b) 백엔드. compose/검증/후속 작업 갱신. 상세 통합 설계는 `docs/14-Open-WebUI-plan.md` 참고 |
| 1.2 | 2026-04-28 | searxng + open-webui 컨테이너 실제 기동 완료. 실행에 사용한 명령어를 §10.5 (신규 — Open WebUI / SearxNG 기동) 에 기록. `docker/searxng-settings.yml` 신규 + `.env` 의 `OPEN_WEBUI_SECRET_KEY` 정책 명시 |

---

## 1. 목표 / 범위

호스트에서 `npm run dev`를 두 번 띄우던 현재 방식을 **Docker Compose 기반 단일 명령**(`docker compose up`)으로 전환한다.

- **포함 대상**: 개발 환경(dev) 전용. HMR/소스 변경 즉시 반영.
- **제외 대상**: 프로덕션 빌드(`next build` + `next start`)는 별도 Dockerfile/Compose 파일로 추후 정의.
- **유지 대상**: 기존 `postgres-db` 컨테이너는 **재생성 없이 그대로 활용**한다 (자격증명·볼륨·데이터 보존).

---

## 2. 기술 스택 확인 (현재 코드베이스)

| 컴포넌트 | 버전 / 설정 | 출처 |
|----------|------------|------|
| Backend | Next.js 16.2.2, `pg ^8.20.0`, TypeScript | `backend/package.json` |
| Frontend | Next.js 16.2.3, React 19.2.4, Tailwind v4, Zustand, React Query | `frontend/package.json` |
| Node 호스트 | v24.15.0 | `node --version` |
| DB | PostgreSQL 18.3 (컨테이너 `postgres-db`) | `docker inspect postgres-db` |
| DB 자격증명 | user `teamworks-manager`, db `teamworks`, pass `Nts123!@#` | `postgres-db` env |
| Docker | 29.4.1 / Compose v5.1.3 | `docker --version` |

호스트 dev 시 backend는 3000(Next.js 기본), frontend는 3001(`next dev -p 3001`)에서 동작 중.

---

## 3. 목표 아키텍처

```
브라우저
   │
   ▼
[ Nginx :8080 ]                      ← 호스트 8080 → 컨테이너 80
   │
   ├── /api/*          → backend :3000     (컨테이너 내부 DNS)
   ├── /_next/...      → frontend :3001    (HMR WebSocket 포함)
   └── /*              → frontend :3001
                            │
                  [ backend ]  ─────────►  [ postgres-db ]
                                            (기존 컨테이너 — 재사용)
```

**원칙**: 외부 노출은 Nginx 한 곳(8080)만. backend/frontend 포트는 호스트로 publish 하지 않음 (컨테이너 네트워크 내부 통신만).

> macOS에서 80 포트는 root 권한이 필요하므로 호스트 측은 8080 사용.

---

## 4. 컨테이너별 설계

### 4.1 backend 컨테이너

| 항목 | 값 |
|------|------|
| Image | `node:24-alpine` (호스트 Node 메이저 일치) |
| WORKDIR | `/app` |
| Bind Mount | `./backend → /app` |
| 익명 볼륨 | `/app/node_modules` (호스트 macOS-build 모듈이 컨테이너 Linux와 ABI 불일치 — 격리 필수) |
| 명령 | `sh -c "npm install && npm run dev"` (Next.js 기본 3000 포트) |
| 노출 포트 | 3000 (내부) |
| 의존 | `postgres-db` (외부 컨테이너) |
| 환경변수 (compose override) | `DATABASE_URL=postgresql://teamworks-manager:Nts123%21%40%23@postgres-db:5432/teamworks` <br> `FRONTEND_URL=http://localhost:8080` |
| 환경변수 (env_file) | `./backend/.env.local` (JWT secrets 등) |

**중요**: `DATABASE_URL`은 호스트 dev용(`localhost:5432`)과 컨테이너 dev용(`postgres-db:5432`)이 호스트명만 다름. compose의 `environment:` 블록으로 override 하여 `.env.local`은 호스트 모드 그대로 둔다.

### 4.2 frontend 컨테이너

| 항목 | 값 |
|------|------|
| Image | `node:24-alpine` |
| WORKDIR | `/app` |
| Bind Mount | `./frontend → /app` |
| 익명 볼륨 | `/app/node_modules` |
| 명령 | `sh -c "npm install && npm run dev"` (`package.json`의 dev 스크립트가 `next dev -p 3001`) |
| 노출 포트 | 3001 (내부) |
| 환경변수 | `NEXT_PUBLIC_API_URL=http://localhost:8080` (브라우저가 보는 URL — Nginx 경유) <br> `WATCHPACK_POLLING=true` (macOS bind mount HMR 안정성) <br> `CHOKIDAR_USEPOLLING=true` |

### 4.3 nginx 컨테이너

| 항목 | 값 |
|------|------|
| Image | `nginx:alpine` |
| Bind Mount | `./docker/nginx.dev.conf → /etc/nginx/conf.d/default.conf:ro` |
| 노출 포트 | `8080:80` (호스트 → 컨테이너) |
| 의존 | `frontend`, `backend` |

**라우팅 규칙** (Nginx config):
- `/api/*` → `backend:3000`
- `/_next/webpack-hmr` → `frontend:3001` (WebSocket Upgrade 필수)
- `/*` → `frontend:3001`

WebSocket(Next.js HMR)은 `proxy_set_header Upgrade $http_upgrade; Connection "upgrade"` 두 줄이 모든 location에 있어야 함.

### 4.4 postgres-db (기존 — 변경 없음)

기존 컨테이너를 그대로 사용. 단 **새 Compose 네트워크에 추가 연결**하는 1회성 작업이 필요(아래 §5).

### 4.5 open-webui 컨테이너 (AI 버틀러 일반 질문 백엔드)

| 항목 | 값 |
|------|------|
| Image | `ghcr.io/open-webui/open-webui:main` |
| 역할 | OpenAI-compatible API (`/api/chat/completions`) 게이트웨이. 웹검색 + Ollama 답변을 한 번에 처리 |
| Bind Mount | `open_webui_data:/app/backend/data` (네임드 볼륨 — 사용자·모델 프리셋·채팅 이력 영구 저장) |
| 환경변수 | `OLLAMA_BASE_URL=http://host.docker.internal:11434` (호스트 Ollama 사용) <br> `WEBUI_SECRET_KEY=<랜덤 문자열>` (세션 서명) <br> `ENABLE_RAG_WEB_SEARCH=true` <br> `RAG_WEB_SEARCH_ENGINE=searxng` <br> `RAG_WEB_SEARCH_RESULT_COUNT=5` <br> `SEARXNG_QUERY_URL=http://searxng:8080/search?q=<query>&format=json` <br> `WEBUI_AUTH=true` (admin 계정 보호) <br> `RAG_EMBEDDING_ENGINE=ollama` ⚠️ <br> `RAG_OLLAMA_BASE_URL=http://host.docker.internal:11434` ⚠️ <br> `RAG_EMBEDDING_MODEL=nomic-embed-text:latest` ⚠️ |

> ⚠️ **임베딩 엔진을 Ollama 로 강제** — Open WebUI 의 기본 임베딩 엔진은 sentence-transformers 라 첫 부팅 시 HuggingFace 에서 모델 30개 파일(~수백 MB)을 받는다. 네트워크가 느리거나 HF 가 rate limit 을 걸면 부팅이 무한정 멈춘다. 본 환경변수 3개를 주면 호스트 Ollama 의 `nomic-embed-text` 를 그대로 재사용해 HF 다운로드를 건너뛸 수 있다 (RAG/Agent 와도 임베딩 분포가 일치). **반드시 위 3개를 함께 설정.**
| 노출 포트 | `8081:8080` (호스트 8081 → 컨테이너 8080. 브라우저에서 admin 콘솔 접근용) |
| 컨테이너 네트워크 | `teamworks-net` |
| 의존 | `searxng` (검색 백엔드) — Ollama 는 호스트(또는 외부) |
| 호스트 Ollama 도달 | macOS/Windows: `host.docker.internal`. Linux: compose 의 `extra_hosts: ["host.docker.internal:host-gateway"]` |

**초기 1회 셋업 (수동, Open WebUI v0.9.x 기준)**

> v0.9 부터 모델 프리셋·도구·지식은 **Workspace** 라는 별도 영역으로 이동했음. "좌측 Settings" 표기는 v0.5 이전 자료임 — 아래 정확한 경로 참고.

1. **admin 계정 생성** — 첫 기동 후 `http://localhost:8081` 접속 → 회원가입(첫 가입자가 자동 admin).

2. **모델 프리셋 등록 — `gemma4-web` (Web Search ON)**
   - 좌측 사이드바 **하단의 Workspace 아이콘**(격자/폴더) → 상단 탭 **Models** → 우측 **+ Create a Model**
   - 이름 `gemma4-web`, 베이스 `gemma4:26b`, 시스템 프롬프트는 [`docs/14-Open-WebUI-plan.md`](./14-Open-WebUI-plan.md) §7 Phase 2 의 문구
   - **Capabilities / Default Features** 섹션의 **Web Search 토글 ON**
   - Save & Create

3. **API 키 발급**
   - 좌측 사이드바 **하단의 사용자 아바타**(이름 옆 동그라미) 클릭
   - 드롭다운에서 **Settings(설정)** 선택 → 좌측 카테고리 **Account(계정)**
   - 하단 **API Keys** 섹션 → **Create new secret key**
   - 키 복사 → 루트 `.env` 의 `OPEN_WEBUI_API_KEY=<발급된 키>` 에 저장

4. **회원가입 비활성화 (선택)**
   - 좌측 하단 아바타 → 드롭다운에서 **Admin Panel(관리자 패널)** 선택
   - 좌측 **Settings(설정)** → 상단 탭 **General(일반)**
   - **"Enable New Sign Ups"** 토글 OFF → Save

5. **기본 채팅 모델 지정 + 임베딩/사용 안 하는 모델 숨김 (필수)**
   - Ollama 에 여러 모델이 있을 때 채팅 드롭다운에 임베딩 모델·구버전이 함께 보여 사용자 혼란 발생
   - **Admin Panel → Settings → 모델** 에서 사용 안 할 모델(`nomic-embed-text:latest`·`gemma2:9b`·`gemma4:31b`·`gemma4:e4b` 등)의 우측 활성 토글을 **OFF** (회색)
   - 새 채팅 한 번 열어 좌측 상단 모델 표시기가 `gemma4:26b` 로 잡히는지 확인 → 모델명 아래의 **"기본값으로 설정"** 링크 클릭하여 LocalStorage 에 확정

> ⚠️ **v0.9.2 관찰**: `DEFAULT_MODELS` 환경변수는 첫 부팅 시에만 DB 로 마이그레이트되고 이후엔 env 를 무시. Admin Panel 의 system-wide "Default Model" 입력란도 v0.9.2 에서는 노출되지 않는다. 결국 **(a) 사용 안 할 모델 비활성화 + (b) 새 채팅에서 "기본값으로 설정" 클릭** 의 2단계 UI 작업이 사실상 표준 절차다.
>
> RAG 의 임베딩 호출은 컨테이너 백엔드(`rag/server.js`) 가 Ollama 를 **직접 호출** 하므로 Open WebUI 에서 `nomic-embed-text` 를 비활성화해도 영향 없음.

**왜 호스트 Ollama 를 그대로 쓰나** — Ollama 는 GPU/메모리 자원을 많이 잡으므로 컨테이너로 추가 띄우면 자원 두 배 점유. RAG/Agent/Open WebUI 모두 같은 Ollama 인스턴스를 공유.

### 4.6 searxng 컨테이너 (메타 검색 엔진)

| 항목 | 값 |
|------|------|
| Image | `searxng/searxng:latest` |
| 역할 | Google/Bing/DuckDuckGo 등 결과를 집계해 JSON 으로 반환. Open WebUI 의 검색 백엔드. API 키 불필요 |
| Bind Mount | `./docker/searxng-settings.yml:/etc/searxng/settings.yml:ro` |
| 노출 포트 | 내부만 (`expose: ["8080"]`). 호스트 publish 없음 |
| 컨테이너 네트워크 | `teamworks-net` |
| 환경변수 | `BASE_URL=http://searxng:8080/` <br> `INSTANCE_NAME=teamworks-searxng` |

**`docker/searxng-settings.yml` 핵심 설정**
- `search.formats: [html, json]` (Open WebUI 가 JSON 호출)
- `search.default_lang: ko`
- `engines:` Google/Bing/DuckDuckGo/Naver 활성, 그 외 비활성
- `server.secret_key: <랜덤>`
- `server.limiter: false` (내부망이므로 rate limit 비활성)

대안: SearxNG 대신 **DuckDuckGo 직접 호출**(Open WebUI 내장)을 쓰면 컨테이너 1개 절약. 단 결과 품질이 떨어지고 한국어 결과 다양성이 낮음. Searx 쪽이 메타검색이라 한국어 친화적.

---

## 5. 네트워크 설계

현재 `postgres-db`는 Docker 기본 `bridge`에 있다. 기본 bridge는 컨테이너 간 DNS resolution이 안 되므로(IP만 가능), 새 컨테이너들이 `postgres-db`를 호스트명으로 부르려면 **사용자 정의 네트워크에 함께 묶여야** 한다.

### 방법

1. Compose가 `teamworks-net` 사용자 정의 bridge 네트워크를 생성 (compose 파일에 정의).
2. 1회성: `docker network connect teamworks-net postgres-db` 실행 → 기존 컨테이너를 새 네트워크에도 동시 소속시킴 (기존 bridge 연결은 유지).
3. 이후 backend는 `postgres-db:5432`로 접속 가능.

### 대안 (선택 안 함, 사유)

| 대안 | 사유 |
|------|------|
| `host.docker.internal:5432` 사용 | macOS Docker Desktop에서만 동작, Linux 호환성 떨어짐 |
| `network_mode: host` | macOS에서 정상 동작 안 함 |
| `postgres-db` 재생성 | 사용자 요청: 재생성 금지 |

---

## 6. Bind Mount 함정과 해결

### 6.1 node_modules 충돌

호스트 `./frontend`를 통째로 컨테이너 `/app`에 마운트하면, 컨테이너 빌드 시점에 만든 `/app/node_modules`가 **호스트 마운트로 덮여** 사라진다. macOS에서 `npm install`한 모듈은 컨테이너의 Alpine Linux와 ABI가 다르므로 그대로 쓸 수도 없다.

**해결**: `node_modules`를 익명 볼륨으로 별도 마운트해 호스트 mount 위에 덧씌움.

```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules        # ← 익명 볼륨, 호스트 마운트보다 우선
```

### 6.2 macOS 파일 감지 누락

Docker Desktop의 VirtioFS/osxfs는 inotify 이벤트 일부를 누락한다. Next.js의 Turbopack은 자체 watcher라 영향이 적지만, 보험으로 폴링 환경변수를 켠다.

```yaml
environment:
  WATCHPACK_POLLING: "true"
  CHOKIDAR_USEPOLLING: "true"
```

### 6.3 .dockerignore

호스트 `node_modules`/`.next`가 Compose 파일 처리 단계에서 빌드 컨텍스트로 들어가지 않도록 `.dockerignore` 작성. (compose는 image만 사용하므로 영향 적지만, 추후 Dockerfile 단계 추가 대비.)

```
node_modules
.next
.git
.env.local
*.log
```

---

## 7. docker-compose.yml 초안

```yaml
services:
  backend:
    image: node:24-alpine
    working_dir: /app
    volumes:
      - ./backend:/app
      - backend_node_modules:/app/node_modules
    env_file:
      - ./backend/.env.local
    environment:
      DATABASE_URL: postgresql://teamworks-manager:Nts123%21%40%23@postgres-db:5432/teamworks
      FRONTEND_URL: http://localhost:8080
      NODE_ENV: development
    command: sh -c "npm install && npm run dev"
    networks:
      - teamworks-net
    expose:
      - "3000"

  frontend:
    image: node:24-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
      WATCHPACK_POLLING: "true"
      CHOKIDAR_USEPOLLING: "true"
      NODE_ENV: development
    command: sh -c "npm install && npm run dev"
    networks:
      - teamworks-net
    expose:
      - "3001"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./docker/nginx.dev.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    networks:
      - teamworks-net

  searxng:
    image: searxng/searxng:latest
    volumes:
      - ./docker/searxng-settings.yml:/etc/searxng/settings.yml:ro
    environment:
      BASE_URL: http://searxng:8080/
      INSTANCE_NAME: teamworks-searxng
    expose:
      - "8080"
    networks:
      - teamworks-net

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "8081:8080"
    volumes:
      - open_webui_data:/app/backend/data
    environment:
      OLLAMA_BASE_URL: http://host.docker.internal:11434
      WEBUI_SECRET_KEY: ${OPEN_WEBUI_SECRET_KEY:-change-me-in-env}
      WEBUI_AUTH: "true"
      ENABLE_RAG_WEB_SEARCH: "true"
      RAG_WEB_SEARCH_ENGINE: searxng
      RAG_WEB_SEARCH_RESULT_COUNT: "5"
      SEARXNG_QUERY_URL: "http://searxng:8080/search?q=<query>&format=json"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - searxng
    networks:
      - teamworks-net

volumes:
  backend_node_modules:
  frontend_node_modules:
  open_webui_data:

networks:
  teamworks-net:
    name: teamworks-net
    driver: bridge
```

---

## 8. nginx.dev.conf 초안

```nginx
upstream backend  { server backend:3000; }
upstream frontend { server frontend:3001; }

server {
    listen 80;
    client_max_body_size 10M;

    # ── Backend API ─────────────────────────────────────────────
    location /api/ {
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ── Next.js HMR WebSocket ──────────────────────────────────
    location /_next/webpack-hmr {
        proxy_pass         http://frontend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # ── Frontend (Next.js) ─────────────────────────────────────
    location / {
        proxy_pass         http://frontend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

## 9. 파일/디렉토리 추가 계획

```
team-works/
├── docker-compose.yml             ← 신규
├── docker/
│   └── nginx.dev.conf             ← 신규
├── .dockerignore                  ← 신규 (선택)
├── backend/
│   └── .env.local                 ← 그대로 (compose가 environment로 override)
└── frontend/
    └── .env.local                 ← 신규 생성 권장 (NEXT_PUBLIC_API_URL=http://localhost:8080)
                                     단, compose의 environment에서도 주입하므로 호스트 dev 시에만 필요
```

---

## 10. 실행 절차

### 최초 1회 셋업

```bash
# 1. 새 네트워크에 기존 postgres-db 연결
docker network create teamworks-net 2>/dev/null || true
docker network connect teamworks-net postgres-db

# 2. compose 기동
docker compose up
```

### 일상 사용

```bash
# ↓ 표준 워크플로우 — 정의된 6개 서비스(db / backend / frontend / nginx / searxng / open-webui)
#   를 한 번에 기동. 서비스 이름을 명시하지 않으면 기본적으로 전체가 대상.
docker compose up              # 포그라운드 (로그 같이 보기)
docker compose up -d           # 백그라운드 (권장)

# 부분 운영
docker compose up -d searxng open-webui   # AI 보조만 단독 기동 (호스트 npm run dev 와 병행 시)
docker compose logs -f backend            # 특정 서비스 로그
docker compose restart open-webui         # 특정 서비스만 재시작
docker compose down                       # 전체 정지 (네임드 볼륨 보존)
```

**확인** — `docker compose ps` 로 6개가 모두 `Up` 상태인지 점검:

```
NAME                    STATUS              SERVICE
postgres-db             Up                  db
team-works-backend-1    Up                  backend
team-works-frontend-1   Up                  frontend
team-works-nginx-1      Up                  nginx
teamworks-searxng       Up                  searxng
teamworks-open-webui    Up (healthy)        open-webui
```

### 의존성 재설치 (package.json 수정 시)

익명 볼륨에 캐시된 `node_modules`를 한 번 비워야 새 패키지가 들어옴.

```bash
docker compose down
docker volume rm team-works_backend_node_modules team-works_frontend_node_modules
docker compose up
```

### 10.5 Open WebUI / SearxNG 기동 (실제 사용 명령어)

본 문서 1.2 시점에 실행한 명령들. backend / frontend 컨테이너와 분리해 **두 서비스만 단독 기동**할 수도 있다(호스트 `npm run dev` 그대로 사용 시).

**사전 조건**
- 호스트 Ollama 실행 중 (`http://127.0.0.1:11434`) — `gemma4:26b` + `nomic-embed-text` pull 완료
- `teamworks-net` 네트워크 존재 (없으면 `docker network create teamworks-net`)
- `docker/searxng-settings.yml` 존재 (없으면 §4.6 의 핵심 설정대로 작성. 본 저장소엔 이미 포함)

**1) `OPEN_WEBUI_SECRET_KEY` 생성 및 `.env` 저장 (1회)**

```bash
# 32바이트 랜덤 hex 키
SECRET=$(openssl rand -hex 32)

# 루트 .env 에 누적 저장 (기존 키 보존)
if [ -f .env ] && grep -q "^OPEN_WEBUI_SECRET_KEY=" .env; then
  echo ".env 에 OPEN_WEBUI_SECRET_KEY 이미 존재 — 보존"
else
  echo "OPEN_WEBUI_SECRET_KEY=$SECRET" >> .env
fi
```

`.env` 는 `.gitignore` 에 포함되어야 하며, 키가 노출되면 즉시 재발급 후 모든 세션을 무효화한다.

**2) 이미지 pull**

```bash
docker compose pull searxng open-webui
```

`open-webui` 이미지는 ~1GB 이상이라 첫 pull 에 수 분 소요.

**3) 두 컨테이너만 단독 기동**

```bash
docker compose up -d searxng open-webui
```

`-d` 는 detached 모드. backend/frontend 는 호스트 `npm run dev` 로 띄우고 있다면 함께 띄우지 않는다.

**4) 헬스 확인**

```bash
# 컨테이너 상태
docker ps --filter "name=teamworks-searxng" --filter "name=teamworks-open-webui" \
  --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# SearxNG JSON 응답 — open-webui 컨테이너 내부에서 호출
docker exec teamworks-open-webui curl -sf "http://searxng:8080/search?q=test&format=json" | head -c 200

# Open WebUI → 호스트 Ollama 도달
docker exec teamworks-open-webui curl -sf http://host.docker.internal:11434/api/tags | head -c 200

# Open WebUI 자체 응답 (첫 부팅 시 30초~1분 동안 HuggingFace 임베딩 모델 다운로드로 인해 503/000 가능)
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8081/health
```

**5) Open WebUI 초기 셋업 (브라우저, 1회)** — §4.5 의 5단계 그대로.

**중지 / 재기동**

```bash
docker compose stop searxng open-webui      # 컨테이너만 중지 (볼륨·네트워크 보존)
docker compose start searxng open-webui     # 다시 기동
docker compose restart open-webui           # 재시작 (설정 변경 반영)
docker compose down                         # compose 의 모든 서비스 중지·제거 (volumes 는 보존)
docker volume rm team-works_open_webui_data # ⚠️ admin 계정·모델 프리셋·채팅 이력 모두 삭제. 정말 초기화할 때만
```

> 첫 부팅 시 Open WebUI 가 HuggingFace 에서 기본 임베딩 모델(sentence-transformers) 30개 파일을 받아온다. 네트워크가 느리면 1~3분 소요. 다음 부팅부터는 컨테이너 볼륨에 캐시되어 즉시 응답.

---

## 11. 검증 항목

| # | 검증 내용 | 예상 결과 |
|---|----------|----------|
| 1 | `curl -I http://localhost:8080/` | `200 OK`, frontend HTML |
| 2 | `curl http://localhost:8080/api/teams/public` | 백엔드 응답 (401/200 등) |
| 3 | `curl -i -X OPTIONS http://localhost:8080/api/auth/signup -H "Origin: http://localhost:8080"` | `access-control-allow-origin: http://localhost:8080` |
| 4 | 브라우저 DevTools — `/_next/webpack-hmr` WebSocket 101 Switching Protocols | HMR 연결 OK |
| 5 | `frontend/app/(auth)/signup/page.tsx` 한 줄 수정 → 브라우저 자동 갱신 | HMR 동작 |
| 6 | `docker exec teamworks-backend-1 wget -qO- postgres-db:5432` 연결 시도 | TCP 연결 가능 (HTTP 응답 아님) |
| 7 | 회원가입 end-to-end (브라우저 → /api/auth/signup → DB 저장) | users 테이블 1행 증가 |
| 8 | `curl -s 'http://searxng:8080/search?q=test&format=json'` (open-webui 컨테이너 내부에서) | JSON `results[]` 반환 |
| 9 | `http://localhost:8081` 접속 → admin 로그인 → Models 에 `gemma4-web` 보임 | Web Search 토글 ON |
| 10 | `curl -X POST http://localhost:8081/api/chat/completions -H "Authorization: Bearer $OPEN_WEBUI_API_KEY" -H "content-type: application/json" -d '{"model":"gemma4-web","messages":[{"role":"user","content":"오늘 서울 날씨"}]}'` | JSON 답변 + sources 에 검색 URL 1건 이상 |
| 11 | Open WebUI → Ollama 도달 — 컨테이너 내부에서 `curl http://host.docker.internal:11434/api/tags` | 모델 목록 응답 |
| 12 | `docker compose ps` | db / backend / frontend / nginx / searxng / open-webui **6개 모두 Up** (open-webui 는 `(healthy)`) |
| 13 | `enable_api_keys` 활성화 확인 — `curl -s http://localhost:8081/api/config \| python3 -c "import sys,json;print(json.load(sys.stdin)['features']['enable_api_keys'])"` | `True` (false 면 admin 패널에서 토글 ON) |

---

## 12. 위험 / 함정 / 마이그레이션 노트

| 항목 | 영향 | 대응 |
|------|------|------|
| **첫 `compose up` 시간** | 컨테이너 내부 `npm install` 5~10분 소요 | 익명 볼륨에 캐시되어 두 번째부터 수십 초 |
| **호스트 dev와 동시 실행 불가** | 포트 3000/3001 충돌 | compose 사용 시 호스트 `npm run dev` 종료 |
| **`backend/.env.local`의 `DATABASE_URL`** | 호스트 dev 시 `localhost`, 컨테이너 dev 시 `postgres-db` | compose의 `environment:`로 override (계획 §4.1 반영). `.env.local`은 호스트 모드 값 유지 |
| **`backend/.env.local`의 `FRONTEND_URL`** | 호스트 dev 시 `http://localhost:3001`, 컨테이너 dev 시 `http://localhost:8080` | 동일하게 compose `environment:`로 override |
| **`NEXT_PUBLIC_API_URL`** | 빌드 시점에 인라인되는 환경변수. dev 모드에선 매 요청 시 적용되나 production 빌드 시 주의 | 프로덕션 Compose 설계 시 build args 사용 |
| **Hot Reload 누락** | macOS bind mount + Turbopack 조합에서 가끔 발생 | `WATCHPACK_POLLING`/`CHOKIDAR_USEPOLLING=true` |
| **postgres-db 네트워크 연결 누락** | backend가 `getaddrinfo ENOTFOUND postgres-db` 에러 | 최초 셋업의 `docker network connect` 단계 누락 시 발생. compose-up 직전 확인 |
| **Compose 프로젝트명** | 익명 볼륨 이름이 `<프로젝트명>_backend_node_modules` 형식 | 디렉토리명 `team-works` 기준 자동 생성. `COMPOSE_PROJECT_NAME` env로 고정 가능 |
| **Open WebUI 첫 부팅 HF 다운로드** | sentence-transformers 모델을 HF Hub 에서 다운로드 시도. 네트워크가 느리거나 HF 가 unauthenticated rate limit 을 걸면 "Fetching 30 files: 0%" 에서 무한 정지. 컨테이너는 `(unhealthy)` 표시 | `RAG_EMBEDDING_ENGINE=ollama` + `RAG_OLLAMA_BASE_URL=http://host.docker.internal:11434` + `RAG_EMBEDDING_MODEL=nomic-embed-text:latest` 3종 설정으로 HF 호출 자체 회피. 본 저장소의 compose 는 이미 적용됨 |
| **Open WebUI healthcheck 30~60초** | 첫 부팅 시 alembic 마이그레이션·플러그인 로드·Ollama 연결 확인 단계 합쳐 ~30초. 그 사이 `/health` 가 000 반환 → 컨테이너 `(health: starting)` | 정상. `until curl -sf http://localhost:8081/health; do sleep 3; done` 로 대기 |
| **env 변수가 첫 부팅 후 무시되는 설정 항목** | `ENABLE_API_KEY`, `ENABLE_RAG_WEB_SEARCH`, `RAG_WEB_SEARCH_ENGINE`, `DEFAULT_MODELS`, `BYPASS_WEB_SEARCH_EMBEDDING_AND_RETRIEVAL` 등 admin 영역 설정은 **첫 부팅에만 DB 로 마이그레이트**되고 이후엔 env 변경 무시. 한 번 컨테이너를 띄운 후엔 env 만 바꿔 재기동해도 적용 안 됨 | **Admin Panel UI** 에서 직접 토글. compose env 는 깨끗한 첫 기동(`docker volume rm team-works_open_webui_data` 후) 시에만 의미. 운영 중 변경은 항상 UI 가 권위 |
| **웹 검색 답변이 빈약(메뉴 텍스트만 인용)** | 페이지 본문 fetch + 임베딩·청킹 과정에서 짧은 SearxNG snippet 의 핵심 정보가 메뉴 텍스트에 묻혀 모델이 "구체 정보 없음" 으로 답변 | Admin Panel → 웹 검색 → **"임베딩 검색 우회"** 토글 ON. snippet 전체가 그대로 모델에 전달돼 답변 품질 향상. 페이지 fetch 도 생략돼 응답 시간 단축 |

---

## 13. 후속 작업 (이번 계획 외)

- **프로덕션 Compose**: `Dockerfile.prod`로 `next build` → `next start` 멀티스테이지 이미지 작성
- **Healthcheck**: 각 컨테이너에 `healthcheck:` 추가 (curl/wget으로 `/api/health`)
- **로그 집계**: `docker compose logs` 대신 Loki/Grafana 연동 (필요 시)
- **CI**: GitHub Actions에서 `docker compose -f docker-compose.ci.yml` 로 통합 테스트 실행
- **Production Compose 가이드(TBD)**: `Dockerfile.prod` 기반 운영 배포 절차를 별도 문서로 정리
- **Open WebUI 회원가입 차단 자동화**: 첫 admin 셋업 후 `WEBUI_AUTH_SIGNUP=false` 자동 적용
- **검색 백엔드 교체 가능성**: SearxNG → Brave Search API (월 2,000건 무료) 또는 Google PSE 로 운영 환경 전환 시 결정. 환경변수만 바꾸면 됨
- **AI 비서 라우팅 미들웨어**: 프론트 프록시(`frontend/app/api/ai-assistant/chat/route.ts`)에 의도 분류 추가. 상세는 [`docs/14-Open-WebUI-plan.md`](./14-Open-WebUI-plan.md)

---

## 14. 작업 단계 (실행 시)

1. `docker/nginx.dev.conf` 작성
2. `docker/searxng-settings.yml` 작성 (SearxNG 검색 엔진·언어·포맷 설정)
3. `docker-compose.yml` 작성 (backend / frontend / nginx / searxng / open-webui)
4. `.dockerignore` 작성
5. `.env.local` (루트) 에 `OPEN_WEBUI_SECRET_KEY`, `OPEN_WEBUI_API_KEY` 추가
6. `docker network connect teamworks-net postgres-db` (compose 가 네트워크 만든 후)
7. `docker compose up -d` 첫 기동 — 정의된 6개 서비스(db·backend·frontend·nginx·searxng·open-webui) 일괄. backend/frontend 는 `npm install` 대기로 5~10분 소요
8. Open WebUI 초기 설정 — admin 계정 생성, `gemma4-web` 모델 프리셋 등록(Web Search ON), API 키 발급해 `.env.local` 에 반영
9. §11 검증 항목 1~11번 순차 실행
10. 호스트 `npm run dev` 워크플로우 종료 안내 (또는 둘 중 택일)

---

## 15. 관련 문서

| 문서 | 경로 |
|------|------|
| 프로젝트 구조 | `docs/4-project-structure.md` |
| API 명세 | `docs/7-api-spec.md` |
| ERD | `docs/6-erd.md` |
| AI 버틀러 라우팅·Open WebUI 통합 | `docs/14-Open-WebUI-plan.md` |
| RAG 파이프라인 | `docs/13-RAG-pipeline-guide.md` |
