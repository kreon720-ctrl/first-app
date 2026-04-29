# AI 버틀러 "찰떡" — Open WebUI 통합 및 의도 기반 라우팅 계획

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-04-28 | 최초 작성 — TEAM WORKS 사용법(RAG) vs 일반 질문(Open WebUI + 웹검색) 자동 라우팅 설계 |
| 1.1 | 2026-04-28 | 구현 완료 후 갱신 — RRF 점수 임계값 가설이 데이터로 반박되어 **키워드 + RAG 답변 거절 fallback** 으로 전략 변경. nginx 라우팅 함정·Open WebUI v0.9 web_search 권한 함정 §9에 기록. sources 추출이 답변 본문 URL 정규식 fallback 사용 |
| 1.2 | 2026-04-29 | 응답 시간 최적화 — `GENERAL_KEYWORDS` BLACKLIST 추가(§4.1)로 명백한 일반 질문은 RAG 답변(약 50초) 스킵. Next.js 16 의 API route `maxDuration` default 5분 함정 발견·해결(§9). 측정된 시간 분포 §9 명시 |
| 1.3 | 2026-04-29 | **응답 스트리밍 도입(SSE) + Option 1 아키텍처 변경**. 두 경로 모두 첫 토큰까지 ~3~10초로 단축. Open WebUI 의 web_search 가 검색·로더를 직렬로 5분+ 소비해 stream 효과를 가리던 문제를 해결하기 위해 **frontend 가 SearxNG 를 직접 호출**해 결과를 system prompt 에 inline 주입하고 Open WebUI 의 web_search 는 비활성. §3·§5.2 갱신, §10 첫 항목 구현 완료로 전환 |

---

## 1. 목표 / 범위

찰떡 팝업창에서 사용자가 한 가지 입력창으로 모든 질문을 던지면, 서버가 **의도를 자동 분류**해 다음 두 경로 중 하나로 답변한다.

- **TEAM WORKS 사용법 질문** → 기존 **RAG 파이프라인** (`rag/server.js:8787`) 으로 처리. `ollama/*.md` 공식 문서 기반.
- **일반 질문** (오늘 날씨, 최신 뉴스, 코딩 팁 등) → 신규 **Open WebUI** 컨테이너의 OpenAI-compatible API 로 전달. SearxNG 메타검색 결과를 동봉해 `gemma4:26b` 가 답변.

기존 **실행 모드**(`mode=agent`, Agent 서버 8788) 는 변경 없음. 본 계획은 **안내 모드** 의 분기만 다룸.

### 범위 안
- 의도 분류기 설계 (RAG 검색 점수 기반 휴리스틱)
- 프록시 라우팅 변경 (`frontend/app/api/ai-assistant/chat/route.ts`)
- Open WebUI / SearxNG 컨테이너 설계 (인프라는 [`docs/30-docker-container-gen.md` §4.5·§4.6](./30-docker-container-gen.md))
- UI 출처 뱃지 (찰떡 팝업이 답변 출처를 명시)

### 범위 밖
- 채팅 히스토리/세션 (단일 턴 유지)
- Open WebUI 자체의 RAG 기능 (Open WebUI 내부 문서 인덱싱 미사용 — TEAM WORKS 문서는 우리 RAG 만 담당)

> 답변 스트리밍은 v1.3 에서 범위 안으로 편입·구현 완료. §5.2, §10 참고.

---

## 2. 현재 vs 목표 아키텍처

### 현재 (안내 모드)

```
사용자 → 찰떡 팝업 → /api/ai-assistant/chat
                          │
                          └─ mode=guide → RAG (8787)
                                            └─ Ollama gemma4:26b
```

질문이 TEAM WORKS 와 무관해도 RAG 가 강제 답변 → 가드레일에 의해 "현재 안내되어 있지 않아요" 정중 거절.

### 목표

```
사용자 → 찰떡 팝업 → /api/ai-assistant/chat (의도 분류)
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
   RAG (8787)        Open WebUI (8081)   Agent (8788, 기존)
   안내 — 사용법     일반 — 웹검색+답변    실행 — 도구 호출
        │                 │                  │
        └─ Ollama gemma4:26b ─────────┘ ←────┘
              ↑
              SearxNG (검색)
```

분류 기준은 **RAG 검색 결과의 RRF 점수가 임계값 이상인가** 만으로 결정. 추가 LLM 호출 없음.

---

## 3. 컴포넌트 책임

| 컴포넌트 | 책임 | 변경 여부 |
|----------|------|----------|
| `frontend/app/api/ai-assistant/chat/route.ts` | 안내 모드에서 RAG `/classify` 호출 → 분기 → RAG `/chat` 또는 **SearxNG 직접 호출 + Open WebUI** 합성. SSE stream 모드 지원 (`stream:true`). 응답에 `source` 필드 부착 | **변경** |
| `rag/server.js` | `POST /classify` (키워드 분류) + `POST /chat` 의 `stream:true` 모드(Ollama ndjson → SSE forward) | **변경 (엔드포인트 추가)** |
| `rag/retriever.js` | 그대로. `retrieve()` 가 이미 RRF 점수 반환 | 변경 없음 |
| Open WebUI 컨테이너 | OpenAI-compatible `/api/chat/completions` 게이트웨이. **검색은 frontend 가 SearxNG 직접 호출 → system prompt inline 주입**, Open WebUI 의 `web_search` 는 `features:{web_search:false}` 로 비활성. 모델은 inline 컨텍스트로 답변 합성 (stream:true) | **신규** |
| SearxNG 컨테이너 | Google/DuckDuckGo/Naver 결과 집계 메타검색. **frontend 와 Open WebUI 양쪽에서 호출** (Option 1 아키텍처) | **신규** |
| Ollama (호스트) | RAG·Agent·Open WebUI 가 공유. `gemma4:26b` + `nomic-embed-text` | 변경 없음 |
| `frontend/app/ai-assistant/page.tsx` | 답변 카드에 출처 뱃지(📚 공식 문서 / 🌐 웹 검색) 추가 + **SSE 파서**(meta/sources/progress/token/error 이벤트 점진 렌더) | **변경** |

---

## 4. 의도 분류 전략

> **갱신 (v1.1, 구현 후)** — 초기 RRF 점수 임계값 접근은 **데이터로 반박됨**.
> 모든 쿼리에 RRF top-1 점수가 비슷하게(0.026~0.033) 나와 **단일 임계값으로 분류 불가능**.
> 채택 전략은 **키워드 화이트리스트 + RAG 답변 거절 패턴 fallback** 의 2-stage.

### 4.1 채택안 — 2-stage 라우팅

```
function routeGuide(question):
    # Stage 1: 강한 사용법 시그널 — 키워드 화이트리스트
    cls = classify(question)
    if cls.isTeamWorks:                      # 키워드 매치 → 즉시 RAG
        return { source: "rag", answer: ragChat(question) }

    # Stage 2: 답변 시도 후 거절 패턴 폴백
    rag = ragChat(question)                  # 일단 RAG 시도
    if not isRefusal(rag.answer):            # 가드레일이 답변을 거절하지 않았으면
        return { source: "rag", answer: rag.answer }

    # RAG 가 거절했거나 실패 → Open WebUI fallback
    return { source: "web", answer: openWebUi(question) }
```

`HARD_KEYWORDS` (현재 12개): `["team works", "팀웍스", "팀 워크스", "찰떡", "포스트잇", "공지사항", "업무보고", "가입 신청", "프로젝트 일정", "세부 일정", "간트차트", "팀장", "팀원", "팀 일정", "팀 채팅"]`. 운영 중 추가/제거.

**`GENERAL_KEYWORDS` (BLACKLIST, v1.2 신규)** — 명백한 일반 질문 시그널. 매치 시 `reason: "general-keyword"` 반환 → `route.ts` 가 **RAG 답변 시도(약 50초) 스킵하고 곧장 Open WebUI** 호출. fallback 라벨은 `general-keyword-direct`. 현재 13개: `["뉴스", "날씨", "주가", "주식", "환율", "시세", "오늘의", "최신", "헤드라인", "스포츠 결과", "경기 결과", "검색해줘", "에 대해 알려줘", "에 대해 검색"]`. RAG 거절 답변 생성 시간을 회피하는 가장 효과적 단일 최적화.

**REFUSAL_PATTERNS** (정규식, OR 매칭) — RAG 가드레일 응답의 표준 시그널. 운영 중 발견된 거절 케이스를 누적하며 보강한다(새 표현으로 거절하면 패턴 추가):
- `참고\s*자료` (메타 표현 — 정상 사용법 답변엔 등장하지 않음, 강한 시그널)
- `AI\s*비서\s*["“”']?찰떡` (자기소개 마감 패턴, 찰떡 단어 명시)
- `저는\s*TEAM\s*WORKS\s*의?\s*AI\s*비서` (찰떡 단어 없는 자기소개 마감 — 2026-04-28 추가)
- `현재\s*안내되어\s*있지\s*않` / `안내되어\s*있지\s*않` ("현재" 없는 케이스 — 2026-04-28 추가)
- `안내해\s*드릴\s*수\s*없` (2026-04-28 추가)
- `안내\s*모드[\s\S]{0,200}실행\s*모드` (두 모드 설명으로 마감 = 거절형 — 2026-04-28 추가)
- `TEAM\s*WORKS\s*이용과\s*관련` / `TEAM\s*WORKS\s*사용법\s*외`
- `제공된\s*(참고\s*)?자료에는?[^]{0,30}않`
- `포함되어\s*있지\s*않아`
- `관련\s*(정보|내용)을?\s*(찾을\s*수\s*없|포함하고\s*있지\s*않)`

### 4.2 RRF 점수 임계값을 버린 이유 (실측)

구현 후 `/classify` 점수 분포:

| 질문 | top-1 RRF 점수 |
|---|---|
| 팀 만들기 (사용법) | 0.0284 |
| 일정을 어떻게 등록해 (사용법) | 0.0314 |
| 프로젝트 삭제 (사용법) | 0.0323 |
| **Next.js 16 새 기능 (일반)** | 0.0265 |
| **파이썬 리스트 정렬 (일반)** | 0.0269 |
| **내일 부산 비 와? (일반)** | 0.0333 |
| **오늘 점심 추천 (일반)** | 0.0301 |

사용법(0.028~0.032)과 일반 질문(0.026~0.033)의 **점수 분포가 거의 겹친다**. RRF 는 절대 점수가 아니라 상대 랭킹 기반(`1/(60+rank)`)이라 모든 쿼리에 비슷한 값이 나오는 것이 자연스러움 — top-K 가 항상 차오르므로.

### 4.3 새 전략의 장단점

**장점**
- 분류 신호가 **답변 내용 자체** — 가장 정확한 시그널 (가드레일이 거절 패턴을 표준화함)
- 임계값 튜닝 불필요
- 키워드 매치 시 빠름 (RAG 답변 한 번으로 종결)
- 사용법으로 잘못 라우팅돼도 RAG 가 거절하면 자연스럽게 Open WebUI 로 보정

**단점**
- 키워드 매치 안 되는 일반 질문은 **RAG 답변 생성(수~수십 초) 후 fallback** — 두 번째 호출 비용
- 거절 패턴 정규식이 가드레일 문구 변경 시 깨질 수 있음 → §10 후속 작업

### 4.4 후속 개선 (선택)

1. **RAG 거절 결정 사전 신호** — RAG 서버가 답변 생성 전에 가드레일이 거절할지 미리 판정해 즉시 fallback. 예: 검색 결과가 모두 무관 청크면 답변 생략.
2. **재현 가능한 거절 시그널 표준화** — 가드레일이 거절 시 응답 메타데이터(JSON 헤더 또는 `kind: "refusal"` 필드)로 명시. 정규식 의존 제거.
3. **운영 로그** — 각 호출의 `(질문, classification, source, fallback, latency)` 적재. 거짓 라우팅 케이스 식별.

---

## 5. 흐름도

### 5.1 시퀀스 — 사용법 질문 (RAG 경로)

```
브라우저          프록시 route.ts        rag/server.js        ollama
  │  question         │                       │                  │
  │ ───────────────▶ │                       │                  │
  │                  │ POST /classify        │                  │
  │                  │ ─────────────────────▶│                  │
  │                  │                       │ embed(query)     │
  │                  │                       │ ────────────────▶│
  │                  │                       │ ◀────────────────│
  │                  │                       │ retrieve(top-5)  │
  │                  │ {isTeamWorks: true,   │                  │
  │                  │  topScore: 0.034,     │                  │
  │                  │  cachedResults: [..]} │                  │
  │                  │ ◀─────────────────────│                  │
  │                  │ POST /chat            │                  │
  │                  │ {question, retrieved} │                  │
  │                  │ ─────────────────────▶│ chat(messages)   │
  │                  │                       │ ────────────────▶│
  │                  │                       │ ◀────────────────│
  │ ◀─────────────── │ ◀───────────────────  │                  │
  │ {answer,         │                       │                  │
  │  source:"rag",   │                       │                  │
  │  sources:[...]}  │                       │                  │
```

### 5.2 시퀀스 — 일반 질문 (Open WebUI 경로, Option 1 + SSE stream)

```
브라우저          프록시 route.ts     rag/server.js     searxng       open-webui     ollama
  │ question(stream)  │                   │                │              │            │
  │ ────────────────▶│                   │                │              │            │
  │                  │ POST /classify    │                │              │            │
  │                  │ ────────────────▶│                │              │            │
  │                  │ {reason:           │                │              │            │
  │                  │  "general-keyword"}│                │              │            │
  │                  │ ◀────────────────│                │              │            │
  │ ◀── SSE meta ─── │ (source:"web")                                                │
  │                  │ GET /search?q=…&format=json (~2초)│              │            │
  │                  │ ─────────────────────────────────▶│              │            │
  │                  │ ◀─────────────────────────────────│              │            │
  │ ◀── SSE sources ─│ (URL/title 5건 즉시 송출)                                     │
  │                  │ POST /api/chat/completions stream:true                         │
  │                  │ {messages:[system+inline 검색결과,user], features:{web_search:false}}
  │                  │ ──────────────────────────────────────────────▶│            │
  │                  │                                                  │ ollama chat (stream)
  │                  │                                                  │ ──────────▶│
  │                  │                                                  │ ◀──tokens──│
  │                  │ ◀──── reasoning_content 청크 (thinking-mode) ───│            │
  │ ◀── SSE progress │ (🔎 검색 결과를 분석 중…)                                     │
  │                  │ ◀──── delta.content 청크 (실제 답변 토큰) ──────│            │
  │ ◀── SSE token ── │ (점진 렌더, 매 토큰)                                          │
  │ ◀── SSE done ─── │ (스트림 종료)                                                 │
```

핵심 결정 — **Open WebUI 의 web_search 를 끄고 frontend 가 SearxNG 를 직접 호출**.
- 동기: Open WebUI 의 web_search 는 검색·web_loader·임베딩 단계가 직렬 ~5분+ 소요해 stream 효과를 가렸음.
- 대안 비교 (Option 0): Open WebUI 의 web_search 를 켜둔 채 stream 으로 받기 → snippet 5건으로 줄여도 첫 토큰 4~5분 지연.
- 채택 (Option 1): SearxNG 를 frontend 가 호출 → snippet 5건을 system prompt 에 inline 주입 → Open WebUI 모델이 검색 단계 없이 곧장 답변 stream. 첫 토큰 ~3~10초.
- 검증: `오늘 뉴스` 쿼리에서 `meta` → `sources` (5건 즉시) → `progress` (thinking 시그널) → `token` 흐름 확인.

---

## 6. 변경 대상 파일

### 6.1 신규

| 파일 | 내용 |
|------|------|
| `docker/searxng-settings.yml` | SearxNG 엔진·언어·포맷·secret_key |
| `frontend/app/api/ai-assistant/__tests__/route.spec.ts` | 분류·라우팅 단위 테스트 (Vitest) |
| (있으면 좋음) `rag/__tests__/classify.spec.js` | `/classify` 엔드포인트 회귀 테스트 |

### 6.2 수정

| 파일 | 내용 |
|------|------|
| `docker-compose.yml` | searxng + open-webui 서비스 (이미 §30 에 명세) |
| 루트 `.env` (compose 가 자동 로드) | `OPEN_WEBUI_SECRET_KEY`, `OPEN_WEBUI_API_KEY`, `OPEN_WEBUI_BASE_URL`, `OPEN_WEBUI_MODEL`, `INTENT_THRESHOLD` 추가 |
| `rag/server.js` | `POST /classify` 핸들러 추가 — `retrieve()` 만 호출, 답변 생성 생략 |
| `frontend/app/api/ai-assistant/chat/route.ts` | RAG `/classify` → 분기 → RAG `/chat` 또는 Open WebUI `/api/chat/completions` 호출. 응답에 `source: "rag" \| "web"` 부착 |
| `frontend/app/ai-assistant/page.tsx` | 출처 뱃지 — `source` 필드에 따라 📚 또는 🌐 배지. `sources[]` 가 URL 배열이면 클릭 가능한 링크 |
| `docs/30-docker-container-gen.md` | (이미 §4.5·§4.6·§7·§11·§13 에 추가됨) |

> **Next.js 16 주의** — `frontend/AGENTS.md` 의 안내대로, `route.ts` 를 손대기 전에 `node_modules/next/dist/docs/` 의 App Router API Routes 문서를 확인. NextRequest/Response 시그니처가 학습 데이터와 다를 수 있음.

---

## 7. 단계별 구현 계획

### Phase 1 — 인프라 (예상 30분)

1. `docker/searxng-settings.yml` 작성 — `formats: [html, json]`, `default_lang: ko`, 엔진(google, duckduckgo, bing, naver) ON, limiter OFF
2. `docker-compose.yml` 에 searxng + open-webui 서비스 추가 (§30 §7 의 yml 그대로)
3. 루트 `.env` 에 `OPEN_WEBUI_SECRET_KEY=$(openssl rand -hex 32)` 추가 (compose 가 자동 로드)
4. `docker compose up searxng open-webui`
5. §30 §11 검증 항목 8·11 통과 확인 (SearxNG JSON, Open WebUI → Ollama 도달)

### Phase 2 — Open WebUI 초기 설정 (예상 30분 수동, v0.9.x 기준)

> v0.9 부터 모델 프리셋·도구·지식은 **Workspace** 라는 별도 영역으로 이동했음. 본 절은 v0.9.x UI 를 기준으로 한다 — v0.5 이전 자료의 "Settings → Models" 안내는 더 이상 유효하지 않음.

1. **admin 계정 생성** — `http://localhost:8081` 접속 → 회원가입 (첫 가입자가 자동 admin).

2. **모델 프리셋 등록 — `gemma4-web` (Web Search ON)**
   - 좌측 사이드바 **하단의 Workspace 아이콘**(격자/폴더 모양) 클릭
   - 상단 탭에서 **Models** 선택 → 우측 **+ Create a Model**
   - 이름 `gemma4-web`, **From**(베이스 모델) `gemma4:26b`
   - **System Prompt** 영역에 다음 문구:
     > 당신은 TEAM WORKS 의 AI 비서 "찰떡"입니다. 사용자가 일반적인 질문(TEAM WORKS 사용법과 무관한 시사·날씨·코딩·일반 지식 등)을 했습니다. 웹 검색 결과를 바탕으로 한국어로 친절하고 간결하게 답하세요. 추측하지 말고, 검색 결과에 없는 내용은 모른다고 답하세요. 답변 끝에 출처 URL 을 1~3개 인용하세요.
   - **Capabilities / Default Features** 섹션에서 **"Web Search" 토글 ON**
   - **Save & Create**

3. **API 키 발급**
   - 좌측 사이드바 **하단의 사용자 아바타**(이름 옆 동그라미) 클릭
   - 드롭다운에서 **Settings(설정)** 선택 → 좌측 카테고리 **Account(계정)**
   - 하단 **API Keys** 섹션 → **Create new secret key**
   - 키 복사 → 루트 `.env` 의 `OPEN_WEBUI_API_KEY=<발급된 키>` 에 저장

4. **회원가입 비활성화 (선택, admin 계정만 운영 시)**
   - 좌측 하단 아바타 → 드롭다운에서 **Admin Panel(관리자 패널)** 선택
   - 좌측 **Settings(설정)** → 상단 탭 **General(일반)**
   - **"Enable New Sign Ups"** 토글 OFF → **Save**

### Phase 3 — RAG `/classify` 엔드포인트 (구현 완료)

`rag/server.js` — 키워드 매치만 수행. 점수 기반 로직은 §4.2 사유로 제거됐다.

```js
const HARD_KEYWORDS = [
  'team works', '팀웍스', '팀 워크스', '찰떡',
  '포스트잇', '공지사항', '업무보고', '가입 신청',
  '프로젝트 일정', '세부 일정', '간트차트',
  '팀장', '팀원', '팀 일정', '팀 채팅',
];

app.post('/classify', async (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: '`question` (string) is required' });
  }
  const q = question.trim().toLowerCase();
  const matched = HARD_KEYWORDS.find((k) => q.includes(k));
  if (matched) {
    return res.json({ isTeamWorks: true, reason: 'keyword', matched });
  }
  return res.json({ isTeamWorks: false, reason: 'no-keyword' });
});
```

검증: `curl -X POST http://127.0.0.1:8787/classify -H 'content-type: application/json' -d '{"question":"포스트잇 색깔 종류"}'` → `{ isTeamWorks: true, reason: "keyword", matched: "포스트잇" }`. 키워드 없는 질문은 `isTeamWorks: false` — 라우팅 결정은 `route.ts` 의 답변 거절 fallback 이 담당.

### Phase 4 — 프록시 라우팅 (구현 완료, 2-stage)

`frontend/app/api/ai-assistant/chat/route.ts` — 안내 모드 분기:

```ts
// Stage 1: classify (키워드 매치)
const cls = await classify(question);
if (cls.isTeamWorks) {
  const data = await callRagChat(question, topK);
  return NextResponse.json({ ...data, source: 'rag', classification: cls });
}

// Stage 2: 키워드 매치 X — 일단 RAG 시도
let ragData = null;
try { ragData = await callRagChat(question, topK); } catch { ragData = null; }

const ragAnswer = typeof ragData?.answer === 'string' ? ragData.answer : '';
if (ragData && !isRefusal(ragAnswer)) {
  // RAG 가 의미 있는 답변 → 그대로
  return NextResponse.json({
    ...ragData, source: 'rag',
    classification: { ...cls, fallback: 'rag-answered' },
  });
}

// 거절형 → Open WebUI fallback
const ow = await callOpenWebUi(question);
return NextResponse.json({
  answer: ow.answer, sources: ow.sources, source: 'web',
  classification: { ...cls, fallback: 'rag-refused' },
});
```

**`isRefusal()`** — §4.1 의 `REFUSAL_PATTERNS` 정규식 OR 매칭.

**`callOpenWebUi()`** — `POST /api/chat/completions` (OpenAI-compatible). v0.9 기준:
- 헤더: `Authorization: Bearer <OPEN_WEBUI_API_KEY>`
- 본문: `{ model, messages: [{role:'user', content:question}], features: { web_search: true }, stream: false }`
- `features.web_search` 는 Open WebUI 비표준 플래그. 모델 프리셋의 Web Search 토글이 API 호출엔 자동 적용 안 되므로 호출별로 명시.
- ⚠️ **권한 주의**: v0.9 부터 web search 가 사용자별 권한으로 분리. 환경변수 `USER_PERMISSIONS_FEATURES_WEB_SEARCH=true` 만으로 부족할 수 있고, **Admin Panel 에서 사용자/그룹 또는 모델 단위 권한 부여 필요**. 권한 부족 시 Open WebUI 가 검색을 스킵하고 모델 사전지식으로 답변(할루시네이션 위험). §9 위험 표 참고.

**`extractWebSources()`** — Open WebUI v0.9 응답에 표준 `sources`/`citations` 필드가 없어, **답변 본문의 URL 정규식 추출** 을 폴백으로 사용:

```ts
const URL_RE = /https?:\/\/[^\s<>'"`)\]]+/g;

function extractWebSources(payload, answerText): WebSource[] {
  // 1) 표준 필드 우선 (top-level / message 양쪽 점검)
  // 2) 없으면 답변 본문에서 URL 정규식 추출, 호스트네임을 title 로
}
```

향후 Open WebUI 가 citations 를 표준 필드로 노출하면 본 함수의 (1) 분기가 자동으로 사용됨.

### Phase 5 — UI 출처 뱃지 (예상 30분)

`frontend/app/ai-assistant/page.tsx` 답변 카드 하단:

```tsx
{answer.source === 'rag' && (
  <div className="text-xs text-amber-700 mt-2">
    📚 TEAM WORKS 공식 문서 {answer.sources?.length ?? 0}건 참조
  </div>
)}
{answer.source === 'web' && (
  <div className="text-xs text-blue-700 mt-2">
    🌐 웹 검색 {answer.sources?.length ?? 0}건 참조
    <ul className="mt-1 space-y-0.5">
      {answer.sources?.map((s: any) => (
        <li key={s.url}><a href={s.url} target="_blank" className="underline">{s.title}</a></li>
      ))}
    </ul>
  </div>
)}
```

### Phase 6 — 검증 (예상 1~2시간)

§8 의 시나리오 모두 통과 확인.

---

## 8. 검증 시나리오

| # | 질문 | 기대 분기 | 기대 답변 특징 |
|---|------|----------|----------------|
| 1 | "포스트잇 색깔 종류 알려줘" | RAG (keyword) | 5색 팔레트 인용. classification.matched=`포스트잇` |
| 2 | "팀에 어떻게 가입해?" | RAG (keyword) | 가입 신청 절차 단계별 |
| 3 | "찰떡이 뭐야?" | RAG (keyword) | AI 비서 자기소개. matched=`찰떡` |
| 4 | "업무보고 어떻게 보내?" | RAG (keyword) | `[업무보고]` 버튼 인용 |
| 5 | "팀 어떻게 만들어?" | RAG (no-keyword → fallback=rag-answered) | RAG 가 양호 답변 → 그대로 |
| 6 | "오늘 서울 날씨" | Open WebUI (no-keyword → fallback=rag-refused) | 답변 본문에 URL, source=web |
| 7 | "Next.js 16 의 새 기능은?" | Open WebUI (rag-refused) | 검색 기반 정리 |
| 8 | "안녕" | Open WebUI (rag-refused) | 일반 인사 응답 |
| 9 | "" (빈 문자열) | 400 | "질문을 입력해 주세요." |
| 10 | (RAG 서버 다운) "팀 만들기" | 502 | "AI 서버에 연결할 수 없습니다." |
| 11 | (Open WebUI 다운) "오늘 날씨" | 502 또는 RAG 답변 (거절형이면 502) | 친절한 에러 또는 RAG 만 |
| 12 | (Ollama 모델 미로드) | 첫 호출은 30~60초 (모델 로드 대기) | 응답 후 정상 |

> **인프라 함정 (구현 후 발견 — §9 위험 표 참고)**:
>
> - **nginx `/api/` 라우팅**: docker compose 환경에선 nginx 가 `/api/` 를 backend 로 일괄 라우팅하므로, frontend 의 `/api/ai-assistant/` 에 별도 location 블록(→ frontend) 이 우선해야 한다. compose 첫 기동 후 nginx 메모리 상태가 옛 config 일 수 있어 **`docker compose restart nginx` 한 번 필요**.
> - **Open WebUI v0.9 web_search 권한**: `USER_PERMISSIONS_FEATURES_WEB_SEARCH=true` 환경변수만으로 부족. Admin Panel → 사용자/그룹 또는 Workspace Models 의 권한 부여가 별도로 필요. 권한 부족 시 SearxNG 호출이 일어나지 않고 모델이 사전지식으로 답변(할루시네이션). 응답의 `reasoning_content` 에 "I cannot browse the live web" 같은 자기 모놀로그가 들어가면 의심 시그널.

---

## 9. 위험 / 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| **거절 패턴 누락** | 가드레일 문구가 변하면 fallback 시그널이 깨져 사용자에게 거절 응답이 노출됨 | `REFUSAL_PATTERNS`(§4.1) 정기 점검. RAG 서버가 거절을 메타데이터(`kind:"refusal"`)로 표준화하면 정규식 의존 제거 — §4.4 후속 <br> **사례 (2026-04-28)**: "오늘 뉴스 검색해줘" → RAG 가 `"현재 뉴스 검색 기능은 안내되어 있지 않습니다... 저는 TEAM WORKS의 AI 비서로서..."` 로 거절. 당시 패턴이 `현재` 단어 위치를 강제해 매칭 실패 → §4.1 에 4개 패턴 추가 |
| **nginx `/api/ai-assistant/` 타임아웃** | 일반 질문 경로(RAG + Open WebUI + SearxNG)는 직렬 호출이라 100~250초 가능. nginx 의 `proxy_read_timeout` 이 짧으면 504 Gateway Timeout | `docker/nginx.dev.conf` 의 `proxy_read_timeout 600s` + `proxy_send_timeout 600s` (v1.2 적용) |
| **Next.js 16 API route `maxDuration` default 5분 (v1.2 발견)** | 컨테이너의 nginx 가 600s 인데도 정확히 300초에 502 종료. Next.js 16 의 server-side route handler 가 default 5분 timeout 강제 | `route.ts` 에 `export const maxDuration = 600` 명시. 추가로 fetch 호출엔 `AbortController` + `setTimeout(540000)` 명시 (Node undici 의 receive timeout 기본 5분도 같이 처리) |
| **응답 시간 분포 (실측 v1.2)** | 일반 질문 경로 시간 비중: RAG `/classify` 0.07초 / **RAG `/chat` 거절형 답변 51초 (회피 대상)** / SearxNG 2초 / **Open WebUI chat 245초 (본질)** | RAG 거절 답변은 `GENERAL_KEYWORDS` 매치 시 스킵(§4.1). Open WebUI 시간은 본질적이라 모델 경량화·스트리밍·snippet 갯수 축소로 단축. v1.2 적용 후 248초 정상 응답 (300초+ 504 → 4분대 200). v1.3 SSE stream 도입으로 첫 토큰 ~3~10초 |
| **Open WebUI web_search stream 효과 가림 (v1.3 발견)** | `features:{web_search:true}` + `stream:true` 조합 시 검색·web_loader·임베딩 단계가 직렬로 5분+ 소요해 첫 토큰까지 stream 효과 무력. v1.3 첫 시도 때 `route.ts maxDuration=600` 까지도 가끔 타격 | **Option 1 채택 (§5.2)** — frontend 가 SearxNG 직접 호출 후 결과를 system prompt 에 inline 주입, Open WebUI 는 `features:{web_search:false}` 로 모델 호출만 담당. 검색 ~2초 후 곧장 stream 시작 |
| **Ollama thinking-mode 가 RAG 답변을 빈 문자열로 끝냄 (v1.3 발견)** | `gemma4:26b` 는 thinking 모델 — Ollama 가 추론 토큰을 `message.thinking` 으로, 답변을 `message.content` 로 분리. RAG `/chat` stream 분기는 `message.content` 만 forward 했고, thinking 단계가 `num_predict 1024` 예산을 잠식해 답변(content) 이 빈 문자열로 끝나는 사례 발생 (예: "팀웍스 일정등록 어떻게해?" → sources 5건 + 토큰 0개 + `[DONE]`). stream:false 비스트림 호출도 동일 증상 | `rag/ollamaClient.js` 의 `chat()`·`chatStreamRaw()` 양쪽에 **`think:false`** 추가(top-level 필드, options 안 아님). RAG 답변은 검색된 컨텍스트를 정리하면 충분해 thinking 자체가 불필요. 적용 후 thinking 0 토큰 / content 즉시 생성 검증 |
| **거짓 음성**(사용법 질문이 웹으로 빠짐) | 부정확한 일반 답변 | 키워드 화이트리스트 적극 활용. 거절 패턴이 정상 답변까지 잡지 않도록 보수적으로(예: 본문 포함 시 매칭) |
| **2-stage 호출 비용** | 키워드 매치 X 일반 질문은 RAG 답변 생성(수~수십 초) 후 fallback — 두 번 LLM 호출 | 향후 RAG 가 "검색 결과 무관" 사전 판정해 답변 생략 (§4.4 후속) |
| **nginx `/api/ai-assistant/` 라우팅 미적용** | 502 — `/api/` 가 backend 로 잘못 라우팅 | `docker/nginx.dev.conf` 에 `location /api/ai-assistant/ → frontend` 가 `location /api/ → backend` 보다 먼저 명시. compose 첫 기동 후 **`docker compose restart nginx` 1회 필요** (config 가 메모리에 새로 로드돼야 함) |
| **Open WebUI v0.9 web_search 권한 (실측 발견)** | API 호출 시 SearxNG 호출이 안 일어나고 모델이 사전지식으로 답변(할루시네이션) | (1) `USER_PERMISSIONS_FEATURES_WEB_SEARCH=true` 환경변수, (2) **Admin Panel → 사용자/그룹/Workspace Models 권한 부여** (UI 작업 필수). `reasoning_content` 에 "cannot browse the live web" 같은 자기 모놀로그가 보이면 권한 부족 시그널 |
| **SearxNG 엔진 응답 깨짐** | "JSON Extra data" 등으로 검색 실패 (현재까지 startpage) | `docker/searxng-settings.yml` 의 `engines:` 에서 해당 엔진 `disabled: true`. 운영 모니터링으로 추가 발견 |
| **Open WebUI 다운 / 검색 실패** | 일반 질문 답변 불가 | 프록시 502 응답을 친절히. 폴백: 검색 없이 모델 단독 답변(`gemma4:26b`) 또는 안내 모드만 사용 |
| **Ollama 자원 경합** | RAG·Agent·Open WebUI 가 같은 모델을 동시 호출 → KV 캐시 swap | `num_ctx 32768` 통일(이미 적용). Ollama `OLLAMA_NUM_PARALLEL=2` 검토 |
| **검색 결과 한국어 품질** | DuckDuckGo 위주면 한국어 결과 빈약 | SearxNG settings.yml 에 Naver/Google 활성. 운영 환경에선 Brave Search API 검토 |
| **Open WebUI 응답 구조 변경** | citations/sources 위치 버전마다 다름. v0.9 는 표준 필드 부재 | `extractWebSources()` 가 표준 필드 + 본문 URL 정규식 fallback 모두 처리(§7 Phase 4). 버전 핀 권장(`open-webui:0.9.x`) |
| **API key 노출** | 외부에서 Open WebUI 무단 호출 | 루트 `.env` 는 `.gitignore` 포함. 컨테이너 네트워크 내부에서만 호출(호스트 8081 publish 는 개발용. 운영 환경에선 nginx 프록시 또는 publish 제거) |
| **검색 결과 부적절(광고·악성 링크)** | 답변 품질·법적 위험 | SearxNG 의 `engines:` 에서 신뢰 가능 엔진만 활성. Brave/Google 운영 전환 시 안정성 ↑ |

---

## 10. 후속 작업 (이번 계획 외)

- ~~**답변 스트리밍 (우선순위 높음)**~~ — **v1.3 에서 구현 완료**. `route.ts` 가 `stream:true` 시 SSE(`text/event-stream`)로 응답하고 `page.tsx` 가 meta/sources/progress/token/error 이벤트를 점진 렌더. 두 경로 모두 첫 토큰 ~3~10초. 일반 질문 경로의 5분 대기 문제는 Option 1 아키텍처(frontend 가 SearxNG 직접 호출 + Open WebUI 의 web_search 비활성, §5.2)로 해결. `gemma4:26b` thinking-mode 의 `reasoning_content` 단계를 `progress` 이벤트로 한 번 시그널해 사용자 빈 화면 시간 감소
- **세션/멀티턴**: 현재 단일 턴. 이전 대화를 `messages` 에 누적해 팔로우업 질문 지원
- **Reranker**: Open WebUI 의 검색 결과를 `bge-reranker-v2-m3` 등으로 재정렬해 인용 정확도 ↑
- **자동 임계값 학습**: 운영 로그(질문, 분류결과, 사용자 피드백 👍/👎) 적재해 ROC 기반 자동 조정
- **다국어 검색**: 영어 질문 → 영어 검색 + 한국어 답변. 또는 검색 결과를 자동 번역
- **RAG 인덱스 자동 갱신**: `ollama/*.md` 변경 감지 → CI/CD 에서 `rag/index.js` 자동 재실행
- **운영 환경 검색 백엔드 결정**: SearxNG vs Brave vs Google PSE — 비용·안정성·결과 품질 비교 후 표준 채택

---

## 11. 관련 문서

| 문서 | 경로 |
|------|------|
| Docker 컨테이너 구성 | [`docs/30-docker-container-gen.md`](./30-docker-container-gen.md) (§4.5 open-webui, §4.6 searxng) |
| RAG 파이프라인 | [`docs/13-RAG-pipeline-guide.md`](./13-RAG-pipeline-guide.md) |
| 프론트엔드 가이드 | [`docs/11-frontend-developer-guide.md`](./11-frontend-developer-guide.md) |
| API 명세 | [`docs/7-api-spec.md`](./7-api-spec.md) |
| Open WebUI 공식 문서 | https://docs.openwebui.com/ |
| SearxNG 공식 문서 | https://docs.searxng.org/ |
