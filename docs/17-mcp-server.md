# AI 버틀러 DB 연동 방안 — MCP 서버 통합

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-23 | 최초 작성 — 로컬 PostgreSQL + gemma2:9b 환경에서 AI 버틀러의 DB 조회·수정 기능 도입 방안 정리 |

---

## 1. 목표와 범위

### 목표
현재 **문서 검색만 가능한** AI 버틀러 찰떡이를 **사용자 데이터(일정·포스트잇·팀 등)를 조회·수정**할 수 있도록 확장한다.

예시 명령
- "내가 속한 팀 목록 보여줘"
- "오늘 팀 A 일정 알려줘"
- "내일 오후 3시에 '주간 회의' 일정 추가해줘"
- "다음 주 월요일 일정에 노란 포스트잇 붙여줘"
- "내 승인 대기 업무보고 몇 건이야?"

### 범위
- **로컬 1대 PC**에서 동작 (인터넷 불필요).
- 기존 `gemma2:9b` + Ollama 런타임 재사용 (모델 교체 없음).
- 기존 RAG 파이프라인(`rag/`)과 **별개로 추가**되는 "행동 에이전트" 계층.
- DB는 백엔드가 이미 사용 중인 로컬 PostgreSQL.

### 성공 기준
- 자연어 명령이 DB 쿼리로 정확히 변환된다.
- **인증된 사용자의 권한 범위 안에서만** 조회·수정이 이뤄진다.
- 파괴적 동작(삭제, 대량 수정)에는 **확인 프롬프트**가 뜬다.
- 기존 RAG 답변(사용법 안내)도 그대로 동작한다.

---

## 2. 현재 아키텍처와 한계

```
┌──────────────┐     POST /chat     ┌──────────────┐    /api/chat    ┌──────────┐
│ 프론트       │ ──────────────────▶│ RAG 서버     │───────────────▶ │ Ollama   │
│ (ai-        │                     │ (Node 8787)  │                 │ gemma2:9b│
│  assistant)  │◀────────────────── │ 검색 + 프롬프트│◀─────────────── │          │
└──────────────┘                    └──────────────┘                 └──────────┘
                                             │
                                             ▼
                                   ollama/**.md 청크 JSON
                                   (읽기 전용 문서)
```

### 한계
- RAG 서버는 `ollama/*.md` 문서만 참조하고 **PostgreSQL을 전혀 모른다**.
- `gemma2:9b`는 **네이티브 tool/function calling 미지원**. 표준 MCP 클라이언트가 요구하는 JSON function schema를 안정적으로 따라주지 못한다.
- 백엔드 API(`backend/app/api/**`)는 JWT 기반 인증을 전제로 하므로, AI 버틀러도 **현재 로그인 사용자 컨텍스트**를 받아야 한다.

---

## 3. MCP (Model Context Protocol) 개요

MCP는 Anthropic이 2024년 공개한 **LLM–외부 도구 간 표준 프로토콜**. 개념적으로는 다음 3개 역할로 구성된다.

| 역할 | 설명 | 이 프로젝트에서 담당할 주체 |
|------|------|-----------------------------|
| **MCP Host** | LLM을 감싸고 사용자 대화를 관리 | RAG 서버(`rag/`) 확장 또는 신규 `agent/` 서버 |
| **MCP Client** | Host가 Server에 요청을 보내는 전송 계층 | Host에 내장된 `@modelcontextprotocol/sdk` 클라이언트 |
| **MCP Server** | 실제 도구(파일·DB·API)를 노출 | `postgres-mcp` (기성품) 또는 자체 제작 `teamworks-mcp` |

프로토콜 전송은 주로 **stdio** 또는 **SSE**. 로컬에서는 stdio가 가장 간단하다.

### 기성 PostgreSQL MCP 서버
- `@modelcontextprotocol/server-postgres` (npm) — 읽기 전용 SQL 실행.
- `postgresql-mcp-server` (PyPI) — 스키마·인덱스·RLS 관리까지 포함.

두 서버 모두 **SQL 레벨**로 동작한다. TEAM WORKS의 비즈니스 규칙(예: "팀원만 일정 조회 가능", "본인이 만든 것만 수정")을 그대로 재현하려면 권한·밸리데이션을 한 번 더 구현해야 한다.

---

## 4. 아키텍처 옵션 비교

### 옵션 A. 기성 postgres-mcp + gemma2:9b 직결

```
gemma2:9b ─(함수 호출 흉내)─▶ MCP Client ─stdio─▶ @modelcontextprotocol/server-postgres ─▶ PostgreSQL
```

- ✅ 구현 빠름.
- ❌ **가장 큰 문제**: `gemma2:9b`는 tool calling을 네이티브 지원하지 않아 MCP Client와 직접 물릴 수 없다. 프롬프트로 구조화된 JSON을 뱉게 유도해도 실패율이 높다.
- ❌ SQL 레벨이라 비즈니스 규칙(권한·밸리데이션) 재구현 필요.
- ❌ `DELETE`/`UPDATE` 바로 노출하면 위험.

### 옵션 B. 툴콜링 가능한 로컬 모델로 교체 + postgres-mcp

- 후보: `llama3.1:8b-instruct`, `qwen2.5:7b-instruct`, `mistral-nemo:12b`.
- ✅ 표준 MCP 클라이언트를 바로 사용 가능.
- ❌ 사용자가 "gemma2:9b 그대로 쓰고 싶다"고 명시. 모델 교체는 범위 밖.
- (참고용으로만 기록)

### 옵션 C. 자체 제작 MCP 서버 + ReAct 프롬프트 (권장)

```
┌─────────────┐        ┌──────────────┐         ┌───────────────────┐      ┌────────────┐
│ 프론트      │        │ Agent Host   │  stdio  │ teamworks-mcp     │      │ 백엔드 API │
│ (ai-        │ ─────▶ │ (gemma2:9b + │────────▶│ 서버 (Node/Python)│─────▶│ /api/...   │
│  assistant) │        │  ReAct 루프) │         │ - tool: list_teams│      │ (JWT 인증) │
└─────────────┘        └──────────────┘         │ - tool: create_   │      └────────────┘
                              │                 │         schedule  │             │
                              ▼                 │ - tool: list_...  │             ▼
                       RAG 문서 검색             └───────────────────┘        PostgreSQL
                       (기존 rag/ 재사용)
```

- ✅ `gemma2:9b`를 **ReAct 스타일 프롬프트**로 써서 tool calling 흉내. 실패해도 파서가 재시도·fallback.
- ✅ 각 tool이 **백엔드 API를 호출**하므로 JWT 인증·권한(`withTeamRole`)·밸리데이션을 100% 재사용.
- ✅ 조회와 수정을 별도 tool로 쪼개 파괴적 동작만 별도 승인 플로우를 붙일 수 있다.
- ✅ 나중에 모델을 툴콜링 지원 모델로 교체하면 **ReAct 파서만 빼고 표준 MCP Client로 교체** 가능.
- ❌ 구현량이 옵션 A보다 많음.

### 옵션 D. 자체 제작 MCP 서버 + 백엔드 직결 (단순화 버전)

옵션 C와 동일하나 Host가 MCP 프로토콜을 쓰지 않고 **HTTP로 직접** tool 서버를 호출. MCP 표준 호환을 포기하는 대신 구현이 가장 단순하다.

- ✅ 가장 빠른 프로토타이핑.
- ❌ Claude Desktop 같은 MCP 호스트와 호환되지 않음 (이 프로젝트 맥락에선 큰 손해 없음).

---

## 5. 권장 아키텍처 — 옵션 C (자체 MCP + ReAct)

### 5.1 전체 흐름

```
사용자: "내일 3시에 '주간회의' 일정 추가해줘"
  │
  ▼
① Agent Host가 질문 수신
  │
  ▼
② [ReAct 1회차] gemma2:9b 에게 System+Tools+Question 전달
   → 모델 출력: "Thought: 일정 등록이 필요함. Action: create_schedule,
                 Args: {title:'주간회의', startAt:'2026-04-24T15:00', ...}"
  │
  ▼
③ Host가 Action을 파싱 → MCP Client가 teamworks-mcp 서버에 tool 호출
  │
  ▼
④ teamworks-mcp 서버:
   - 사용자 JWT 토큰 포함해 백엔드 POST /api/teams/{id}/schedules 호출
   - 백엔드가 withAuth, withTeamRole, zod 검증 수행 후 INSERT
   - 응답을 MCP 표준 포맷으로 래핑해 반환
  │
  ▼
⑤ [ReAct 2회차] Host가 Observation(도구 결과)을 모델에게 다시 전달
   → 모델 출력: "Final Answer: 내일 3시 '주간회의' 일정을 등록했어요."
  │
  ▼
⑥ 프론트에 최종 답변 + (옵션) 수행된 action 요약 반환
```

### 5.2 컴포넌트 선택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| LLM | `gemma2:9b` (Ollama) | 재사용. |
| Agent Host | **`rag/` 디렉토리 확장** 또는 `agent/` 신규 | Node.js 재활용. Ollama JS SDK, `@modelcontextprotocol/sdk` 사용. |
| MCP 전송 | **stdio** (로컬 전용) | 포트 충돌 없음, 디버깅 단순. |
| MCP 서버 | **자체 제작 `teamworks-mcp/`** (Node.js) | 백엔드 API를 얇게 감싼 tool 3~10개만 정의. |
| 인증 | 사용자 JWT를 **프론트 → Host → MCP 서버 → 백엔드**로 투명 전달 | 기존 미들웨어 재사용. |
| 밸리데이션 | 백엔드 API가 담당 | MCP 서버는 호출만 하고 에러를 그대로 전달. |

### 5.3 Tool 카탈로그 (초기)

조회 계열 (side-effect 없음, 자동 실행)
- `list_my_teams()` → GET `/api/me/teams` 계열
- `list_team_schedules(teamId, fromDate, toDate)` → GET `/api/teams/{id}/schedules`
- `list_team_postits(teamId, month)` → GET `/api/teams/{id}/postits`
- `get_my_pending_tasks()` → GET `/api/me/tasks`
- `list_team_projects(teamId)` → GET `/api/teams/{id}/projects`
- `get_notices(teamId)` → GET `/api/teams/{id}/notices`

수정 계열 (side-effect 있음, **확인 프롬프트 후** 실행)
- `create_schedule(teamId, title, startAt, endAt, color, description?)`
- `update_schedule(teamId, scheduleId, patch)`
- `delete_schedule(teamId, scheduleId)` ← 위험도 높음, 반드시 확인
- `create_postit(teamId, date, color, content)`
- `send_message(teamId, content, mode)` ← 기본 비활성. 필요 시 명시적 opt-in.

각 tool은 JSON Schema로 입·출력 정의. 예시:

```json
{
  "name": "create_schedule",
  "description": "특정 팀에 새 일정을 만든다.",
  "inputSchema": {
    "type": "object",
    "required": ["teamId", "title", "startAt", "endAt"],
    "properties": {
      "teamId":      { "type": "string", "format": "uuid" },
      "title":       { "type": "string", "maxLength": 200 },
      "startAt":     { "type": "string", "format": "date-time" },
      "endAt":       { "type": "string", "format": "date-time" },
      "color":       { "enum": ["indigo","blue","emerald","amber","rose"], "default": "indigo" },
      "description": { "type": "string" }
    }
  }
}
```

---

## 6. gemma2:9b와 ReAct 프롬프트

`gemma2:9b`에 MCP 호환 JSON tool call을 기대할 수 없으므로, **문자열 템플릿**으로 제약을 건다.

### 시스템 프롬프트 (요약)

```
당신은 TEAM WORKS AI 버틀러 "찰떡이"입니다. 사용자의 자연어 명령을 해석해
아래 도구 중 하나를 호출하거나, 도구가 필요 없으면 바로 답합니다.

# 사용 가능한 도구
- list_my_teams(): 내 팀 목록
- list_team_schedules(teamId, fromDate, toDate): 특정 팀 기간 일정
- create_schedule(teamId, title, startAt, endAt, color, description): 일정 등록
- ... (생략)

# 출력 형식 (반드시 이 형식만 사용)
THOUGHT: <한 줄 추론>
ACTION: <도구이름>
ARGS: <JSON 한 줄>
-- 또는 --
FINAL_ANSWER: <사용자에게 한국어로 응답>

# 규칙
1. 정보가 부족하면 도구 호출 대신 FINAL_ANSWER로 되묻는다.
2. 파괴적 작업(delete_*)은 사용자가 명확히 승인한 경우에만.
3. ARGS는 반드시 유효한 JSON 한 줄.
```

### 파서
Host에서 정규식으로 블록을 추출하고, ARGS가 깨졌으면 "형식 오류, 다시 시도"를 모델에 다시 던진다(최대 2회 재시도).

### 한국어 날짜 해석
"내일 오후 3시", "다음 주 월요일" 같은 표현은 모델이 그대로 `start_at` 문자열에 넣으면 실패한다. Host에서 **Chrono-ko 같은 라이브러리로 전처리**하거나, 프롬프트에 "오늘은 2026-04-23 KST"를 주입해 모델이 구체적 ISO 문자열로 추론하게 한다.

---

## 7. 보안·권한·감사

### 인증 체인
```
프론트                        Agent Host                  MCP 서버                  백엔드
 JWT 토큰 ─── Authorization ──▶  (그대로 전달) ──env var──▶ (그대로 전달) ──header──▶ withAuth
                                                                                   withTeamRole
```

- Host는 JWT를 해독하지 않는다(백엔드가 검증). 단, `sub`(user_id)만 ReAct 프롬프트의 컨텍스트("사용자 ID: ...")로 노출해 모델이 teamId 추론 시 참고할 수 있게 한다.

### Tool 실행 게이트
| 종류 | 자동 실행 | 사용자 확인 필요 |
|------|-----------|-----------------|
| 조회 (`list_*`, `get_*`) | ✅ | – |
| 생성 (`create_*`) | – | ✅ 프론트에서 "아래 내용으로 등록할까요?" 카드 노출 후 버튼 클릭 |
| 수정 (`update_*`) | – | ✅ |
| 삭제 (`delete_*`) | – | ✅✅ 이중 확인 |

프론트에서 확인 카드를 보여주려면 Host 응답에 다음 필드를 추가:
```json
{
  "answer": "일정을 등록할까요?",
  "pendingAction": {
    "tool": "create_schedule",
    "args": { ... },
    "confirmPrompt": "내일 15:00~16:00 '주간회의' 일정을 등록합니다."
  }
}
```
사용자가 승인 버튼을 누르면 프론트가 `POST /api/ai-assistant/execute`로 해당 action을 확정 실행.

### 감사 로그
모든 수정 계열 tool 호출은 **백엔드 DB에 감사 테이블**로 남긴다.
```sql
CREATE TABLE ai_audit_log (
  id UUID PK,
  user_id UUID FK,
  tool VARCHAR,
  args JSONB,
  result_status VARCHAR,   -- OK | ERROR
  error_message TEXT,
  created_at TIMESTAMP
);
```

### 프롬프트 인젝션 대응
사용자 입력을 시스템 프롬프트나 tool 결과 블록에 그대로 이어 붙이지 않는다. 명확한 구분자(`---BEGIN_USER---`, `---END_USER---`)를 쓰고, 모델이 그 블록 내부의 "SYSTEM:" 같은 주석을 무시하도록 프롬프트에 규칙을 명시.

### SQL 레벨 차단
`teamworks-mcp`는 **raw SQL을 절대 실행하지 않는다**. 모든 경로가 백엔드 API를 거치므로 SQL 인젝션 경로가 원천 차단된다. (SQL 실행이 필요해지면 그때 `postgres-mcp`를 "읽기 전용 DB 사용자"로 붙이는 별도 안건으로 다룬다.)

---

## 8. 구현 단계

1. **브랜치 분기**: `feature/ai-agent-mcp` 생성.
2. **디렉토리 스캐폴딩**
   ```
   team-works/
   ├── agent/                 # Agent Host (신규)
   │   ├── host.js            # ReAct 루프
   │   ├── toolRouter.js      # MCP Client 래퍼
   │   ├── parser.js          # ReAct 출력 파싱
   │   ├── dateNormalizer.js  # "내일 3시" → ISO
   │   ├── server.js          # POST /agent/chat
   │   └── package.json
   ├── teamworks-mcp/         # MCP 서버 (신규)
   │   ├── index.js           # stdio 엔트리
   │   ├── tools/
   │   │   ├── listMyTeams.js
   │   │   ├── createSchedule.js
   │   │   └── ...
   │   └── package.json
   └── docs/17-mcp-server.md  # 이 문서
   ```
3. **MCP 서버 구현**: `@modelcontextprotocol/sdk` 사용. tool 3개부터(`list_my_teams`, `list_team_schedules`, `create_schedule`).
4. **Agent Host 구현**: Ollama `/api/chat` 호출 → ReAct 루프 → tool 호출 → 최종 답변.
5. **프론트 통합**:
   - 기존 `/api/ai-assistant/chat` 라우트에 `mode=agent` 파라미터 추가.
   - `mode=agent`면 RAG 서버 대신 Agent Host(기본 8788)로 라우팅.
   - 프론트 UI에 "조회 전용 / 실행 모드" 토글 추가.
6. **확인 플로우**: 프론트에 pendingAction 카드 컴포넌트 추가, `/api/ai-assistant/execute` 구현.
7. **감사 로그**: 백엔드에 `ai_audit_log` 테이블·쿼리 추가.
8. **회귀 테스트**: 섹션 10의 시나리오를 모두 통과시킨다.
9. **문서 업데이트**: `ollama/README.md`, `rag/README.md`에 에이전트 모드 추가, `docs/4-project-structure.md`에 디렉토리 반영.

각 단계는 반나절~하루 단위. 전체 초기 구현 약 5~7 영업일 예상.

---

## 9. 디렉토리·포트 요약

| 프로세스 | 포트 | 역할 |
|----------|------|------|
| 프론트 (`frontend/`) | 3001 | Next.js UI |
| 백엔드 (`backend/`) | 3000 | Next.js API |
| Ollama 런타임 | 11434 | `gemma2:9b`, `nomic-embed-text` 호스팅 |
| RAG 서버 (`rag/`) | 8787 | 문서 Q&A (기존) |
| **Agent Host (`agent/`)** | **8788** | **MCP ReAct 루프 (신규)** |
| **MCP 서버 (`teamworks-mcp/`)** | stdio | **Host가 자식 프로세스로 실행 (신규)** |

---

## 10. 검증 시나리오

| 카테고리 | 질문 | 기대 결과 |
|----------|------|-----------|
| 조회 | "내 팀 목록 보여줘" | `list_my_teams` 호출 → 표 형식 답변 |
| 조회 | "개발팀 오늘 일정 뭐야?" | `list_team_schedules(개발팀id, 오늘, 오늘)` |
| 조회 (모호) | "일정 보여줘" | 도구 호출 없이 "어떤 팀인가요?"로 되묻기 |
| 생성 | "내일 3시 주간회의 1시간" | `create_schedule` args 채움 → 확인 카드 노출 |
| 생성 (거부) | (확인 카드에서 취소) | 백엔드 호출 없이 종료, 감사 로그 남지 않음 |
| 삭제 | "어제 회의 일정 삭제" | 이중 확인 후 `delete_schedule` |
| 권한 위반 | (다른 팀 일정 조회 요청) | 백엔드가 403 → Host가 "해당 팀에 접근 권한이 없어요" 안내 |
| 범위 외 | "오늘 저녁 메뉴 추천해줘" | 도구 호출 없이 거부 응답 |
| RAG 유지 | "업무보고 어떻게 보내?" | 기존 문서 답변이 정상 (mode 토글 전환 시) |

---

## 11. 제약과 한계

- **gemma2:9b의 툴콜 정확도**: ReAct 파싱 실패·환각 tool 이름 발생 가능. 운영 중 실패율이 10% 이상이면 툴콜 특화 모델 교체(옵션 B)를 재검토한다.
- **ReAct 멀티 스텝**: 여러 tool을 연쇄 호출해야 하는 복잡한 명령(예: "팀 A와 팀 B의 충돌 일정 찾아줘")은 2~3 스텝을 넘어가면 실패율이 급격히 상승한다. 초기 릴리스는 **1 스텝 tool 호출**만 허용한다.
- **한국어 날짜·시간 파싱**: "이번 주 화요일 오후", "모레 저녁" 등의 상대 표현은 `dateNormalizer`로 전처리하되 완전하지 않다. 명백히 모호하면 사용자에게 되묻도록 프롬프트 강화.
- **대규모 조회**: `list_team_schedules`가 수백 건 반환하면 프롬프트 컨텍스트 초과. Host에서 최대 20건으로 잘라 주고 "더 보려면 달력에서 직접 확인해주세요"로 유도한다.
- **동시성**: MCP 서버는 stdio 단일 프로세스. 사용자가 많아지면 Host가 multiplex 필요. 로컬 1인 사용 전제라 당장은 무시 가능.
- **모델 교체 경로**: 향후 `llama3.1:8b` 등 툴콜 지원 모델로 교체할 때는 `agent/parser.js`만 버리고 `@modelcontextprotocol/sdk` Client의 표준 function calling으로 갈아탈 수 있도록 설계.

---

## 12. 이후 단계

- 이 문서는 설계안이며, 실제 코드(`agent/`, `teamworks-mcp/`)는 별도 작업에서 진행한다.
- 구현 완료 후 `docs/15-ai-review.md`에 "에이전트 도입 이후 평가" 섹션을 추가해 before/after 사용성을 기록한다.
- RAG(`rag/`)와 Agent(`agent/`)는 당분간 공존하고, 사용자가 UI에서 "안내 모드 / 실행 모드"를 선택한다. 안정화되면 단일 엔트리로 통합 검토.

---

## 13. 관련 문서

| 문서 | 경로 |
|------|------|
| RAG 파이프라인 설계 | `docs/16-rag-plan.md` |
| RAG 구현 가이드 | `rag/README.md` |
| AI 리뷰 (모델 품질 근거) | `docs/15-ai-review.md` |
| ERD (DB 스키마) | `docs/6-erd.md` |
| API 스펙 | `docs/7-api-spec.md` |
| Gemma 페르소나 | `ollama/system-prompt.md`, `ollama/Modelfile` |
| 백엔드 미들웨어 | `backend/lib/middleware/withAuth.ts`, `withTeamRole.ts` |
