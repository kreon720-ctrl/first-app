# Backend 일관성 점검 리뷰

## 리뷰 일자
2026-04-09

## 요약
총 **14건** 발견, **11건 수정**, **3건 확인 필요(ACTION NEEDED)**

---

## 점검 항목

### [FIXED-01] getPublicTeams 정렬 순서 불일치
- **카테고리**: API 일관성 / DB 스키마
- **파일**: `backend/lib/db/queries/teamQueries.ts` (line 73)
- **문제**: `getPublicTeams()` 함수가 `ORDER BY t.created_at DESC`로 정렬하고 있었으나, API 명세(`docs/7-api-spec.md`) 및 Swagger(`GET /teams/public`)는 "팀명 오름차순 정렬"을 명시
- **수정**: `ORDER BY t.created_at DESC` → `ORDER BY t.name ASC`

---

### [FIXED-02] getPublicTeams LIMIT 누락
- **카테고리**: API 일관성
- **파일**: `backend/lib/db/queries/teamQueries.ts` (line 74)
- **문제**: API 명세 및 Swagger에 "최대 100개까지 반환" 명시되어 있으나 SQL에 `LIMIT` 절 없음 — 팀 수가 많을 경우 응답 크기가 무제한으로 증가
- **수정**: 쿼리 끝에 `LIMIT 100` 추가

---

### [FIXED-03] POST join-requests 구성원 중복 체크 로직 오류
- **카테고리**: API 일관성 / 인증·권한
- **파일**: `backend/app/api/teams/[teamId]/join-requests/route.ts` (line 53–71)
- **문제**: `createJoinRequest()`는 `team_join_requests` 테이블에만 INSERT하므로 `team_members` unique constraint를 절대 위반할 수 없음. 이미 구성원인 경우 `err.constraint?.includes('team_members')` 조건이 실제로 발동되지 않아 409가 아닌 500 반환
- **수정**: INSERT 전에 `getUserTeamRole(teamId, userId)`로 이미 구성원 여부를 먼저 확인하고 409 반환. PENDING 중복 신청은 DB unique index(`idx_team_join_requests_pending_unique`)가 잡도록 유지

---

### [FIXED-04] createJoinRequest PG 에러 코드 손실
- **카테고리**: API 일관성
- **파일**: `backend/lib/db/queries/joinRequestQueries.ts` (line 32–34)
- **문제**: `catch` 블록에서 `throw new Error(...)` 로 감싸면 PG 에러 코드(`code`, `constraint`)가 유실됨. route에서 `DatabaseError.isUniqueViolation()` 로 PENDING 중복을 판별하려 해도 항상 실패하여 500 반환
- **수정**: `catch` 블록에서 PG 에러 속성을 보존하는 `throw new DatabaseError(message, code, constraint, detail)` 패턴으로 변경

---

### [FIXED-05] PATCH join-request 응답에 requesterName 누락
- **카테고리**: 응답 필드 / API 일관성
- **파일**: `backend/app/api/teams/[teamId]/join-requests/[requestId]/route.ts` (line 111–119)
- **문제**: API 명세(`docs/7-api-spec.md`)와 Swagger(`JoinRequestDetail` schema)는 PATCH 응답에 `requesterName`(및 Swagger의 `requesterEmail`) 필드를 포함해야 한다고 명시. 소스 코드는 `requesterName`을 반환하지 않았음
- **수정**: 처리 후 `getUserById(joinRequest.requester_id)` 호출로 신청자 정보를 조회하여 `requesterName` 필드를 응답에 추가. `userQueries.ts`에서 `getUserById` import 추가

---

### [FIXED-06] createChatMessage 응답에 sender_name 누락
- **카테고리**: 응답 필드
- **파일**: `backend/lib/db/queries/chatQueries.ts` (line 32–47)
- **문제**: `createChatMessage()`의 INSERT RETURNING 절에 users JOIN이 없어 `sender_name`이 undefined. `ChatMessage` 인터페이스에 `sender_name: string`이 선언되어 있고 POST messages route가 `message.sender_name`을 직접 응답에 매핑하므로 실제로 `senderName: undefined`가 반환됨
- **수정**: INSERT 후 `SELECT name FROM users WHERE id = $1`로 발신자 이름을 조회하여 반환 객체에 합성 (`{ ...row, sender_name: ... }`)

---

### [FIXED-07] Swagger GET /teams/{teamId}/schedules — view·date 필수 여부 불일치
- **카테고리**: Swagger
- **파일**: `backend/swagger/swagger.json` (schedules GET parameters)
- **문제**: Swagger에서 `view`와 `date`를 `required: true`로 선언했으나, 소스 코드(`route.ts`)는 두 파라미터 모두 선택적으로 처리(기본값: `view=month`, `date=오늘`)
- **수정**: `required: false`로 변경. `view`에 `"default": "month"` 추가. description에 기본값 명시

---

### [FIXED-08] Swagger GET /teams/{teamId}/schedules — 응답 스키마에 view·date 누락
- **카테고리**: Swagger
- **파일**: `backend/swagger/swagger.json` (schedules GET 200 response)
- **문제**: 소스 코드는 `{ schedules, view, date }` 를 반환하나 Swagger 응답 스키마에는 `schedules`만 있고 `view`, `date`가 없음
- **수정**: 응답 schema에 `view`(enum), `date`(string) 필드 추가, `required` 배열에도 추가

---

### [FIXED-09] Swagger GET /teams/{teamId}/messages — date 필수 여부 및 응답 스키마 불일치
- **카테고리**: Swagger
- **파일**: `backend/swagger/swagger.json` (messages GET)
- **문제 1**: Swagger에서 `date`를 `required: true`로 선언했으나 소스 코드는 `date` 미제공 시 `getMessagesByTeam()`으로 폴백하는 옵션도 지원
- **문제 2**: Swagger 200 응답 schema가 `"required": ["date", "messages"]`로 `date` 필드를 포함하나, 소스 코드 응답에는 `date`가 없음 (`{ messages: [...] }` 만 반환)
- **수정**: `date` → `required: false`, `limit`·`before` 쿼리 파라미터 설명 추가. 200 응답 required에서 `date` 제거 및 schema에서 `date` 필드 삭제

---

### [FIXED-10] Swagger 에러 메시지 불일치 (Schedules, Messages)
- **카테고리**: Swagger
- **파일**: `backend/swagger/swagger.json`
- **문제**: Swagger example 에러 메시지가 소스 코드 실제 반환 메시지와 다름
  - POST schedules: `"startAt과 endAt은 필수입니다."` → 소스: `"시작일과 종료일은 필수입니다."`
  - POST/PATCH schedules: `"종료 일시는 시작 일시보다 이후여야 합니다."` → 소스: `"종료일은 시작일보다 늦어야 합니다."`
  - POST/PATCH schedules: `"날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요."` → 소스: `"날짜 형식이 올바르지 않습니다."`
  - GET schedules: `"view 파라미터는 month, week, day 중 하나이어야 합니다."` → 소스: `"view는 month, week, day 중 하나여야 합니다."`
  - POST messages: `"type은 NORMAL 또는 SCHEDULE_REQUEST이어야 합니다."` → 소스: `"잘못된 메시지 타입입니다."`
- **수정**: 각 example 값을 소스 코드 실제 메시지와 일치하도록 수정

---

### [FIXED-11] Swagger Message schema에 createdAt 필드 누락
- **카테고리**: Swagger
- **파일**: `backend/swagger/swagger.json` (`Message` schema)
- **문제**: 소스 코드는 GET/POST messages 응답에 `createdAt` 필드를 포함하나, Swagger `Message` schema의 `required` 배열과 `properties`에 `createdAt`이 없음
- **수정**: `required` 배열에 `"createdAt"` 추가, `properties`에 `createdAt` (date-time) 정의 추가

---

### [FIXED-12] pool.ts — dev 조건 범위 불일치
- **카테고리**: 환경변수
- **파일**: `backend/lib/db/pool.ts` (line 17)
- **문제**: `docs/4-project-structure.md` 설계 문서에서 `process.env.NODE_ENV !== 'production'` 조건을 명시했으나 소스 코드는 `=== 'development'`를 사용. `test` 환경에서 HMR 싱글턴 혜택을 받지 못함
- **수정**: `=== 'development'` → `!== 'production'`. 이중 if 중첩도 단순화

---

### [FIXED-doc-01] docs/7-api-spec.md GET schedules view·date 필수 여부 수정
- **카테고리**: API 일관성 (문서 오타/오기)
- **파일**: `docs/7-api-spec.md` (line 768–769)
- **문제**: 설계 문서가 `view`, `date` 파라미터를 필수(O)로 기록했으나 실제 소스 코드는 기본값을 제공하며 선택적으로 처리
- **수정**: 필수 `O` → `X`, 기본값 열에 `month` / `오늘` 추가

---

### [CONFIRMED OK-01] DB 테이블·컬럼명 일관성
모든 쿼리 파일의 테이블명(`users`, `teams`, `team_members`, `team_join_requests`, `schedules`, `chat_messages`)과 컬럼명(`leader_id`, `requester_id`, `created_by`, `start_at`, `end_at`, `sent_at`, `password_hash`)이 `database/schema.sql`과 일치 확인

---

### [CONFIRMED OK-02] camelCase 변환 — API 응답 필드
모든 route handler에서 DB snake_case → API camelCase 변환 확인:
- `leader_id` → `leaderId`, `created_at` → `createdAt`, `team_id` → `teamId`, `requester_id` → `requesterId`, `start_at` → `startAt`, `end_at` → `endAt`, `sent_at` → `sentAt`, `created_by` → `createdBy`

---

### [CONFIRMED OK-03] 환경변수 — .env.example 완전성
`.env.example`에 선언된 5개 변수(`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`)가 소스 코드에서 실제로 사용되는 모든 환경변수와 일치. 사용하지 않는 변수 없음

---

### [CONFIRMED OK-04] 인증·권한 미들웨어 적용 완전성
- 모든 보호 엔드포인트에 `withAuth` 적용 확인
- 팀장 전용 엔드포인트(`GET/PATCH join-requests`, `PATCH join-request[id]`, `POST/PATCH/DELETE schedules`) 에 `requireLeader` 적용 확인
- 팀원 접근 엔드포인트(`GET teams[id]`, `GET/POST schedules`, `GET/POST messages`) 에 `withTeamRole` 적용 확인
- 공개 엔드포인트(`POST signup`, `POST login`, `POST refresh`) 에 auth 미들웨어 미적용 확인

---

### [CONFIRMED OK-05] DB CHECK 제약 및 인덱스 일관성
- `team_members.role`: `CHECK (role IN ('LEADER', 'MEMBER'))` — 쿼리에서 'LEADER'/'MEMBER' 상수 사용, 일치
- `team_join_requests.status`: `CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))` — 쿼리에서 해당 값만 사용
- `chat_messages.type`: `CHECK (type IN ('NORMAL', 'SCHEDULE_REQUEST'))` — 쿼리에서 해당 값만 사용
- `schedules.end_at > start_at`: source route에서 애플리케이션 레이어 검증도 중복 적용 — 이중 방어 OK
- `idx_team_join_requests_pending_unique` (PENDING 중복 방지 partial index): FIXED-04 수정 후 createJoinRequest에서 DatabaseError로 올바르게 전파됨

---

### [CONFIRMED OK-06] Swagger 스키마 구조 — Auth, Teams, JoinRequests 기본 일치
- `AuthResponse`, `User`, `Team`, `PublicTeam`, `TeamMember`, `TeamDetail`, `JoinRequest`, `JoinRequestDetail`, `TaskItem`, `Schedule` 스키마가 소스 코드 응답 객체와 필드 수준에서 일치 확인 (FIXED 항목 제외)

---

### [ACTION NEEDED-01] GET schedules/messages에서 존재하지 않는 teamId → 403 반환 (설계: 404)
- **카테고리**: API 일관성 / 인증·권한
- **파일**: `backend/app/api/teams/[teamId]/schedules/route.ts` (GET), `backend/app/api/teams/[teamId]/messages/route.ts` (GET)
- **문제**: 두 route 모두 팀 존재 여부 확인(`getTeamById`) 없이 바로 `withTeamRole`을 호출. teamId가 존재하지 않으면 `getUserTeamRole`이 null을 반환하고 403을 반환. API 명세는 404를 명시
- **설계 결정 필요**: 보안상 존재하지 않는 teamId를 404로 명시할 경우 정보 노출 우려 있음. 현재처럼 403으로 통일하거나, `getTeamById` 선행 조회 후 404 → 403 순으로 처리할지 결정 필요

---

### [ACTION NEEDED-02] PATCH join-request 응답에 requesterEmail 미포함
- **카테고리**: 응답 필드
- **파일**: `backend/app/api/teams/[teamId]/join-requests/[requestId]/route.ts`
- **문제**: API 설계 문서 예시(`docs/7-api-spec.md` PATCH 응답)에는 `requesterName`만 있으나 Swagger `JoinRequestDetail` schema의 `required`에 `requesterEmail`도 포함되어 있음. FIXED-05에서 `requesterName`은 추가했지만 `requesterEmail`은 추가하지 않음
- **설계 결정 필요**: PATCH 응답에 `requesterEmail`을 포함할지 결정 필요. 포함 시 `getUserById` 반환 값에서 `email` 필드를 추가로 매핑하면 됨. 포함 여부에 따라 Swagger `JoinRequestDetail` schema도 정합 필요

---

### [ACTION NEEDED-03] docs/7-api-spec.md — POST schedules/PATCH schedules 에러 메시지 소스 코드와 불일치
- **카테고리**: API 일관성 (설계 문서 vs 소스)
- **파일**: `docs/7-api-spec.md` (lines 887–890)
- **문제**: 설계 문서에 `"startAt과 endAt은 필수입니다."`, `"종료 일시는 시작 일시보다 이후여야 합니다."`, `"날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요."` 로 기재되어 있으나 소스 코드(및 수정된 Swagger)는 `"시작일과 종료일은 필수입니다."`, `"종료일은 시작일보다 늦어야 합니다."`, `"날짜 형식이 올바르지 않습니다."` 를 반환
- **설계 결정 필요**: 설계 문서를 소스 코드 기준으로 갱신할지 또는 소스 코드의 에러 메시지를 설계 문서 기준으로 통일할지 결정 필요. 한국어 표현 차이이므로 어느 쪽이든 무방하나 단일 truth source 확보 필요

---

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `backend/lib/db/queries/teamQueries.ts` | getPublicTeams 정렬 ORDER BY t.name ASC로 변경, LIMIT 100 추가 |
| `backend/lib/db/queries/joinRequestQueries.ts` | createJoinRequest catch 블록에서 DatabaseError로 래핑, DatabaseError import 추가 |
| `backend/lib/db/queries/chatQueries.ts` | createChatMessage 후 users SELECT로 sender_name 채워서 반환 |
| `backend/lib/db/pool.ts` | NODE_ENV 조건 `=== 'development'` → `!== 'production'` 변경 |
| `backend/app/api/teams/[teamId]/join-requests/route.ts` | POST: getUserTeamRole로 구성원 여부 선제 확인 후 409. getUserTeamRole import 추가. DatabaseError catch 단순화 |
| `backend/app/api/teams/[teamId]/join-requests/[requestId]/route.ts` | PATCH 응답에 requesterName 추가. getUserById import 추가 |
| `backend/swagger/swagger.json` | view·date required 수정, schedules 응답 스키마 보완, messages 응답 스키마 수정, 에러 메시지 소스 일치, Message createdAt 추가 |
| `docs/7-api-spec.md` | GET schedules view·date 필수 여부 수정 (O→X), 기본값 명시 |
