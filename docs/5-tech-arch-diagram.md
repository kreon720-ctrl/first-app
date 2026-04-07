# Team CalTalk — 기술 아키텍처 다이어그램

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |

---

## 다이어그램 1 — 전체 시스템 아키텍처

```mermaid
graph TB
    Browser["브라우저\nReact 19 + TypeScript\nZustand / TanStack Query"]

    subgraph Vercel["Vercel (Serverless)"]
        Next["Next.js API Routes\nJWT 검증 미들웨어\n역할·팀 권한 검증"]
    end

    DB["PostgreSQL\n(Vercel Postgres / Neon)"]

    Browser -- "HTTPS REST API\n(Authorization: Bearer)" --> Next
    Next -- "SQL (pg Pool)" --> DB
    DB -- "결과 반환" --> Next
    Next -- "JSON 응답" --> Browser

    Browser -. "폴링 (refetchInterval 3초)\n채팅 메시지 갱신" .-> Next
```

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
    subgraph Pages["화면 (App Router)"]
        Auth["(auth)\nlogin / signup"]
        Main["(main)\nteams / invitations"]
    end

    subgraph Components["컴포넌트"]
        Schedule["schedule\nCalendarView\nScheduleForm"]
        Chat["chat\nChatPanel\nChatInput"]
        Team["team\nTeamList\nTeamInviteForm"]
        Common["common\nButton / Modal"]
    end

    subgraph State["상태 관리"]
        Zustand["Zustand\nauthStore\nteamStore"]
        TQ["TanStack Query\nuseSchedules\nuseMessages\nuseTeams"]
    end

    API["apiClient\nfetch 래퍼\nAuthorization 헤더 자동 주입"]

    Pages --> Components
    Components --> Zustand
    Components --> TQ
    TQ -- "REST API 호출" --> API
```

---

## 다이어그램 5 — 백엔드 아키텍처

```mermaid
graph TB
    subgraph Routes["API Routes (app/api/)"]
        AuthR["/auth\nsignup / login / refresh"]
        TeamR["/teams\nCRUD + invitations"]
        SchedR["/teams/teamId/schedules\nCRUD"]
        ChatR["/teams/teamId/messages\nGET / POST"]
    end

    subgraph Middleware["미들웨어 (lib/middleware/)"]
        WithAuth["withAuth\nJWT 검증 → 401"]
        WithRole["withTeamRole\n역할 검증 → 403"]
    end

    subgraph Queries["DB 쿼리 (lib/db/queries/)"]
        UQ["userQueries"]
        TMQ["teamQueries\ninvitationQueries"]
        SQ["scheduleQueries"]
        CQ["chatQueries\n(KST 날짜 그룹핑)"]
    end

    Pool["pg Pool\n글로벌 싱글턴\n(max: 5)"]
    DB["PostgreSQL"]

    Routes --> WithAuth --> WithRole
    WithRole --> Queries
    AuthR --> UQ
    TeamR --> TMQ
    SchedR --> SQ
    ChatR --> CQ
    Queries --> Pool --> DB
```

---

## Vercel 제약 요약

- WebSocket / SSE 미지원 — 채팅은 TanStack Query `refetchInterval: 3000` 폴링으로 대체
- Serverless Function 실행 시간 기본 10초 제한 — 복잡한 집계 쿼리 금지, 인덱스 필수
- 로컬 파일 쓰기 불가, DB 연결은 pg Pool 글로벌 싱글턴(max: 5)으로 과부하 방지
