# Team CalTalk — 구체적 실행계획

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-08 | TeamInvitation → TeamJoinRequest 전면 반영: DB 스키마, 쿼리 파일, API 엔드포인트, 프론트엔드 화면·훅, E2E 시나리오 전수 갱신 |
| 1.2 | 2026-04-08 | BE-11 일정 API에 GET /api/teams/:teamId/schedules/:id (일정 상세 조회) 추가 |
| 1.3 | 2026-04-09 | 디렉토리 구조 개편 반영: 모든 파일 경로를 backend/ · frontend/ · DB/ 기준으로 갱신 |
| 1.4 | 2026-04-09 | DB/ → database/ 디렉토리명 변경 반영 |
| 1.5 | 2026-04-09 | DB-07 scheduleQueries 테스트 결과 추가 |
| 1.6 | 2026-04-09 | DB-08 chatQueries 테스트 결과 추가 |

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 기간 | 5일 (Day 1 ~ Day 5) |
| 개발 인원 | 1인 |
| 총 Task 수 | DB 9개 / BE 18개 / FE 21개 = **48개** |
| 예상 총 소요 | 약 60시간 |

---

## 의존성 맵 (전체)

```
[DB 레이어]
DB-01 (초기세팅)
  └─ DB-02 (Pool 싱글턴)
       └─ DB-03 (schema.sql)
            └─ DB-04 (userQueries)
            └─ DB-05 (teamQueries)
            └─ DB-06 (joinRequestQueries)
            └─ DB-07 (scheduleQueries)
            └─ DB-08 (chatQueries)

[BE 레이어] — DB-04~08 완료 후 시작
BE-01 (JWT 유틸)  BE-02 (비밀번호)  BE-03 (응답헬퍼)  BE-04 (타임존)
    └─────────────────────┬──────────────────────────────┘
                    BE-05 (withAuth)
                          └─ BE-06 (withTeamRole)
                               ├─ BE-07 ~ BE-12 (도메인별 API)
                               └─ BE-13 (API 통합테스트)

[FE 레이어] — BE API 완료 후 시작
FE-01 (초기세팅) → FE-02 (apiClient) → FE-03 (Zustand) → FE-04 (TanStack Query)
    └─ FE-05 (공통 컴포넌트)
         └─ FE-06~FE-21 (화면 및 기능 구현)
```

---

## Day별 실행계획

### Day 1 — 기반 구축 (DB + BE 기초)

**목표**: 프로젝트 세팅, DB 스키마, 인증 API 완성

---

#### DB-01. 프로젝트 초기 세팅
**설명**: Next.js 프로젝트 생성, TypeScript·ESLint·Prettier 설정, 필수 패키지 설치
**예상 소요**: 1시간
**의존성**:
- [x] 없음

**작업 내용**:
- [x] `backend/` 디렉토리 기준 Next.js 프로젝트 구성 (App Router, TypeScript)
- [x] `backend/tsconfig.json` strict 모드 확인
- [x] `npm install pg bcryptjs jsonwebtoken` 설치 (`backend/package.json`)
- [x] `npm install -D @types/pg @types/bcryptjs @types/jsonwebtoken` 설치
- [x] `backend/.env.local` 파일 생성 (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN=15m, JWT_REFRESH_EXPIRES_IN=7d)
- [x] `backend/.env.example` 파일 생성 (키 목록만, 값 없음)
- [x] `backend/.gitignore` 생성 및 `.env.local` 추가

**완료 조건**:
- [x] `cd backend && npm run dev` 정상 실행 (Next.js 16.2.2 Turbopack, localhost:3000)
- [x] `cd backend && npx tsc --noEmit` TypeScript 컴파일 오류 없음
- [x] `backend/.env.local` 생성 완료, git에 미포함 확인 (`backend/.gitignore` 적용)

---

#### DB-02. pg Pool 글로벌 싱글턴
**설명**: Vercel Serverless 환경을 고려한 pg 연결 풀 구현
**예상 소요**: 30분
**의존성**:
- [x] DB-01

**작업 내용**:
- [x] `backend/lib/db/pool.ts` 생성
- [x] 글로벌 싱글턴 패턴 구현 (`global as unknown as { pgPool: Pool }`)
- [x] Pool 설정: `max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000`
- [x] 개발 환경 전역 캐싱 분기 처리 (`process.env.NODE_ENV !== 'production'`)
- [x] Vercel Serverless 경고 주석 추가

**완료 조건**:
- [x] PostgreSQL 연결 테스트 성공 (`pool.query('SELECT 1')` → `{"result":1}` 응답 확인)
- [x] TypeScript 컴파일 성공 (`npx tsc --noEmit` 오류 0건)

---

#### DB-03. schema.sql DDL 작성 및 마이그레이션
**설명**: 6개 테이블 + 인덱스 + 제약조건 DDL 작성 후 DB에 적용
**예상 소요**: 1.5시간
**의존성**:
- [x] DB-02

**작업 내용**:
- [x] `database/schema.sql` 생성
- [x] `users` 테이블: id(UUID PK), email(UNIQUE), name(VARCHAR 50), password_hash, created_at
- [x] `teams` 테이블: id(UUID PK), name(VARCHAR 100), leader_id(FK→users), created_at
- [x] `team_members` 테이블: (team_id, user_id) 복합 PK, role ENUM('LEADER','MEMBER'), created_at
- [x] `team_join_requests` 테이블: id(UUID PK), team_id(FK), requester_id(FK→users), status ENUM('PENDING','APPROVED','REJECTED'), requested_at, responded_at
- [x] `schedules` 테이블: id(UUID PK), team_id(FK), title(VARCHAR 200), description, start_at, end_at, CHECK(end_at > start_at), created_by(FK→users), created_at, updated_at
- [x] `chat_messages` 테이블: id(UUID PK), team_id(FK), sender_id(FK→users), type ENUM('NORMAL','SCHEDULE_REQUEST'), content(TEXT 2000자), sent_at, created_at
- [x] 인덱스: `users(email)`, `team_members(user_id)`, `team_join_requests(team_id, status)`, `team_join_requests(requester_id)`, `schedules(team_id, start_at, end_at)`, `chat_messages(team_id, sent_at DESC)`
- [x] PostgreSQL에 실행 (`psql -f database/schema.sql`)

**완료 조건**:
- [x] 모든 테이블 생성 확인 (`\dt` → users, teams, team_members, team_join_requests, schedules, chat_messages 6개 확인)
- [x] 인덱스 생성 확인 (`\di` → PK 6개 + 커스텀 인덱스 10개, 총 16개 확인)
- [x] CHECK 제약 조건 동작 확인 (end_at < start_at 삽입 시 `chk_schedules_end_after_start` 위반 오류 발생 확인)

---

#### DB-04 ~ DB-08. 도메인별 DB 쿼리 함수 (병렬 작업 가능)
**설명**: 5개 도메인 쿼리 파일 구현
**예상 소요**: 각 1~1.5시간 (합계 6시간, 병렬 시 단축 불가)
**의존성**:
- [x] DB-03

| Task | 파일 | 핵심 함수 | 상태 |
|------|------|-----------|------|
| DB-04 | `backend/lib/db/queries/userQueries.ts` | createUser, getUserByEmail, getUserById | ✅ 완료 · 테스트 통과 |
| DB-05 | `backend/lib/db/queries/teamQueries.ts` | createTeam, getTeamById, getUserTeams, addTeamMember, getUserTeamRole | ✅ 완료 · 테스트 통과 |
| DB-06 | `backend/lib/db/queries/joinRequestQueries.ts` | createJoinRequest, getJoinRequestById, getPendingJoinRequestsByTeam, getPendingJoinRequestsByLeader, updateJoinRequestStatus | ✅ 완료 · 테스트 통과 |
| DB-07 | `backend/lib/db/queries/scheduleQueries.ts` | createSchedule, getSchedulesByDateRange, getScheduleById, updateSchedule, deleteSchedule | ✅ 완료 · 테스트 통과 |
| DB-08 | `backend/lib/db/queries/chatQueries.ts` | createChatMessage, getMessagesByDate (KST 기준), getMessagesByTeam | ✅ 완료 · 테스트 통과 |

**완료 조건 (공통)**:
- [x] 모든 함수 TypeScript 타입 정의
- [x] 모든 SELECT 쿼리에 `teamId` WHERE 조건 포함 (팀 격리)
- [x] try-catch 에러 처리 추가
- [x] `chatQueries.ts`: KST 날짜 기준 UTC 범위 변환 로직 포함

**DB-04 테스트 결과** (`backend/scripts/test-db04.ts`):
- [x] createUser → UUID 생성, 전체 필드 반환 확인
- [x] getUserByEmail → 이메일로 정확히 조회
- [x] getUserById → ID로 정확히 조회
- [x] getUserById(없는 ID) → null 반환 확인
- [x] TypeScript 컴파일 오류 0건 (`npx tsc --noEmit`)

**DB-05 테스트 결과** (`backend/scripts/test-db05.ts`):
- [x] createTeam → UUID 생성, name·leader_id 반환 확인
- [x] addTeamMember(LEADER) → role=LEADER 등록 확인
- [x] addTeamMember(MEMBER) → role=MEMBER 등록 확인
- [x] getTeamById → ID로 조회, 없는 ID → null 반환
- [x] getUserTeams → 팀 격리 확인 (leader/member 각 1개 팀, role 정확)
- [x] getUserTeamRole → LEADER/MEMBER/비소속(null) 구분 확인
- [x] TypeScript 컴파일 오류 0건 (`npx tsc --noEmit`)

**DB-06 테스트 결과** (`backend/scripts/test-db06.ts`):
- [x] createJoinRequest → PENDING 상태, responded_at=null 초기값 확인
- [x] getJoinRequestById → ID 조회, 없는 ID → null 반환
- [x] getPendingJoinRequestsByTeam → teamId 격리 확인, requester_name/email 포함
- [x] getPendingJoinRequestsByLeader → leader 기준 전체 팀 PENDING 조회, team_name 포함
- [x] updateJoinRequestStatus(APPROVED) → status 변경, responded_at 자동 설정
- [x] updateJoinRequestStatus(REJECTED) → status 변경 확인
- [x] 처리 후 PENDING 목록 → 0건 확인
- [x] TypeScript 컴파일 오류 0건 (`npx tsc --noEmit`)

**DB-07 테스트 결과** (`backend/scripts/test-db07.ts`):
- [x] createSchedule → team_id·title·description 반환 확인
- [x] getSchedulesByDateRange → 겹침 로직(start_at < rangeEnd AND end_at > rangeStart), 팀 격리 확인
- [x] getSchedulesByDateRange → 범위 외 조회 → 0건 확인
- [x] getScheduleById → teamId+id 복합 조회, 타 팀 teamId → null 반환 (팀 격리)
- [x] updateSchedule → 부분 수정(title·end_at), updated_at 갱신 확인
- [x] deleteSchedule → true 반환 후 조회 시 null, 없는 ID → false 반환
- [x] TypeScript 컴파일 오류 0건 (`npx tsc --noEmit`)

**DB-08 테스트 결과** (`backend/scripts/test-db08.ts`):
- [x] createChatMessage(NORMAL) → team_id·type·content 반환 확인
- [x] createChatMessage(SCHEDULE_REQUEST) → type=SCHEDULE_REQUEST 확인
- [x] getMessagesByDate → KST 날짜 기준 UTC 범위 변환, 3건 조회, sender_name JOIN 포함
- [x] getMessagesByDate → 팀 격리 확인, sent_at 오름차순 정렬 확인
- [x] getMessagesByDate → 범위 외 날짜 → 0건, KST 경계(04-11 00:30) 미포함 확인
- [x] getMessagesByTeam → limit 적용, 팀 격리, sender_name JOIN, 오래된 순 반환
- [x] getMessagesByTeam → before 커서 기반 조회 (cursor 이전 메시지만 반환)
- [x] TypeScript 컴파일 오류 0건 (`npx tsc --noEmit`)

---

#### BE-01 ~ BE-04. 공통 유틸 구현 (병렬 작업 가능)
**설명**: JWT·비밀번호·응답헬퍼·타임존 유틸 구현
**예상 소요**: 합계 4시간
**의존성**:
- [ ] DB-01

| Task | 파일 | 핵심 기능 |
|------|------|-----------|
| BE-01 | `backend/lib/auth/jwt.ts` | generateAccessToken(15분), generateRefreshToken(7일), verifyAccessToken, verifyRefreshToken |
| BE-02 | `backend/lib/auth/password.ts` | hashPassword(saltRounds:12), verifyPassword |
| BE-03 | `backend/lib/utils/apiResponse.ts` | successResponse, errorResponse (표준 JSON 형식) |
| BE-04 | `backend/lib/utils/timezone.ts` | utcToKst, kstToUtc, getKstDateRange(월/주/일 범위 반환) |

**완료 조건**:
- [ ] BE-01: Access Token 15분 만료, Refresh Token 7일 만료 검증
- [ ] BE-02: bcrypt 해싱·검증 테스트 성공
- [ ] BE-03: 200/201/400/401/403/404/409 응답 형식 정의
- [ ] BE-04: UTC→KST +9시간 변환, 월/주/일 범위 경계값 정확성

---

### Day 2 — 인증 + 팀 API

**목표**: 인증 미들웨어, 인증 API(signup/login/refresh), 팀 API 완성

---

#### BE-05. withAuth 미들웨어
**설명**: JWT 검증 → 401, userId 추출 HOF
**예상 소요**: 1시간
**의존성**:
- [ ] BE-01, BE-03

**작업 내용**:
- [ ] `backend/lib/middleware/withAuth.ts` 생성
- [ ] Authorization 헤더에서 Bearer 토큰 추출
- [ ] `verifyAccessToken`으로 검증
- [ ] 검증 성공 시 `request`에 `userId` 주입
- [ ] 실패 시 401 반환

**완료 조건**:
- [ ] 유효한 토큰: userId 추출 성공
- [ ] 토큰 없음/만료/손상: 401 응답

---

#### BE-06. withTeamRole 미들웨어
**설명**: 팀 내 LEADER/MEMBER 역할 검증 → 403 HOF
**예상 소요**: 1시간
**의존성**:
- [ ] BE-05, DB-05

**작업 내용**:
- [ ] `backend/lib/middleware/withTeamRole.ts` 생성
- [ ] `teamId` (URL params) + `userId` (withAuth에서 주입) 조합으로 DB에서 역할 조회
- [ ] 팀 비소속 → 403, 권한 부족 → 403
- [ ] 성공 시 `request`에 `userRole` 주입

**완료 조건**:
- [ ] LEADER/MEMBER 역할 정확히 검증
- [ ] 비소속 사용자 403 응답
- [ ] withAuth와 체이닝 가능

---

#### BE-07. 인증 API 구현
**설명**: signup / login / refresh 3개 엔드포인트
**예상 소요**: 3시간
**의존성**:
- [ ] BE-01, BE-02, BE-03, DB-04

| 엔드포인트 | 파일 | 핵심 로직 |
|-----------|------|-----------|
| POST /api/auth/signup | `backend/app/api/auth/signup/route.ts` | 이메일 중복 확인 → bcrypt 해싱 → DB 저장 → 토큰 발급 → 201 |
| POST /api/auth/login | `backend/app/api/auth/login/route.ts` | 사용자 조회 → bcrypt 검증 → 토큰 발급 → 200 |
| POST /api/auth/refresh | `backend/app/api/auth/refresh/route.ts` | Refresh Token 검증 → 새 Access Token 발급 → 200 |

**완료 조건**:
- [ ] signup: 201 Created, 이메일 중복 409, 형식 오류 400
- [ ] login: 200 OK, 자격증명 오류 401
- [ ] refresh: 200 OK, 토큰 오류 401
- [ ] Refresh Token HttpOnly 쿠키 설정 확인

---

#### BE-08 ~ BE-10. 팀·가입 신청 API 구현
**설명**: 팀 목록/생성/상세 + 공개 팀 목록 + 가입 신청 제출/조회/승인·거절 + 나의 할 일
**예상 소요**: 4시간
**의존성**:
- [ ] BE-05, BE-06, DB-05, DB-06

| 엔드포인트 | 파일 |
|-----------|------|
| GET /api/teams | `backend/app/api/teams/route.ts` |
| POST /api/teams | `backend/app/api/teams/route.ts` |
| GET /api/teams/public | `backend/app/api/teams/public/route.ts` |
| GET /api/teams/:teamId | `backend/app/api/teams/[teamId]/route.ts` |
| POST /api/teams/:teamId/join-requests | `backend/app/api/teams/[teamId]/join-requests/route.ts` |
| GET /api/teams/:teamId/join-requests | `backend/app/api/teams/[teamId]/join-requests/route.ts` |
| PATCH /api/teams/:teamId/join-requests/:requestId | `backend/app/api/teams/[teamId]/join-requests/[requestId]/route.ts` |
| GET /api/me/tasks | `backend/app/api/me/tasks/route.ts` |

**완료 조건**:
- [ ] GET /teams: myRole 포함, 소속 팀만 반환
- [ ] POST /teams: 생성자 자동 LEADER 등록, 201
- [ ] GET /teams/public: 전체 팀 목록(팀명, 구성원 수) 반환
- [ ] GET /teams/:id: members 배열 포함, 비소속 403
- [ ] POST join-requests: 중복 신청 409, PENDING 생성 201
- [ ] PATCH join-requests: APPROVE 시 team_members(MEMBER) 원자적 등록, 200
- [ ] GET /me/tasks: 내가 LEADER인 팀들의 PENDING 신청 전체 조회

---

### Day 3 — 일정 + 채팅 API

**목표**: 일정 CRUD API, 채팅 API 완성

---

#### BE-11. 일정 API 구현
**설명**: 월/주/일 조회 + 일정 CRUD (LEADER 전용)
**예상 소요**: 3시간
**의존성**:
- [ ] BE-05, BE-06, BE-04, DB-07

| 엔드포인트 | 파일 |
|-----------|------|
| GET /api/teams/:teamId/schedules | `backend/app/api/teams/[teamId]/schedules/route.ts` |
| POST /api/teams/:teamId/schedules | `backend/app/api/teams/[teamId]/schedules/route.ts` |
| GET /api/teams/:teamId/schedules/:id | `backend/app/api/teams/[teamId]/schedules/[scheduleId]/route.ts` |
| PATCH /api/teams/:teamId/schedules/:id | `backend/app/api/teams/[teamId]/schedules/[scheduleId]/route.ts` |
| DELETE /api/teams/:teamId/schedules/:id | `backend/app/api/teams/[teamId]/schedules/[scheduleId]/route.ts` |

**완료 조건**:
- [ ] GET (목록): `?view=month|week|day&date=YYYY-MM-DD` 파라미터로 KST 기준 범위 조회
- [ ] GET (상세): scheduleId로 단건 조회, 비소속 팀원 403, 비존재 404
- [ ] POST: LEADER 전용, `startAt < endAt` 검증, 201
- [ ] PATCH: 부분 수정 지원, MEMBER 403
- [ ] DELETE: LEADER 전용, 비존재 404

---

#### BE-12. 채팅 API 구현
**설명**: 날짜별 메시지 조회(폴링용) + 메시지 전송
**예상 소요**: 2시간
**의존성**:
- [ ] BE-05, BE-06, BE-04, DB-08

| 엔드포인트 | 파일 |
|-----------|------|
| GET /api/teams/:teamId/messages | `backend/app/api/teams/[teamId]/messages/route.ts` |
| POST /api/teams/:teamId/messages | `backend/app/api/teams/[teamId]/messages/route.ts` |

**완료 조건**:
- [ ] GET: `?date=YYYY-MM-DD` KST 기준, sentAt 오름차순, senderName 포함
- [ ] POST: NORMAL/SCHEDULE_REQUEST 타입 모두 저장, content 2000자 제한
- [ ] 팀 격리 확인 (타 팀 메시지 미노출)

---

#### BE-13. 백엔드 통합 테스트 (curl/Postman)
**설명**: 전체 API 수동 테스트, 권한 검증 확인
**예상 소요**: 2시간
**의존성**:
- [ ] BE-07 ~ BE-12 (모든 API)

**작업 내용**:
- [ ] 인증 흐름: signup → login → refresh → 재요청
- [ ] 권한 흐름: MEMBER로 일정 생성 시도 → 403 확인
- [ ] 팀 격리: 타 팀 일정/채팅 접근 → 403 확인
- [ ] 날짜 범위: 월/주/일 일정 조회 KST 기준 확인
- [ ] 채팅 날짜 그룹핑: KST 자정 경계 메시지 확인

**완료 조건**:
- [ ] 모든 성공 케이스 200/201 응답
- [ ] 모든 실패 케이스 4xx 응답 정확
- [ ] 권한 검증 100% 통과
- [ ] KST 날짜 경계 정확

---

### Day 4 — 프론트엔드 핵심 화면

**목표**: 인증·팀·캘린더·채팅 화면 구현

---

#### FE-01. 프론트엔드 초기 세팅
**설명**: 타입 정의, apiClient, Zustand, TanStack Query 세팅
**예상 소요**: 2시간
**의존성**:
- [ ] DB-01

**작업 내용**:
- [ ] `frontend/types/` 디렉토리 생성 (auth.ts, team.ts, schedule.ts, chat.ts)
- [ ] `frontend/lib/apiClient.ts`: fetch 래퍼, Authorization 헤더 자동 주입, 401 시 refresh 재시도
- [ ] `frontend/store/authStore.ts`: currentUser, accessToken, setUser, logout
- [ ] `frontend/store/teamStore.ts`: selectedTeamId, selectedDate, setSelectedDate
- [ ] `frontend/lib/utils/timezone.ts` (FE 버전): UTC→KST 변환, 날짜 포맷
- [ ] TanStack Query `QueryClientProvider` 설정 (`frontend/app/layout.tsx`)

**완료 조건**:
- [ ] `apiClient`에서 모든 요청에 Authorization 헤더 자동 포함
- [ ] 401 응답 시 refresh 재시도 후 재요청 동작
- [ ] Zustand 스토어 상태 관리 확인

---

#### FE-02. 공통 컴포넌트 + TanStack Query 훅
**설명**: Button/Input/Modal + 도메인별 Query 훅
**예상 소요**: 2.5시간
**의존성**:
- [ ] FE-01

**작업 내용**:
- [ ] `frontend/components/common/`: Button, Input, Modal, ErrorBoundary
- [ ] `frontend/hooks/query/useAuth.ts`: 로그인, 회원가입 useMutation
- [ ] `frontend/hooks/query/useTeams.ts`: 팀 목록/상세/생성 useQuery+useMutation
- [ ] `frontend/hooks/query/useSchedules.ts`: 일정 조회/CRUD useQuery+useMutation
- [ ] `frontend/hooks/query/useMessages.ts`: 메시지 조회(refetchInterval:3000 폴링)/전송
- [ ] `frontend/hooks/query/useJoinRequests.ts`: 가입 신청 제출/조회/승인·거절
- [ ] `frontend/hooks/query/useMyTasks.ts`: 나의 할 일(PENDING 신청 전체 조회)
- [ ] `frontend/hooks/useBreakpoint.ts`: isMobile(640px 미만) / isDesktop(1024px 이상)

**완료 조건**:
- [ ] useMessages refetchInterval: 3000 설정 확인
- [ ] 공통 컴포넌트 TypeScript 타입 완전 정의
- [ ] 모든 훅에서 에러/로딩 상태 처리

---

#### FE-03. 인증 화면 + 인증 가드
**설명**: 로그인·회원가입 화면 + (main) 레이아웃 인증 가드
**예상 소요**: 2.5시간
**의존성**:
- [ ] FE-02

**작업 내용**:
- [ ] `frontend/app/(auth)/login/page.tsx` + `frontend/components/auth/LoginForm.tsx`
- [ ] `frontend/app/(auth)/signup/page.tsx` + `frontend/components/auth/SignupForm.tsx`
- [ ] `frontend/app/(main)/layout.tsx`: authStore에서 currentUser 확인, 없으면 `/login` 리다이렉트
- [ ] 로그인 성공 → `/` 리다이렉트
- [ ] 회원가입 성공 → `/` 리다이렉트

**완료 조건**:
- [ ] 비인증 상태에서 `/teams/*` 접근 시 `/login`으로 리다이렉트
- [ ] 로그인/회원가입 성공 시 `/`로 리다이렉트

---

#### FE-04. 팀 목록 + 팀 생성 + 팀 탐색 화면
**설명**: S-03 팀 목록, S-04 팀 생성, S-04B 팀 공개 목록(탐색)
**예상 소요**: 2시간
**의존성**:
- [ ] FE-02, FE-03

**작업 내용**:
- [ ] `frontend/app/(main)/page.tsx`: useTeams()로 팀 목록 렌더링, 팀 클릭 → `/teams/[teamId]`
- [ ] `frontend/components/team/TeamList.tsx`, `TeamCard.tsx`
- [ ] `frontend/app/(main)/teams/new/page.tsx`: 팀명 입력 → 팀 생성 → `/teams/[newTeamId]` 리다이렉트
- [ ] `frontend/components/team/TeamCreateForm.tsx`
- [ ] `frontend/app/(main)/teams/explore/page.tsx`: 공개 팀 목록(팀명, 구성원 수) + 가입 신청 버튼
- [ ] `frontend/components/team/TeamExploreList.tsx`

**완료 조건**:
- [ ] 팀 목록 렌더링 및 클릭 이동 확인
- [ ] 팀 생성 후 팀 메인 화면으로 이동 확인
- [ ] 팀 탐색 화면에서 가입 신청 → 201 확인

---

#### FE-05. 캘린더 컴포넌트 (월/주/일 뷰)
**설명**: CalendarView 컨테이너 + 월·주·일 뷰 컴포넌트
**예상 소요**: 2.5시간
**의존성**:
- [ ] FE-02

**작업 내용**:
- [ ] `frontend/components/schedule/CalendarView.tsx`: 월/주/일 탭 전환, 날짜 네비게이션
- [ ] `frontend/components/schedule/CalendarMonthView.tsx`: 월간 그리드, 일정 점 표시
- [ ] `frontend/components/schedule/CalendarWeekView.tsx`: 주간 타임라인
- [ ] `frontend/components/schedule/CalendarDayView.tsx`: 일일 리스트
- [ ] useSchedules() 훅으로 `?view=...&date=...` 파라미터 연동
- [ ] 날짜 클릭 시 `teamStore.setSelectedDate()` 업데이트

**완료 조건**:
- [ ] 월/주/일 뷰 전환 가능
- [ ] 날짜 네비게이션 ([이전]/[다음]) 동작
- [ ] 날짜 클릭 시 teamStore selectedDate 업데이트

---

#### FE-06. 채팅 컴포넌트 (ChatPanel)
**설명**: 메시지 목록 + 입력창 + 폴링
**예상 소요**: 2시간
**의존성**:
- [ ] FE-02

**작업 내용**:
- [ ] `frontend/components/chat/ChatMessageList.tsx`: 메시지 목록, SCHEDULE_REQUEST 강조 스타일
- [ ] `frontend/components/chat/ChatMessageItem.tsx`: 발신자명, 시간, 타입별 배경색 구분
- [ ] `frontend/components/chat/ChatInput.tsx`: 텍스트 입력, [전송], [일정 변경 요청] 버튼, Enter 전송
- [ ] `frontend/components/chat/ChatPanel.tsx`: ChatMessageList + ChatInput 조합, refetchInterval:3000 관리

**완료 조건**:
- [ ] SCHEDULE_REQUEST 메시지 시각적 구분 확인
- [ ] 3초마다 메시지 폴링 갱신 확인
- [ ] 메시지 2000자 초과 입력 방지

---

### Day 5 — 통합 화면 + 배포

**목표**: S-05 팀 메인 화면 완성, 반응형 UI, 나의 할 일 화면 완성, Vercel 배포

---

#### FE-07. 팀 메인 화면 (S-05) — 반응형
**설명**: 캘린더+채팅 동시 화면 (데스크탑 좌우 분할 / 모바일 탭 전환)
**예상 소요**: 2시간
**의존성**:
- [ ] FE-05, FE-06

**작업 내용**:
- [ ] `frontend/app/(main)/teams/[teamId]/page.tsx`
- [ ] `useBreakpoint()` 훅으로 분기
- [ ] **데스크탑(1024px+)**: CalendarView(좌 60%) + ChatPanel(우 40%) 좌우 분할
- [ ] **모바일(640px 미만)**: [캘린더] / [채팅] 탭 전환
- [ ] 캘린더 날짜 클릭 → `teamStore.selectedDate` 업데이트 → ChatPanel 날짜 연동

**완료 조건**:
- [ ] 데스크탑: 좌우 분할 화면 렌더링
- [ ] 모바일: 탭 전환 동작
- [ ] 날짜 선택 → 채팅 목록 날짜 연동 확인

---

#### FE-08. 일정 폼 + 나의 할 일 화면
**설명**: 일정 상세/생성/수정 + 나의 할 일(가입 신청 승인/거절)
**예상 소요**: 2시간
**의존성**:
- [ ] FE-02, FE-04

**작업 내용**:
- [ ] `frontend/components/schedule/ScheduleForm.tsx`: 제목·설명·시작/종료 입력, LEADER만 표시
- [ ] `frontend/components/schedule/ScheduleDetailModal.tsx`: 일정 상세 팝업
- [ ] `frontend/app/(main)/me/tasks/page.tsx` + `frontend/components/team/JoinRequestActions.tsx`: 나의 할 일 — PENDING 신청 목록, 승인/거절 버튼
- [ ] 승인 처리: `PATCH /api/teams/[teamId]/join-requests/[requestId]` (action: "APPROVE")

**완료 조건**:
- [ ] MEMBER에게 일정 생성/수정/삭제 버튼 미표시
- [ ] 가입 신청 승인 시 TeamMember(MEMBER) 원자적 등록, 목록에서 제거
- [ ] `startAt < endAt` 클라이언트 검증 동작

---

#### FE-09. 권한 기반 UI 제어 + 토큰 갱신
**설명**: LEADER/MEMBER 버튼 표시 제어 + Access Token 자동 갱신
**예상 소요**: 1시간
**의존성**:
- [ ] FE-01, FE-07, FE-08

**작업 내용**:
- [ ] `frontend/hooks/useLeaderRole.ts`: teamStore + useTeams로 현재 팀 내 역할 판단
- [ ] 모든 LEADER 전용 버튼 조건부 렌더링 적용
- [ ] `frontend/lib/apiClient.ts`: 401 응답 시 `/api/auth/refresh` 자동 호출 후 원래 요청 재시도
- [ ] Refresh Token 만료 시 authStore 초기화 → `/login` 리다이렉트

**완료 조건**:
- [ ] MEMBER 계정으로 로그인 시 [일정 추가] 버튼 미표시
- [ ] Access Token 만료 후 자동 갱신, 재요청 성공

---

#### FE-10. 반응형 UI 검증 + 빌드 확인
**설명**: 모바일/데스크탑 화면 검증, TypeScript + ESLint 통과
**예상 소요**: 1시간
**의존성**:
- [ ] FE-07 ~ FE-09

**작업 내용**:
- [ ] 브라우저 DevTools 모바일 에뮬레이션 (320px, 375px, 768px, 1280px)
- [ ] `next build` 실행 → 오류 없음 확인
- [ ] `next lint` 실행 → ESLint 오류 없음 확인
- [ ] TypeScript 타입 오류 0개 확인

**완료 조건**:
- [ ] `next build` 성공
- [ ] `next lint` 통과
- [ ] 모바일/데스크탑 레이아웃 정상

---

#### FE-11. E2E 시나리오 테스트
**설명**: UC-01~UC-07 전체 흐름 수동 테스트
**예상 소요**: 1.5시간
**의존성**:
- [ ] FE-10

**작업 내용**:
- [ ] **SC-01**: 회원가입 → 로그인 → 팀 목록 진입
- [ ] **SC-02/SC-02B/SC-02C**: 팀 생성 → 팀 탐색/가입 신청 → 팀장 승인 → 팀 합류
- [ ] **SC-04/SC-05**: 팀 일정 조회 (월/주/일) → 일정 추가·수정·삭제
- [ ] **SC-03**: LEADER로 일정 삭제 → 캘린더에서 제거 확인
- [ ] **SC-06**: MEMBER 계정으로 일정 수정 시도 → 버튼 미노출 확인
- [ ] **SC-07/SC-08**: 채팅 메시지 전송 → 3초 폴링 갱신 → SCHEDULE_REQUEST 전송
- [ ] **SC-09**: 캘린더 날짜 선택 → 채팅 날짜 연동 (데스크탑/모바일)

**완료 조건**:
- [ ] UC-01~UC-07 모든 시나리오 성공
- [ ] 모바일/데스크탑 양쪽에서 확인
- [ ] 오류 없이 전체 흐름 완주

---

#### FE-12. Vercel 배포
**설명**: Vercel 배포 설정 및 프로덕션 환경 검증
**예상 소요**: 1시간
**의존성**:
- [ ] FE-11

**작업 내용**:
- [ ] GitHub 리포지토리 생성 및 코드 푸시
- [ ] Vercel에 GitHub 연결 및 프로젝트 생성
- [ ] Vercel Dashboard에서 환경변수 설정 (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET 등)
- [ ] 배포 트리거 및 빌드 로그 확인
- [ ] 배포 URL에서 로그인·팀 생성·채팅 동작 확인

**완료 조건**:
- [ ] Vercel 빌드 성공
- [ ] 배포 URL에서 회원가입 → 로그인 → 팀 생성 동작 확인
- [ ] 채팅 폴링 동작 확인 (3초 갱신)
- [ ] 모바일 브라우저에서 화면 정상 확인

---

## 전체 Task 의존성 요약

| Task | 의존 Task |
|------|-----------|
| DB-01 | 없음 |
| DB-02 | DB-01 |
| DB-03 | DB-02 |
| DB-04~08 | DB-03 |
| BE-01~04 | DB-01 |
| BE-05 | BE-01, BE-03 |
| BE-06 | BE-05, DB-05 |
| BE-07 | BE-01, BE-02, BE-03, DB-04 |
| BE-08~10 | BE-05, BE-06, DB-05, DB-06 |
| BE-11 | BE-05, BE-06, BE-04, DB-07 |
| BE-12 | BE-05, BE-06, BE-04, DB-08 |
| BE-13 | BE-07~12 |
| FE-01 | DB-01 |
| FE-02 | FE-01 |
| FE-03~06 | FE-02 |
| FE-07 | FE-05, FE-06 |
| FE-08 | FE-02, FE-04 |
| FE-09 | FE-01, FE-07, FE-08 |
| FE-10 | FE-07~09 |
| FE-11 | FE-10 |
| FE-12 | FE-11 |

> 참고: BE-08~10은 팀 CRUD + 가입 신청(join-requests) + 나의 할 일 API를 포함합니다. FE-08은 일정 폼 + 나의 할 일 화면을 포함합니다.

---

## Vercel 배포 체크리스트

- [ ] WebSocket 사용 없음 확인 (채팅은 refetchInterval 폴링만 사용)
- [ ] `backend/lib/db/pool.ts`에 글로벌 싱글턴 + max:5 설정 확인
- [ ] 모든 환경변수가 `.env.local`이 아닌 Vercel Dashboard에 설정됨
- [ ] Serverless Function 실행 시간 10초 초과 쿼리 없음 확인
- [ ] `next build` 로컬에서 성공 후 배포

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| 도메인 정의서 | docs/1-domain-definition.md |
| PRD | docs/2-prd.md |
| 사용자 시나리오 | docs/3-user-scenarios.md |
| 프로젝트 구조 | docs/4-project-structure.md |
| 기술 아키텍처 | docs/5-tech-arch-diagram.md |
| ERD | docs/6-erd.md |
| API 명세 | docs/7-api-spec.md |
