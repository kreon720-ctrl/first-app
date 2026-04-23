# TEAM WORKS AI 비서 — RAG 파이프라인 구현 가이드

> 로컬에 설치한 **Gemma 2 9B** + **nomic-embed-text**(Ollama)로 TEAM WORKS 사용법 챗봇을 만든 방법 정리.
> 관련 문서: [15-ai-review.md](./15-ai-review.md) (왜 RAG로 갔는지) · [16-rag-plan.md](./16-rag-plan.md) (RAG 설계안)

---

## 1. 무엇을 만들었나

- **`ollama/*.md`** 공식 문서(절차·버튼 이름·오류 메시지·FAQ)를 검색증강(RAG)해서 Gemma가 환각 없이 답하게 한다.
- TEAM WORKS 앱의 헤더(사용자명 오른쪽)에 **AI 비서 아이콘**을 넣고, 클릭 시 **별도 팝업 창**으로 상담 UI를 띄운다.
- 브라우저 → Next.js(프론트) → Next.js API 라우트 → RAG 서버(Express:8787) → Ollama(11434).

---

## 2. 전체 아키텍처

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 브라우저(팝업 창 /ai-assistant)                                              │
│   ├─ 채팅 UI (React, Next.js App Router)                                     │
│   └─ fetch('/api/ai-assistant/chat')                                         │
└───────────────────────┬──────────────────────────────────────────────────────┘
                        │  (same-origin, 상대 경로)
┌───────────────────────▼──────────────────────────────────────────────────────┐
│ Next.js 프론트엔드 (localhost:3001)                                          │
│   app/api/ai-assistant/chat/route.ts  ─── 단순 프록시                         │
└───────────────────────┬──────────────────────────────────────────────────────┘
                        │  POST http://127.0.0.1:8787/chat
┌───────────────────────▼──────────────────────────────────────────────────────┐
│ RAG 서버 (Express, rag/server.js, 포트 8787)                                 │
│   1) retriever.js  — 질문 임베딩 → chunks.json 하이브리드 검색 → top-k        │
│   2) promptBuilder — Modelfile SYSTEM + 가드레일 + 검색 청크 조립             │
│   3) ollamaClient  — gemma2:9b /api/chat 호출                                 │
└───────────────┬──────────────────────────────────┬───────────────────────────┘
                │ /api/embed (nomic-embed-text)    │ /api/chat (gemma2:9b)
┌───────────────▼──────────────────────────────────▼───────────────────────────┐
│ Ollama 런타임 (127.0.0.1:11434)                                              │
└──────────────────────────────────────────────────────────────────────────────┘

오프라인 1회: rag/index.js 가 ollama/*.md → chunks.json (임베딩 포함) 생성
```

---

## 3. 파일 구성

### 3.1 RAG 엔진 (`rag/`)

| 파일 | 역할 |
|------|------|
| `config.js` | 경로·포트·모델명 환경변수 기본값 |
| `chunker.js` | 마크다운을 H2/H3 섹션 또는 Q&A 쌍으로 청킹 |
| `index.js` | 청크를 임베딩해 `data/chunks.json`에 저장 (1회 실행) |
| `retriever.js` | 질문 임베딩 + **하이브리드(코사인 0.6 + 키워드 0.4)** 점수로 top-k 반환 |
| `promptBuilder.js` | Modelfile SYSTEM 블록 + RAG 가드레일 + 검색 결과 조립 |
| `ollamaClient.js` | Ollama `/api/embed`, `/api/chat` 얇은 래퍼 |
| `server.js` | Express — `POST /chat`, `GET /health` |
| `ask.js` | CLI 대화/1회성 질문 클라이언트 |
| `data/chunks.json` | 인덱싱 산출물 (gitignore) |

### 3.2 프론트엔드 통합 (`frontend/`)

| 파일 | 역할 |
|------|------|
| `components/common/AIAssistantButton.tsx` | 헤더에 들어가는 아이콘 버튼. `window.open`으로 480×720 팝업 생성 |
| `app/ai-assistant/layout.tsx` | 팝업용 미니 레이아웃 (메인 레이아웃 밖) |
| `app/ai-assistant/page.tsx` | 채팅 UI (메시지 버블·예시 질문·참고 청크 접기) |
| `app/api/ai-assistant/chat/route.ts` | 브라우저 ↔ RAG 서버 프록시 (CORS 우회·에러 정규화) |

헤더 수정 지점 3곳:
- `app/(main)/page.tsx` — 홈
- `app/(main)/me/tasks/page.tsx` — 나의 할 일
- `app/(main)/teams/[teamId]/_components/TeamPageHeader.tsx` — 팀 메인(데스크톱)

---

## 4. 구현 핵심 포인트

### 4.1 청킹 전략

문서 종류별로 다르게 쪼갠다 — 같은 크기로 자르면 문맥이 깨진다.

| 문서 유형 | 전략 |
|-----------|------|
| `faq.md` | `**Q**: … **A**: …` 정규식으로 Q&A 쌍 단위 |
| `features/*.md`, `knowledge-base.md` | H2 섹션 단위, 600 토큰 넘으면 H3로 재분할 |
| `glossary.md` | H2 섹션 단위 |
| `system-prompt.md`, `README.md` | **인덱싱 제외** (내부 메타데이터) |

FAQ 정규식은 대시 프리픽스(`- **Q**:`)와 평문(`**Q**:`) 둘 다 허용:

```js
/(?:^|\n)\s*(?:-\s*)?\*\*Q\*\*:\s*([\s\S]*?)\n\s*\*\*A\*\*:\s*([\s\S]*?)(?=\n\s*(?:-\s*)?\*\*Q\*\*:|\n##\s|\n#\s|$)/g
```

### 4.2 검색 품질: 3가지가 결정적

**① nomic-embed-text 태스크 프리픽스**
인덱싱 시 `search_document: ...`, 질문 시 `search_query: ...`를 붙인다. 안 붙이면 한국어에서 Q&A 형식·길이 같은 **표면 특성**을 먼저 맞춰서, 내용이 다른 FAQ가 상위에 올라온다.

**② 섹션 경로를 임베딩 텍스트에 포함**
`search_document: features/06-chat.md / 업무보고 전송\n{본문}` — 제목·경로가 쿼리 매칭에 결정적 단서가 된다.

**③ 하이브리드 스코어링 (코사인 0.6 + 키워드 0.4)**
한국어는 임베딩만으로 순위 뒤집힘이 잦다. 정답 청크가 70등에서 14등까지만 올라오다가, 조사 제거한 키워드 오버랩 점수를 더해서 **3등 이내**에 들어왔다.

```js
const score = cosine * 0.6 + keywordOverlap * 0.4;
```

`retriever.js`의 `queryTerms()`가 한국어 조사(이/가/을/를/은/는/…)를 제거하고 2자 이상 토큰만 남긴다.

### 4.3 프롬프트 구조

**system** = Modelfile의 `SYSTEM """..."""` 블록 + RAG 가드레일
**user** = `# 참고 자료` + 검색된 top-k 청크 + `# 사용자 질문` + 원문 질문

```
[시스템]
{페르소나 · 답변 규칙 · 황금 규칙 · 화면 경로 · Few-shot 3개}
{RAG 가드레일 — "참고자료 안에 있으면 반드시 활용, 버튼/경로 원문 인용"}

[사용자]
# 참고 자료 (TEAM WORKS 공식 문서 발췌)

[1] knowledge-base.md / 8. 채팅 (3종류)
{본문}

---

[2] features/06-chat.md / 개요
{본문}

---

# 사용자 질문
업무보고 어떻게 보내?

위 참고 자료를 바탕으로 TEAM WORKS 도우미로서 답변하세요.
```

**왜 컨텍스트를 system이 아닌 user에 넣었나**
system에만 넣었을 때 Gemma가 짧은 반말 질문("업무보고 어떻게 보내?")을 Modelfile의 거절 예시(예시 3: "오늘 저녁 메뉴 추천해줘")와 패턴 매칭해서 `TEAM WORKS 사용법 외에는 답하기 어려워요`로 거절하는 현상이 있었다. 참고자료를 user 메시지에 묶어 "이 자료 바탕으로 답하세요"로 명시하니 해결.

### 4.4 Next.js 프록시가 필요한 이유

브라우저에서 바로 `fetch('http://127.0.0.1:8787/chat')`하면 CORS·프로토콜·보안 이슈가 많다. Next.js API 라우트를 프록시로 끼워서:
- 같은 origin → CORS 불필요
- RAG 서버 다운 상태를 잡아 친절한 메시지로 변환
- 프로덕션 이동 시 `RAG_SERVER_URL` 환경변수로 바꾸면 끝

```ts
// frontend/app/api/ai-assistant/chat/route.ts
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://127.0.0.1:8787';
// POST 바디를 그대로 RAG 서버로 포워딩
```

### 4.5 팝업 창 생성

```ts
window.open(
  '/ai-assistant',
  'teamworks-ai-assistant',   // 이름 고정 → 이미 열린 창이 있으면 재사용
  'width=480,height=720,left=...,top=80,resizable=yes,scrollbars=yes'
);
```

창 이름을 고정하면 같은 이름으로 두 번 열어도 **같은 창으로 포커스**된다.

---

## 5. 실행 순서

### 5.1 최초 설치 (1회)

```bash
# 1) Ollama 런타임 실행 중인지 확인 (http://127.0.0.1:11434)
ollama pull gemma2:9b
ollama pull nomic-embed-text

# 2) RAG 엔진 의존성 설치
cd rag
npm install

# 3) 인덱싱 (ollama/*.md → rag/data/chunks.json)
npm run index
```

**재인덱싱이 필요한 경우**
- `ollama/*.md` 문서를 수정했을 때
- `chunker.js` 로직을 바꿨을 때
- 임베딩 모델을 교체했을 때

### 5.2 개발 모드 (3개 프로세스)

```bash
# 터미널 1: RAG 서버 (포트 8787)
cd rag && npm run server

# 터미널 2: 백엔드 (팀·일정·채팅 API)
cd backend && npm run dev

# 터미널 3: 프론트엔드 (Next.js)
cd frontend && npm run dev
```

로그인 후 헤더의 **✨ AI 비서** 버튼 클릭 → 팝업 창 → 질문 입력.

---

## 6. 검증 방법

### 6.1 RAG 엔진 단독 (CLI)

```bash
cd rag
node ask.js "업무보고 어떻게 보내?"
node ask.js "종료 시각이 시작보다 앞서면 어떤 오류가 나?"
node ask.js "포스트잇 색깔 종류 알려줘"
node ask.js "프로젝트 삭제하면 하위 일정 어떻게 돼?"
node ask.js "팀에 어떻게 가입해?"
node ask.js "오늘 저녁 메뉴 추천해줘"   # → 정중 거절
```

답변 아래에 참고 청크 경로와 점수가 찍힌다.

### 6.2 HTTP

```bash
curl -X POST http://127.0.0.1:8787/chat \
  -H "content-type: application/json" \
  --data-binary '{"question":"팀 어떻게 만들어?"}'
```

> 주의: Windows cmd/bash에서 curl의 한글 바디는 코드페이지 문제로 깨질 수 있다. Node.js `fetch`로 테스트하는 것이 안정적.

### 6.3 브라우저 E2E

1. 프론트 로그인
2. 헤더 **AI 비서** 아이콘 클릭 → 팝업 창 확인
3. 예시 질문 버튼 클릭 또는 직접 입력
4. 답변 하단 "참고한 문서 N건" 펼쳐서 근거 확인

---

## 7. 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 런타임 주소 |
| `EMBED_MODEL` | `nomic-embed-text` | 임베딩 모델 |
| `CHAT_MODEL`  | `gemma2:9b` | 답변 생성 모델 |
| `TOP_K`       | `3` | 검색 반환 청크 수 |
| `PORT`        | `8787` | RAG 서버 포트 |
| `RAG_SERVER_URL` | `http://127.0.0.1:8787` | 프론트 API 라우트가 호출할 RAG 주소 |

---

## 8. 트러블슈팅 (실제 겪은 이슈)

| 증상 | 원인 | 해결 |
|------|------|------|
| `faq.md: 0 chunk(s)` | 정규식이 대시(`-`) 프리픽스만 매칭 | `(?:-\s*)?` 옵셔널로 변경 |
| `system-prompt.md` 내용이 답변에 섞임 | 내부 메타데이터가 인덱싱됨 | `listMarkdownFiles`에서 제외 |
| 한글 질문에 엉뚱한 FAQ가 top-3에 옴 | nomic-embed-text가 태스크 프리픽스 없이 표면 유사도로 점수 | `search_document:` / `search_query:` 프리픽스 추가 |
| 정답 청크가 여전히 10등 밖 | 한국어 임베딩 분별력 부족 | 코사인 + 키워드 오버랩 하이브리드 |
| 짧은 반말 질문("~보내?")에 거절 응답 | system 예시 3(거절 패턴)과 매칭 | RAG 컨텍스트를 user 메시지로 이동, "관련 내용 있으면 반드시 활용" 가드 추가 |
| 팝업에서 `RAG 서버 연결 실패` | `rag/server.js` 미실행 | 별도 터미널에서 `npm run server` |

---

## 9. 확장 아이디어

- **한국어 임베딩 모델** — `bge-m3`, `multilingual-e5-large` 등으로 교체 시 `EMBED_MODEL` + 재인덱싱만 하면 됨.
- **스트리밍 응답** — `/api/chat` `stream: true` + Next.js `ReadableStream`으로 타이핑 효과.
- **Reranker** — 1차로 top-20 뽑고 `bge-reranker-v2-m3` 로 재정렬해 top-3 확정.
- **대화 맥락 유지** — 현재는 단일 턴. 이전 대화를 `messages`에 누적해 팔로우업 질문 지원.
- **캐시** — 동일 질문은 `chunks.json` 해시 + 질문 해시로 메모이제이션.
- **모니터링** — 답변 품질 로깅(질문, 검색된 청크, 답변, 사용자 피드백 👍/👎)으로 회귀 감지.

---

## 10. 원격 AI 모델 서버로 분리하는 경우

로컬 PC의 Ollama 를 **GPU 전용 서버**나 **사내 공유 추론 서버**로 분리할 때의 조치와 주의점. RAG 파이프라인은 Ollama 에 두 가지 작업(chat + embed)을 맡기므로 Agent 단독 경로보다 고려할 포인트가 조금 더 있다.

동일 주제의 Agent 경로 버전은 [`docs/18-mcp-server-and-agent-guide.md` §12](./18-mcp-server-and-agent-guide.md) 참고.

### 10.1 RAG 가 Ollama 에 하는 두 가지 호출

1. **인덱싱 — `/api/embed` (배치)** — `rag/index.js` 가 모든 문서 청크를 한 번에 임베딩해 `chunks.json` 에 저장. 수백 회 호출. 오프라인 1회성.
2. **질의 — `/api/embed` 1회 + `/api/chat` 1회** — 질문을 nomic-embed-text 로 임베딩 → retriever → gemma2:9b 로 답변.

→ **두 모델 모두 원격 서버에 설치돼 있어야** 한다. 어느 하나만 빠져도 전체 경로가 죽는다.

### 10.2 영향 파일: 단 한 곳 — `rag/config.js`

```js
export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
```

모든 Ollama 호출이 `rag/ollamaClient.js` 의 `postJson` 한 함수를 거치므로, `OLLAMA_HOST` 한 변수만 바꾸면 기본 동작은 그대로다.

### 10.3 배치 방식 3가지

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **전체 원격** | embed·chat 모두 원격 | 로컬 리소스 0, GPU 집중 | 인덱싱 배치가 네트워크 bound |
| **분할 배치** | embed 로컬, chat 원격 | 질의 지연 일부 절약, 작은 모델은 로컬 유지 | `ollamaClient` 가 호스트 2개를 다뤄야 해 코드 확장 필요 |
| **전체 로컬** (현재) | 둘 다 로컬 | 네트워크 지연 0 | 개인 PC 사양 한계 |

대부분 **전체 원격**이 단순하고 충분하다. 분할은 `embed` 호출이 초당 수십 회 이상 빈번할 때만 검토.

### 10.4 인덱싱 파일(`chunks.json`) 재사용 가능성

| 상황 | 재인덱싱 필요? |
|------|---------------|
| 원격 서버에 **동일 버전** `nomic-embed-text` 설치 | **불필요** — 기존 `chunks.json` 그대로 재사용. 벡터 값은 모델 가중치만 같으면 동일하게 재현된다. |
| 원격이 다른 버전의 임베딩 모델 사용 | **필요** — 쿼리 임베딩과 저장 임베딩이 다른 분포를 가져 검색 품질이 붕괴한다. |
| 원격 지연이 커서 미리 만들어두고 싶음 | **선택** — 로컬 Ollama 로 한 번 인덱싱한 후 `chunks.json` 을 원격 환경에 배포. 단 모델이 일치해야 한다. |

### 10.5 `ollamaClient.js` 확장 예시 (인증·타임아웃·모델 상주)

원격 분리 시 최소 수정:

```js
// rag/ollamaClient.js
import { OLLAMA_HOST } from "./config.js";

const OLLAMA_AUTH = process.env.OLLAMA_AUTH; // "Bearer xxx" 또는 "Basic base64(u:p)"

async function postJson(pathname, body, timeoutMs = 60_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { "content-type": "application/json" };
    if (OLLAMA_AUTH) headers.authorization = OLLAMA_AUTH;
    const res = await fetch(`${OLLAMA_HOST}${pathname}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
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

// chat 호출에 keep_alive 를 붙여 콜드 스타트 완화
export async function chat(model, messages, options = {}) {
  return postJson("/api/chat", {
    model, messages, stream: false, options, keep_alive: "30m",
  });
}
```

### 10.6 지연 성능 영향

| 구간 | 로컬 | 원격 |
|------|------|------|
| 질문 임베딩 | 50~150ms | 100~300ms (네트워크 + 임베딩) |
| top-k 검색 | <10ms | 동일 — **`chunks.json` 이 RAG 서버 메모리에 있음** |
| 답변 생성 | 5~15초 | 5~20초 (네트워크 오버헤드 미미) |
| 인덱싱 (수백 청크) | 30~120초 | 2~10배 느려질 수 있음 |

검색은 로컬 파일 기반이라 영향 없음. 실시간 질의는 차이가 작음. **인덱싱만 체감 느려진다**. 원격에서 인덱싱할 때는 `index.js` 에 동시 호출 수 제한(`p-limit` 등)을 붙여 원격 서버 GPU 큐가 막히지 않도록 관리.

### 10.7 RAG 서버 자체는 어디에 두나

- **계속 로컬** — 가장 단순. RAG 서버는 Ollama 외엔 `chunks.json`(디스크)와 프론트 프록시 말고는 의존이 없다.
- **RAG 서버도 원격** — 프론트 프록시의 `RAG_SERVER_URL` 만 바꾸면 되지만, `chunks.json` 배포·재인덱싱 플로우가 복잡해진다. 권장하지 않음.

### 10.8 인증·보안

Ollama 는 기본 인증이 없다. 원격 분리 시 **반드시** 다음 중 하나 이상:

- 리버스 프록시(Caddy/nginx)에서 TLS 종료 + Basic Auth 또는 JWT 검증
- 프라이빗 망(VPN/Tailscale/WireGuard) 배치
- 방화벽에서 RAG 서버 IP 만 화이트리스트

**인덱싱 중 대량 요청**이 발생하므로 인증 비용을 줄이려면 `OLLAMA_AUTH` 같은 고정 문자열 방식이 편리(요청별 토큰 갱신 불필요). Node `fetch`(Undici)는 keep-alive 로 TCP/TLS 연결을 재사용해준다.

### 10.9 장애 시 거동

- **원격 Ollama 미도달** → `server.js` 의 `/chat` 이 500 응답 → 프론트 프록시(`frontend/app/api/ai-assistant/chat/route.ts`)가 `ECONNREFUSED` / `fetch failed` 를 잡아 "RAG 서버 연결 실패" 안내. 기존 에러 경로를 그대로 재사용.
- **임베딩만 장애** → 질의는 실패하지만 `chunks.json` 은 안전. 복구 후 즉시 재사용 가능.
- **인덱싱 중 중단** → `index.js` 는 재진입 안전(전체 재생성). 재실행만 하면 됨.

### 10.10 마이그레이션 체크리스트

- [ ] 원격 서버에 `gemma2:9b` 와 `nomic-embed-text` **둘 다** pull
- [ ] `ollama serve` 가 외부 바인딩(`0.0.0.0:11434` 또는 리버스 프록시 뒤)
- [ ] 리버스 프록시/VPN/방화벽 중 하나로 인증 계층 구성
- [ ] `rag/` 의 `OLLAMA_HOST` 환경변수 변경
- [ ] 인증 필요 시 `rag/ollamaClient.js` 에 `OLLAMA_AUTH`·타임아웃·`keep_alive` 추가
- [ ] 임베딩 모델 버전이 동일하면 `chunks.json` 재사용, 다르면 재인덱싱
- [ ] CLI 검증 — `node ask.js "업무보고 어떻게 보내?"` 통과 확인
- [ ] 프론트 팝업에서 실제 질문 1건 이상 성공 확인
- [ ] Agent 쪽도 같이 쓰는 Ollama 라면 [`agent/` 의 `OLLAMA_HOST` 동기화](./18-mcp-server-and-agent-guide.md)

---

## 11. 참고

- [docs/15-ai-review.md](./15-ai-review.md) — Modelfile 단독 방식의 한계 (환각 발생 이유)
- [docs/16-rag-plan.md](./16-rag-plan.md) — 초기 RAG 설계안
- [docs/18-mcp-server-and-agent-guide.md](./18-mcp-server-and-agent-guide.md) — Agent 경로 구현·운영 가이드 (원격 Ollama §12)
- [rag/README.md](../rag/README.md) — 엔진 단독 사용 설명
- nomic-embed-text task prefixes: https://huggingface.co/nomic-ai/nomic-embed-text-v1.5
