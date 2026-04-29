# TEAM WORKS AI 비서 — RAG 파이프라인 구현·운영 가이드

> 로컬 **Ollama** 위에서 `gemma4:26b`(채팅) + `nomic-embed-text`(임베딩) 조합으로 TEAM WORKS 사용법 챗봇을 만들고 운영한다.
> 관련 코드 경로: `agent/` (포트 8788, ReAct + JSON schema 기반 도구 호출, 동일 Ollama 공유). 별도 운영 가이드 문서는 없음 — `agent/README.md` 참고.

---

## 1. 무엇을 만들었나

- **`ollama/*.md`** 공식 문서(개요·기능별 절차·FAQ·용어집)를 검색증강(RAG)해서 모델이 환각 없이 답하게 한다.
- TEAM WORKS 앱 헤더에 **AI 비서 아이콘**을 두고 클릭 시 **별도 팝업 창(`/ai-assistant`)**으로 상담 UI를 띄운다.
- 흐름: 브라우저 → Next.js 프론트(`localhost:3001`) → Next.js API 라우트(프록시) → RAG 서버 Express(`127.0.0.1:8787`) → Ollama(`127.0.0.1:11434`).

---

## 2. 전체 아키텍처

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 브라우저 팝업창(/ai-assistant)                                                │
│   ├─ 채팅 UI (React, Next.js App Router)                                     │
│   └─ fetch('/api/ai-assistant/chat')                                         │
└───────────────────────┬──────────────────────────────────────────────────────┘
                        │  same-origin · 상대 경로
┌───────────────────────▼──────────────────────────────────────────────────────┐
│ Next.js 프론트엔드 (localhost:3001)                                          │
│   app/api/ai-assistant/chat/route.ts  ─── 안내(guide)/실행(agent) 분기 프록시  │
└───────────────────────┬──────────────────────────────────────────────────────┘
                        │  POST http://127.0.0.1:8787/chat   (안내 모드)
┌───────────────────────▼──────────────────────────────────────────────────────┐
│ RAG 서버 (Express, rag/server.js, 포트 8787)                                 │
│   1) retriever.js   — 임베딩 + BM25 → RRF 융합 top-k                          │
│   2) promptBuilder  — PERSONA + RAG 가드레일 + parent-document 컨텍스트       │
│   3) ollamaClient   — gemma4:26b /api/chat 호출 (num_ctx=32768 명시)          │
└───────────────┬──────────────────────────────────┬───────────────────────────┘
                │ /api/embed (nomic-embed-text)    │ /api/chat (gemma4:26b)
┌───────────────▼──────────────────────────────────▼───────────────────────────┐
│ Ollama 런타임 (127.0.0.1:11434)                                              │
└──────────────────────────────────────────────────────────────────────────────┘

오프라인 1회: rag/index.js 가 ollama/*.md → rag/data/chunks.json (임베딩+BM25 통계+parents)
```

> **Agent 경로(`/agent`, 포트 8788)** 는 같은 Ollama 를 공유하지만 도구 호출 기반이라 본 가이드에서는 다루지 않는다.

---

## 3. 파일 구성

### 3.1 RAG 엔진 (`rag/`)

| 파일 | 역할 |
|------|------|
| `config.js` | 경로·포트·모델명 환경변수 기본값 (`CHAT_MODEL=gemma4:26b`, `EMBED_MODEL=nomic-embed-text`, `TOP_K=5`, `SERVER_PORT=8787`) |
| `chunker.js` | 마크다운을 H2/H3 섹션 또는 Q&A 쌍으로 청킹. `parent_id`·`tokens`·`doc_len` 부착 |
| `tokenizer.js` | 한국어 조사 stem + 불용어 필터 (BM25·검색 공용) |
| `bm25.js` | 표준 BM25 (k1=1.2, b=0.75) 통계·점수 |
| `index.js` | 청크 임베딩 + BM25 통계 + parents(파일 전문) 합쳐 `data/chunks.json` 생성 (1회 실행) |
| `retriever.js` | semantic(cosine) + lexical(BM25) → **RRF(k=60)** 융합 top-k |
| `promptBuilder.js` | 인라인 PERSONA + RAG 가드레일 + Parent-Document 컨텍스트 (22K 토큰 안전 캡) |
| `ollamaClient.js` | Ollama `/api/embed`, `/api/chat` 얇은 래퍼. **호출 시 `num_ctx: 32768`, `num_predict: 1024` 기본 적용** |
| `server.js` | Express — `POST /chat` (`{question, topK?}`), `GET /health` |
| `ask.js` | CLI 대화/1회성 질문 클라이언트 (RRF·cos·bm25 점수 함께 출력) |
| `data/chunks.json` | 인덱싱 산출물 (gitignore) — `{model, dim, count, bm25, chunks[], parents{}}` |

### 3.2 프론트엔드 통합 (`frontend/`)

| 파일 | 역할 |
|------|------|
| `components/common/AIAssistantButton.tsx` | 헤더 아이콘 버튼. `window.open` 으로 480×720 팝업 |
| `app/ai-assistant/layout.tsx` | 팝업용 미니 레이아웃 (메인 레이아웃 밖) |
| `app/ai-assistant/page.tsx` | 채팅 UI (안내/실행 모드 토글, 메시지 버블, 참고 청크 접기) |
| `app/api/ai-assistant/chat/route.ts` | 브라우저 ↔ RAG/Agent 서버 프록시. `mode==='agent'` 면 `127.0.0.1:8788`, 기본은 `127.0.0.1:8787` |

### 3.3 인덱싱 대상 (`ollama/`)

현재 인덱싱되는 마크다운(루트 + `features/`):

```
ollama/
├─ overview.md             ← 서비스 개요
├─ getting-started.md      ← 첫 사용 흐름
├─ glossary.md             ← 용어집 (H2 섹션 단위)
├─ faq.md                  ← Q&A 쌍 단위
└─ features/
   ├─ teams.md
   ├─ schedules.md
   ├─ chat.md
   ├─ postits.md
   ├─ projects.md
   └─ ai-assistant.md
```

**제외**: `README.md`, `system-prompt.md` (둘 다 `chunker.js:listMarkdownFiles` 의 하드 제외 목록)

---

## 4. 구현 핵심 포인트

### 4.1 청킹 전략

문서 종류별로 다르게 쪼갠다 — 같은 크기로 자르면 문맥이 깨진다.

| 파일 | 전략 |
|------|------|
| `faq.md` | `**Q**: … **A**: …` 정규식으로 Q&A 쌍 단위 |
| `features/*.md`, `overview.md`, `getting-started.md` | H2 섹션 단위. 600 토큰 초과 시 H3 로 재분할 |
| `glossary.md` | H2 섹션 단위 |
| `README.md`, `system-prompt.md` | **제외** |

FAQ 정규식은 대시 프리픽스(`- **Q**:`)와 평문(`**Q**:`) 둘 다 허용:

```js
/(?:^|\n)\s*(?:-\s*)?\*\*Q\*\*:\s*([\s\S]*?)\n\s*\*\*A\*\*:\s*([\s\S]*?)(?=\n\s*(?:-\s*)?\*\*Q\*\*:|\n##\s|\n#\s|$)/g
```

각 청크는 `parent_id`(현재는 source_file 이 곧 parent), `tokens`(BM25용), `doc_len` 을 함께 들고 인덱스에 저장된다.

### 4.2 검색 품질을 결정한 4가지

**① nomic-embed-text 태스크 프리픽스**
인덱싱 시 `search_document: {source_file} / {section_path}\n{본문}`, 질문 시 `search_query: ...`. 안 붙이면 한국어에서 표면 유사도(Q&A 형태·길이)에 끌려 엉뚱한 청크가 상위에 옴. 프리픽스로 의미 매칭이 살아난다.

**② 섹션 경로를 임베딩 텍스트에 포함**
파일명·섹션 제목이 쿼리 매칭의 결정적 단서가 된다. 본문만 임베딩하면 한국어 한정으로 분별력이 크게 떨어짐.

**③ Hybrid Search — semantic(cosine) + lexical(BM25), RRF 융합**
점수를 단순 가중합하면 두 분포가 달라 튜닝이 까다롭다. **Reciprocal Rank Fusion**(`1/(60 + rank)`) 로 두 랭킹을 합산하면 스케일 무관하게 안정적으로 합쳐진다 — `rag/retriever.js`.

```js
const RRF_K = 60;

semantic.forEach((r, rank) => {
  fused.set(r.id, (fused.get(r.id) || 0) + 1 / (RRF_K + rank));
});
lexical.forEach((r, rank) => {
  fused.set(r.id, (fused.get(r.id) || 0) + 1 / (RRF_K + rank));
});
```

BM25 통계(`N`, `avgdl`, `df`)는 인덱싱 시점에 한 번 계산해 `chunks.json` 에 함께 저장한다 — 검색 때 다시 만들 필요 없음.

**④ 한국어 토크나이저 — 조사 stem + 불용어 필터**
`rag/tokenizer.js` 가 한국어 조사(이/가/을/를/은/는/의/로/으로/에/에서…)를 제거하고 1글자 토큰·의문사 stopword 를 필터. BM25 와 검색 모두 같은 함수를 써서 분포 일치를 보장한다.

### 4.3 Parent-Document Retrieval

청크는 검색을 정밀하게 하려고 잘게 쪼개지만, 답변에 청크 단편만 던지면 모델이 맥락을 이해하지 못한다. 그래서:

1. **검색은 청크 단위**로 — RRF top-k(기본 5)
2. **응답에는 부모 파일 전문**을 동봉 — `parents[parent_id]` 를 그대로 LLM 에 전달
3. **중복 부모는 한 번만** — 같은 파일에서 여러 청크가 뽑혀도 부모 블록은 1회

→ `rag/promptBuilder.js:buildContext` 가 이 로직 담당. 부모 파일이 너무 길어 누적 토큰이 **22,000(`MAX_CONTEXT_TOKENS`)** 을 넘으면, 이후 항목은 **청크 본문으로 폴백**, 그래도 넘치면 break. `num_ctx=32768` 안에서 시스템 프롬프트·질문·답변 budget 을 빼고 본문이 차지할 수 있는 안전선.

### 4.4 프롬프트 구조

**system** = 인라인 PERSONA + RAG 가드레일 (Modelfile 의존 제거)
**user** = `# 참고 자료` + 부모 파일들 + `# 사용자 질문` + 원문 질문

```
[system]
당신은 TEAM WORKS의 AI 비서 "찰떡"입니다. ...
# 참고 자료 사용 규칙
- 참고 자료에 관련 정보가 있으면 반드시 활용해 구체적 절차·버튼 이름·경로를 답변에 포함
- 짧거나 반말 질문도 TEAM WORKS 관련으로 간주하고 답변
- 버튼·경로·오류 메시지는 원문 그대로 인용
- 참고 자료에 정말 없을 때만 "현재 안내되어 있지 않아요"

[user]
# 참고 자료 (TEAM WORKS 공식 문서 발췌)
[1] features/chat.md
{파일 전문}
---
[2] features/ai-assistant.md
{파일 전문}

---
# 사용자 질문
업무보고 어떻게 보내?

위 참고 자료를 바탕으로 TEAM WORKS 도우미로서 답변하세요.
```

> **왜 컨텍스트를 system 이 아닌 user 에 넣었나** — system 에만 넣었을 때 짧은 반말 질문("업무보고 어떻게 보내?") 이 거절 패턴과 매칭되어 `TEAM WORKS 사용법 외에는 답하기 어려워요`로 거절되는 사례가 있었음. 참고자료를 user 메시지에 묶고 "이 자료 바탕으로 답하세요"로 명시하니 해결.

### 4.5 호출 옵션: `num_ctx`·`num_predict`

`gemma4:26b` 의 Modelfile 기본값은 `num_ctx 131072`(128K). RAG/Agent 둘 다 그만큼 안 쓰는데 KV 캐시 메모리만 크게 잡혀서, 호출 시점에 32K 로 줄여 사용한다 — `rag/ollamaClient.js`:

```js
const DEFAULT_CHAT_OPTIONS = { num_ctx: 32768, num_predict: 1024 };

export async function chat(model, messages, options = {}) {
  return postJson("/api/chat", {
    model,
    messages,
    stream: false,
    options: { ...DEFAULT_CHAT_OPTIONS, ...options },
  });
}
```

- **Modelfile 은 손대지 않음**. 다른 서비스가 같은 모델을 풀 컨텍스트로 호출하면 그쪽은 128K 로 동작.
- 출력 잘림 방지를 위해 `num_predict: 1024` 도 함께 명시.
- 회귀가 필요하면 `DEFAULT_CHAT_OPTIONS` 한 줄만 되돌리면 됨.

### 4.6 Next.js 프록시가 필요한 이유

브라우저에서 바로 `fetch('http://127.0.0.1:8787/chat')` 하면 CORS·프로토콜·보안 이슈가 많다. Next.js API 라우트가 프록시 역할 + **4-way intent 분기**(`usage` / `general` / `schedule_query` / `schedule_create` / `blocked`) 를 담당. 자체 MCP agent 서버(8788) 는 폐기됨 (`docs/16-mcp-server-plan.md` Phase 5):

```ts
// frontend/app/api/ai-assistant/chat/route.ts
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://127.0.0.1:8787';
// classify 응답의 intent 따라:
//   'usage'           → RAG /chat (stream)
//   'general'         → SearxNG 직접 호출 + Open WebUI (web_search 비활성)
//   'schedule_query'  → backend GET /api/teams/:teamId/schedules
//   'schedule_create' → /parse-schedule-args → confirm 카드 → backend POST
//   'blocked'         → 정중한 거절 안내
//   'unknown'         → RAG 시도 후 거절형이면 Open WebUI fallback
// 502 발생 시 ECONNREFUSED/fetch failed 를 한국어 안내로 변환
```

### 4.7 팝업 창 생성

```ts
window.open(
  '/ai-assistant',
  'teamworks-ai-assistant',   // 이름 고정 → 이미 열린 창 재사용
  'width=480,height=720,left=...,top=80,resizable=yes,scrollbars=yes'
);
```

창 이름을 고정하면 같은 이름으로 두 번 열어도 **같은 창으로 포커스**된다.

---

## 5. 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 런타임 주소 |
| `EMBED_MODEL` | `nomic-embed-text` | 임베딩 모델 |
| `CHAT_MODEL`  | `gemma4:26b` | 답변 생성 모델 |
| `TOP_K`       | `5` | 검색 반환 청크 수 |
| `PORT`        | `8787` | RAG 서버 포트 |
| `RAG_SERVER_URL` | `http://127.0.0.1:8787` | 프론트 API 라우트가 호출할 RAG 주소 |
| `AGENT_SERVER_URL` | `http://127.0.0.1:8788` | 프론트 API 라우트가 호출할 Agent 주소 (실행 모드) |

> `num_ctx`·`num_predict`·`MAX_CONTEXT_TOKENS` 는 코드 상수다. 변경하려면 §6.4 를 따른다.

---

## 6. 운영 (Operations)

### 6.1 최초 설치 (1회)

```bash
# 1) Ollama 런타임 확인
curl http://127.0.0.1:11434/api/tags

# 2) 모델 받기
ollama pull gemma4:26b
ollama pull nomic-embed-text

# 3) RAG 엔진 의존성
cd rag && npm install

# 4) 인덱싱
npm run index           # rag/data/chunks.json 생성
```

### 6.2 개발 모드 (3개 프로세스)

```bash
# 터미널 1: RAG 서버 (포트 8787)
cd rag && npm run server

# 터미널 2: 백엔드 API
cd backend && npm run dev

# 터미널 3: 프론트엔드
cd frontend && npm run dev
```

로그인 후 헤더의 **AI 비서** 아이콘 클릭 → 팝업 → 질문.

### 6.3 인덱스 리빌드 — `ollama/*.md` 가 바뀌었을 때

**언제 필요한가**

| 변경 종류 | 리빌드 필요? |
|-----------|:------------:|
| `ollama/*.md` 본문 수정·추가·삭제 | ✅ |
| 파일명 변경 (예: `features/chat.md` → `features/chats.md`) | ✅ |
| `chunker.js` / `tokenizer.js` / `bm25.js` 로직 변경 | ✅ |
| `rag/index.js` 의 임베딩 입력 포맷 변경 | ✅ |
| `EMBED_MODEL` 교체 (또는 동일 이름이지만 가중치가 바뀐 버전) | ✅ |
| `CHAT_MODEL` 만 교체 (예: gemma4:26b → llama3:70b) | ❌ — chunks.json 그대로 |
| `TOP_K` 변경 | ❌ |
| `MAX_CONTEXT_TOKENS` 또는 호출 옵션(`num_ctx` 등) 변경 | ❌ |

**절차**

```bash
cd rag
npm run index           # 기존 chunks.json 을 덮어쓴다 (재진입 안전)
```

콘솔에 다음과 같이 청크 수와 BM25 통계가 찍히면 정상:

```
Indexing sources under: /Users/.../ollama
Found 10 markdown file(s).
  overview.md: 4 chunk(s)
  getting-started.md: 5 chunk(s)
  glossary.md: 8 chunk(s)
  faq.md: 23 chunk(s)
  features/teams.md: 6 chunk(s)
  ...
Total chunks: 71
Embedding with model: nomic-embed-text
  embedded 71/71
BM25 stats: N=71, avgdl=320.4, vocab=1247
Saved 71 chunks + 10 parents to /Users/.../rag/data/chunks.json
```

> **인덱싱은 약 30초~2분 소요.** Ollama 가 임베딩 모델을 로드하는 동안 첫 1~2개 청크는 느림.

**리빌드 후 RAG 서버 재기동 필요** — `retriever.js` 가 `chunks.json` 을 모듈 메모리에 캐시(`let cache = null`)하므로, 서버를 재시작하지 않으면 옛 인덱스가 계속 쓰인다.

```bash
# 6.4 절차로 RAG 서버 재시작
```

**검증** — 새로 추가한 문서에 들어 있는 키워드로 한 번 질의:

```bash
cd rag
node ask.js "방금 추가한 문서의 핵심 단어로 질문"
```

상단에 출력되는 참고 청크에 새 파일명이 보이면 OK.

### 6.4 RAG 서버 재기동

코드(rag/*.js) 또는 인덱스(`chunks.json`)가 바뀌었을 때 반드시 재기동해야 변경이 반영된다 (Node 모듈은 시작 시 메모리 로드).

**포어그라운드(개발용)**

```bash
# 기존 프로세스 중지: Ctrl+C
cd rag && npm run server
```

**포트 점유 확인 → 강제 종료**

```bash
# 8787 포트를 잡고 있는 PID 확인
lsof -ti:8787

# 한 번에 종료
lsof -ti:8787 | xargs kill          # SIGTERM
lsof -ti:8787 | xargs kill -9       # 안 죽으면 SIGKILL
```

**백그라운드(로그 파일 분리)**

```bash
cd rag
nohup node server.js > /tmp/rag-server.log 2>&1 &
echo $! > /tmp/rag-server.pid

# 종료
kill "$(cat /tmp/rag-server.pid)" && rm /tmp/rag-server.pid
```

**기동 확인**

```bash
curl http://127.0.0.1:8787/health
# {"ok":true,"model":"gemma4:26b"}
```

> Agent 도 같이 쓰고 있다면 8788 포트에 대해 동일 절차로 `cd agent && npm run server` 를 재기동.

### 6.5 모델·컨텍스트 옵션 변경

**채팅 모델만 교체** (예: gemma4:26b → llama3:70b)

```bash
# 1) 새 모델 pull
ollama pull llama3:70b

# 2) RAG 서버를 새 모델로 기동 (한 번만 쓸 때)
cd rag
CHAT_MODEL=llama3:70b npm run server

# 3) 영구 변경하려면 rag/config.js 의 기본값 수정 후 재기동
```

> 임베딩과 BM25 는 그대로라 **인덱스 리빌드는 불필요**.

**임베딩 모델 교체** (예: nomic-embed-text → bge-m3)

```bash
ollama pull bge-m3
EMBED_MODEL=bge-m3 npm run index    # ← 인덱스 리빌드 필수 (벡터 분포가 달라짐)
EMBED_MODEL=bge-m3 npm run server
```

> nomic 의 `search_document:` / `search_query:` 프리픽스는 nomic 전용. 다른 모델로 바꿀 때는 `index.js` 와 `retriever.js` 의 프리픽스 처리도 점검해야 한다.

**컨텍스트 윈도우(`num_ctx`) 변경**

`rag/ollamaClient.js` 의 `DEFAULT_CHAT_OPTIONS` 상수만 수정 후 서버 재기동:

```js
const DEFAULT_CHAT_OPTIONS = { num_ctx: 16384, num_predict: 1024 };
```

`num_ctx` 를 더 줄이면 `promptBuilder.js` 의 `MAX_CONTEXT_TOKENS`(현재 22000) 도 같이 낮춰야 입력이 잘리지 않는다. 대략 `num_ctx - 4000` 정도가 안전선.

### 6.6 검증 체크리스트

```bash
# A. RAG 엔진 단독 (인덱스 + 검색 + 응답)
cd rag
node ask.js "업무보고 어떻게 보내?"
node ask.js "포스트잇 색깔 종류 알려줘"
node ask.js "팀에 어떻게 가입해?"
node ask.js "오늘 저녁 메뉴 추천해줘"   # → 정중 거절 (가드레일 동작 확인)

# B. HTTP
curl -X POST http://127.0.0.1:8787/chat \
  -H "content-type: application/json" \
  --data-binary '{"question":"팀 어떻게 만들어?","topK":5}'

# C. health
curl http://127.0.0.1:8787/health

# D. 브라우저 E2E
# 프론트 로그인 → 헤더 AI 비서 → 팝업에서 질문 → "참고한 문서 N건" 펼쳐 근거 확인
```

> **Windows curl 한글 바디 주의** — cmd/bash 코드페이지 문제로 깨질 수 있음. `node -e "..."` 또는 `ask.js` 로 검증하는 것이 안정적.

### 6.7 운영 중 자주 보는 로그·아티팩트

| 위치 | 무엇 |
|------|------|
| `rag/server.js` stdout | 요청별 에러 스택 (현재는 access log 미수집) |
| `rag/data/chunks.json` | 인덱스 자체. 손상 의심 시 `npm run index` 로 재생성 |
| `chunks.json` 의 `model`·`dim`·`count` 필드 | 어떤 임베딩 모델·차원·청크 수로 빌드됐는지 |
| `GET /health` 응답의 `model` 필드 | 현재 RAG 서버가 사용하는 채팅 모델명 |
| `node ask.js` 출력의 RRF·cos·bm25 점수 | 검색 품질 디버깅 |

---

## 7. 트러블슈팅 (실제 겪은 이슈)

| 증상 | 원인 | 해결 |
|------|------|------|
| 인덱스 빌드 시 `faq.md: 0 chunk(s)` | 정규식이 대시(`-`) 프리픽스만 매칭 | `(?:-\s*)?` 옵셔널로 변경 (이미 적용) |
| 답변에 내부 메타데이터(`system-prompt.md` 등)가 섞임 | 의도치 않게 인덱싱됨 | `chunker.js:listMarkdownFiles` 의 제외 목록 갱신 |
| 한글 질문에 엉뚱한 FAQ 가 top-3 에 옴 | nomic-embed-text 가 태스크 프리픽스 없이 표면 유사도로 정렬 | `search_document:` / `search_query:` 프리픽스 추가 |
| 정답 청크가 여전히 10등 밖 | 한국어 임베딩 분별력 부족 | semantic + BM25 → RRF 융합 도입 |
| 짧은 반말 질문(`~보내?`)에 거절 응답 | system 의 거절 패턴과 매칭 | RAG 컨텍스트를 user 메시지로 이동 + "관련 내용 있으면 반드시 활용" 가드 강화 |
| 인덱스를 리빌드했는데 답변이 그대로 옛날 내용 | RAG 서버가 `chunks.json` 을 모듈 캐시 | RAG 서버 재기동 (§6.4) |
| 첫 답변이 매우 느림 | Ollama 가 모델을 처음 로드 (특히 26B) | 정상. 두 번째부터 빠름. `keep_alive` 로 상주 시간 늘리기도 가능 |
| 팝업에서 `RAG 서버 연결 실패` | `rag/server.js` 미실행 또는 포트 충돌 | `lsof -ti:8787` → 재기동 (§6.4) |
| 답변이 중간에 잘림 | `num_predict` 부족 또는 입력이 ctx 한계까지 잠식 | `MAX_CONTEXT_TOKENS` 를 낮추거나 `num_predict` 를 늘림 |
| `Ollama /api/chat 500 ... model not found` | `CHAT_MODEL` 이 가리키는 모델을 pull 하지 않음 | `ollama pull <model>` 또는 `CHAT_MODEL` env 점검 |

---

## 8. 확장 아이디어

- **한국어 임베딩 모델 교체** — `bge-m3`, `multilingual-e5-large` 등으로 바꾸려면 `EMBED_MODEL` + 인덱스 리빌드 (§6.5).
- **스트리밍 응답** — `/api/chat` `stream: true` + Next.js `ReadableStream` 으로 타이핑 효과.
- **Reranker 도입** — RRF top-20 → `bge-reranker-v2-m3` 로 재정렬 → top-5 확정.
- **대화 맥락 유지** — 현재는 단일 턴. 이전 대화를 `messages` 에 누적하고 `MAX_CONTEXT_TOKENS` 를 그에 맞춰 조정.
- **캐시** — 동일 질문은 `chunks.json` 해시 + 질문 해시로 메모이제이션.
- **모니터링** — 질문, 검색된 청크 ID, 답변, 사용자 피드백을 별도 로그 테이블에 적재해 회귀 감지.

---

## 9. 원격 AI 모델 서버로 분리하는 경우

로컬 PC 의 Ollama 를 **GPU 전용 서버**나 **사내 공유 추론 서버**로 분리할 때의 조치와 주의점. RAG 는 chat + embed 두 가지를 모두 호출하므로 Agent 단독 경로보다 점검 포인트가 많다.

동일 주제의 Agent 경로(`agent/`)는 `OLLAMA_HOST` 환경변수만 동기화하면 본 §9 가이드와 동일하게 적용된다 — Agent 도 `agent/ollamaClient.js` 한 함수에서 모든 Ollama 호출이 일어나는 구조이기 때문.

### 9.1 RAG 가 Ollama 에 하는 두 가지 호출

1. **인덱싱 — `/api/embed` (배치)** — `rag/index.js` 가 모든 청크를 한 번에 임베딩. 수십~수백 회. 오프라인 1회성.
2. **질의 — `/api/embed` 1회 + `/api/chat` 1회** — 질문 임베딩 + 답변 생성.

→ **두 모델(`nomic-embed-text`, `gemma4:26b`)이 모두 원격에 설치돼 있어야** 한다. 어느 하나만 빠져도 전체 경로가 죽는다.

### 9.2 영향 파일: 단 한 곳 — `rag/config.js`

```js
export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
```

모든 Ollama 호출이 `rag/ollamaClient.js:postJson` 한 함수를 거치므로 `OLLAMA_HOST` 만 바꾸면 동작은 그대로다.

### 9.3 배치 방식 3가지

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **전체 원격** | embed·chat 모두 원격 | 로컬 리소스 0, GPU 집중 | 인덱싱 배치가 네트워크 bound |
| **분할 배치** | embed 로컬, chat 원격 | 질의 지연 일부 절약 | `ollamaClient` 가 호스트 2개를 다뤄야 함 |
| **전체 로컬**(현재) | 둘 다 로컬 | 네트워크 지연 0 | 개인 PC 사양 한계 |

대부분 **전체 원격**이 단순하고 충분.

### 9.4 인덱싱 파일(`chunks.json`) 재사용

| 상황 | 재인덱싱 필요? |
|------|---------------|
| 원격이 **동일 버전** `nomic-embed-text` | **불필요** — 기존 `chunks.json` 그대로 |
| 원격이 다른 임베딩 모델/버전 | **필요** — 분포 불일치로 검색 품질 붕괴 |
| 원격 지연이 커서 미리 만들고 싶음 | **선택** — 로컬에서 인덱싱한 `chunks.json` 을 원격 환경에 배포(모델 일치 전제) |

### 9.5 `ollamaClient.js` 확장 예시 (인증·타임아웃·모델 상주)

```js
import { OLLAMA_HOST } from "./config.js";

const OLLAMA_AUTH = process.env.OLLAMA_AUTH;        // "Bearer xxx" or "Basic ..."
const DEFAULT_CHAT_OPTIONS = { num_ctx: 32768, num_predict: 1024 };

async function postJson(pathname, body, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { "content-type": "application/json" };
    if (OLLAMA_AUTH) headers.authorization = OLLAMA_AUTH;
    const res = await fetch(`${OLLAMA_HOST}${pathname}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama ${pathname} ${res.status}: ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

// keep_alive 로 콜드 스타트 완화
export async function chat(model, messages, options = {}) {
  return postJson("/api/chat", {
    model, messages, stream: false,
    options: { ...DEFAULT_CHAT_OPTIONS, ...options },
    keep_alive: "30m",
  });
}
```

### 9.6 지연 영향

| 구간 | 로컬 | 원격 |
|------|------|------|
| 질문 임베딩 | 50~150ms | 100~300ms |
| top-k 검색 | <10ms | 동일 — `chunks.json` 은 RAG 서버 메모리 |
| 답변 생성 (gemma4:26b) | 5~20초 | 5~25초 (네트워크 오버헤드 미미) |
| 인덱싱 (수십~수백 청크) | 30~120초 | 2~10배 느려질 수 있음 |

**인덱싱만 체감 느려진다.** 동시 호출 수 제한(`p-limit` 등)으로 GPU 큐 보호.

### 9.7 RAG 서버 자체는 어디에 두나

- **계속 로컬** — 가장 단순. RAG 서버는 Ollama 외엔 `chunks.json`(디스크) + 프론트 프록시 외에 의존이 없다.
- **RAG 서버도 원격** — 프론트 프록시의 `RAG_SERVER_URL` 만 바꾸면 되지만, `chunks.json` 배포·재인덱싱 플로우가 복잡. 권장하지 않음.

### 9.8 인증·보안

Ollama 는 기본 인증이 없다. 원격 분리 시 **반드시** 다음 중 하나 이상:

- 리버스 프록시(Caddy/nginx) TLS + Basic Auth / JWT
- 프라이빗 망(VPN/Tailscale/WireGuard)
- 방화벽 IP 화이트리스트

### 9.9 장애 거동

- **원격 Ollama 미도달** → `server.js:/chat` 500 → 프론트 프록시가 `ECONNREFUSED`/`fetch failed` 를 잡아 한국어 안내로 변환.
- **임베딩만 장애** → 질의는 실패하지만 `chunks.json` 안전. 복구 후 즉시 재사용.
- **인덱싱 중 중단** → `index.js` 는 재진입 안전(전체 재생성). 다시 실행만.

### 9.10 마이그레이션 체크리스트

- [ ] 원격에 `gemma4:26b` 와 `nomic-embed-text` **둘 다** pull
- [ ] `ollama serve` 가 외부 바인딩(`0.0.0.0:11434` 또는 리버스 프록시 뒤)
- [ ] 리버스 프록시/VPN/방화벽 중 하나로 인증 계층
- [ ] `OLLAMA_HOST` 변경 (RAG·Agent 양쪽)
- [ ] 인증 필요 시 `ollamaClient.js` 에 `OLLAMA_AUTH`·타임아웃·`keep_alive` 추가
- [ ] 임베딩 모델 버전 동일하면 `chunks.json` 재사용, 아니면 재인덱싱
- [ ] CLI 검증 — `node ask.js "업무보고 어떻게 보내?"` 통과
- [ ] 프론트 팝업에서 실제 질문 1건 이상 성공
- [ ] Agent(`agent/`)도 같이 쓰는 Ollama 라면 `agent/config.js` 의 `OLLAMA_HOST` 도 동일하게 변경

---

## 10. 참고

- [rag/README.md](../rag/README.md) — 엔진 단독 사용 설명
- [agent/README.md](../agent/README.md) — Agent 경로(포트 8788, ReAct + JSON schema)
- nomic-embed-text task prefixes: https://huggingface.co/nomic-ai/nomic-embed-text-v1.5
- BM25 표준: Robertson & Spärck Jones (1976)
- Reciprocal Rank Fusion: Cormack et al. (2009)
