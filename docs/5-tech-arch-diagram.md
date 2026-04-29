# TEAM WORKS — 기술 아키텍처 다이어그램

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-08 | TeamInvitation → TeamJoinRequest 반영: 다이어그램 4, 5에서 invitations 관련 경로·쿼리 제거, join-requests 반영 |
| 1.2 | 2026-04-09 | 디렉토리 구조 개편 반영: 다이어그램 4, 5 경로를 frontend/ · backend/ 기준으로 갱신 |
| 1.3 | 2026-04-20 | 앱명 Team CalTalk → TEAM WORKS 반영. 신규 기능(포스트잇/공지사항/업무보고 권한/프로젝트 관리) 전체 반영: 다이어그램 4(프론트엔드 컴포넌트·스토어·훅), 다이어그램 5(백엔드 Routes·Queries) 전면 갱신. 다이어그램 6(권한 흐름) 신규 추가 |
| 1.4 | 2026-04-28 | 다이어그램 7(AI 비서 흐름 — RAG·Agent·MCP·Ollama, gemma4:26b) 신규 추가 |

---

## 다이어그램 1 — 전체 시스템 아키텍처

```mermaid
graph TB
    Browser["브라우저\nReact 19 + TypeScript\nZustand / TanStack Query"]

    subgraph Vercel["Vercel (Serverless)"]
        Next["Next.js API Routes\nJWT 검증 미들웨어\n역할·팀 권한 검증"]
    end

    DB["PostgreSQL\n(Vercel Postgres / Neon)"]

    subgraph Local["AI 보조 (로컬 호스트 / 옵션)"]
        RAG["RAG 서버 :8787\n(rag/)"]
        Agent["Agent 서버 :8788\n(agent/, MCP)"]
        Ollama[("Ollama :11434\ngemma4:26b\nnomic-embed-text")]
    end

    Browser -- "HTTPS REST API\n(Authorization: Bearer)" --> Next
    Next -- "SQL (pg Pool)" --> DB
    DB -- "결과 반환" --> Next
    Next -- "JSON 응답" --> Browser

    Browser -. "폴링 (refetchInterval 3초)\n채팅 메시지 갱신" .-> Next

    Browser -. "AI 비서 (안내/실행)" .-> RAG
    Browser -. "AI 비서 (실행)" .-> Agent
    RAG -. "/api/embed, /api/chat" .-> Ollama
    Agent -. "/api/chat (JSON schema)" .-> Ollama
    Agent -. "팀·일정 도구 호출" .-> Next
```

> AI 보조 영역은 별도 호스트의 옵션 컴포넌트. 자세한 흐름은 **다이어그램 7** 참고.

---

## 다이어그램 2 — 레이어 의존성

```mermaid
graph LR
    UI["UI Layer\nReact 컴포넌트"]
    SQ["Store / Query Layer\nZustand + TanStack Query"]
    API["API Layer\nNext.js API Routes"]
    DBQ["DB Query Layer\nlib/db/queries (pg)"]
    PG["PostgreSQL"]

    UI --> SQ
    SQ --> API
    API --> DBQ
    DBQ --> PG
```

---

## 다이어그램 3 — 인증 흐름

```mermaid
sequenceDiagram
    participant C as 브라우저
    participant A as API Route
    participant D as PostgreSQL

    C->>A: POST /api/auth/login (email, password)
    A->>D: 사용자 조회 + bcrypt 비교
    D-->>A: 사용자 정보
    A-->>C: Access Token (15분) + Refresh Token HttpOnly 쿠키 (7일)

    C->>A: GET /api/teams (Authorization: Bearer <AccessToken>)
    A-->>C: 200 OK (팀 목록)

    C->>A: POST /api/auth/refresh (Refresh Token 쿠키)
    A-->>C: 새 Access Token 발급
```

---

## 다이어그램 4 — 프론트엔드 아키텍처

```mermaid
graph TB
    subgraph Pages["화면 (frontend/app/)"]
        Auth["(auth)\nlogin / signup"]
        Main["(main)\nteams/[teamId] / explore / me/tasks"]
        TeamPage["teams/[teamId]/_components\nCalendarSection · PostitSection\nTeamPageHeader · MobileLayout"]
    end

    subgraph Components["컴포넌트 (frontend/components/)"]
        Schedule["schedule\nCalendarView · ScheduleForm\nPostItCard · PostItColorPalette\nScheduleTooltip"]
        Chat["chat\nChatPanel · ChatMessageList\nChatInput · NoticeBanner\nWorkPermissionModal · useChatPanel"]
        Project["project\nProjectGanttView · GanttChart\nGanttBar · SubBar\nProjectCreateModal\nProjectScheduleModal\nSubScheduleCreateModal"]
        Team["team\nTeamList · TeamExploreList\nJoinRequestActions"]
        Common["common\nButton · Modal · Input\nResizableSplit · ErrorBoundary"]
    end

    subgraph State["상태 관리"]
        Zustand["Zustand (frontend/store/)\nauthStore · teamStore\nnoticeStore · projectStore\nprojectScheduleStore · subScheduleStore"]
        TQ["TanStack Query (frontend/hooks/query/)\nuseSchedules · useMessages(폴링)\nuseTeams · useJoinRequests\nusePostits · useWorkPermissions\nuseMyTasks · useRemoveTeamMember\nuseUpdateProfile · useLeaderRole"]
    end

    subgraph Lib["라이브러리 (frontend/lib/)"]
        ApiClient["apiClient.ts\nfetch 래퍼 + Authorization 헤더"]
        Interceptor["authInterceptor.ts\n401 시 자동 토큰 갱신"]
        TokenMgr["tokenManager.ts\nAccess/Refresh 인메모리 관리"]
        DomainApi["api/\nnoticeApi · projectApi"]
    end

    Pages --> Components
    Components --> Zustand
    Components --> TQ
    TQ --> ApiClient
    ApiClient --> Interceptor
    Interceptor --> TokenMgr
    DomainApi --> ApiClient
```

---

## 다이어그램 5 — 백엔드 아키텍처

```mermaid
graph TB
    subgraph Routes["API Routes (backend/app/api/)"]
        AuthR["/auth\nsignup · login · refresh · me"]
        TeamR["/teams\nCRUD · join-requests · public\nmembers(강퇴)"]
        SchedR["/teams/teamId/schedules\nCRUD"]
        PostitR["/teams/teamId/postits\nCRUD"]
        ChatR["/teams/teamId/messages\nGET · POST"]
        NoticeR["/teams/teamId/notices\nGET · POST · DELETE"]
        WorkPermR["/teams/teamId/work-permissions\nGET · PATCH"]
        ProjectR["/teams/teamId/projects\nCRUD"]
        PSR["/projects/projectId/schedules\nCRUD"]
        SubR["/schedules/scheduleId/sub-schedules\nCRUD"]
        TasksR["/me/tasks\nGET"]
    end

    subgraph Middleware["미들웨어 (backend/lib/middleware/)"]
        WithAuth["withAuth\nJWT 검증 → 401"]
        WithRole["withTeamRole\n역할 검증 → 403"]
    end

    subgraph Queries["DB 쿼리 (backend/lib/db/queries/)"]
        UQ["userQueries"]
        TMQ["teamQueries · joinRequestQueries"]
        SQ["scheduleQueries"]
        CQ["chatQueries\n(KST 날짜 그룹핑)"]
        PsQ["postitQueries"]
        NQ["noticeQueries"]
        WPQ["permissionQueries"]
        PrQ["projectQueries\nprojectScheduleQueries\nsubScheduleQueries"]
    end

    Pool["pg Pool\n글로벌 싱글턴\n(backend/lib/db/pool.ts, max: 5)"]
    DB["PostgreSQL\n(database/schema.sql)"]

    Routes --> WithAuth --> WithRole
    WithRole --> Queries
    AuthR --> UQ
    TeamR --> TMQ
    SchedR --> SQ
    PostitR --> PsQ
    ChatR --> CQ
    NoticeR --> NQ
    WorkPermR --> WPQ
    ProjectR --> PrQ
    PSR --> PrQ
    SubR --> PrQ
    TasksR --> TMQ
    Queries --> Pool --> DB
```

---

## 다이어그램 6 — 권한 흐름 (Creator-based + LEADER 특권)

```mermaid
flowchart TD
    Req["API 요청 수신"]
    Auth["withAuth\nAccess Token 검증"]
    Role["withTeamRole\ntreamId 격리 + 팀원 여부"]
    Creator{"생성자 본인?\n(created_by = userId)"}
    Leader{"LEADER 역할?"}

    Read["조회 허용\n(모든 팀원)"]
    Create["생성 허용\n(모든 팀원)"]
    ModDel["수정/삭제 허용"]
    Deny403["403 Forbidden"]

    Req --> Auth
    Auth -- "401" --> Deny403
    Auth --> Role
    Role -- "비팀원 · teamId 불일치" --> Deny403
    Role -- "조회" --> Read
    Role -- "생성" --> Create
    Role -- "수정/삭제" --> Creator
    Creator -- "Yes" --> ModDel
    Creator -- "No" --> Leader
    Leader -- "Yes (공지 삭제 포함)" --> ModDel
    Leader -- "No" --> Deny403
```

---

## 다이어그램 7 — AI 비서 흐름 (안내·실행 모드)

브라우저 헤더의 AI 비서 아이콘을 누르면 480×720 팝업창(`/ai-assistant`)이 열린다. 팝업은 같은 origin 의 Next.js API 라우트(`app/api/ai-assistant/chat`)를 프록시로 호출하고, 라우트가 `mode` 값에 따라 RAG 서버(안내) 또는 Agent 서버(실행)로 분기한다. 두 서버 모두 같은 호스트의 Ollama(`gemma4:26b` + `nomic-embed-text`)를 공유한다.

```mermaid
flowchart LR
    User["사용자 브라우저"]
    Btn["헤더 AI 비서 버튼\n(amber-500)"]
    Pop["팝업 /ai-assistant\nReact UI"]
    Proxy["Next.js API 라우트\n/api/ai-assistant/chat\nmode 분기 + 에러 정규화"]
    RAG["rag/server.js  :8787\nRRF (cosine + BM25)\nParent-Document Retrieval\nMAX_CTX 22000"]
    Agent["agent/server.js  :8788\nReAct + JSON schema\nMAX_STEPS 4"]
    MCP["teamworks-mcp\n(stdio)\n팀·일정 도구"]
    Backend["Backend API\n/api/teams/...\n/api/me/tasks"]
    Ollama[("Ollama  :11434\ngemma4:26b  (num_ctx 32768)\nnomic-embed-text")]
    Chunks["rag/data/chunks.json\n(청크 + 임베딩 + BM25 통계 + parents)"]

    User --> Btn --> Pop --> Proxy
    Proxy -- "mode=guide" --> RAG
    Proxy -- "mode=agent (Bearer)" --> Agent
    RAG -- "/api/embed (search_query:)\n/api/chat" --> Ollama
    RAG -. "오프라인: rag/index.js" .-> Chunks
    RAG -- "load index" --> Chunks
    Agent -- "/api/chat (format:schema)" --> Ollama
    Agent -- "stdio JSON-RPC" --> MCP
    MCP -- "팀·일정 CRUD" --> Backend
```

흐름 핵심:
- **안내 모드(`mode=guide`)** — `ollama/*.md` 공식 문서를 RAG 로 검색해 참고 자료를 동봉한 답변. 인증 불필요(프록시가 RAG 서버로 그대로 전달).
- **실행 모드(`mode=agent`)** — 사용자 자연어를 JSON 도구 호출로 변환해 백엔드 API 를 실제로 호출. Bearer 토큰 필수(프록시가 헤더 검증).
- **호출 옵션** — `rag/ollamaClient.js` · `agent/ollamaClient.js` 모두 `DEFAULT_CHAT_OPTIONS = { num_ctx: 32768, num_predict: 1024 }` 를 호출 시점에 병합. Modelfile(128K 기본) 은 변경하지 않아 다른 서비스가 같은 모델을 풀 컨텍스트로 호출하면 그쪽은 영향 없음.
- **인덱스 산출물** — `rag/data/chunks.json` 은 `rag/index.js` 가 1회 생성. `ollama/*.md` 가 변경되면 재인덱싱 후 RAG 서버 재기동 필요(`docs/13-RAG-pipeline-guide.md §6.3·§6.4`).

---

## Vercel 제약 요약

- WebSocket / SSE 미지원 — 채팅은 TanStack Query `refetchInterval: 3000` 폴링으로 대체
- Serverless Function 실행 시간 기본 10초 제한 — 복잡한 집계 쿼리 금지, 인덱스 필수
- 로컬 파일 쓰기 불가, DB 연결은 pg Pool 글로벌 싱글턴(max: 5)으로 과부하 방지
