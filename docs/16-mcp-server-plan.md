# MCP 서버 재설계 계획 — 표준 PostgreSQL MCP 도입 + 안내 모드 단일 진입점

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-04-29 | 최초 작성 — 안내 모드 단일 진입점 + 4-way 의도 분류 + 자체 MCP 서버 → 표준 PostgreSQL MCP 서버 전환 검토 |
| 1.1 | 2026-04-29 | **Phase 1~4 구현 완료 + 검증** — `/classify` 4-way 응답, `frontend/lib/mcp/{pgClient,scheduleQueries}.ts`, `route.ts`/`execute/route.ts` 4-way 분기, `AIAssistantPanel` mode 토글 제거. **PG-MCP 통합 방식 변경**: stdio child process 직접 통합 대신 백엔드 기존 `/api/teams/:teamId/schedules` API 호출 wrapper 로 구현 (§3.4 보강) — 백엔드 미들웨어 재사용으로 권한 격리 자동, 인터페이스(`getSchedules`/`createSchedule`)는 plan 그대로 유지해 향후 진짜 PG-MCP 로 교체 시 호출처 변경 없음 |
| 1.2 | 2026-04-29 | **Phase 5 완료** — `agent/` 디렉토리 + 자체 MCP 서버 폐기. `docker-compose.yml` 의 `AGENT_SERVER_URL` env 제거. 다중 턴 일정 등록(부족한 정보는 후속 질문) 도입 — `/parse-schedule-args` 가 `{ok:false, needs, hint}` 반환, frontend 가 직전 미완 question 과 새 입력을 결합 재요청 |

---

## 1. Context

### 1.1 현재 구조

찰떡(AI 버틀러) 우측 탭 진입점에서 사용자가 **모드를 직접 선택** 한다.

| 모드 | 라우팅 | 처리 |
|------|--------|------|
| 안내 모드 (`mode=guide`) | `/api/ai-assistant/chat` → RAG `/classify` → RAG `/chat` 또는 Open WebUI | 사용법 RAG, 일반 질문 웹검색 |
| 실행 모드 (`mode=agent`) | `/api/ai-assistant/chat` → Agent 서버(`8788`) | **자체 MCP 서버** ReAct loop 로 일정 조회/등록 |

**자체 MCP 서버** (`agent/`): Node.js + `@modelcontextprotocol/sdk`, ReAct loop(`reactLoop.js`), 도구 라우터(`toolRouter.js`) 가 `getSchedules`·`createSchedule` 같은 **의도 단위 도구** 를 등록해 호출.

### 1.2 변경 동기

- **사용자 입장**: 질문하기 전에 "사용법인가? 일정 등록인가? 일반 질문인가?" 를 미리 판단해 모드를 골라야 하는 부담. 자연스러운 흐름은 **하나의 입력창에 자유롭게 묻기** 다.
- **자체 MCP 의 한계**: 새 기능(예: 프로젝트 일정 조회) 마다 도구를 코드로 추가해야 함. DB 스키마 변경마다 도구 시그니처도 바꿔야 일관성 유지. AI 가 도구 어휘 안에서만 표현 가능해 사용자 의도가 도구에 매핑되지 않으면 거부 응답.
- **PostgreSQL 표준 MCP 가 이미 인프라에 존재**: `.mcp.json` 에 `@henkey/postgres-mcp-server` 가 등록되어 있어 도입 진입장벽 낮음. AI 가 DB 카탈로그를 검사한 뒤 적절한 SQL 을 직접 생성하면 도구 추가 작업 없이 자연어 → SQL 자동 처리 가능.

### 1.3 목표

1. 모드 토글 폐기 → 안내 모드 단일 진입점.
2. 질문 유형을 **자동 분류** 후 4-way 분기.
3. 일정 조회/등록은 **표준 PostgreSQL MCP** 가 처리하도록 전환 (자체 MCP 서버 폐기 또는 축소).
4. 일정 수정·삭제 / 프로젝트·채팅 관련 모든 요청은 **정중한 거절 안내** 로 통일.

---

## 2. 4-way 의도 분류

| # | 의도 | 처리 경로 | 응답 |
|---|------|----------|------|
| 1 | 일반 질문 (날씨·뉴스·지식) | Open WebUI + SearxNG (현재 그대로) | 웹 검색 기반 답변 |
| 2 | TEAM WORKS 사용법 | RAG 파이프라인 (현재 그대로) | 공식 문서 기반 답변 |
| 3 | **일정 조회·등록** | **PostgreSQL MCP** + AI SQL 생성 | DB 결과 자연어로 가공 |
| 4 | 일정 수정·삭제 / 프로젝트·채팅 관련 요청 | 거절 안내 | "찰떡이는 일정 조회·등록만 가능해요. 직접 해주세요." |

### 2.1 분류 방식

기존 `rag/server.js` 의 `/classify` 는 **키워드 기반** 2-stage(`HARD_KEYWORDS` / `GENERAL_KEYWORDS`) 인데, 의도가 4종으로 늘면 키워드만으로는 정확도가 떨어진다.

**채택안 — 키워드 + LLM 의도 분류 보강**:

1) **Stage 1 — 빠른 키워드 화이트리스트** (~0.1초)
   - HARD_KEYWORDS(사용법) + GENERAL_KEYWORDS(일반) 매치 시 즉시 결정 (현재 동작 유지).
   - **신규**: `SCHEDULE_KEYWORDS = ['일정', '회의', '미팅', '약속', '스케줄']` + 동작 키워드(`등록`, `추가`, `만들`, `잡아`, `보여`, `알려`, `확인`)
   - **신규**: `BLOCKED_KEYWORDS = ['수정', '삭제', '변경', '취소', '제거']` 와 `SCHEDULE_KEYWORDS` 동시 매치 → 즉시 거절 분기

2) **Stage 2 — LLM 의도 분류기** (~0.5~1초, gemma4:26b 의 `think:false` 모드 짧은 호출)
   - 키워드 매치 실패 시에만 호출. system prompt 로 4종 라벨 중 하나를 JSON 으로 반환하도록 강제.
   - 응답 예: `{"intent": "schedule_create", "reason": "..."}` / `{"intent": "general"}` / `{"intent": "usage"}` / `{"intent": "blocked", "subreason": "schedule_modify"}`

3) **Stage 3 — RAG 거절 fallback** (현재 동작 유지)
   - LLM 분류기가 실패하거나 애매할 때 RAG `/chat` 시도 후 거절형이면 일반 질문으로 fallback.

> **장점**: 키워드로 90% 케이스를 ms 단위에 처리하고, 애매한 케이스만 LLM 으로. RAG fallback 은 최후 안전망.

---

## 3. 자체 MCP vs 표준 PostgreSQL MCP 비교

### 3.1 자체 MCP 서버 (현재 `agent/`)

**구성**: Node.js 서버, `@modelcontextprotocol/sdk` 클라이언트, ReAct loop 가 등록된 도구(`getSchedules` 등) 를 LLM 의 tool-call 로 호출.

**장점**
- 도구가 **의도 단위** 라 LLM 이 적은 토큰으로 정확한 호출 (도구 이름·인자 시그니처가 명시적).
- **권한·비즈니스 규칙** 을 도구 구현부에 일원화 — 백엔드의 기존 `withTeamRole` 같은 미들웨어 재사용 용이.
- 응답 포맷을 통제 — DB 컬럼명을 그대로 노출하지 않고 사용자 친화 키(`startAt`, `title`)로 가공.
- **검증된 안전성** — 임의 SQL 실행 위험 없음. INSERT 시 트리거되는 각 도구가 미리 정의된 컬럼만 받음.

**단점**
- DB 스키마 변경이나 새 조회 패턴 등장마다 **도구 코드를 추가**. 개발 비용이 도구 수에 비례.
- LLM 이 도구 어휘 밖의 의도는 거부 (예: "지난주 화요일 회의 시간 알려줘" 같이 도구의 인자 형식과 맞지 않으면 fallback 답변).
- ReAct loop 자체의 **다단계 호출** 이 응답 시간을 늘림 (도구 호출 → 결과 → 추가 호출 → 답변, 평균 2~3 hop).
- 코드 중복 — 백엔드 API 와 비슷한 로직을 도구 측에서 또 구현하게 됨.

### 3.2 표준 PostgreSQL MCP (`@henkey/postgres-mcp-server`)

**구성**: 이미 `.mcp.json` 에 등록된 표준 MCP. AI 가 DB 카탈로그를 조회(`pg_get_setup_instructions`, `pg_execute_query`, `pg_manage_schema` 등) 한 뒤 SQL 을 직접 생성·실행.

**장점**
- **DB 스키마 변경에 자동 적응** — 새 컬럼·테이블이 생기면 카탈로그 검색만으로 LLM 이 발견하고 사용 가능.
- 도구 코드 작성 0건 — `pg_execute_query` 한 도구로 무한히 다양한 조회·등록.
- LLM 이 자연어 의도를 SQL 로 자유롭게 변환 → 사용자 표현 다양성에 강함.
- 표준 도구라 커뮤니티 유지보수, 버그 수정 자동 수혜.

**단점**
- **SQL 인젝션·잘못된 쿼리 위험** — AI 가 실수하면 다른 팀 데이터 노출, 잘못된 INSERT 등. 권한·격리 처리가 핵심 과제.
- **권한 모델 부재** — 백엔드 미들웨어(`withTeamRole`, `withAuth`) 와 분리되어 있어 사용자 컨텍스트(현재 로그인된 user_id, 활성 team_id) 를 LLM 이 매번 system prompt 로 주입받아야 함.
- **응답 시간 증가** — 카탈로그 검색(`information_schema` 조회) + SQL 작성 + 실행 + 결과 해석으로 LLM hop 수가 늘어남 (평균 3~5 hop, 자체 MCP 대비 1.5~2배).
- **결과 가공** — 결과가 raw 컬럼명 (`start_at`, `team_id`) 으로 와서 사용자 친화 표현으로 LLM 이 다시 변환해야 함 → 토큰 비용 ↑.

### 3.3 비교표

| 항목 | 자체 MCP | 표준 PG-MCP |
|------|----------|-------------|
| 새 기능 추가 비용 | 매번 코드 추가 | 0건 (스키마 변경만으로) |
| LLM 응답 시간 | 빠름 (1~2 hop) | 느림 (3~5 hop) |
| 안전성 | 매우 높음 (whitelist) | 낮음 — 별도 안전장치 필수 |
| 권한·격리 | 미들웨어 재사용 | system prompt 의존 |
| 의도 다양성 대응 | 좁음 (도구 어휘 한정) | 넓음 (자유 SQL) |
| 토큰 비용 | 작음 (도구 시그니처만) | 큼 (카탈로그 + SQL 작성) |
| 유지보수 | 우리 책임 | 커뮤니티 |
| DB 스키마 변경 추종 | 수동 | 자동 |

### 3.4 채택안 — **하이브리드 + 안전장치**

**의도 분기에 따라 PG-MCP 와 자체 MCP 의 좋은 부분만 결합**:

- **자체 도구 정의는 유지** — 단, 구현부가 PG-MCP 를 호출 (얇은 레이어).
- 도구는 `getSchedules`, `createSchedule` 두 종만. 이 둘은 매우 자주 쓰여 자체 정의의 토큰 절약 효과가 크다.
- 도구 구현부는 PG-MCP 의 `pg_execute_query` / `pg_execute_mutation` 를 호출하지만, **SQL 은 우리가 작성한 템플릿** 사용 (사용자 입력은 파라미터로만).
- 새 기능(예: 프로젝트 일정 조회) 이 요구되면 **그때 도구 추가** — 처음부터 모든 SQL 자유도를 LLM 에 주지 않음.

> **결론**: 표준 PG-MCP 는 **인프라 도구** 로만 활용하고, **의도 분기·SQL 템플릿·권한 검증** 은 우리가 보유. 자유 SQL 생성을 LLM 에 직접 맡기는 방안은 **위험-편익이 맞지 않음** (B안 채택, A안 기각).

#### 3.4.1 v1.1 구현 결정 — 백엔드 기존 API 호출 wrapper

Phase 2 구현 단계에서 **PG-MCP stdio child process 직접 통합 대신 더 안전한 길** 채택:

- `frontend/lib/mcp/pgClient.ts` 와 `scheduleQueries.ts` 의 인터페이스(`getSchedules`/`createSchedule`)는 plan 그대로 유지.
- **내부 구현은 백엔드의 기존 `/api/teams/:teamId/schedules` API 호출**. JWT 헤더 동봉.
- 백엔드 미들웨어(`withAuth`/`withTeamRole`) 가 이미 `team_id` + 사용자 권한을 검증하므로 권한 격리·SQL 인젝션 방지가 자동.
- **새 SQL 템플릿 0건** — 기존 `backend/lib/db/queries/scheduleQueries.ts` 그대로 활용.
- 향후 진짜 PG-MCP child process 로 교체할 때 `pgClient.ts` 만 바꾸면 호출처(`route.ts`) 변경 없음.

**왜 PG-MCP child process 를 안 썼나**: Next.js dev 의 turbopack HMR 이 모듈 재로드 시 child process leak 위험, 매 요청 spawn 은 수백 ms 오버헤드, system prompt 로 사용자 컨텍스트(JWT/team_id) 주입 시 LLM 이 만질 수 있는 영역 증가. 동일 효과 + 기존 미들웨어 재사용 측면에서 백엔드 API wrapper 가 ROI 압도.

---

## 4. 자료 교환 형식 — JSON 활용 방안

### 4.1 JSON 사용 영역

1. **LLM 의도 분류기** 응답 — `{"intent": "...", "args": {...}}`
2. **도구 호출 인자 / 결과** — MCP 표준이 이미 JSON RPC 기반
3. **거절 안내 응답 메타데이터** — `{"refused": true, "reason": "schedule_modify"}`
4. **frontend 가 받는 SSE 청크** — `data: {"type":"...", ...}` (현재 그대로)

### 4.2 장점

- **LLM 출력의 기계 파싱 안정성** — 자유 텍스트 답변보다 형식 깨짐이 적고, JSON 모드(`response_format: {"type":"json_object"}`) 로 강제 가능.
- **검증·디버깅 용이** — 스키마(JSON Schema 또는 zod) 로 입력·출력 검증 → 비정상 응답을 코드 단계에서 차단.
- **프론트·백엔드·LLM 3자 모두 동일 표준** — 새로운 직렬화 합의 없이 그대로 흘려보낼 수 있음 (현재 SSE 도 JSON 청크).
- **MCP 표준이 JSON RPC** — 자료교환 형식을 우리가 따로 정의할 필요 없음.

### 4.3 단점

- **토큰 비용** — JSON 의 키 이름·따옴표·중괄호가 답변 토큰을 차지. 자유 텍스트 대비 같은 정보 1.3~1.5배.
- **부분 출력 시 파싱 어려움** — 스트리밍 시 JSON 이 절반만 도착하면 파싱 실패. 토큰 단위 progressive 렌더에는 부적합 → 답변 본문은 자유 텍스트, **메타데이터만 JSON** 으로 분리.
- **LLM 이 가끔 깨진 JSON 생성** — 작은 모델일수록 더 자주. `gemma4:26b` 는 비교적 안정하지만 100% 보장 아님 → fallback 으로 텍스트 파싱 + 정규식 보강 필요.
- **사용자에게 노출되면 가독성 ↓** — JSON 은 어디까지나 시스템 내부 자료. 답변은 자연어로.

### 4.4 적용 원칙

- **도구 호출 인자·결과**: JSON (MCP 표준)
- **LLM 의도 분류 응답**: JSON (response_format 강제)
- **사용자에게 보이는 답변**: 자유 텍스트 (스트리밍 토큰 단위 점진 렌더)
- **SSE 메타 청크**: JSON (`{type, source, classification}` — 현재 그대로)

---

## 5. 변경 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `rag/server.js` | `/classify` 에 `SCHEDULE_KEYWORDS` / `BLOCKED_KEYWORDS` 추가, 4-way 응답 (`intent` 필드 신설) |
| `rag/intentClassifier.js` (신규) | LLM 기반 보조 의도 분류기 — 키워드 매치 실패 시 호출 |
| `frontend/app/api/ai-assistant/chat/route.ts` | mode 토글 제거, `intent` 따라 4-way 분기. PG-MCP 호출 추가 |
| `frontend/lib/mcp/pgClient.ts` (신규) | PG-MCP 호출 wrapper — 우리 SQL 템플릿을 안전하게 실행 |
| `frontend/lib/mcp/scheduleQueries.ts` (신규) | `getSchedules` / `createSchedule` SQL 템플릿 + 파라미터 바인딩 |
| `frontend/components/ai-assistant/AIAssistantPanel.tsx` | mode 토글 UI 제거, 단일 입력창 + 의도별 응답 카드 |
| `agent/` | 점진 폐기 — Phase 4 까지는 유지하다가 Phase 5 에 제거 |
| `docker-compose.yml` | `agent` 서비스 제거 (Phase 5) |
| `.mcp.json` | 변경 없음 (`postgresql-mcp` 이미 등록됨) |

---

## 6. 단계별 구현 계획

> v1.2 진행 상태: **Phase 1·2·3·4·5·6 모두 완료**. 자체 MCP 서버(`agent/`) 디렉토리·도커 서비스·env 모두 폐기.

### Phase 1 — 의도 분류기 4-way 확장 (가장 작은 ROI 높은 변화) ✅ 완료

- `rag/server.js` `/classify` 응답을 `{intent: 'usage' | 'general' | 'schedule_query' | 'schedule_create' | 'blocked', reason, matched?}` 으로 확장
- 키워드 화이트리스트 추가 (§2.1)
- 기존 `isTeamWorks` 필드는 backward compat 으로 유지하되 `intent === 'usage'` 와 동치

**검증**: `오늘 일정 알려줘` → `intent: schedule_query`, `내일 회의 등록해줘` → `intent: schedule_create`, `회의 시간 변경해줘` → `intent: blocked`

### Phase 2 — PG-MCP wrapper + SQL 템플릿 ✅ 완료 (v1.1 §3.4.1 결정 반영)

- `frontend/lib/mcp/pgClient.ts` 신규 — `mcp__postgresql-mcp__pg_execute_query` 호출 래퍼. 결과 JSON 으로 반환.
- `frontend/lib/mcp/scheduleQueries.ts` 신규 — 두 함수:
  ```ts
  export async function getSchedules(opts: { teamId, dateRange? }): Promise<Schedule[]>
  export async function createSchedule(opts: { teamId, createdBy, title, ... }): Promise<Schedule>
  ```
- SQL 템플릿은 백엔드 `lib/db/queries/scheduleQueries.ts` 의 SELECT/INSERT 와 1:1 미러. 단, 파라미터 바인딩(`$1`, `$2`) 으로 SQL 인젝션 방지.

**검증**: `pgClient.test.ts` 단위 테스트 — 정상 case + 권한 없는 team_id 거부 case.

### Phase 3 — route.ts 4-way 분기 ✅ 완료

- `mode=guide`/`mode=agent` 분기 제거.
- `intent` 따라:
  - `usage` → 기존 RAG stream
  - `general` → 기존 Open WebUI stream
  - `schedule_query` → PG-MCP `getSchedules` 호출 → LLM 으로 자연어 답변 (작은 prompt) + sources 에 raw 결과 첨부
  - `schedule_create` → LLM 으로 인자 파싱 (`title`, `start_at`, `end_at` 등) → confirm 카드 → 사용자 승인 후 `createSchedule`
  - `blocked` → 정중한 거절 메시지 한 줄 + 안내 (수정·삭제는 직접 / 프로젝트·채팅은 직접)
- `intent: schedule_create` 의 confirm 카드는 기존 `pendingAction` UI 재사용 가능 — 자체 MCP agent 시절 검증된 패턴.

**검증**: 4-way 모두 우측 탭에서 자연스럽게 동작. 거절형 응답은 1초 안에 도착.

### Phase 4 — UI 단일 진입점 정리 ✅ 완료

- `AIAssistantPanel` 의 모드 토글 제거 → 단일 입력창
- 응답 카드의 출처 뱃지: `📚 사용법` / `🌐 웹검색` / `📅 일정 N건` / `🚫 지원하지 않음` 4종
- 거절 안내 메시지: "찰떡이는 **일정 조회·등록** 만 도와드릴 수 있어요. 일정 수정/삭제나 프로젝트·채팅 작업은 화면에서 직접 처리해 주세요."

**검증**: 사용자 입장에서 모드 의식 없이 "오늘 뉴스" / "포스트잇 색깔" / "오늘 일정 알려줘" / "내일 회의 등록" / "어제 일정 삭제" 5종이 모두 단일 입력창에서 자연스럽게 처리.

### Phase 5 — `agent/` 서버 폐기 ✅ 완료 (v1.2)

- Phase 1~4 가 안정 운영되면 `agent/` 디렉토리 + `agent/server.js` 컨테이너(`8788`) 제거.
- `docker-compose.yml` 의 agent 서비스 삭제, `frontend` env 의 `AGENT_SERVER_URL` 제거.
- `prompt.js`·`reactLoop.js`·`toolRouter.js` 의 ReAct·도구 등록 패턴은 git 히스토리로 보존.

**검증**: agent 서비스 down 상태에서 모든 4-way 분기 정상 동작.

### Phase 6 — 문서 갱신 ✅ 완료

- `docs/14-Open-WebUI-plan.md` §2~3 갱신 — mode 토글 제거 반영
- `docs/16-mcp-server-plan.md` (본 문서) v1.x 로 업데이트
- `ollama/features/ai-assistant.md` 갱신 + RAG 인덱스 재실행

---

## 7. 위험 / 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| **LLM 의도 분류기 오분류** | 일정 등록 의도가 일반 질문으로 빠지거나 그 반대 | 키워드 화이트리스트 우선 적용 + LLM 분류는 보조 + 사용자 피드백 ROC 운영 |
| **PG-MCP SQL 템플릿 외 호출 위험** | LLM 이 자유 SQL 만들면 다른 팀 데이터 노출 가능 | **SQL 템플릿 외 호출 금지** — `pgClient` 가 화이트리스트 함수만 export. LLM 은 SQL 직접 생성 안 함 (B안 채택) |
| **권한 격리 (`team_id` 강제)** | 사용자 A 가 팀 X 의 일정 조회 → 다른 팀 데이터 노출 | SQL 템플릿이 `team_id = $1` 항상 강제. `team_id` 는 frontend session 의 `selectedTeamId` 에서 주입, LLM 이 만지지 못함 |
| **`schedule_create` 시 LLM 인자 파싱 오류** | 잘못된 시간/팀에 일정 등록 | confirm 카드(기존 pendingAction 패턴) 그대로 — 사용자 승인 전엔 INSERT 안 함 |
| **거절 안내가 사용자에게 차갑게 들림** | UX 저하 | 친근한 톤 + 대안 제시 (직접 화면 안내) |
| **응답 시간 증가** | LLM 보조 분류기 + PG-MCP hop | 키워드로 90% 케이스 처리해 평균 영향 최소화. 일정 조회/등록은 본질적으로 의도 명확해 1 hop 으로 충분 |
| **`agent/` 폐기 후 회귀** | 기존 실행 모드 사용 패턴 깨짐 | Phase 5 전에 Phase 1~4 가 모든 케이스 커버하는지 회귀 테스트 |

---

## 8. 검증 시나리오

```bash
# 1) 의도 분류기 4-way 확장 (Phase 1)
curl -s -X POST http://127.0.0.1:8787/classify \
  -H "content-type: application/json" \
  -d '{"question":"내일 오후 3시 회의 등록해줘"}'
# 기대: { "intent": "schedule_create", "reason": "...", "matched": "등록" }

curl -s -X POST http://127.0.0.1:8787/classify \
  -d '{"question":"어제 회의 삭제해줘"}'
# 기대: { "intent": "blocked", "subreason": "schedule_modify" }

# 2) Phase 3 — 일정 조회 SSE
curl -s --max-time 30 -N -X POST http://localhost:8080/api/ai-assistant/chat \
  -H "content-type: application/json" \
  -d '{"question":"오늘 우리 팀 일정 알려줘","stream":true}'
# 기대: meta(source:schedule) → sources(일정 N건) → token (자연어 요약)

# 3) Phase 3 — 거절 안내
curl -s -X POST http://localhost:8080/api/ai-assistant/chat \
  -d '{"question":"내일 회의 시간 변경해줘"}'
# 기대: intent=blocked, "찰떡이는 일정 조회·등록만..."

# 4) Phase 5 — agent 서비스 down 상태에서 모든 분기 정상
docker compose stop agent
# 위 1~3 시나리오 모두 동일하게 동작
```

---

## 9. 후속 작업 (이번 계획 외)

- **다중 턴 대화** — "내일 회의 등록해줘" → "몇 시?" 후속 질문 처리. 현재는 단일 턴.
- **읽기 전용 PG 사용자 분리** — `getSchedules` 는 read-only DB user 로, `createSchedule` 만 write user 로. 격리 강화.
- **ROC 기반 의도 분류기 자동 학습** — 운영 로그(질문, 분류 결과, 사용자 👍/👎) 적재해 키워드·LLM 임계값 자동 조정.
- **거절 안내 톤 학습** — 사용자 피드백으로 거절 메시지 친근도 조정.
- **Phase 5 이후 자체 MCP SDK 재활용** — 외부 통합(Slack, Google Calendar) 도구가 필요해지면 다시 자체 MCP 도입 검토.

---

## 10. 관련 문서

- [docs/14-Open-WebUI-plan.md](./14-Open-WebUI-plan.md) — Open WebUI 통합 + 안내 모드 라우팅 (현재)
- [docs/13-RAG-pipeline-guide.md](./13-RAG-pipeline-guide.md) — RAG 파이프라인 구성
- [docs/15-docker-container-gen.md](./15-docker-container-gen.md) — 컨테이너 인프라
- [`.mcp.json`](../.mcp.json) — MCP 서버 등록 (`postgresql-mcp` 이미 포함)
- [`agent/`](../agent/) — 현재 자체 MCP 서버 구현 (Phase 5 에 폐기 예정)
