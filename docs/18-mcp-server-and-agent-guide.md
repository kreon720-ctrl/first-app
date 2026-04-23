# MCP 서버 및 Agent 개발 가이드

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-23 | 최초 작성 — `teamworks-mcp/` · `agent/` 구현 반영 |

## 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 설계 배경 | `docs/17-mcp-server.md` | 왜 이 구조를 선택했는지 — 옵션 비교·보안 모델 |
| RAG 파이프라인 | `docs/16-rag-plan.md` · `rag/README.md` | 안내 모드(`mode=guide`)에 쓰이는 별도 경로 |
| API 스펙 | `docs/7-api-spec.md` | MCP 도구가 실제로 호출하는 백엔드 REST 엔드포인트 |
| ERD | `docs/6-erd.md` | 도구가 다루는 데이터 모델 |

---

## 1. 개요

### 1.1 목적

**AI 버틀러 찰떡이**의 "실행 모드"를 구현하는 두 컴포넌트를 다룬다.

- **`teamworks-mcp/`** — Model Context Protocol 서버. stdio 전송으로 도구를 노출한다.
- **`agent/`** — Ollama `gemma2:9b` 위에서 동작하는 Agent Host. 사용자 자연어를 JSON 구조화 출력으로 받아 MCP 도구 호출로 번역한다.

두 프로세스는 로컬 PC 1대에서 돌고, 인터넷은 필요 없다.

### 1.2 아키텍처

```
┌──────────┐     /api/ai-assistant/chat       ┌────────────────┐
│ 프론트   │ ───────────────────────────────▶ │ Next.js 프록시 │
│ (popup)  │◀─── {kind:answer|confirm}      │ (frontend)     │
└──────────┘                                   └────────┬───────┘
                                                         │ mode=agent
                                                         │ Bearer JWT
                                                         ▼
                                               ┌───────────────────┐
                                               │   Agent Host      │
                                               │   (agent/, 8788)  │
                                               │                   │
                                               │   ┌─────────────┐ │
                                               │   │ gemma2:9b   │ │      ┌──────────┐
                                               │   │  (JSON mode)│◀┼────▶ │ Ollama   │
                                               │   └─────────────┘ │      │ (11434)  │
                                               │   ┌─────────────┐ │      └──────────┘
                                               │   │ MCP Client  │ │
                                               │   │   (SDK)     │ │
                                               │   └──────┬──────┘ │
                                               └──────────┼────────┘
                                                          │ stdio
                                                          │ spawn(node teamworks-mcp/index.js)
                                                          │ env: TEAMWORKS_JWT
                                                          ▼
                                               ┌───────────────────┐
                                               │   teamworks-mcp   │
                                               │   (stdio)         │
                                               │                   │
                                               │   tools/          │
                                               │   ├ listMyTeams   │
                                               │   ├ listTeamSch.. │      ┌──────────┐
                                               │   └ createSchedul…│────▶ │ 백엔드   │
                                               │         ↑         │ JWT  │ (3000)   │
                                               └─────────┼─────────┘      └──────────┘
                                                         │
                                                         └── HTTP fetch()
```

### 1.3 프로세스·포트 요약

| 프로세스 | 포트 | 구동 주체 | 수명 |
|----------|------|-----------|------|
| 프론트 (`frontend/`) | 3001 | 개발자 | 상시 |
| 백엔드 (`backend/`) | 3000 | 개발자 | 상시 |
| Ollama | 11434 | 개발자 | 상시 |
| **Agent Host** (`agent/`) | **8788** | 개발자 | 상시 |
| **MCP 서버** (`teamworks-mcp/`) | stdio | **Agent가 요청마다 스폰** | 요청 단위 |

MCP 서버는 포트를 열지 않는다. Agent가 JWT를 `env.TEAMWORKS_JWT` 로 주입해 자식 프로세스로 띄우고, 응답이 끝나면 종료한다.

---

## 2. 디렉토리 구조

### 2.1 `teamworks-mcp/`

```
teamworks-mcp/
├── package.json              # "@modelcontextprotocol/sdk" 의존
├── config.js                 # BACKEND_URL, getJwt() (env에서 JWT 로드)
├── backendClient.js          # fetch 래퍼. 2xx 아니면 { status, body } 에러 throw
├── tools/
│   ├── listMyTeams.js        # 도구 1개당 파일 1개
│   ├── listTeamSchedules.js
│   └── createSchedule.js
├── index.js                  # stdio 엔트리. Server 인스턴스 + 요청 핸들러 등록
└── README.md
```

각 도구 모듈의 표준 export:

```js
export const X = {
  name: 'tool_name',
  description: '<모델이 읽을 1~2줄 설명>',
  inputSchema: { /* JSON Schema */ },
  mutates: true | false,          // UI 확인 카드가 필요한지 (참고용 플래그)
  async handler(args) { ... },    // 실제 동작
};
```

### 2.2 `agent/`

```
agent/
├── package.json              # "@modelcontextprotocol/sdk", "express"
├── config.js                 # OLLAMA_HOST, CHAT_MODEL, BACKEND_URL, MAX_STEPS, CONFIRM_TOOLS
├── ollamaClient.js           # chat(model, messages, options, format) — Ollama /api/chat 래퍼
├── prompt.js                 # buildSystemPrompt, buildResponseSchema, buildObservationMessage
├── toolRouter.js             # withMcpClient (stdio spawn 캡슐화), listTools, callTool
├── reactLoop.js              # runAgent, executePendingAction, 날짜 전처리·정규화·sanitize
├── server.js                 # Express — POST /chat, POST /execute, GET /health
└── README.md
```

---

## 3. 실행 방법

### 3.1 전제 조건

- Node.js 20+
- Ollama 런타임 실행 중 (`ollama serve`) — `gemma2:9b` 모델 pull 완료
- 백엔드(`backend/`)가 `http://localhost:3000`에서 실행 중
- 프론트(`frontend/`)가 `http://localhost:3001`에서 실행 중 (실제 UI 테스트용)

### 3.2 최초 설치

```bash
cd teamworks-mcp && npm install
cd ../agent && npm install
```

### 3.3 기동

```bash
cd agent
npm run server
```

헬스체크:

```bash
curl http://127.0.0.1:8788/health
# {"ok":true,"model":"gemma2:9b"}
```

MCP 서버는 **별도 기동하지 않는다.** Agent가 `/chat` 요청마다 자식 프로세스로 스폰한다.

### 3.4 코드 수정 후 재기동

Node 모듈 캐시 때문에 `agent/` 하위 파일을 수정하면 Agent 재기동이 필요하다. MCP 서버는 매 요청마다 새로 스폰되므로 재기동 불필요.

Windows 기준:

```bash
PID=$(netstat -ano | grep -E ":8788\s" | grep LISTENING | awk '{print $NF}' | head -1)
taskkill //F //PID $PID
cd agent && npm run server
```

### 3.5 환경변수

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 주소 |
| `CHAT_MODEL` | `gemma2:9b` | 사용할 Ollama 모델 |
| `BACKEND_URL` | `http://localhost:3000` | 백엔드 REST API |
| `AGENT_PORT` | `8788` | Agent HTTP 포트 |
| `AGENT_MAX_STEPS` | `4` | 한 요청당 최대 ReAct 스텝 |
| `AGENT_CONFIRM_TOOLS` | `create_schedule,update_schedule,delete_schedule` | 자동 실행 대신 UI 확인 요구 |
| `TEAMWORKS_JWT` | (Agent가 자동 주입) | 수동 MCP 테스트 시에만 설정 |

---

## 4. 요청 흐름 — 한 번의 질문이 어떻게 처리되나

예시: 사용자가 "내일 15시 회의 등록해줘" 입력.

```
1. 프론트 (ai-assistant/page.tsx)
   - mode='agent', question='내일 15시 회의 등록해줘'
   - localStorage 에서 JWT 가져와 Authorization 헤더 부착
   - POST /api/ai-assistant/chat

2. 프론트 라우트 (frontend/app/api/ai-assistant/chat/route.ts)
   - mode=agent 이면 Agent Host(8788)로 그대로 프록시

3. Agent Host (agent/server.js → runAgent)
   a. Question 정규화 (normalizeKoreanDateInQuestion)
      - "4.15." → "4월 15일", "22일" → "4월 22일" 등
   b. MCP Client 스폰
      - withMcpClient(jwt, async (client) => { ... })
      - teamworks-mcp 가 자식 프로세스로 실행 (env.TEAMWORKS_JWT)
   c. 도구 카탈로그 확보
      - listTools(client) → [{name, description, inputSchema}, ...]
   d. 시스템 프롬프트 구축
      - buildSystemPrompt({tools, dateContext, userHint})
      - dateContext: 오늘·내일·이번 주 월~일·다음 주 월~일 미리 계산
   e. 응답 스키마 구축
      - buildResponseSchema(tools) → oneOf 분기 (tool마다 args 스키마 포함)
   f. Ollama /api/chat 호출
      - format=<schema> 로 구조화 출력 강제
      - 실패 시 format='json' 폴백

4. 모델 출력 파싱 (safeParseJson)
   - {"kind":"action","tool":"create_schedule","args":{...}}
   - 또는 {"kind":"answer","answer":"..."}
   - 둘 다 아니면 즉시 사용자 에러 반환 (재시도 금지 — 오작동 방지)

5. 분기
   - kind='answer' → 바로 반환
   - kind='action' + tool ∈ CONFIRM_TOOLS
       → sanitizeArgs (color enum 보정, title 시간어 제거)
       → { kind:'confirm', pendingAction:{tool,args}, preview:'제목: ...' } 반환
   - kind='action' + 조회 도구
       → callTool(client, name, args) 즉시 실행
       → observation을 다시 모델에 주입 (다음 스텝)

6. 프론트 수신
   - kind='confirm' 이면 승인 카드 렌더 ([승인][취소] 버튼)
   - 승인 누르면 POST /api/ai-assistant/execute → Agent /execute → MCP callTool
```

---

## 5. 새 도구 추가하기

예: 포스트잇 조회 도구 `list_team_postits` 를 추가한다.

### 5.1 도구 파일 작성 — `teamworks-mcp/tools/listTeamPostits.js`

```js
import { callBackend } from '../backendClient.js';

export const listTeamPostits = {
  name: 'list_team_postits',
  description: '특정 팀의 월간 포스트잇 목록을 조회한다. month 는 YYYY-MM 형식.',
  inputSchema: {
    type: 'object',
    required: ['teamId', 'month'],
    properties: {
      teamId: { type: 'string', description: '팀 UUID' },
      month:  { type: 'string', description: 'YYYY-MM' },
    },
    additionalProperties: false,
  },
  mutates: false,
  async handler({ teamId, month }) {
    const data = await callBackend(`/api/teams/${teamId}/postits`, {
      query: { month },
    });
    return {
      count: (data?.postits ?? []).length,
      postits: (data?.postits ?? []).map(p => ({
        id: p.id,
        date: p.date,
        color: p.color,
        content: p.content,
      })),
    };
  },
};
```

### 5.2 서버에 등록 — `teamworks-mcp/index.js`

```js
import { listTeamPostits } from './tools/listTeamPostits.js';

const TOOLS = [listMyTeams, listTeamSchedules, createSchedule, listTeamPostits];
```

이게 전부다. Agent 는 매 요청마다 `listTools()` 로 카탈로그를 재확보하므로 Agent 쪽 코드 수정 불필요.

### 5.3 수정·삭제 계열 도구라면

- `mutates: true` 로 표시
- `agent/config.js` 의 `CONFIRM_TOOLS` 환경변수 기본값에 도구 이름 추가 (또는 `AGENT_CONFIRM_TOOLS` env 로 주입)
- (선택) `agent/reactLoop.js` `buildPreview()` 에 해당 도구 전용 preview 렌더 추가:

```js
if (toolName === 'delete_schedule') {
  return `삭제 대상: ${args.scheduleId}`;
}
```

### 5.4 체크리스트

- [ ] `inputSchema` 의 enum·required 명시
- [ ] handler 에서 백엔드 호출 시 에러는 그대로 throw (MCP 서버가 랩핑해 모델에 돌려줌)
- [ ] JSON.stringify 가능한 결과만 return
- [ ] `mutates: true` 면 CONFIRM_TOOLS 등록
- [ ] 재기동 + `/health` 확인 후 실제 질문으로 테스트

---

## 6. 프롬프트 엔지니어링

### 6.1 설계 원칙

- **JSON 모드 전제.** gemma2:9b 는 ReAct 텍스트 프로토콜 이행률이 40% 로 낮았다. Ollama `format: <schema>` 로 구조화 출력을 강제해 100%까지 올림.
- **모델에게 계산시키지 않는다.** "다음 주 월요일" 같은 상대 날짜는 Host 가 미리 계산해 프롬프트 테이블로 주입한다 (`buildDateContext`).
- **enum은 프롬프트와 스키마 양쪽에 둔다.** 스키마 강제가 깨질 때를 대비해 프롬프트에도 enum 을 나열하고, 추가로 `sanitizeArgs` 가 런타임에서 복구한다.

### 6.2 `buildSystemPrompt` 구조

```
1. 페르소나 1문장 + "JSON 단일 객체만 출력"
2. 현재 시각·상대 날짜 테이블 (오늘·내일·모레·이번 주·다음 주)
3. 컨텍스트 (기본 팀)
4. 도구 카탈로그 (name + 1줄 설명 + enum 필드 강조)
5. 응답 형식 (action 분기, answer 분기)
6. 규칙 10개 (의문/명령 분류, 날짜 해석, title 정제 등)
7. 예시 — 조회 / 등록 각 1개 (플레이스홀더 치환 각주 포함)
```

### 6.3 `buildResponseSchema` 구조

각 도구마다 `{kind:'action', tool: const, args: <해당 tool inputSchema>}` 분기를 `oneOf` 로 엮는다.  각 도구의 args 스키마가 그대로 들어가서 **color enum, required 필드**까지 모델 출력 단계에서 강제된다.

```js
{ oneOf: [
    { required:['kind','tool','args'], properties:{ kind:{const:'action'}, tool:{const:'list_my_teams'}, args:{...} } },
    { required:['kind','tool','args'], properties:{ kind:{const:'action'}, tool:{const:'list_team_schedules'}, args:{...} } },
    { required:['kind','tool','args'], properties:{ kind:{const:'action'}, tool:{const:'create_schedule'}, args:{...} } },
    { required:['kind','answer'],      properties:{ kind:{const:'answer'}, answer:{type:'string'} } },
  ]
}
```

### 6.4 규칙 튜닝 요령

- 모델이 **엉뚱한 도구를 고를 때** → 규칙 1(의문형→조회) / 규칙 2(명령형→수정) 의 키워드를 늘린다.
- 모델이 **날짜를 엉뚱하게 추측할 때** → 규칙 3 을 강화하고, 필요하면 dateContext 에 더 많은 사전 계산 값을 주입.
- 모델이 **title 에 시간 표현을 넣을 때** → 규칙 5 ("시간/기간/날짜 표현 금지") + `scrubTemporalWords` 패턴 추가.
- 모델이 **응답 포맷을 깨는 경우** → `format` 파라미터를 받는 Ollama 버전인지 확인. 구버전이면 `'json'` 폴백만 동작하며 스키마 enforcement 가 느슨해진다.

### 6.5 한국어 질문 전처리 — `normalizeKoreanDateInQuestion`

모델이 "M월 D일" 외의 날짜 표기를 못 다루는 문제를 Agent 쪽에서 해결한다.

- `2026-04-15`, `2026.04.15`, `2026/04/15` → `2026년 4월 15일`
- `4.15`, `4.15.`, `4/15` → `4월 15일`
- `4월15일` → `4월 15일` (공백 삽입)
- `22일` → `<current KST month>월 22일` — 단, 이미 `N월` 또는 `달` 이 선행하면 변환하지 않음

**변환이 일어나면 `trace` 배열에 기록**되어 디버깅에서 확인할 수 있다.

---

## 7. 확인 플로우 (CONFIRM_TOOLS)

### 7.1 Agent 쪽

```js
if (CONFIRM_TOOLS.has(toolName)) {
  return {
    kind: 'confirm',
    pendingAction: { tool: toolName, args: sanitizedArgs },
    preview: buildPreview(toolName, sanitizedArgs),
  };
}
```

즉시 실행하지 않고 프론트에게 책임을 넘긴다. `sanitizeArgs` 는 먼저 적용되므로 사용자가 보는 preview 와 실제 실행될 args 는 항상 일치한다.

### 7.2 프론트 쪽 (ai-assistant/page.tsx)

- 서버 응답의 `pendingAction` 을 메시지 객체에 저장
- 말풍선 아래 [승인] [취소] 버튼 렌더
- **승인**: `POST /api/ai-assistant/execute { tool, args }` → Agent `/execute` → MCP callTool → 백엔드 쓰기 실행 → "완료했어요." 메시지
- **취소**: 백엔드 호출 없이 상태만 "취소됨" 으로 변경

### 7.3 preview 커스터마이징

`agent/reactLoop.js` `buildPreview(toolName, args)` 에 도구별 분기 추가. 현재 `create_schedule` 은:

```
제목: {title} · 일시: {YYYY-MM-DD} {HH:MM} ~ {HH:MM}
```

형식. `formatDateTime` 가 ISO → date/time 분해를 담당한다.

---

## 8. 방어막 (Sanitization)

### 8.1 `sanitizeArgs`

`tool.inputSchema.properties` 를 순회하며:

1. **enum 필드** 가 enum 밖의 값이면 교정.
   - `color` 의 경우 `COLOR_ALIAS` (red→rose, yellow→amber, green→emerald, orange→amber, 등) 매핑을 먼저 시도하고, 실패하면 `default` 또는 enum 첫 번째 값으로.
2. **`title` 필드** 에서 `scrubTemporalWords` 호출 — "오전/오후/점심/저녁/1시간/하루종일/N시" 등 시간 표현 제거.

변환될 때마다 `trace` 에 `{role:'sanitize', field, from, to}` 기록.

### 8.2 추가 방어가 필요한 상황

- 새 enum 필드 추가 → 자동으로 `sanitizeArgs` 가 잡아줌 (도구 스키마만 정의하면 됨)
- 새 자유 텍스트 필드에서 오염이 발생 → `scrubTemporalWords` 에 패턴 추가 (`TEMPORAL_PATTERNS` 배열)
- 날짜 문자열이 ISO 가 아닌 경우가 빈번 → `agent/reactLoop.js` 에 별도 정규화 로직 추가

---

## 9. 디버깅

### 9.1 Trace 확인

`runAgent` 는 내부적으로 `trace` 배열을 채우지만 현재 HTTP 응답에는 포함하지 않는다. 디버그 시 `agent/server.js` 에서 임시로 응답에 추가:

```js
if (result.kind === 'answer') return res.json({ ...result });
```

또는 콘솔 로깅:

```js
console.log(JSON.stringify(result.trace, null, 2));
```

trace 에는 다음이 남는다:

- `{step, role:'assistant', content}` — 모델 raw 출력
- `{step, role:'tool', tool, args, result}` — 도구 실행 결과
- `{step, role:'tool-error', content}` — 도구 실패
- `{role:'normalize', from, to}` — 날짜 정규화
- `{role:'sanitize', field, from, to, tool}` — args 교정

### 9.2 Ollama 직접 호출로 프롬프트 검증

Agent 를 거치지 않고 모델 출력만 보고 싶을 때:

```bash
cat << 'NODE_EOF' | node --input-type=module
const { buildSystemPrompt, buildResponseSchema } = await import('file:///C:/_vibe/team-works/agent/prompt.js');

const tools = [ /* 실제 MCP 도구 목록을 여기에 */ ];
const system = buildSystemPrompt({ tools, dateContext: '오늘: 2026-04-24 (금)', userHint: '기본 팀: teamId=...' });
const schema = buildResponseSchema(tools);

const res = await fetch('http://127.0.0.1:11434/api/chat', {
  method: 'POST',
  headers: {'content-type':'application/json'},
  body: JSON.stringify({
    model: 'gemma2:9b',
    messages: [ {role:'system', content: system}, {role:'user', content: '내일 15시 회의 등록'} ],
    stream: false,
    options: { temperature: 0.1 },
    format: schema,
  }),
});
console.log((await res.json())?.message?.content);
NODE_EOF
```

### 9.3 MCP Inspector 로 도구 단독 테스트

```bash
cd teamworks-mcp
TEAMWORKS_JWT=<실제 JWT> npx @modelcontextprotocol/inspector node index.js
```

브라우저 UI 에서 도구 목록·입력 폼·결과를 확인할 수 있다. 백엔드 REST 응답만 검증하고 싶을 때 유용.

### 9.4 자주 만나는 증상과 원인

| 증상 | 원인 | 해결 |
|------|------|------|
| `"kind":"answer"` 만 돌아오고 도구 호출 안 함 | 모델이 의문형으로 오해하거나 정보 부족 판단 | 프롬프트 규칙 2 키워드 보강 또는 userHint 로 teamId 확실히 주입 |
| 파싱 실패 → "응답 형식이 잘못됐어요" | Ollama 가 format 를 무시 (구버전) 또는 schema 자체 오류 | `ollama --version` 확인, 또는 `format:'json'` 폴백 경로 확인 |
| color enum 위반 | Ollama 스키마 enforcement 가 nested args 에서 느슨 | `sanitizeArgs` 가 잡아줌. 로그에서 `sanitize` trace 확인 |
| 날짜 1일 차이 | KST/UTC 혼동 | `dateContext` 가 KST 기준인지, startAt 이 `+09:00` 을 포함하는지 확인 |
| 엉뚱한 도구 (조회 질문인데 create) | 과거: ReAct 재시도 루프 / 현재: 거의 발생 안 함 | 여전히 보이면 프롬프트 규칙 1 강화 |

---

## 10. 보안 체크리스트

- [ ] **raw SQL 금지.** 모든 도구 handler 는 `callBackend` 를 거친다. SQL 실행 필요 시 별도 안건으로.
- [ ] **JWT 경로.** 프론트 → Next.js → Agent → env → MCP → 백엔드. 디스크/로그에 남기지 않는다.
- [ ] **파괴적 도구는 CONFIRM_TOOLS.** delete/update/create 는 반드시 포함. 운영 중에 빠뜨리면 즉시 추가.
- [ ] **tool result → 사용자 프롬프트 합성 시 구분자 사용.** Observation 주입 시 raw 결과를 `JSON.stringify` 해 문자열로 박고, 주변에 "도구 결과입니다:" 같은 프레이밍을 둠 — 프롬프트 인젝션 방지.
- [ ] **감사 로그** (선택). 프로덕션이면 `ai_audit_log` 테이블에 수정 계열 호출 전부 기록.

---

## 11. 제약과 한계

- **gemma2:9b** 는 툴콜링을 네이티브 지원하지 않는다. JSON 모드로 흉내 내지만, 복잡한 multi-step 체이닝(`list_my_teams → list_team_schedules`)은 여전히 실패율이 있다. 초기에는 1-hop 도구만 넣고, 필요하면 Agent 에서 선수 호출(`list_my_teams` 자동)을 하거나 도구 입력 스키마에 `teamName` 을 허용해 서버 측에서 해소하도록 확장.
- **응답 시간** 은 JSON 스키마 컴파일 비용 때문에 9~17초. UX 로 수용 가능하지만 스트리밍이 필요하면 `stream: true` + 청크 파싱으로 확장해야 함.
- **MCP 서버는 요청당 spawn** 이라 대량 병렬에 부적합. 로컬 1인 사용 전제.
- **Ollama `format:<schema>` 지원** 은 0.5+ 버전 필요. 이전 버전이면 `'json'` 폴백으로 동작하나 enum 강제가 느슨해져 `sanitizeArgs` 의존도가 커진다.
- **한국어 날짜 표기** 는 `normalizeKoreanDateInQuestion` 으로 커버 중이나, "다음 달 15일", "3일 뒤" 같은 상대 표현은 아직 모델 담당. 원한다면 chrono-ko 수준의 프리프로세서 추가.

---

## 12. 원격 AI 모델 서버로 분리하는 경우

현재 구조는 Ollama 가 로컬 PC에서 도는 걸 전제로 한다. **모델 서버를 별도 호스트(예: GPU 전용 서버)로 옮길 때** 필요한 변경을 정리한다.

### 12.1 언제 분리하나

- GPU 가 있는 전용 서버로 추론을 옮겨 로컬 CPU 부담을 덜고 싶을 때
- 여러 개발자·PC 가 한 모델을 공유할 때
- 더 큰 모델(예: 70B)로 업그레이드해 개인 PC 사양을 초과할 때

### 12.2 무엇이 바뀌고 무엇이 안 바뀌는가

**바뀌는 건 Ollama 엔드포인트 하나뿐**이다. MCP 서버·백엔드·프론트·Agent 코드 거의 손대지 않는다.

```
┌──────────┐     ...      ┌────────────────┐
│ 프론트   │ ─────────── ▶│ Next.js 프록시 │
└──────────┘               └────────┬───────┘
                                    │
                                    ▼
                          ┌───────────────────┐    HTTPS   ┌──────────────────┐
                          │   Agent Host      │──────────▶ │  원격 Ollama     │
                          │   (로컬)          │            │  (GPU 서버)       │
                          └─────────┬─────────┘            └──────────────────┘
                                    │ stdio (그대로)
                                    ▼
                          ┌───────────────────┐
                          │   teamworks-mcp   │ ───▶ 백엔드
                          └───────────────────┘
```

### 12.3 원격 서버 설정

Ollama 를 외부 접속 허용으로 기동:

```bash
# systemd unit 또는 환경변수로 지정
OLLAMA_HOST=0.0.0.0:11434 ollama serve
ollama pull gemma2:9b
```

⚠️ **Ollama 는 기본 인증이 없다.** 포트를 그대로 노출하면 임의 사용자가 모델을 돌리거나 프롬프트를 훔칠 수 있다. 반드시 다음 중 하나 이상 적용:

- **리버스 프록시**(Caddy / nginx) 에서 TLS 종료 + HTTP Basic Auth 또는 JWT 검증
- **프라이빗 네트워크** — 사내 VPC, Tailscale, WireGuard 등
- **방화벽** 에서 Agent Host IP 만 화이트리스트

### 12.4 Agent 쪽 변경

**(1) 환경변수만 바꾸면 기본 동작은 돌아간다.**

```bash
export OLLAMA_HOST=https://ollama.internal.example.com
```

`agent/ollamaClient.js` 는 이 URL 에 `/api/chat` 을 붙여 호출하므로 코드 수정 없음.

**(2) 인증 헤더를 추가해야 한다면** `chat()` 을 한 줄 확장:

```js
// agent/ollamaClient.js
export async function chat(model, messages, options = {}, format = undefined) {
  const body = { model, messages, stream: false, options };
  if (format !== undefined) body.format = format;
  const headers = { 'content-type': 'application/json' };
  if (process.env.OLLAMA_AUTH) headers.authorization = process.env.OLLAMA_AUTH;
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, { method: 'POST', headers, body: JSON.stringify(body) });
  // ...
}
```

그리고 `OLLAMA_AUTH="Bearer xxx"` 또는 `"Basic base64(user:pass)"` 형식으로 주입.

**(3) 타임아웃 설정.** 로컬 루프백은 무제한이지만 네트워크는 다르다. gemma2:9b 평균 9~17초를 여유 있게 덮도록 60초 권장:

```js
const controller = new AbortController();
const t = setTimeout(() => controller.abort(), 60_000);
try {
  const res = await fetch(url, { ...opts, signal: controller.signal });
  // ...
} finally {
  clearTimeout(t);
}
```

**(4) 모델 상주 유지.** 원격 서버에 다수 모델이 돌면 콜드 스타트가 커진다. Ollama `/api/chat` 바디에 `keep_alive` 를 넣어 모델을 메모리에 오래 유지:

```js
// agent/ollamaClient.js
const body = { model, messages, stream: false, options, keep_alive: '30m' };
```

**(5) 헬스체크 확장.** Agent 기동 시 원격 Ollama 도달 가능성을 함께 점검:

```js
// agent/server.js
app.get('/health', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { method: 'GET' });
    res.json({ ok: r.ok, model: CHAT_MODEL, ollama: r.ok ? 'reachable' : `status=${r.status}` });
  } catch (err) {
    res.status(503).json({ ok: false, model: CHAT_MODEL, ollama: String(err.message || err) });
  }
});
```

### 12.5 MCP·백엔드는 건드리지 않는다

- `teamworks-mcp/` 는 stdio 로 Agent 와 통신하므로 네트워크 분리와 무관하다.
- 백엔드 REST API 호출은 `BACKEND_URL` 이 여전히 로컬(개발) 또는 내부망(스테이징/프로덕션) 주소.
- RAG 서버(`rag/`, 안내 모드) 가 같은 Ollama 를 쓴다면 **같이 `OLLAMA_HOST` 를 바꿔야 한다.** 안내 모드에만 다른 모델을 쓰고 싶으면 `rag/config.js` 의 `OLLAMA_HOST` 를 독립적으로 지정.

### 12.6 성능·안정성 주의

- **keep-alive.** Node `fetch`(Undici) 는 기본 keep-alive. 잦은 호출에서도 TCP/TLS 핸드셰이크 비용은 미미.
- **동시성.** Ollama 는 모델당 내부 큐가 있다. 여러 사용자가 동시에 쓰면 GPU 서버 사양에 따라 순차 처리. 지연이 크면 Agent 쪽에 동시 요청 수 상한(세마포)을 도입.
- **콜드 스타트.** 모델이 메모리에 안 올라와 있으면 첫 응답이 수십 초. `keep_alive` 옵션과 원격 서버 모니터링으로 완화.
- **스트리밍.** 네트워크 경로가 길어지면 전체 응답을 기다리는 게 더 괴롭다. 필요하면 `stream: true` + 프런트까지 SSE 로 청크 전달 구조로 확장(현재 범위 밖).

### 12.7 재해 시나리오

- **원격 Ollama 도달 불가** → `runAgent` 가 500 반환 → 프론트 `/api/ai-assistant/chat` 이 "AI 서버에 연결할 수 없습니다" 로 안내.
- **부분 장애(일부 요청 타임아웃)** → Agent 에서 재시도 루프를 돌리면 오히려 엉뚱한 도구 호출로 이어질 수 있으니, **재시도 금지·즉시 에러 반환** 원칙을 유지한다 (현재 reactLoop 도 동일 원칙).
- **모델 제거/교체** → 원격 관리자가 `gemma2:9b` 를 삭제하면 Agent 응답이 404. 모델 배포는 운영 프로세스로 관리.

### 12.8 마이그레이션 체크리스트

- [ ] 원격 서버에 Ollama 설치 + `gemma2:9b` pull
- [ ] `ollama serve` 가 외부 바인딩(`0.0.0.0:11434` 또는 리버스 프록시 뒤)
- [ ] 리버스 프록시 / VPN / 방화벽 중 하나로 인증 계층 구성
- [ ] Agent 에 `OLLAMA_HOST` (그리고 필요 시 `OLLAMA_AUTH`) 주입
- [ ] `agent/ollamaClient.js` 에 인증 헤더·타임아웃·keep_alive 필요한 만큼 추가
- [ ] `/health` 엔드포인트가 원격 도달 여부를 반영하도록 확장
- [ ] RAG 서버(`rag/`) 도 같은 Ollama 를 쓰면 `OLLAMA_HOST` 동기화
- [ ] 로컬에서 10건 진단 스크립트(조회/등록 섞어) 재실행해 응답 시간·정확도 확인
- [ ] 프론트 UI 에서 실행 모드 실제 질문 1건 이상 성공 확인

---

## 13. 체크리스트 — 새 기능 릴리스 전

- [ ] 새 도구 추가 시 `mutates: true` 면 CONFIRM_TOOLS 등록했는가
- [ ] `inputSchema` 의 enum·required 가 실제 백엔드 스펙과 일치하는가
- [ ] 확인 카드에 필요한 필드가 `buildPreview` 에 반영됐는가
- [ ] 10건 내외 샘플 질문으로 자동 테스트 돌렸는가 (조회/등록/거절 섞어)
- [ ] 날짜·색상·제목 오염 케이스 검증했는가
- [ ] Agent 재기동·프론트 팝업 재오픈 후 실제 UI 에서 끝까지 동작하는가
- [ ] `docs/17-mcp-server.md` 설계 문서에 변경 사항 반영했는가
