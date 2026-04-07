# Team CalTalk — 프로젝트 구조 설계 원칙

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |

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
  React 컴포넌트 (app/, components/)
    ↓ 데이터 읽기/쓰기
[Store / Query Layer]
  Zustand 스토어 (store/)          ← 클라이언트 전역 상태
  TanStack Query 훅 (hooks/query/) ← 서버 상태, 폴링
    ↓ HTTP 요청
[API Layer]
  Next.js API Routes (app/api/)
  JWT 검증 미들웨어
  역할/팀 권한 검증
    ↓ SQL
[DB Layer]
  pg 쿼리 함수 (lib/db/queries/)
  PostgreSQL
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
- 도메인 + 역할 조합: `ScheduleForm`, `TeamInviteModal`, `ChatMessageList`

### 함수명

- 동사 + 명사 조합: `createSchedule`, `getTeamMembers`, `sendChatMessage`
- 불리언 반환: `is` / `has` 접두사: `isLeader`, `hasTeamAccess`
- 이벤트 핸들러: `handle` 접두사: `handleSubmit`, `handleDateSelect`

### TypeScript 타입 네이밍

- 도메인 엔티티: PascalCase 명사: `User`, `Team`, `Schedule`, `ChatMessage`
- API 요청/응답 DTO: `~Request`, `~Response`: `CreateScheduleRequest`, `LoginResponse`
- Zustand 스토어 타입: `~Store`: `AuthStore`, `TeamStore`
- Enum: PascalCase: `UserRole`, `MessageType`, `InvitationStatus`

### API 엔드포인트 네이밍 (RESTful)

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/teams
POST   /api/teams
GET    /api/teams/[teamId]
POST   /api/teams/[teamId]/invitations
GET    /api/invitations/[invitationId]
PATCH  /api/invitations/[invitationId]

GET    /api/teams/[teamId]/schedules
POST   /api/teams/[teamId]/schedules
PUT    /api/teams/[teamId]/schedules/[scheduleId]
DELETE /api/teams/[teamId]/schedules/[scheduleId]

GET    /api/teams/[teamId]/messages
POST   /api/teams/[teamId]/messages
```

### DB 테이블/컬럼 네이밍

- 테이블명: snake_case 복수형: `users`, `teams`, `team_members`, `team_invitations`, `schedules`, `chat_messages`
- 컬럼명: snake_case: `team_id`, `leader_id`, `created_by`, `start_at`, `end_at`, `sent_at`
- PK: `id` (UUID)
- FK: 참조 테이블 단수형 + `_id`: `team_id`, `user_id`, `sender_id`
- Enum 컬럼 값: UPPER_SNAKE_CASE: `LEADER`, `MEMBER`, `PENDING`, `ACCEPTED`, `REJECTED`, `NORMAL`, `SCHEDULE_REQUEST`

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

```bash
# .env.local (로컬 개발 전용, .gitignore에 반드시 포함)
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

- `.env.local`은 절대 git에 커밋하지 않음
- `.env.example` 파일에 키 목록만 (값 없이) 커밋
- 환경변수 접근은 `process.env.VARIABLE_NAME`으로만, 하드코딩 금지
- Vercel Dashboard > Settings > Environment Variables에서 프로덕션 환경변수 동일하게 설정

### JWT 처리 방식

- Access Token: 만료 15분, HTTP 요청 Authorization 헤더 (`Bearer <token>`)
- Refresh Token: 만료 7일, HttpOnly 쿠키로 저장
- 모든 API Route에서 Access Token 검증 미들웨어 통과 필수
- 토큰 검증 실패 시 401 반환, 권한 부족 시 403 반환
- 비밀번호는 bcrypt (saltRounds: 12) 해싱 필수

### pg 연결 풀 관리 (Vercel Serverless 고려)

```typescript
// lib/db/pool.ts
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

## 6. 프론트엔드 디렉토리 구조

```
app/
├── (auth)/                        # 인증 불필요 라우트 그룹
│   ├── login/
│   │   └── page.tsx               # S-01 로그인 화면
│   └── signup/
│       └── page.tsx               # S-02 회원가입 화면
├── (main)/                        # 인증 필요 라우트 그룹
│   ├── layout.tsx                 # 인증 가드 레이아웃
│   ├── page.tsx                   # S-03 팀 목록 (홈)
│   ├── teams/
│   │   ├── new/
│   │   │   └── page.tsx           # S-04 팀 생성
│   │   └── [teamId]/
│   │       ├── page.tsx           # S-05 팀 메인 (캘린더 + 채팅)
│   │       ├── invite/
│   │       │   └── page.tsx       # S-07 팀원 초대
│   │       └── schedules/
│   │           └── [scheduleId]/
│   │               └── page.tsx   # S-06 일정 상세/생성/수정
│   └── invitations/
│       └── [invitationId]/
│           └── page.tsx           # S-08 초대 수락/거절
│
components/
├── auth/
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── team/
│   ├── TeamList.tsx
│   ├── TeamCard.tsx
│   ├── TeamCreateForm.tsx
│   └── TeamInviteForm.tsx
├── schedule/
│   ├── CalendarView.tsx           # 월/주/일 뷰 컨테이너
│   ├── CalendarMonthView.tsx
│   ├── CalendarWeekView.tsx
│   ├── CalendarDayView.tsx
│   ├── ScheduleForm.tsx
│   └── ScheduleDetailModal.tsx
├── chat/
│   ├── ChatPanel.tsx
│   ├── ChatMessageList.tsx
│   ├── ChatMessageItem.tsx        # SCHEDULE_REQUEST 시각적 구분 포함
│   └── ChatInput.tsx
└── common/
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    └── ErrorBoundary.tsx

hooks/
├── query/                         # TanStack Query 훅 (서버 상태)
│   ├── useAuth.ts
│   ├── useTeams.ts
│   ├── useSchedules.ts
│   └── useMessages.ts             # refetchInterval 폴링 포함
└── useBreakpoint.ts               # 반응형 분기 훅

store/                             # Zustand 스토어 (클라이언트 전역 상태)
├── authStore.ts                   # 현재 로그인 유저, 토큰
└── teamStore.ts                   # 선택된 팀, 선택된 날짜

types/
├── auth.ts                        # User, LoginRequest, LoginResponse 등
├── team.ts                        # Team, TeamMember, TeamInvitation 등
├── schedule.ts                    # Schedule, CreateScheduleRequest 등
└── chat.ts                        # ChatMessage, MessageType 등

lib/
└── apiClient.ts                   # fetch 래퍼 (Authorization 헤더 자동 주입)
```

---

## 7. 백엔드 디렉토리 구조

```
app/api/
├── auth/
│   ├── signup/route.ts            # POST /api/auth/signup
│   ├── login/route.ts             # POST /api/auth/login
│   └── refresh/route.ts          # POST /api/auth/refresh
├── teams/
│   ├── route.ts                   # GET, POST /api/teams
│   └── [teamId]/
│       ├── route.ts               # GET /api/teams/[teamId]
│       ├── invitations/route.ts   # POST /api/teams/[teamId]/invitations
│       ├── schedules/
│       │   ├── route.ts           # GET, POST /api/teams/[teamId]/schedules
│       │   └── [scheduleId]/
│       │       └── route.ts       # PUT, DELETE
│       └── messages/route.ts     # GET, POST /api/teams/[teamId]/messages
└── invitations/
    └── [invitationId]/route.ts   # GET, PATCH

lib/
├── db/
│   ├── pool.ts                    # pg Pool 글로벌 싱글턴
│   └── queries/
│       ├── userQueries.ts
│       ├── teamQueries.ts
│       ├── invitationQueries.ts
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
    └── timezone.ts                # UTC ↔ KST 변환

db/
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
| ERD | docs/4-erd.md |
| API 명세 | docs/5-api-spec.md |
