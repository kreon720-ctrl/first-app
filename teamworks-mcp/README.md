# teamworks-mcp

TEAM WORKS 전용 **MCP (Model Context Protocol) 서버**. 백엔드 REST API를 감싸는 도구(tool)들을 stdio 전송으로 노출한다. 실제 실행은 상위 프로세스(Agent Host)가 `node index.js` 로 자식 프로세스 띄워 붙는 식으로 이루어진다.

## 요구 사항

- Node.js 20+
- 백엔드(`backend/`)가 실행 중이어야 한다 (기본 `http://localhost:3000`)
- 호출 시점의 사용자 JWT가 `TEAMWORKS_JWT` 환경변수로 주입되어야 한다

## 설치

```bash
cd teamworks-mcp
npm install
```

## 환경 변수

| 변수 | 기본값 |
|------|--------|
| `BACKEND_URL` | `http://localhost:3000` |
| `TEAMWORKS_JWT` | (필수) — 상위 프로세스가 사용자별로 주입 |

## 제공 도구

| 이름 | 타입 | 설명 |
|------|------|------|
| `list_my_teams` | 조회 | 내가 속한 팀 목록 |
| `list_team_schedules` | 조회 | 특정 팀의 일정 (view: month/week/day) |
| `create_schedule` | 수정 | 새 일정 등록 (title/startAt/endAt) |

tool 추가 시 `tools/*.js` 에 `{ name, description, inputSchema, mutates, handler }` 형태로 export 하고 `index.js` 의 `TOOLS` 배열에 넣으면 된다.

## 보안 모델

- **raw SQL 을 실행하지 않는다.** 모든 경로가 백엔드 API를 거치므로 `withAuth` / `withTeamRole` / zod 검증이 그대로 동작한다.
- 파괴적/수정 도구는 `mutates: true` 로 표시된다. Agent Host가 이 플래그를 보고 사용자 확인 카드를 띄울지 결정한다.
- JWT는 env 로만 전달되며 디스크에 저장되지 않는다.

## 디버깅

stdout 은 JSON-RPC 프레이밍 전용이므로 로그는 `stderr` 로 찍힌다. Agent Host 를 실행한 쉘에서 `[teamworks-mcp] ready` 가 보이면 정상.

직접 테스트하고 싶으면 MCP Inspector 를 쓰는 것이 가장 편하다:

```bash
npx @modelcontextprotocol/inspector node index.js
```

설계 문서: `docs/17-mcp-server.md`.
