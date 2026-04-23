# Agent Host (`agent/`)

**AI 버틀러 찰떡이 — 실행 모드** 의 두뇌. `gemma2:9b` (Ollama) 위에서 **ReAct 루프** 를 돌려 사용자 자연어 명령을 `teamworks-mcp` 의 도구 호출로 번역한다.

```
프론트 /api/ai-assistant/chat
        │ Bearer <JWT>
        ▼
Agent Host (Express 8788)
        │  ReAct: THOUGHT / ACTION / ARGS / FINAL_ANSWER
        │
        ├── Ollama /api/chat  (gemma2:9b)
        └── MCP Client (stdio) ──▶ teamworks-mcp ──▶ 백엔드 API
```

## 요구 사항

- Node.js 20+
- Ollama 런타임 (`ollama serve`), `gemma2:9b` 모델 설치
- 백엔드(`backend/`)와 `teamworks-mcp/` 동일 레포에 있어야 한다 (spawn 경로 고정)

## 설치

```bash
cd agent
npm install

# 형제 디렉토리 teamworks-mcp 도 따로 설치가 필요하다
cd ../teamworks-mcp
npm install
```

## 실행

```bash
cd agent
npm run server
```

기본 포트 8788. 헬스체크: `GET http://127.0.0.1:8788/health`.

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama 런타임 주소 |
| `CHAT_MODEL`  | `gemma2:9b` | ReAct 루프에 쓸 모델 |
| `BACKEND_URL` | `http://localhost:3000` | TEAM WORKS 백엔드 (MCP 서버가 사용) |
| `AGENT_PORT`  | `8788` | HTTP 포트 |
| `AGENT_MAX_STEPS` | `4` | ReAct 최대 스텝 수 |
| `AGENT_CONFIRM_TOOLS` | `create_schedule,update_schedule,delete_schedule` | 자동 실행하지 않고 UI 확인을 요구할 tool 목록 |

## API

### `POST /chat`

요청:
```json
{
  "question": "내일 오후 3시 주간회의 1시간 등록해줘",
  "userHint": "user_id=abc-..."
}
```
헤더: `Authorization: Bearer <JWT>`.

응답 — **즉답** 의 경우:
```json
{ "kind": "answer", "answer": "개발팀 오늘 일정은 2건이에요. ..." }
```

응답 — **사용자 확인 필요** 의 경우:
```json
{
  "kind": "confirm",
  "answer": "아래 내용으로 실행해도 될까요?\n제목: 주간회의 · ...",
  "preview": "제목: 주간회의 · 시작: 2026-04-24T15:00:00+09:00 · ...",
  "pendingAction": {
    "tool": "create_schedule",
    "args": { "teamId": "...", "title": "주간회의", "startAt": "...", "endAt": "..." }
  }
}
```

### `POST /execute`

사용자가 `pendingAction` 을 승인했을 때 프론트가 호출.

```json
{ "tool": "create_schedule", "args": { ... } }
```

응답: `{ "ok": true, "tool": "...", "args": {...}, "result": {...} }`

### `GET /health`

`{ "ok": true, "model": "gemma2:9b" }`.

## 동작 원리

1. `/chat` 수신 → MCP 클라이언트가 `teamworks-mcp` 를 자식 프로세스로 스폰. 사용자 JWT 는 `TEAMWORKS_JWT` env 로 주입.
2. 도구 카탈로그를 받아 시스템 프롬프트 구성 (`prompt.js`).
3. ReAct 루프 (`reactLoop.js`):
   - Gemma 가 `THOUGHT / ACTION / ARGS` 또는 `THOUGHT / FINAL_ANSWER` 를 출력
   - `parser.js` 가 블록을 추출
   - 조회 도구면 즉시 실행하고 Observation 을 모델에 다시 주입
   - 수정 도구면 루프를 중단하고 `pendingAction` 을 반환 — 프론트에서 확인 카드로 노출
   - `FINAL_ANSWER` 가 나오면 그대로 응답
4. 종료 시 MCP 클라이언트·자식 프로세스 정리.

## 제한

- `gemma2:9b` 는 native tool calling 미지원이라 출력 형식이 어긋날 때가 있다. 파서는 재시도 1회를 허용하며 그래도 실패하면 에러 반환.
- 한 요청당 MCP 프로세스 1개를 스폰하므로 대량 병렬 트래픽에는 부적합 (로컬 1인 사용 전제).
- 현재 tool 3개 (`list_my_teams`, `list_team_schedules`, `create_schedule`). 확장은 `teamworks-mcp/tools/` 에 파일 추가 → `teamworks-mcp/index.js` 의 `TOOLS` 에 등록.

설계 문서: `docs/17-mcp-server.md`.
