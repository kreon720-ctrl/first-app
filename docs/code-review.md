# Backend 코드 리뷰

## 리뷰 일자
2026-04-09

## 요약
총 11건 발견, 11건 수정 완료.
- CRITICAL 2건 (트랜잭션 누락으로 인한 데이터 정합성 문제)
- HIGH 3건 (토큰 타입 미검증, 타임존 계산 오류, 날짜 유효성 누락)
- MEDIUM 3건 (any 타입, COALESCE null 클리어 불가, view 파라미터 미검증)
- LOW 3건 (unused import 3건)

---

## 발견 항목

### [CRITICAL] 팀 생성 시 createTeam + addTeamMember 트랜잭션 누락

- **파일**: `backend/app/api/teams/route.ts:77-78`
- **문제**: `createTeam` 성공 후 `addTeamMember` 가 실패하면 `teams` 테이블에만 행이 삽입되고 `team_members`에는 LEADER 행이 없는 고아 팀이 생성된다. 이후 어떤 사용자도 해당 팀에 접근할 수 없게 된다.
- **수정**: `pool.connect()`로 클라이언트를 획득하고 `BEGIN` / `COMMIT` / `ROLLBACK` 트랜잭션 블록으로 두 INSERT를 원자적으로 실행. `createTeam`, `addTeamMember` 개별 함수 대신 클라이언트 직접 쿼리 사용.
- **상태**: ✅ 수정 완료

---

### [CRITICAL] 가입 신청 APPROVE 시 updateJoinRequestStatus + addTeamMember 트랜잭션 누락

- **파일**: `backend/app/api/teams/[teamId]/join-requests/[requestId]/route.ts:80-84`
- **문제**: `updateJoinRequestStatus(APPROVED)` 성공 후 `addTeamMember` 가 실패하면 신청 상태는 APPROVED이지만 해당 사용자는 `team_members`에 추가되지 않아 팀 데이터가 불일치 상태가 된다. 해당 사용자는 팀에 진입할 수 없으나 재신청도 불가능하다.
- **수정**: APPROVE 경로 전체를 `BEGIN` / `COMMIT` / `ROLLBACK` 트랜잭션으로 감쌌다. REJECT는 단일 쓰기이므로 트랜잭션 불필요.
- **상태**: ✅ 수정 완료

---

### [HIGH] withAuth가 access 토큰 타입 클레임을 검증하지 않음

- **파일**: `backend/lib/middleware/withAuth.ts:40-50`
- **문제**: `verifyAccessToken`은 서명과 만료만 검증하고 `type` 클레임을 확인하지 않는다. `withAuth`도 반환된 payload의 `type`을 확인하지 않는다. 따라서 유효한 **refresh 토큰**을 Authorization 헤더에 담아 보내면 모든 보호된 API 엔드포인트에 접근할 수 있다. 탈취된 refresh 토큰이 access 토큰으로 오용될 수 있다.
- **수정**: `withAuth`에서 `payload.type !== 'access'` 조건을 추가하여 refresh 토큰으로의 인증을 차단.
- **상태**: ✅ 수정 완료

---

### [HIGH] getKstDateRange가 new Date(year, month, date)로 로컬 시간 기준 Date 생성

- **파일**: `backend/lib/utils/timezone.ts:118-137`
- **문제**: `baseKst`는 `+09:00` 파싱으로 올바른 KST 기준값을 가지지만, `new Date(year, month, date, 0, 0, 0, 0)` 생성자는 **로컬 시스템 시간** 기준으로 Date를 만든다. Vercel 서버리스 환경은 UTC이므로 `new Date(2026, 3, 8, 0, 0, 0)` 은 `2026-04-08T00:00:00Z` (UTC 자정)를 반환하는데, 이는 KST 기준 `2026-04-08T09:00:00+09:00` (KST 오전 9시)에 해당한다. month/week/day 범위가 9시간 뒤로 밀린다.
- **수정**: `kstMidnight` 헬퍼를 도입하여 ISO 8601 `+09:00` 오프셋 문자열로 Date를 생성. `new Date(year, month, date)` 패턴 완전 제거.
- **상태**: ✅ 수정 완료

---

### [HIGH] schedules PATCH에서 잘못된 날짜 문자열을 NaN 검사 없이 updateSchedule에 전달

- **파일**: `backend/app/api/teams/[teamId]/schedules/[scheduleId]/route.ts:101-113`
- **문제**: `startAt`/`endAt` 중 하나만 제공되는 경우, 제공된 값이 유효하지 않은 날짜 문자열이더라도 NaN 검사 조건(`!isNaN && !isNaN`)이 단락 평가로 통과되어 `NaN` Date가 DB 쿼리 파라미터로 전달된다. PostgreSQL이 에러를 던지지만 500 응답으로 처리된다.
- **수정**: 조건을 `isNaN(startDate.getTime()) || isNaN(endDate.getTime())` 로 변경하여 유효하지 않은 날짜가 있으면 즉시 400 반환.
- **상태**: ✅ 수정 완료

---

### [MEDIUM] messages/route.ts에서 messages 변수를 any[] 타입으로 선언

- **파일**: `backend/app/api/teams/[teamId]/messages/route.ts:47`
- **문제**: `let messages: any[]` 선언으로 타입 안전성이 없다. `ChatMessage` 타입이 이미 import되어 있으므로 사용해야 한다.
- **수정**: `let messages: ChatMessage[]` 로 변경.
- **상태**: ✅ 수정 완료

---

### [MEDIUM] updateSchedule의 description COALESCE로 null 명시 클리어 불가

- **파일**: `backend/lib/db/queries/scheduleQueries.ts:93-94`
- **문제**: `description = COALESCE($4, description)` 패턴은 `$4`가 `null`일 때 기존 값을 유지한다. `description`을 명시적으로 `null`(비어있음)로 업데이트하려는 경우 불가능하다. `UpdateScheduleParams`에서 `description?: string | null`을 허용하지만 실제 null 클리어는 동작하지 않는다.
- **수정**: `CASE WHEN $4::boolean THEN $5 ELSE description END` 패턴으로 변경. `'description' in params` 플래그를 파라미터로 전달하여 키가 존재하면 null 포함 값을 그대로 적용, 없으면 기존 값 유지.
- **상태**: ✅ 수정 완료

---

### [MEDIUM] schedules GET에서 view 쿼리 파라미터 유효성 검증 없음

- **파일**: `backend/app/api/teams/[teamId]/schedules/route.ts:42`
- **문제**: `view` 파라미터가 `month | week | day` 외의 값이면 `getKstDateRange`의 `default` 분기로 빠져 `day` 뷰로 처리된다. 클라이언트 버그를 조용히 무시하고 잘못된 범위를 반환한다.
- **수정**: 유효한 값 배열로 검증 후 유효하지 않으면 400 반환.
- **상태**: ✅ 수정 완료

---

### [LOW] teams/route.ts에서 withTeamRole 미사용 import

- **파일**: `backend/app/api/teams/route.ts:3`
- **문제**: `withTeamRole`이 import되었지만 해당 파일의 GET/POST 핸들러에서 사용되지 않는다.
- **수정**: import 제거. 아울러 `getTeamById`, `getTeamMembers`도 트랜잭션 리팩터링 과정에서 불필요해져 제거.
- **상태**: ✅ 수정 완료

---

### [LOW] join-requests/route.ts에서 getJoinRequestById, updateJoinRequestStatus, addTeamMember 미사용 import

- **파일**: `backend/app/api/teams/[teamId]/join-requests/route.ts:7-10`
- **문제**: `getJoinRequestById`, `updateJoinRequestStatus`, `addTeamMember`가 import되었지만 이 파일(POST/GET 핸들러)에서는 사용되지 않는다. 이 함수들은 `[requestId]/route.ts`에서 사용된다.
- **수정**: 세 import 모두 제거.
- **상태**: ✅ 수정 완료

---

### [LOW] chatQueries.ts의 KST_OFFSET_MS 미사용 dead code

- **파일**: `backend/lib/db/queries/chatQueries.ts:27`
- **문제**: `KST_OFFSET_MS` 상수를 선언 후 `void KST_OFFSET_MS`로 사용한다. 실제 변환에는 사용되지 않고, 주석으로 설명된 대로 `+09:00` ISO 파싱이 실제 변환을 담당한다. `void` 표현식은 ESLint 경고를 우회하기 위한 패턴이지만 불필요한 코드다.
- **수정**: `KST_OFFSET_MS` 선언과 `void` 표현식 제거.
- **상태**: ✅ 수정 완료

---

## 수정 없는 양호 항목

- **JWT 시크릿 하드코딩 없음**: `jwt.ts`에서 환경변수가 없을 때 폴백 문자열 없이 즉시 throw. 안전.
- **SQL 인젝션 방어**: 모든 쿼리가 파라미터화된 `$1, $2, ...` 형식 사용. 문자열 보간 없음.
- **비밀번호 응답 노출 없음**: 모든 응답에서 `password_hash` 필드 제외 확인.
- **pool.end() 호출 없음**: 라우트 핸들러 내에서 `pool.end()` 호출 없음. Vercel 환경에서 안전.
- **글로벌 싱글턴 풀 패턴**: HMR 환경에서 풀 재생성 방지 올바르게 구현.
- **팀 격리**: `getScheduleById(teamId, id)` 등 모든 팀 리소스 쿼리에 `team_id` 조건 포함. 다른 팀 데이터 접근 불가.
- **비밀번호 강도 검증**: `validatePasswordStrength`에서 최소 8자, 영문+숫자 조합 검증.
- **withTeamRole 멤버십 검증**: 팀 데이터 접근 전 반드시 `withTeamRole` 또는 `requireLeader` 통과 확인.
- **DatabaseError 클래스**: PG 에러코드 보존 및 HTTP 상태코드 매핑 설계 적절.
- **KST 날짜 파싱**: `kstDateToUtcRange`는 `+09:00` ISO 파싱으로 정확하게 UTC 변환. `chatQueries.ts`와 `timezone.ts` 모두 동일 방식 사용.
- **refresh 엔드포인트 타입 검증**: `payload.type !== 'refresh'` 체크로 access 토큰의 refresh 오용 방지.
- **TypeScript strict 모드**: `tsconfig.json`에 `"strict": true` 활성화.
