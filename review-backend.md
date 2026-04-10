# Backend 코드 및 설계 문서 평가 리뷰

## 리뷰 일시
2026-04-09

## 리뷰 범위
- 설계 문서: `docs/` 디렉토리 (12개 파일)
- Swagger 명세: `backend/swagger/swagger.json`
- 백엔드 소스: `backend/` 디렉토리 전체
- 데이터베이스: `database/schema.sql`

---

## 1. 종합 평가 요약

| 영역 | 상태 | 평가 |
|------|------|------|
| 설계 문서 (docs/) | ✅ 완성 | 12개 파일, 상호 일관성 검증 완료 |
| Swagger 명세 | ✅ 완성 | OpenAPI 3.0.3, 16개 엔드포인트 정의 |
| 데이터베이스 스키마 | ✅ 완성 | 6개 테이블, 인덱스·제약조건 포함 |
| DB 쿼리 레이어 | ✅ 완성 | 5개 쿼리 파일, 테스트 스크립트 존재 |
| 인증 유틸리티 | ❌ 미구현 | JWT, bcrypt 관련 코드 전무 |
| 미들웨어 | ❌ 미구현 | withAuth, withTeamRole 없음 |
| API 라우트 | ❌ 미구현 | 16개 엔드포인트 중 0개 구현 |
| 프론트엔드 | ❌ 미시작 | frontend/ 디렉토리 자체 없음 |
| 테스트 | ⚠️ 일부 | DB 쿼리 테스트만 존재, API 테스트 없음 |

**현재 진행률**: 약 25% (DB 레이어 완료, API/인증/프론트엔드 미시작)

---

## 2. 설계 문서 평가

### 2.1 장점

#### ✅ 뛰어난 문서 완성도
- **12개 설계 문서**가 도메인 정의 → PRD → 사용자 시나리오 → 구조 → 아키텍처 → ERD → API 명세 → 실행 계획 → 와이어프레임 → 스타일 가이드까지 전 주기를 커버
- `review-docs.md`에서 **11개 파일 간 상호 일관성 검증** 완료, 모든 항목 "Perfect Consistency" 판정
- 용어 통일 (TeamJoinRequest / team_join_requests / 가입 신청), 엔드포인트명, 테이블명, 비즈니스 규칙이 전 문서에 걸쳐 일치

#### ✅ 잘 구조화된 실행 계획
- `8-execution-plan.md`에 48개 Task가 DB(9) / BE(18) / FE(21)로 분류되어 의존성 그래프와 체크리스트 포함
- 각 태스크에 대한 구체적인 산출물과 검증 기준 명시

#### ✅ 명확한 기술 의사결정
- Vercel Serverless 배포 제약 하에서 WebSocket 대신 HTTP polling 선택 이유 문서화
- Pg 대신 node-postgres 선택, Prisma 미사용 이유 명확
- JWT Access Token 15분 + Refresh Token 7일 전략 명시

### 2.2 설계 문서의 문제점

#### 🔴 [CRITICAL] 프론트엔드 디렉토리 미존재 반영 안 됨
- 모든 설계 문서에서 `frontend/` 디렉토리 구조, 컴포넌트, 훅, 페이지가 상세히 정의되어 있으나 **실제 프로젝트에 frontend/ 디렉토리가 아예 없음**
- 실행 계획의 FE-01 ~ FE-21 태스크가 아직 시작되지 않은 상태가 문서에 반영되지 않음
- `review-docs.md`가 "완벽 일치"라고 평가했으나, 이는 **문서 간 일치성만 검증**했을 뿐 실제 구현 상태를 평가한 것이 아님

#### 🟡 [WARNING] swagger.json에 중복된 TaskItem 스키마
- `swagger.json`에 `JoinRequest`와 `TaskItem`이 사실상 동일한 구조로 중복 정의됨
- `TaskItem`은 `requesterName`, `requesterEmail`을 포함해 `JoinRequestDetail`과 유사
- 단일 출처 원칙(Single Source of Truth) 위반. API 응답에서 두 스키마가 실제로 다르게 쓰이는지 명확하지 않음

#### 🟡 [WARNING] API 명세와 Swagger 간 미세한 불일치 가능성
- `docs/7-api-spec.md`는 1,273줄의 방대한 명세지만, `swagger.json`과 수동 동기화 상태 검증 도구/프로세스 부재
- 향후 변경 시 2개 파일을 동시에 업데이트해야 하는 유지보수 리스크

#### 🟡 [MINOR] 실행 계획에 테스트 전략 부재
- 48개 Task 중 단위 테스트, 통합 테스트, E2E 테스트 관련 태스크가 명시적으로 포함되지 않음
- `scripts/test-db04~08.ts`가 존재하지만 이는 수동 테스트 스크립트이며 자동화된 테스트 스위트 아님

#### 🟡 [MINOR] CI/CD 파이프라인 정의 없음
- Vercel 배포가 언급되지만 GitHub Actions, lint, type-check, test 자동화 파이프라인에 대한 문서 없음

---

## 3. Swagger 명세 평가

### 3.1 장점

#### ✅ 포괄적인 엔드포인트 정의
- Auth(3), Teams(4), JoinRequests(3), Schedules(4), Chat(1), Me(1) 총 16개 엔드포인트 모두 정의
- 요청/응답 스키마, 에러 응답 예시, security schemes(Bearer JWT) 포함

#### ✅ 일관된 응답 구조
- 400, 401, 403, 404, 409 등 HTTP 상태 코드별 에러 응답이 한국어 메시지로 정의
- `ErrorResponse` 스키마 단일 정의 재사용

### 3.2 문제점

#### 🟡 [WARNING] swagger.json 서빙 경로 미구현
- `swagger.json` 파일은 존재하지만 이를 서빙할 Swagger UI 라우트 (`/api/docs` 등)가 구현되지 않음
- 설계 문서에는 명세되어 있으나 실제 접근 방법 없음

#### 🟡 [WARNING] 파일 분할 없음
- 단일 `swagger.json` 파일이 1,804줄로 매우 김. 유지보수 어려움
- `swagger/` 디렉토리에 `paths/`, `schemas/` 하위 분할 권장

#### 🟡 [MINOR] 서버 URL이 상대 경로
```json
"servers": [{ "url": "/api", "description": "Base URL" }]
```
- Swagger UI에서 테스트 시 절대 URL (`http://localhost:3000/api`)이 없어 불편함
- 개발/운영 환경별 서버 URL 추가 권장

---

## 4. 데이터베이스 스키마 평가

### 4.1 장점

#### ✅ 잘 정의된 테이블 구조
- 6개 테이블(users, teams, team_members, team_join_requests, schedules, chat_messages) 모두 적절한 컬럼명(snake_case)과 데이터 타입
- FK 제약조건: CASCADE/RESTRICT가 비즈니스 규칙에 맞게 적용됨
  - 팀 삭제 시 팀 멤버/가입신청/일정/채팅 CASCADE 삭제 (올바름)
  - 사용자 삭제 시 팀 리더/생성자 RESTRICT (데이터 보호)

#### ✅ CHECK 제약조건 활용
- `role IN ('LEADER', 'MEMBER')`
- `status IN ('PENDING', 'APPROVED', 'REJECTED')`
- `type IN ('NORMAL', 'SCHEDULE_REQUEST')`
- `end_at > start_at`
- `char_length(content) <= 2000`

#### ✅ 인덱스 전략 적절
- 복합 인덱스 `team_join_requests(team_id, status)` — PENDING 조회에 최적
- `chat_messages(team_id, sent_at DESC)` — 최신 메시지 조회에 적합
- `schedules(team_id, start_at)`, `schedules(team_id, end_at)` — 날짜 범위 조회용

### 4.2 문제점

#### 🟡 [WARNING] team_join_requests 중복 신청 방지 인덱스 부재
- 비즈니스 규칙 BR-07: "동일 사용자의 중복 신청 방지"
- 현재 인덱스: `(team_id, status)`, `(requester_id)`
- **필요 인덱스**: `(team_id, requester_id, status)` — PENDING 중복 체크를 위한 유니크 제약 또는 인덱스 권장
- 대안: `WHERE status = 'PENDING'` 조건부 유니크 인덱스 고려
  ```sql
  CREATE UNIQUE INDEX idx_join_requests_pending_unique
    ON team_join_requests(team_id, requester_id)
    WHERE status = 'PENDING';
  ```

#### 🟡 [WARNING] chat_messages에 sender_name 컬럼 없음
- `chatQueries.ts`에서 `JOIN users u ON u.id = cm.sender_id`로 매번 JOIN 필요
- 채팅 메시지가 빈번히 조회되는 경우 성능 이슈 가능
- 역정규화 옵션: `sender_name` 컬럼 추가 (INSERT 시점 저장)

#### 🟡 [MINOR] created_at / updated_at 자동 업데이트 누락
- `schedules` 테이블은 `updated_at DEFAULT now()`지만 UPDATE 시 자동 갱신 트리거 없음
- 다른 테이블은 `created_at`만 존재. 일관성 있는 감사(audit) 컬럼 정책 부재
- 권장: `updated_at` 자동 업데이트 트리거 또는 모든 테이블에 일관된 audit 컬럼 추가

#### 🟡 [MINOR] pgcrypto EXTENSION 사용但未 활용
- `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` 선언했으나 `gen_random_uuid()` 사용
- PostgreSQL 13+에서는 `gen_random_uuid()`가 내장이므로 pgcrypto 불필요
- 삭제 권장 (혼란 유발)

---

## 5. DB 쿼리 레이어 평가

### 5.1 장점

#### ✅ 타입스크립트 인터페이스 정의
- 각 쿼리 파일에 해당하는 Interface/User/DTO 명확히 정의
- `CreateUserParams`, `CreateScheduleParams` 등 파라미터 타입 분리

#### ✅ Parameterized Query 사용
- 모든 SQL 쿼리가 `$1, $2, ...` placeholder 사용 — SQL Injection 방지
- `pool.query<T>` 제네릭으로 타입 안전성 확보

#### ✅ 팀 격리(Team Isolation) 준수
- 모든 SELECT에 `team_id` WHERE 절 포함 — 멀티테넌시 기본 원칙 준수
- `getUserTeams`, `getSchedulesByDateRange`, `getMessagesByTeam` 등

#### ✅ KST-UTC 변환 로직
- `chatQueries.ts`의 `kstDateToUtcRange()` — KST(UTC+9) 날짜를 UTC 범위로 정확 변환
- `sent_at >= $2 AND sent_at < $3` 범위 쿼리로 경계 조건 처리 올바름

#### ✅ Connection Pool 싱글턴 패턴
- `pool.ts`에서 Vercel Serverless 환경 고려한 글로벌 싱글턴 구현
- `max: 5`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 5000` 적절한 설정

### 5.2 문제점

#### 🔴 [CRITICAL] 에러 처리가 단순 Error throw
```typescript
catch (err) {
  throw new Error(`createUser 실패: ${(err as Error).message}`)
}
```
- **모든 쿼리 함수**가 에러를 일반 `Error`로 재포장하여 throw
- PG 고유 에러 코드(예: `23505` 중복 제약 위반, `23503` 외래 키 위반) 정보 소실
- API 레이어에서 HTTP 상태 코드(409, 400, 500) 매핑 불가
- **권장**: 커스텀 에러 클래스 또는 에러 코드 반환
  ```typescript
  class DatabaseError extends Error {
    constructor(
      public code: string,      // PG error code
      public message: string,
      public constraint?: string
    ) { super(message) }
  }
  ```

#### 🟡 [WARNING] 트랜잭션 미사용
- `createTeam` + `addTeamMember`가 별도 함수로 분리되어 있으나 **트랜잭션으로 묶이지 않음**
- 팀 생성은 성공했으나 멤버 추가 실패 시 고아 팀 생성 가능
- `addTeamMember` 호출 시 리더도 `team_members`에 삽입해야 하나 이 로직이 쿼리 레이어 밖에 있어야 함
- **권장**: 팀 생성 시 트랜잭션 내에서 INSERT teams → INSERT team_members 원자적으로 처리

#### 🟡 [WARNING] getPublicTeams의 LEFT JOIN 비효율
```sql
FROM teams t
JOIN users u ON u.id = t.leader_id
LEFT JOIN team_members tm ON tm.team_id = t.id
GROUP BY t.id, t.name, t.leader_id, t.created_at, u.name
```
- 전체 `team_members` 테이블을 LEFT JOIN 후 GROUP BY — 팀 수 증가 시 성능 저하
- **권장**: 서브쿼리 또는 COUNT 서브셀렉트
  ```sql
  SELECT t.id, t.name, t.leader_id, t.created_at,
         u.name AS leader_name,
         (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
  FROM teams t
  JOIN users u ON u.id = t.leader_id
  ORDER BY t.name ASC
  ```

#### 🟡 [WARNING] getMessagesByTeam에서 reverse() 호출
```typescript
return result.rows.reverse() // 오래된 순으로 반환
```
- DESC로 조회 후 reverse() — 메모리에서 배열 뒤집기. 메시지 수 증가 시 비효율
- **권장**: SQL에서 `ORDER BY sent_at ASC`로 직접 조회하거나, cursor 기반 페이지네이션 적용

#### 🟡 [WARNING] getUserTeams에서 LEADER 필터링 누락 가능성
- `team_members` 테이블에 리더도 명시적으로 삽입되어야 함
- `getUserTeams`는 `team_members` JOIN 기반으로, 리더가 `team_members`에 없으면 자신이 만든 팀을 조회 못 함
- 현재 `createTeam` 함수가 `team_members`에 리더를 자동 삽입하는지 불명확 (트랜잭션 문제와 연결)

#### 🟡 [MINOR] getUserByEmail에서 password_hash 불필요하게 노출 가능
```typescript
SELECT id, email, name, password_hash, created_at
```
- 인증 목적 외 호출에서 `password_hash` 포함 — 실수로 응답에 포함될 리스크
- **권장**: `getUserById`는 password_hash 제외, `getUserByEmailForAuth`로 분리

#### 🟡 [MINOR] pool.ts에서 개발 환경에서만 싱글턴 유지
```typescript
if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool
}
```
- `globalForPg.pgPool = pool` 할당이 `if` 블록 **안쪽**에 있음
- 즉, development에서도 **첫 번째 모듈 로드 시** `globalForPg.pgPool ??`에서 `globalForPg.pgPool`이 undefined이므로 새 Pool 생성 후, 그 다음 라인에서 할당
- 두 번째 모듈 로드(HMR) 시에는 `globalForPg.pgPool`이 있으므로 재사용 — 의도한 동작이 맞으나 코드가 혼란스러움
- **권장**: 가독성 개선
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    if (!globalForPg.pgPool) {
      globalForPg.pgPool = pool
    }
  }
  ```

---

## 6. 미구현 영역 평가

### 6.1 🔴 인증 유틸리티 (완전 미구현)

#### 필요 파일
- `backend/lib/auth/jwt.ts` — Access/Refresh Token 발급·검증
- `backend/lib/auth/password.ts` — bcrypt 해싱·검증

#### 예상 문제점
- `package.json`에 `bcryptjs`와 `jsonwebtoken`은 의존성으로 추가됨
- 하지만 실제 구현 코드가 **전혀 없음**
- swagger.json의 Bearer Auth scheme 동작 불가

#### 권장 구현 우선순위
1. `password.ts`: `hashPassword(password)`, `verifyPassword(password, hash)`
2. `jwt.ts`: `generateAccessToken(user)`, `generateRefreshToken(user)`, `verifyToken(token)`

### 6.2 🔴 미들웨어 (완전 미구현)

#### 필요 파일
- `backend/lib/middleware/withAuth.ts` — JWT 검증, userId 추출
- `backend/lib/middleware/withTeamRole.ts` — 팀 역할 검증

#### 예상 문제점
- 모든 보호된 API 엔드포인트(16개 중 13개)가 인증 필요
- 미들웨어 없이 API 라우트 구현 시 중복 코드 폭증

### 6.3 🔴 API 라우트 (16개 중 0개 구현)

#### 미구현 엔드포인트 목록
| # | Method | Path | 설명 | 우선순위 |
|---|--------|------|------|----------|
| 1 | POST | `/api/auth/signup` | 회원가입 | P0 |
| 2 | POST | `/api/auth/login` | 로그인 | P0 |
| 3 | POST | `/api/auth/refresh` | 토큰 재발급 | P0 |
| 4 | GET | `/api/teams` | 내 팀 목록 | P1 |
| 5 | POST | `/api/teams` | 팀 생성 | P1 |
| 6 | GET | `/api/teams/public` | 공개 팀 목록 | P1 |
| 7 | GET | `/api/teams/:teamId` | 팀 상세 | P1 |
| 8 | POST | `/api/teams/:teamId/join-requests` | 가입 신청 | P1 |
| 9 | GET | `/api/teams/:teamId/join-requests` | PENDING 신청 목록 (팀장) | P1 |
| 10 | PATCH | `/api/teams/:teamId/join-requests/:requestId` | 승인/거절 | P1 |
| 11 | GET | `/api/me/tasks` | 나의 할 일 | P1 |
| 12 | GET | `/api/teams/:teamId/schedules` | 일정 목록 | P2 |
| 13 | POST | `/api/teams/:teamId/schedules` | 일정 생성 | P2 |
| 14 | GET | `/api/teams/:teamId/schedules/:scheduleId` | 일정 상세 | P2 |
| 15 | PATCH | `/api/teams/:teamId/schedules/:scheduleId` | 일정 수정 | P2 |
| 16 | DELETE | `/api/teams/:teamId/schedules/:scheduleId` | 일정 삭제 | P2 |
| 17 | GET | `/api/teams/:teamId/chat` | 채팅 메시지 | P2 |

#### `backend/app/` 현재 상태
- `page.tsx` — Next.js 기본 Scaffold (삭제 또는 교체 필요)
- `layout.tsx` — 기본 레이아웃
- `globals.css` — Tailwind CSS 설정
- `favicon.ico` — 기본 파비콘
- **`app/api/` 디렉토리 자체가 존재하지 않음**

### 6.4 🔴 유틸리티 함수 미구현

#### 필요 파일
- `backend/lib/utils/apiResponse.ts` — 표준 API 응답 포맷
- `backend/lib/utils/timezone.ts` — KST/UTC 변환 유틸리티

#### 영향
- API 라우트 간 응답 형식 불일치 가능성
- 시간대 처리 로직 중복 구현 리스크

---

## 7. 보안 평가

### 7.1 잠재적 보안 이슈

#### 🔴 [CRITICAL] bcryptjs 대신 bcrypt 권장
- 현재 `bcryptjs` 사용 (순수 JS 구현, 네이티브 bcrypt 대비 느림)
- 프로덕션에서 `bcrypt` (네이티브 addon) 권장
- 다만 Vercel Serverless에서 네이티브 모듈 빌드 문제 발생 가능 — Trade-off 인지 필요

#### 🟡 [WARNING] JWT 시크릿 키 환경변수 관리
- 아직 구현되지 않았으나 `JWT_SECRET`, `JWT_REFRESH_SECRET`이 `.env.example`에 정의되어 있는지 확인 필요
- `backend/.env.example` 파일 존재但 내용 확인 불가 (읽지 않음)

#### 🟡 [WARNING] Rate Limiting 부재
- 회원가입, 로그인 엔드포인트에 Rate Limiting 미정의
- Brute Force 공격에 취약

#### 🟡 [WARNING] CORS 설정 정의 없음
- `next.config.ts`에 CORS 설정이 명시되어 있는지 확인 필요
- Vercel 배포 시 도메인 제한 권장

#### 🟡 [MINOR] 입력 검증 레이어 부재
- Swagger 스키마에 `maxLength`, `format` 정의는 있으나 실제 API 라우트에서 검증 로직 구현 필요
- Zod, Joi 등의 검증 라이브러리 도입 권장

---

## 8. 아키텍처 평가

### 8.1 장점

#### ✅ 3-Tier 아키텍처 준수
- Presentation(API Routes) → Business(Middleware) → Data(Queries) 분리 계획
- DB 쿼리 레이어가 이미 잘 구현됨

#### ✅ Vercel Serverless 고려사항 반영
- Connection Pool 싱글턴
- WebSocket 대신 HTTP Polling
- `max: 5`_pool size_

### 8.2 문제점

#### 🟡 [WARNING] Next.js App Router가 백엔드로 사용됨
- `backend/` 디렉토리가 Next.js 앱 구조 (`app/`, `next.config.ts`)
- 이는 **풀스택 프레임워크를 백엔드로만 사용**하는 형태
- 문제없으나, `frontend/`가 별도 디렉토리로 분리될 경우 Next.js 인스턴스가 2개가 됨
- **의도한 구조인지 확인 필요**: `backend/`가 API 서버 + 정적 프론트 호스팅을 모두 담당한다면 `frontend/` 디렉토리 불필요

#### 🟡 [WARNING] 디렉토리 구조 불일치
- 설계 문서(`4-project-structure.md`): `backend/` + `frontend/` 2개 디렉토리
- 실제: `backend/`만 존재, `frontend/` 없음
- `backend/app/`에 Next.js scaffold가 있어 백엔드가 프론트엔드를 포함하는 구조로 변경된 것으로 보이나 문서 업데이트 안 됨

#### 🟡 [MINOR] 테스트 스크립트 naming convention
- `test-db04.ts` ~ `test-db08.ts` — 번호만으로는 테스트 내용 파악 불가
- 권장: `test-db-join-requests.test.ts`, `test-chat-date-filtering.test.ts` 등

---

## 9. 패키지 의존성 평가

### 9.1 현재 의존성
```json
"dependencies": {
  "bcryptjs": "^3.0.3",
  "jsonwebtoken": "^9.0.3",
  "next": "16.2.2",
  "pg": "^8.20.0",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

### 9.2 문제점

#### 🟡 [WARNING] 누락된 의존성
| 패키지 | 용도 | 우선순위 |
|--------|------|----------|
| `zod` | 요청 본문 검증 | P0 |
| `@types/pg`는 있음 | ✅ 타입 정의 포함 | - |
| `typescript` | ✅ devDependencies 포함 | - |

#### 🟡 [MINOR] Next.js 16 안정성
- Next.js 16.2.2 사용 — 비교적 최신 버전
- RC 또는 Canary 아님 확인 필요

---

## 10. 권장 개선 사항 우선순위

### P0 — 즉시 착수 필요
1. **인증 유틸리티 구현** (`lib/auth/jwt.ts`, `lib/auth/password.ts`)
2. **미들웨어 구현** (`lib/middleware/withAuth.ts`, `lib/middleware/withTeamRole.ts`)
3. **API 응답 유틸리티 구현** (`lib/utils/apiResponse.ts`)
4. **핵심 API 라우트 구현** — Auth 3개 엔드포인트 우선

### P1 — 단기 개선
5. **DB 쿼리 에러 처리 개선** — PG 에러 코드 매핑
6. **트랜잭션 처리 추가** — 팀 생성 + 멤버 등록 원자적 처리
7. **team_join_requests 중복 방지 인덱스 추가**
8. **getPublicTeams 쿼리 최적화**
9. **Swagger UI 서빙 라우트 추가**
10. **입력 검증 미들웨어 도입** (Zod 권장)

### P2 — 중기 개선
11. **나머지 API 라우트 구현** (Teams, JoinRequests, Schedules, Chat)
12. **프론트엔드 구현 시작** 또는 `frontend/` 디렉토리 계획 재검토
13. **자동화된 테스트 스위트 구축** (Jest/Vitest)
14. **CI/CD 파이프라인 정의** (GitHub Actions)
15. **Rate Limiting 도입**
16. **CORS 설정 정의**

### P3 — 장기 개선
17. **swagger.json 파일 분할** (schemas/, paths/)
18. **chat_messages 역정규화 검토** (sender_name 컬럼 추가)
19. **Audit 컬럼 일관성 정책** (updated_at 자동 업데이트)
20. **PgBouncer 또는 Neon Driver 마이그레이션 검토** (Vercel Serverless 최적화)

---

## 11. 결론

### 잘된 점
- 📋 **설계 문서가 탁월함**: 12개 문서가 전 주기를 커버하고 상호 일관성 검증 완료. 개발의 나침반으로 충분함
- 🗄️ **DB 스키마가 견고함**: CHECK/FK 제약조건, 인덱스 전략이 비즈니스 규칙에 맞게 정의됨
- 💻 **DB 쿼리 레이어가 잘 구현됨**: 타입 안전성, Parameterized Query, 팀 격리 모두 준수

### 주요 문제점
- 🚨 **API 구현이 전무함**: 훌륭한 설계 문서와 DB 레이어가 있으나 **실제 API가 0개** 구현됨
- 🚨 **인증 시스템이 없음**: JWT, bcrypt 코드 전혀 없음 — 보호된 엔드포인트 모두 동작 불가
- 🚨 **문서-현실 괴리**: 설계 문서는 완성되었으나 구현은 25% 수준. `review-docs.md`의 "Perfect Consistency"는 문서 간 일치성만 평가했을 뿐 실제 구현률 아님

### 핵심 제언
**지금 당장 코드를 짜야 합니다.** 설계는 이미 완벽합니다. 다음 3가지만 순서대로 구현하면 API 서버의 뼈대가 완성됩니다:

1. `lib/auth/jwt.ts` + `lib/auth/password.ts` (2개 파일, 약 100줄)
2. `lib/middleware/withAuth.ts` (1개 파일, 약 40줄)
3. `app/api/auth/signup/route.ts` (1개 파일, 약 50줄)

이 3개 파일이 동작하면 나머지 13개 엔드포인트는 같은 패턴으로 빠르게 구현할 수 있습니다.
