# Team CalTalk — 프로젝트 구조 설계 원칙

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-08 | TeamInvitation → TeamJoinRequest 반영: invitations 관련 디렉토리·엔드포인트 제거, join-requests·teams/public·me/tasks 라우트 추가, ERD/API 명세 경로 수정 |
| 1.2 | 2026-04-08 | 컴포넌트명 예시의 TeamInviteModal → JoinRequestActions 로 수정 |
| 1.3 | 2026-04-09 | 디렉토리 구조 개편: backend/ · frontend/ · database/ 3-tier 분리 |
| 1.4 | 2026-04-09 | Vercel 단독 배포 적합성 검토 반영: backend/·frontend/ 각각에 next.config.ts·package.json·tsconfig.json 위치 명시, swagger/ 를 backend/ 내로 이동·Swagger UI route 추가, 환경변수를 서비스별 루트에 분리 명시, NEXT_PUBLIC_API_URL 구조 추가, frontend/lib/apiClient.ts 에 API URL 환경변수 참조 명시 |
| 1.5 | 2026-04-09 | DB/ 디렉토리명을 database/ 로 변경 |
| 1.6 | 2026-04-09 | FE-01 완료: frontend/ 초기 세팅 반영 - Providers.tsx 추가, test/ 디렉토리 및 Vitest 설정, globals.css 커스텀 컬러 시스템, Tailwind CSS v4 CSS 기반 적용 |

---

## 1. 최상위 공통 원칙

| # | 원칙 | 설명 |
|---|------|------|
| P-01 | 단일 책임 | 파일 하나는 하나의 역할만 담당. 컴포넌트·함수·쿼리 파일 혼합 금지 |
| P-02 | 레이어 격리 | UI는 Store/Query만 호출. API Route는 DB 쿼리만 실행. 레이어 건너뛰기 금지 |
| P-03 | 명시적 의존성 | import 경로는 항상 명시적으로 작성. barrel index 남용 금지 |
| P-04 | 과도한 추상화 금지 | 1인 5일 MVP 기준. 실제 중복이 3회 이상 발생할 때만 추상화 |
| P-05 | 서버 사이드 권한 검증 필수 | LEADER/MEMBER 역할 및 teamId 격리는 반드시 API Route에서 검증. 클라이언트 검증만으로 대체 불가 |
| P-06 | Vercel 제약 준수 | WebSocket/SSE/로컬 파일 쓰기 사용 시 경고 주석 필수. 폴링 방식 채택 |

---

## 2. 의존성 / 레이어 원칙

### 레이어 구조

```
[UI Layer]
  React 컴포넌트 (frontend/app/, frontend/components/)
    ↓ 데이터 읽기/쓰기
[Store / Query Layer]
  Zustand 스토어 (frontend/store/)          ← 클라이언트 전역 상태
  TanStack Query 훅 (frontend/hooks/query/) ← 서버 상태, 폴링
    ↓ HTTP 요청
[API Layer]
  Next.js API Routes (backend/app/api/)
  JWT 검증 미들웨어
  역할/팀 권한 검증
    ↓ SQL
[DB Layer]
  pg 쿼리 함수 (backend/lib/db/queries/)
  PostgreSQL (database/schema.sql)
```

### 의존 방향 규칙

- UI → Store/Query 단방향만 허용
- API Route → DB 쿼리 함수 단방향만 허용
- UI에서 pg 직접 호출 절대 금지
- DB 쿼리 함수에서 HTTP fetch 절대 금지
- 순환 의존(A → B → A) 발생 시 즉시 중간 레이어로 분리

---

## 3. 코드 / 네이밍 원칙

### 파일명

| 대상 | 규칙 | 예시 |
|------|------|------|
| React 컴포넌트 | PascalCase | `CalendarView.tsx`, `ChatPanel.tsx` |
| 훅 | camelCase, `use` 접두사 | `useSchedules.ts`, `useAuth.ts` |
| 유틸/헬퍼 | camelCase | `formatDate.ts`, `verifyJwt.ts` |
| DB 쿼리 파일 | camelCase | `scheduleQueries.ts`, `chatQueries.ts` |
| API Route | Next.js 규칙 준수 | `route.ts` (디렉토리로 구분) |

### 컴포넌트명

- PascalCase 필수
- 도메인 + 역할 조합: `ScheduleForm`, `JoinRequestActions`, `ChatMessageList`

### 함수명

- 동사 + 명사 조합: `createSchedule`, `getTeamMembers`, `sendChatMessage`
- 불리언 반환: `is` / `has` 접두사: `isLeader`, `hasTeamAccess`
- 이벤트 핸들러: `handle` 접두사: `handleSubmit`, `handleDateSelect`

### TypeScript 타입 네이밍

- 도메인 엔티티: PascalCase 명사: `User`, `Team`, `Schedule`, `ChatMessage`
- API 요청/응답 DTO: `~Request`, `~Response`: `CreateScheduleRequest`, `LoginResponse`
- Zustand 스토어 타입: `~Store`: `AuthStore`, `TeamStore`
- Enum: PascalCase: `UserRole`, `MessageType`, `JoinRequestStatus`

### API 엔드포인트 네이밍 (RESTful)

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/teams
POST   /api/teams
GET    /api/teams/[teamId]
GET    /api/teams/public
POST   /api/teams/[teamId]/join-requests
GET    /api/teams/[teamId]/join-requests
PATCH  /api/teams/[teamId]/join-requests/[requestId]
GET    /api/me/tasks

GET    /api/teams/[teamId]/schedules
POST   /api/teams/[teamId]/schedules
GET    /api/teams/[teamId]/schedules/[scheduleId]
PATCH  /api/teams/[teamId]/schedules/[scheduleId]
DELETE /api/teams/[teamId]/schedules/[scheduleId]

GET    /api/teams/[teamId]/messages
POST   /api/teams/[teamId]/messages
```

### DB 테이블/컬럼 네이밍

- 테이블명: snake_case 복수형: `users`, `teams`, `team_members`, `team_join_requests`, `schedules`, `chat_messages`
- 컬럼명: snake_case: `team_id`, `leader_id`, `created_by`, `start_at`, `end_at`, `sent_at`
- PK: `id` (UUID)
- FK: 참조 테이블 단수형 + `_id`: `team_id`, `user_id`, `sender_id`
- Enum 컬럼 값: UPPER_SNAKE_CASE: `LEADER`, `MEMBER`, `PENDING`, `APPROVED`, `REJECTED`, `NORMAL`, `SCHEDULE_REQUEST`

---

## 4. 테스트 / 품질 원칙

### 테스트 전략 (1인 5일 MVP 기준)

과도한 테스트 커버리지 목표 설정 금지. 아래 최소 전략만 적용:

| 대상 | 방식 | 비고 |
|------|------|------|
| 인증 API | curl / Postman 수동 테스트 | 회원가입·로그인·토큰 갱신 |
| 권한 검증 로직 | curl로 403 응답 확인 | MEMBER의 일정 생성 시도 등 |
| DB 쿼리 함수 | 개발 중 console.log 확인 | 자동화 테스트 미적용 |
| UI | 브라우저 직접 확인 | 모바일/데스크탑 반응형 |
| E2E | Day 5에 주요 유스케이스 수동 시나리오 테스트 | UC-01~UC-07 흐름 |

단위 테스트 / 통합 테스트 자동화는 Post-MVP에서 적용.

### 린트 / 포맷

- ESLint: Next.js 기본 설정 (`eslint-config-next`) 사용
- Prettier: 기본값 사용 (세미콜론, 작은따옴표, trailing comma)
- TypeScript: `strict: true` 필수, `any` 사용 금지 (부득이한 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 주석 명시)
- 커밋 전 `next build` 통과 필수

---

## 5. 설정 / 보안 / 운영 원칙

### 환경변수 관리

환경변수 파일은 **각 서비스 루트**에 분리하여 관리합니다. Vercel 배포 루트(Root Directory)가 `backend/` 또는 `frontend/`이므로, `.env.local` / `.env.example` 도 해당 디렉토리 안에 위치해야 합니다.

```bash
# backend/.env.local (로컬 개발 전용, .gitignore에 반드시 포함)
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

```bash
# frontend/.env.local (로컬 개발 전용, .gitignore에 반드시 포함)
NEXT_PUBLIC_API_URL=http://localhost:3001   # 로컬 개발: 백엔드 포트 지정
# 프로덕션: Vercel Dashboard에서 백엔드 배포 URL로 설정 (예: https://caltalk-api.vercel.app)
```

- `.env.local`은 절대 git에 커밋하지 않음
- `backend/.env.example`, `frontend/.env.example` 각각에 키 목록만 (값 없이) 커밋
- 환경변수 접근은 `process.env.VARIABLE_NAME`으로만, 하드코딩 금지
- 프론트엔드에서 브라우저에 노출되어야 하는 환경변수는 반드시 `NEXT_PUBLIC_` 접두사 사용
- Vercel Dashboard > Settings > Environment Variables에서 프로덕션 환경변수 동일하게 설정

### JWT 처리 방식

- Access Token: 만료 15분, HTTP 요청 Authorization 헤더 (`Bearer <token>`)
- Refresh Token: 만료 7일, HttpOnly 쿠키로 저장
- 모든 API Route에서 Access Token 검증 미들웨어 통과 필수
- 토큰 검증 실패 시 401 반환, 권한 부족 시 403 반환
- 비밀번호는 bcrypt (saltRounds: 12) 해싱 필수

### pg 연결 풀 관리 (Vercel Serverless 고려)

```typescript
// backend/lib/db/pool.ts
// ⚠️ WARNING: Vercel Serverless 환경에서는 함수 인스턴스마다 새 연결이 생성될 수 있음.
// 글로벌 싱글턴 패턴으로 동일 인스턴스 내 재사용. PgBouncer 또는 Neon serverless driver 사용 권장.
import { Pool } from 'pg'

const globalForPg = global as unknown as { pgPool: Pool }

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Serverless 환경에서 연결 수 제한
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool
}
```

### Vercel 배포 시 주의사항

| 항목 | 주의 내용 |
|------|-----------|
| WebSocket | ⚠️ 미지원. 채팅은 TanStack Query `refetchInterval` 폴링(3~5초)으로 구현 |
| SSE | ⚠️ 장시간 스트리밍 불안정. 폴링으로 대체 |
| Function 실행 시간 | 기본 10초 제한. 복잡한 집계 쿼리 금지. 인덱스 필수 적용 |
| 로컬 파일 쓰기 | ⚠️ 불가. 파일 업로드 기능 MVP 제외 |
| DB 연결 | 연결 풀 글로벌 싱글턴 + max 제한 설정 필수 |

---

## 6. 최상위 디렉토리 구조

```
/ (프로젝트 루트)
├── backend/         # 서버사이드: API Routes + 서버 전용 라이브러리 (Vercel 백엔드 배포 루트)
│   ├── next.config.ts   # ← backend/ 전용 Next.js 설정 (Vercel 배포 루트 기준)
│   ├── tsconfig.json    # ← backend/ 전용 TypeScript 경로 매핑
│   ├── package.json     # ← backend/ 전용 의존성 (pg, jsonwebtoken, bcrypt 등)
│   └── .env.example     # ← backend/ 전용 환경변수 키 목록 (DATABASE_URL, JWT_* 등)
├── frontend/        # 클라이언트사이드: 페이지 · 컴포넌트 · 훅 · 스토어 (Vercel 프론트엔드 배포 루트)
│   ├── next.config.ts   # ← frontend/ 전용 Next.js 설정
│   ├── tsconfig.json    # ← frontend/ 전용 TypeScript 경로 매핑
│   ├── package.json     # ← frontend/ 전용 의존성 (React, TanStack Query, Zustand 등)
│   └── .env.example     # ← frontend/ 전용 환경변수 키 목록 (NEXT_PUBLIC_API_URL 등)
├── database/              # 데이터베이스: DDL 스키마
└── docs/            # 설계 문서
```

> **Vercel 단독 배포 구조 주의**
> `backend/`와 `frontend/`는 각각 독립적인 Next.js 프로젝트입니다.
> Vercel에서 배포 시 **Root Directory** 를 `backend` 또는 `frontend` 로 지정해야 합니다.
> 프로젝트 루트에 공용 `next.config.ts` / `package.json` 을 두지 않으며, 각 서비스 디렉토리가 독립적인 배포 단위가 됩니다.

> **Next.js 경로 설정 주의**
> Next.js App Router는 `app/` 디렉토리를 루트 또는 `src/` 내에서만 인식합니다.
> `backend/app/api/` 와 `frontend/app/` 을 Next.js가 올바르게 인식하도록
> 각 서비스의 `next.config.ts` 및 `tsconfig.json` 의 `paths` alias 를 반드시 구성해야 합니다.

---

## 7. 프론트엔드 디렉토리 구조

```
frontend/
├── next.config.ts                     # Next.js 설정 (frontend/ 배포 루트 기준)
├── tsconfig.json                      # TypeScript 경로 매핑
├── package.json                       # 의존성 (React, TanStack Query, Zustand 등)
├── .env.example                       # 환경변수 키 목록 (NEXT_PUBLIC_API_URL 등)
│
├── app/
│   ├── (auth)/                        # 인증 불필요 라우트 그룹
│   │   ├── login/
│   │   │   └── page.tsx               # S-01 로그인 화면
│   │   └── signup/
│   │       └── page.tsx               # S-02 회원가입 화면
│   └── (main)/                        # 인증 필요 라우트 그룹
│       ├── layout.tsx                 # 인증 가드 레이아웃
│       ├── page.tsx                   # S-03 팀 목록 (홈)
│       ├── teams/
│       │   ├── new/
│       │   │   └── page.tsx           # S-04 팀 생성
│       │   ├── explore/
│       │   │   └── page.tsx           # S-04B 팀 공개 목록 (탐색)
│       │   └── [teamId]/
│       │       ├── page.tsx           # S-05 팀 메인 (캘린더 + 채팅)
│       │       └── schedules/
│       │           ├── new/
│       │           │   └── page.tsx   # S-06 일정 생성
│       │           └── [scheduleId]/
│       │               └── page.tsx   # S-06 일정 상세/수정
│       ├── me/
│       │   └── tasks/
│       │       └── page.tsx           # S-04C 나의 할 일
│       └── explore/
│           └── page.tsx               # S-04B 팀 공개 목록 (별도 라우트)
│
├── components/
│   ├── Providers.tsx                  # TanStack Query QueryClientProvider 래퍼 (FE-01 추가)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── team/
│   │   ├── TeamList.tsx
│   │   ├── TeamCard.tsx
│   │   ├── TeamCreateForm.tsx
│   │   ├── TeamExploreList.tsx        # 공개 팀 목록 카드
│   │   └── JoinRequestActions.tsx     # 가입 신청 승인/거절 컴포넌트
│   ├── schedule/
│   │   ├── CalendarView.tsx           # 월/주/일 뷰 컨테이너
│   │   ├── CalendarMonthView.tsx
│   │   ├── CalendarWeekView.tsx
│   │   ├── CalendarDayView.tsx
│   │   ├── ScheduleForm.tsx
│   │   └── ScheduleDetailModal.tsx
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── ChatMessageItem.tsx        # SCHEDULE_REQUEST 시각적 구분 포함
│   │   └── ChatInput.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── query/                         # TanStack Query 훅 (서버 상태)
│   │   ├── useAuth.ts
│   │   ├── useTeams.ts
│   │   ├── useSchedules.ts
│   │   ├── useMessages.ts             # refetchInterval 폴링 포함
│   │   ├── useJoinRequests.ts         # 가입 신청 조회/처리
│   │   └── useMyTasks.ts              # 나의 할 일 (PENDING 신청 목록)
│   └── useBreakpoint.ts               # 반응형 분기 훅
│
├── store/                             # Zustand 스토어 (클라이언트 전역 상태)
│   ├── authStore.ts                   # 현재 로그인 유저, 토큰
│   ├── authStore.test.ts              # authStore 단위 테스트 (FE-01 추가)
│   ├── teamStore.ts                   # 선택된 팀, 선택된 날짜
│   └── teamStore.test.ts              # teamStore 단위 테스트 (FE-01 추가)
│
├── types/
│   ├── auth.ts                        # User, LoginRequest, LoginResponse 등
│   ├── team.ts                        # Team, TeamMember, TeamJoinRequest 등
│   ├── schedule.ts                    # Schedule, CreateScheduleRequest 등
│   └── chat.ts                        # ChatMessage, MessageType 등
│
├── lib/
│   ├── apiClient.ts                   # fetch 래퍼 (Authorization 헤더 자동 주입, NEXT_PUBLIC_API_URL 기반 URL 조립)
│   ├── apiClient.test.ts              # apiClient 단위 테스트 (FE-01 추가)
│   └── utils/
│       └── timezone.ts               # UTC ↔ KST 변환 (클라이언트용)
│       └── timezone.test.ts          # timezone 유틸 단위 테스트 (FE-01 추가)
│
├── test/                              # 테스트 설정 및 헬퍼 (FE-01 추가)
│   └── setup.ts                       # Vitest 글로벌 설정
│
├── vitest.config.ts                   # Vitest 테스트 설정 (FE-01 추가)
│
└── app/
    ├── globals.css                    # Tailwind CSS v4 + 커스텀 컬러 시스템 (FE-01 업데이트)
    └── layout.tsx                     # 루트 레이아웃 (Providers 포함)
```

> **프론트엔드 API 연결 주의**
> `frontend/lib/apiClient.ts` 에서 모든 API 요청의 base URL은 `process.env.NEXT_PUBLIC_API_URL` 환경변수로 참조합니다.
> 로컬 개발 시에는 `frontend/.env.local` 에, Vercel 배포 시에는 Vercel Dashboard 환경변수에 백엔드 배포 URL을 설정합니다.
> 예: `const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`

---

## 8. 백엔드 디렉토리 구조

```
backend/
├── next.config.ts                     # Next.js 설정 (backend/ 배포 루트 기준)
├── tsconfig.json                      # TypeScript 경로 매핑
├── package.json                       # 의존성 (pg, jsonwebtoken, bcrypt 등)
├── .env.example                       # 환경변수 키 목록 (DATABASE_URL, JWT_* 등)
│
├── app/
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts        # POST /api/auth/signup
│       │   ├── login/route.ts         # POST /api/auth/login
│       │   └── refresh/route.ts       # POST /api/auth/refresh
│       ├── teams/
│       │   ├── route.ts               # GET, POST /api/teams
│       │   ├── public/route.ts        # GET /api/teams/public
│       │   └── [teamId]/
│       │       ├── route.ts           # GET /api/teams/[teamId]
│       │       ├── join-requests/
│       │       │   ├── route.ts       # POST, GET /api/teams/[teamId]/join-requests
│       │       │   └── [requestId]/
│       │       │       └── route.ts   # PATCH /api/teams/[teamId]/join-requests/[requestId]
│       │       ├── schedules/
│       │       │   ├── route.ts       # GET, POST /api/teams/[teamId]/schedules
│       │       │   └── [scheduleId]/
│       │       │       └── route.ts   # GET, PATCH, DELETE
│       │       └── messages/
│       │           └── route.ts       # GET, POST /api/teams/[teamId]/messages
│       └── me/
│           └── tasks/route.ts         # GET /api/me/tasks
│
├── swagger/
│   ├── swagger.json                   # OpenAPI 명세 파일 (정적 서빙)
│   └── route.ts                       # GET /swagger/swagger.json — 명세 파일 서빙 route
│
└── lib/
    ├── db/
    │   ├── pool.ts                    # pg Pool 글로벌 싱글턴 (backend/lib/db/pool.ts)
    │   └── queries/
    │       ├── userQueries.ts
    │       ├── teamQueries.ts
    │       ├── joinRequestQueries.ts  # 가입 신청 CRUD
    │       ├── scheduleQueries.ts
    │       └── chatQueries.ts         # KST 날짜 그룹핑 포함
    ├── auth/
    │   ├── jwt.ts                     # Access/Refresh Token 발급·검증
    │   └── password.ts                # bcrypt 해싱·검증
    ├── middleware/
    │   ├── withAuth.ts                # JWT 검증 (401 처리)
    │   └── withTeamRole.ts            # 팀 내 역할 검증 (403 처리)
    └── utils/
        ├── apiResponse.ts             # 표준 응답 형식 헬퍼
        └── timezone.ts               # UTC ↔ KST 변환 (서버용)
```

> **Swagger UI 서빙 주의**
> `swagger/swagger.json` 은 백엔드 배포 루트(`backend/`) 기준으로 `backend/swagger/swagger.json` 에 위치해야 합니다.
> Vercel Serverless에서는 `public/` 디렉토리를 통한 정적 파일 서빙이 가능하므로, `swagger.json` 을 `backend/public/swagger/swagger.json` 에 두거나,
> `backend/app/swagger/route.ts` API Route를 통해 파일 내용을 응답으로 반환하는 방식을 사용합니다.
> Swagger UI 자체(HTML/JS)는 외부 CDN(`https://unpkg.com/swagger-ui-dist`) 또는 `backend/public/swagger-ui/` 정적 파일로 서빙합니다.

---

## 9. DB 디렉토리 구조

```
database/
└── schema.sql                     # 테이블 DDL (초기 마이그레이션)
```

---

## 부록: 핵심 제약 요약

| 항목 | 결정 |
|------|------|
| 실시간 채팅 | WebSocket 미사용. TanStack Query `refetchInterval: 3000` 폴링 |
| DB 클라이언트 | Prisma 미사용. `pg` 직접 + 글로벌 Pool 싱글턴 |
| 추상화 수준 | 최소. Repository 패턴, DI 컨테이너 등 도입 금지 |
| 테스트 | 자동화 테스트 미적용. 수동 시나리오 테스트로 대체 |
| Vercel 주의 | WebSocket, SSE, 로컬 파일 쓰기 사용 시 경고 주석 필수 |

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| 도메인 정의서 | docs/1-domain-definition.md |
| PRD | docs/2-prd.md |
| ERD | docs/6-erd.md |
| API 명세 | docs/7-api-spec.md |
