# Team CalTalk API 명세서

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-08 | 섹션 4(Invitations) 전면 제거 → 섹션 4(Join Requests)로 교체. GET /api/teams/public, POST /api/teams/:teamId/join-requests, GET /api/teams/:teamId/join-requests, PATCH /api/teams/:teamId/join-requests/:requestId, GET /api/me/tasks 추가. 엔드포인트 요약 테이블 갱신 |
| 1.2 | 2026-04-08 | POST /api/teams 비즈니스 규칙에서 잘못된 BR-03 참조 제거 (BR-01, FR-02-1 으로 수정) |

---

## 1. 공통 사항

### Base URL

```
/api
```

### 인증

로그인 후 발급된 Access Token을 모든 인증 필요 요청의 헤더에 포함합니다.

```
Authorization: Bearer <accessToken>
```

- Access Token 유효 기간: 15분
- 만료 시 `POST /api/auth/refresh`로 재발급 필요

### 공통 에러 응답 형식

```json
{ "error": "에러 메시지" }
```

### 날짜 형식

- 모든 날짜/시각 값은 **ISO 8601 (UTC)** 형식으로 전송합니다.
- 예: `2026-04-07T09:00:00.000Z`
- DB 저장: UTC, API 응답: UTC (클라이언트에서 KST 변환 또는 서버 응답 시 KST 명시)
- 채팅 메시지 날짜 그룹핑은 `sentAt` 기준 **KST(UTC+9)** 날짜로 처리됩니다.

### ID 형식

모든 ID는 **UUID v4** 형식입니다.

### 응답 필드 네이밍 컨벤션

- API 요청/응답 바디는 **camelCase** 를 사용합니다.
- DB 컬럼(snake_case)과 매핑하여 API 레이어에서 변환됩니다.

### HTTP 상태 코드 요약

| 코드 | 의미 |
|------|------|
| 200 | 성공 (조회, 수정) |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 401 | 인증 실패 (토큰 없음 또는 만료) |
| 403 | 권한 없음 (역할 부족) |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 데이터) |
| 500 | 서버 내부 오류 |

---

## 2. Auth (인증)

---

### POST /api/auth/signup

**설명**: 신규 사용자 회원가입. 계정 생성 후 Access Token과 Refresh Token을 발급합니다.
**인증**: 불필요
**권한**: 없음

**Request**

- Headers: 없음
- Body:

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "password": "password1234"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 이메일 형식, 최대 255자 |
| name | string | O | 표시 이름, 최대 50자 |
| password | string | O | 평문 비밀번호 (서버에서 bcrypt 해싱) |

**Response**

- 성공: `201 Created`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "이메일 형식이 올바르지 않습니다." | 이메일 유효성 검증 실패 |
| 400 | "이름은 최대 50자까지 입력 가능합니다." | name 길이 초과 |
| 400 | "필수 입력 항목이 누락되었습니다." | email, name, password 중 하나 이상 누락 |
| 409 | "이미 사용 중인 이메일입니다." | 이메일 중복 (FR-01-2) |

**비즈니스 규칙**: FR-01-1, FR-01-2, FR-01-4

---

### POST /api/auth/login

**설명**: 이메일과 비밀번호로 로그인하여 Access Token과 Refresh Token을 발급합니다.
**인증**: 불필요
**권한**: 없음

**Request**

- Headers: 없음
- Body:

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 가입된 이메일 |
| password | string | O | 평문 비밀번호 |

**Response**

- 성공: `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "필수 입력 항목이 누락되었습니다." | email 또는 password 누락 |
| 401 | "이메일 또는 비밀번호가 올바르지 않습니다." | 미가입 이메일 또는 비밀번호 불일치 |

**비즈니스 규칙**: BR-01, FR-01-3

---

### POST /api/auth/refresh

**설명**: Refresh Token을 이용해 만료된 Access Token을 재발급합니다.
**인증**: 불필요 (Refresh Token을 바디로 전달)
**권한**: 없음

**Request**

- Headers: 없음
- Body:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| refreshToken | string | O | 로그인 또는 이전 refresh 시 발급받은 Refresh Token |

**Response**

- 성공: `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "refreshToken이 누락되었습니다." | 바디에 refreshToken 없음 |
| 401 | "유효하지 않거나 만료된 Refresh Token입니다." | 토큰 검증 실패 또는 만료 |

**비즈니스 규칙**: FR-01-6

---

## 3. Teams (팀 관리)

---

### GET /api/teams

**설명**: 현재 로그인한 사용자가 속한 팀 목록을 조회합니다. 공개 탐색용 전체 팀 목록은 `GET /api/teams/public`을 사용합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters: 없음
- Query Parameters: 없음
- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "teams": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "name": "개발팀",
      "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "myRole": "LEADER",
      "createdAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-ab2345678901",
      "name": "디자인팀",
      "leaderId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "myRole": "MEMBER",
      "createdAt": "2026-04-03T00:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 팀 UUID |
| name | string | 팀 이름 |
| leaderId | string | 팀장 사용자 UUID |
| myRole | string | 요청자의 해당 팀 역할 (`LEADER` 또는 `MEMBER`) |
| createdAt | string | 팀 생성 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |

**비즈니스 규칙**: BR-01, BR-06, FR-02-9

---

### POST /api/teams

**설명**: 새 팀을 생성합니다. 생성자는 자동으로 해당 팀의 LEADER로 등록됩니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (누구든 팀 생성 가능, 생성 시 LEADER 역할 부여)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Body:

```json
{
  "name": "개발팀"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 팀 이름, 최대 100자 |

**Response**

- 성공: `201 Created`

```json
{
  "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "name": "개발팀",
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "myRole": "LEADER",
  "createdAt": "2026-04-07T09:00:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "팀 이름은 필수입니다." | name 누락 |
| 400 | "팀 이름은 최대 100자까지 입력 가능합니다." | name 길이 초과 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |

**비즈니스 규칙**: BR-01, FR-02-1

---

### GET /api/teams/public

**설명**: 로그인한 모든 사용자가 가입을 고려하기 위해 전체 공개 팀 목록을 조회합니다. 각 팀의 현재 구성원 수를 포함합니다. 팀명 오름차순으로 정렬되며 최대 100개까지 반환합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (로그인한 모든 사용자)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters: 없음
- Query Parameters: 없음
- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "teams": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "name": "개발팀",
      "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "leaderName": "홍길동",
      "memberCount": 5,
      "createdAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-ab2345678901",
      "name": "디자인팀",
      "leaderId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "leaderName": "이영희",
      "memberCount": 3,
      "createdAt": "2026-04-03T00:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 팀 UUID |
| name | string | 팀 이름 |
| leaderId | string | 팀장 사용자 UUID |
| leaderName | string | 팀장 표시 이름 |
| memberCount | number | 현재 팀 구성원 수 (LEADER + MEMBER 합산) |
| createdAt | string | 팀 생성 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |

**비즈니스 규칙**: BR-01, BR-07, FR-02-2

---

### GET /api/teams/:teamId

**설명**: 특정 팀의 상세 정보를 조회합니다. 해당 팀의 구성원만 접근 가능합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (해당 팀 소속 구성원)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 조회할 팀의 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "name": "개발팀",
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "myRole": "LEADER",
  "createdAt": "2026-04-01T00:00:00.000Z",
  "members": [
    {
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "홍길동",
      "email": "leader@example.com",
      "role": "LEADER",
      "joinedAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "userId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "name": "김철수",
      "email": "member@example.com",
      "role": "MEMBER",
      "joinedAt": "2026-04-02T00:00:00.000Z"
    }
  ]
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-06

---

## 4. Join Requests (팀 가입 신청)

---

### POST /api/teams/:teamId/join-requests

**설명**: 로그인한 사용자가 특정 팀에 가입 신청을 제출합니다. `TeamJoinRequest` 레코드를 `PENDING` 상태로 생성하며, 해당 팀 팀장의 나의 할 일 목록에 자동으로 표시됩니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (로그인한 모든 사용자, 단 해당 팀의 구성원이 아닌 경우에 한함)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 가입 신청할 팀의 UUID |

- Body: 없음 (신청자는 인증 토큰에서 추출)

**Response**

- 성공: `201 Created`

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "requesterId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
  "status": "PENDING",
  "requestedAt": "2026-04-08T09:00:00.000Z",
  "respondedAt": null
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 가입 신청 UUID |
| teamId | string | 신청 대상 팀 UUID |
| teamName | string | 신청 대상 팀 이름 |
| requesterId | string | 신청자 사용자 UUID |
| status | string | 신청 상태: 항상 `PENDING` |
| requestedAt | string | 신청 일시 (UTC ISO 8601) |
| respondedAt | string \| null | 응답 일시. 신청 직후 `null` |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 409 | "이미 해당 팀의 구성원입니다." | 요청자가 이미 team_members에 존재 (FR-02-4) |
| 409 | "이미 가입 신청이 진행 중입니다." | 동일 팀에 동일 사용자의 PENDING 신청이 이미 존재 (FR-02-5) |

**비즈니스 규칙**: BR-01, BR-07, FR-02-3, FR-02-4, FR-02-5

---

### GET /api/teams/:teamId/join-requests

**설명**: 특정 팀의 PENDING 상태 가입 신청 목록을 조회합니다. 팀장(LEADER)만 접근할 수 있으며, 나의 할 일 화면에서 팀별로 신청을 확인하는 용도로 사용됩니다.
**인증**: 필요
**권한**: LEADER만 (해당 팀의 팀장)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 조회할 팀의 UUID |

- Query Parameters: 없음
- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "joinRequests": [
    {
      "id": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
      "requesterId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "requesterName": "김철수",
      "requesterEmail": "kimcs@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-08T09:00:00.000Z",
      "respondedAt": null
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| teamId | string | 팀 UUID |
| teamName | string | 팀 이름 |
| joinRequests | array | PENDING 상태 가입 신청 배열 (`requestedAt` 오름차순 정렬) |
| joinRequests[].id | string | 가입 신청 UUID |
| joinRequests[].requesterId | string | 신청자 UUID |
| joinRequests[].requesterName | string | 신청자 표시 이름 |
| joinRequests[].requesterEmail | string | 신청자 이메일 |
| joinRequests[].status | string | 신청 상태: `PENDING` |
| joinRequests[].requestedAt | string | 신청 일시 (UTC ISO 8601) |
| joinRequests[].respondedAt | string \| null | 응답 일시. PENDING 상태에서 항상 `null` |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 가입 신청 목록을 조회할 수 있습니다." | 요청자의 역할이 MEMBER 또는 해당 팀 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-03, FR-02-6

---

### PATCH /api/teams/:teamId/join-requests/:requestId

**설명**: 팀장이 PENDING 상태의 가입 신청을 승인(APPROVE) 또는 거절(REJECT)합니다. 승인 시 `team_members`에 MEMBER로 원자적 등록되고 `status`가 `APPROVED`로 갱신됩니다.
**인증**: 필요
**권한**: LEADER만 (해당 팀의 팀장)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| requestId | string (UUID) | 처리할 가입 신청 UUID |

- Body:

```json
{
  "action": "APPROVE"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| action | string | O | `APPROVE` 또는 `REJECT` |

**Response**

- 성공 (승인): `200 OK`

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "requesterId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
  "requesterName": "김철수",
  "status": "APPROVED",
  "requestedAt": "2026-04-08T09:00:00.000Z",
  "respondedAt": "2026-04-08T09:10:00.000Z"
}
```

- 성공 (거절): `200 OK`

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "requesterId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
  "requesterName": "김철수",
  "status": "REJECTED",
  "requestedAt": "2026-04-08T09:00:00.000Z",
  "respondedAt": "2026-04-08T09:10:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "action은 APPROVE 또는 REJECT이어야 합니다." | 허용되지 않는 action 값 |
| 400 | "action은 필수입니다." | action 필드 누락 |
| 400 | "이미 처리된 가입 신청입니다." | status가 이미 APPROVED 또는 REJECTED |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 가입 신청을 처리할 수 있습니다." | 요청자의 역할이 MEMBER 또는 해당 팀 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "가입 신청을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 requestId |

**비즈니스 규칙**: BR-01, BR-03, FR-02-7

> 참고: `action=APPROVE` 처리 시 서버에서 원자적으로 `team_join_requests.status = APPROVED` + `team_members(role=MEMBER)` 등록이 이루어집니다.

---

### GET /api/me/tasks

**설명**: 현재 로그인한 사용자가 LEADER로 있는 **모든 팀**의 PENDING 가입 신청을 한 번에 조회합니다. 나의 할 일(My Tasks) 화면의 메인 데이터 소스입니다.
**인증**: 필요
**권한**: LEADER만 (MEMBER 역할만 가진 사용자는 빈 배열 반환)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters: 없음
- Query Parameters: 없음
- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "totalPendingCount": 2,
  "tasks": [
    {
      "id": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "teamName": "개발팀",
      "requesterId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "requesterName": "김철수",
      "requesterEmail": "kimcs@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-08T09:00:00.000Z",
      "respondedAt": null
    },
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-de6789012345",
      "teamId": "c2d3e4f5-a6b7-8901-cdef-ab2345678901",
      "teamName": "디자인팀",
      "requesterId": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
      "requesterName": "박지수",
      "requesterEmail": "parkjs@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-08T10:30:00.000Z",
      "respondedAt": null
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| totalPendingCount | number | 전체 PENDING 가입 신청 수 |
| tasks | array | PENDING 가입 신청 배열 (`requestedAt` 오름차순 정렬) |
| tasks[].id | string | 가입 신청 UUID |
| tasks[].teamId | string | 신청 대상 팀 UUID |
| tasks[].teamName | string | 신청 대상 팀 이름 |
| tasks[].requesterId | string | 신청자 UUID |
| tasks[].requesterName | string | 신청자 표시 이름 |
| tasks[].requesterEmail | string | 신청자 이메일 |
| tasks[].status | string | 신청 상태: `PENDING` |
| tasks[].requestedAt | string | 신청 일시 (UTC ISO 8601) |
| tasks[].respondedAt | string \| null | 응답 일시. PENDING 상태에서 항상 `null` |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |

**비즈니스 규칙**: BR-01, BR-03, FR-02-8

---

## 5. Schedules (팀 일정)

---

### GET /api/teams/:teamId/schedules

**설명**: 팀의 일정을 조회합니다. 월/주/일 단위 뷰와 기준 날짜를 Query Parameter로 지정합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (해당 팀 소속 구성원)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 조회할 팀의 UUID |

- Query Parameters:

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| view | string | X | `month` | 조회 단위: `month`, `week`, `day`. 기본값: `month` |
| date | string | X | 오늘 | 기준 날짜 (YYYY-MM-DD, KST 기준). 기본값: 오늘. `month`는 해당 월 전체, `week`는 해당 주 전체(일~토), `day`는 해당 하루 |

- 요청 예시:
  ```
  GET /api/teams/b1c2d3e4-f5a6-7890-bcde-fa1234567890/schedules?view=month&date=2026-04-01
  GET /api/teams/b1c2d3e4-f5a6-7890-bcde-fa1234567890/schedules?view=week&date=2026-04-07
  GET /api/teams/b1c2d3e4-f5a6-7890-bcde-fa1234567890/schedules?view=day&date=2026-04-07
  ```

**Response**

- 성공: `200 OK`

```json
{
  "schedules": [
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-de6789012345",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "title": "주간 팀 미팅",
      "description": "이번 주 진행 상황 공유 및 다음 주 계획 수립",
      "startAt": "2026-04-07T01:00:00.000Z",
      "endAt": "2026-04-07T02:00:00.000Z",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "createdAt": "2026-04-05T10:00:00.000Z",
      "updatedAt": "2026-04-05T10:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 일정 UUID |
| teamId | string | 소속 팀 UUID |
| title | string | 일정 제목 |
| description | string \| null | 일정 상세 설명 |
| startAt | string | 시작 일시 (UTC ISO 8601) |
| endAt | string | 종료 일시 (UTC ISO 8601) |
| createdBy | string | 생성한 팀장의 사용자 UUID |
| createdAt | string | 레코드 생성 일시 (UTC ISO 8601) |
| updatedAt | string | 최종 수정 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "view 파라미터는 month, week, day 중 하나이어야 합니다." | 허용되지 않는 view 값 |
| 400 | "date 파라미터는 YYYY-MM-DD 형식이어야 합니다." | date 형식 오류 |
| 400 | "view와 date는 필수 파라미터입니다." | view 또는 date 누락 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-06, FR-03-1, FR-03-2, FR-03-3, FR-03-4, FR-03-5

---

### POST /api/teams/:teamId/schedules

**설명**: 팀 일정을 생성합니다. 팀장(LEADER)만 실행할 수 있습니다.
**인증**: 필요
**권한**: LEADER만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 일정을 생성할 팀의 UUID |

- Body:

```json
{
  "title": "주간 팀 미팅",
  "description": "이번 주 진행 상황 공유 및 다음 주 계획 수립",
  "startAt": "2026-04-07T01:00:00.000Z",
  "endAt": "2026-04-07T02:00:00.000Z"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 일정 제목, 최대 200자 |
| description | string | X | 일정 상세 설명, 선택 입력 |
| startAt | string | O | 시작 일시 (UTC ISO 8601) |
| endAt | string | O | 종료 일시 (UTC ISO 8601), `startAt`보다 이후여야 함 |

**Response**

- 성공: `201 Created`

```json
{
  "id": "f6a7b8c9-d0e1-2345-fabc-de6789012345",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "주간 팀 미팅",
  "description": "이번 주 진행 상황 공유 및 다음 주 계획 수립",
  "startAt": "2026-04-07T01:00:00.000Z",
  "endAt": "2026-04-07T02:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-07T09:00:00.000Z",
  "updatedAt": "2026-04-07T09:00:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "제목은 필수입니다." | title 누락 |
| 400 | "제목은 최대 200자까지 입력 가능합니다." | title 길이 초과 |
| 400 | "startAt과 endAt은 필수입니다." | startAt 또는 endAt 누락 |
| 400 | "종료 일시는 시작 일시보다 이후여야 합니다." | endAt <= startAt (FR-04-4) |
| 400 | "날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요." | 날짜 파싱 실패 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 일정을 생성할 수 있습니다." | 요청자의 역할이 MEMBER (BR-02) |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-02, BR-06, FR-04-1, FR-04-4, FR-04-6

### GET /api/teams/:teamId/schedules/:scheduleId

**설명**: 특정 팀 일정의 상세 정보를 조회합니다. LEADER와 MEMBER 모두 접근할 수 있습니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (해당 팀 소속 구성원)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| scheduleId | string (UUID) | 조회할 일정 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "id": "f6a7b8c9-d0e1-2345-fabc-de6789012345",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "팀 전체 회의",
  "description": "분기별 성과 공유 및 다음 스프린트 계획 논의",
  "startAt": "2026-04-14T06:00:00.000Z",
  "endAt": "2026-04-14T07:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 일정 UUID |
| teamId | string | 소속 팀 UUID |
| title | string | 일정 제목 |
| description | string \| null | 일정 상세 설명 |
| startAt | string | 시작 일시 (UTC ISO 8601) |
| endAt | string | 종료 일시 (UTC ISO 8601) |
| createdBy | string | 생성한 팀장의 사용자 UUID |
| createdAt | string | 레코드 생성 일시 (UTC ISO 8601) |
| updatedAt | string | 최종 수정 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "일정을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 scheduleId |

**비즈니스 규칙**: BR-01, BR-06, FR-03-4, FR-03-5

---

### PATCH /api/teams/:teamId/schedules/:scheduleId

**설명**: 기존 팀 일정을 수정합니다. 팀장(LEADER)만 실행할 수 있습니다. 전달된 필드만 수정합니다.
**인증**: 필요
**권한**: LEADER만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| scheduleId | string (UUID) | 수정할 일정의 UUID |

- Body:

```json
{
  "title": "주간 팀 미팅 (일정 변경)",
  "description": "장소: 회의실 A",
  "startAt": "2026-04-07T02:00:00.000Z",
  "endAt": "2026-04-07T03:00:00.000Z"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | X | 일정 제목, 최대 200자 |
| description | string \| null | X | 일정 상세 설명 (`null` 전달 시 비워짐) |
| startAt | string | X | 변경할 시작 일시 (UTC ISO 8601) |
| endAt | string | X | 변경할 종료 일시 (UTC ISO 8601) |

> 최소 1개 이상의 필드를 포함해야 합니다. `startAt`과 `endAt` 중 하나만 변경하는 경우, 서버는 기존 값과 신규 값을 조합하여 `startAt < endAt` 조건을 검증합니다.

**Response**

- 성공: `200 OK`

```json
{
  "id": "f6a7b8c9-d0e1-2345-fabc-de6789012345",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "주간 팀 미팅 (일정 변경)",
  "description": "장소: 회의실 A",
  "startAt": "2026-04-07T02:00:00.000Z",
  "endAt": "2026-04-07T03:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-07T09:00:00.000Z",
  "updatedAt": "2026-04-07T10:30:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "수정할 항목이 없습니다." | 바디가 비어 있음 |
| 400 | "제목은 최대 200자까지 입력 가능합니다." | title 길이 초과 |
| 400 | "종료 일시는 시작 일시보다 이후여야 합니다." | 수정 후 endAt <= startAt (FR-04-4) |
| 400 | "날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요." | 날짜 파싱 실패 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 일정을 수정할 수 있습니다." | 요청자의 역할이 MEMBER (BR-02) |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "일정을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 scheduleId |

**비즈니스 규칙**: BR-01, BR-02, BR-06, FR-04-2, FR-04-4

---

### DELETE /api/teams/:teamId/schedules/:scheduleId

**설명**: 팀 일정을 삭제합니다. 팀장(LEADER)만 실행할 수 있습니다.
**인증**: 필요
**권한**: LEADER만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| scheduleId | string (UUID) | 삭제할 일정의 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "message": "일정이 삭제되었습니다."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 일정을 삭제할 수 있습니다." | 요청자의 역할이 MEMBER (BR-02) |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "일정을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 scheduleId |

**비즈니스 규칙**: BR-01, BR-02, BR-06, FR-04-3

---

## 6. Messages (채팅 메시지)

---

### GET /api/teams/:teamId/messages

**설명**: 특정 날짜(KST 기준)의 팀 채팅 메시지 목록을 조회합니다. 폴링 방식으로 주기적 호출을 통해 새 메시지를 수신합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (해당 팀 소속 구성원)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 조회할 팀의 UUID |

- Query Parameters:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string | O | KST 기준 날짜 (YYYY-MM-DD). 해당 날짜의 00:00:00 KST ~ 23:59:59 KST 범위 내 메시지 반환 |

- 요청 예시:
  ```
  GET /api/teams/b1c2d3e4-f5a6-7890-bcde-fa1234567890/messages?date=2026-04-07
  ```

**Response**

- 성공: `200 OK`

```json
{
  "date": "2026-04-07",
  "messages": [
    {
      "id": "a7b8c9d0-e1f2-3456-abcd-ef7890123456",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "type": "NORMAL",
      "senderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "senderName": "홍길동",
      "content": "오늘 미팅 시간 변경합니다. 오후 3시로 조정해주세요.",
      "sentAt": "2026-04-07T01:30:00.000Z"
    },
    {
      "id": "b8c9d0e1-f2a3-4567-bcde-fa8901234567",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "type": "SCHEDULE_REQUEST",
      "senderId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "senderName": "김철수",
      "content": "팀장님, 4월 10일 일정을 오후로 변경 부탁드립니다.",
      "sentAt": "2026-04-07T02:15:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| date | string | 조회 기준 날짜 (KST, YYYY-MM-DD) |
| messages | array | 해당 날짜의 메시지 배열, `sentAt` 오름차순 정렬 |
| messages[].id | string | 메시지 UUID |
| messages[].teamId | string | 소속 팀 UUID |
| messages[].type | string | 메시지 유형: `NORMAL` 또는 `SCHEDULE_REQUEST` |
| messages[].senderId | string | 발신자 사용자 UUID |
| messages[].senderName | string | 발신자 표시 이름 |
| messages[].content | string | 메시지 본문 |
| messages[].sentAt | string | 전송 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "date 파라미터는 필수입니다." | date 누락 |
| 400 | "date 파라미터는 YYYY-MM-DD 형식이어야 합니다." | date 형식 오류 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-05, BR-06, FR-05-2, FR-05-6, FR-05-7

> 폴링 구현: 클라이언트(TanStack Query)에서 `refetchInterval: 3000~5000`(ms)으로 주기적 호출하여 준실시간 채팅을 구현합니다.

---

### POST /api/teams/:teamId/messages

**설명**: 팀 채팅 메시지를 전송합니다. `NORMAL` 타입의 일반 메시지와 `SCHEDULE_REQUEST` 타입의 일정 변경 요청 메시지를 모두 처리합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두 (해당 팀 소속 구성원)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 메시지를 전송할 팀의 UUID |

- Body (일반 메시지):

```json
{
  "type": "NORMAL",
  "content": "오늘 미팅 시간 변경합니다. 오후 3시로 조정해주세요."
}
```

- Body (일정 변경 요청 메시지):

```json
{
  "type": "SCHEDULE_REQUEST",
  "content": "팀장님, 4월 10일 일정을 오후로 변경 부탁드립니다."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | X | 메시지 유형: `NORMAL` 또는 `SCHEDULE_REQUEST`. 미입력 시 기본값 `NORMAL` |
| content | string | O | 메시지 본문, 최대 2000자 |

**Response**

- 성공: `201 Created`

```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-ef7890123456",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "type": "SCHEDULE_REQUEST",
  "senderId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
  "senderName": "김철수",
  "content": "팀장님, 4월 10일 일정을 오후로 변경 부탁드립니다.",
  "sentAt": "2026-04-07T02:15:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "메시지 내용은 필수입니다." | content 누락 |
| 400 | "메시지는 최대 2000자까지 입력 가능합니다." | content 길이 초과 (FR-05-5) |
| 400 | "type은 NORMAL 또는 SCHEDULE_REQUEST이어야 합니다." | 허용되지 않는 type 값 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-04, BR-06, FR-05-1, FR-05-3, FR-05-5, FR-05-6

---

## 7. 엔드포인트 요약

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | /api/auth/signup | 회원가입 | 불필요 | 없음 |
| POST | /api/auth/login | 로그인 | 불필요 | 없음 |
| POST | /api/auth/refresh | Access Token 재발급 | 불필요 | 없음 |
| GET | /api/teams | 내 팀 목록 조회 | 필요 | LEADER·MEMBER |
| POST | /api/teams | 팀 생성 | 필요 | LEADER·MEMBER |
| GET | /api/teams/public | 공개 팀 목록 조회 (탐색) | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId | 팀 상세 조회 | 필요 | LEADER·MEMBER (팀 구성원) |
| POST | /api/teams/:teamId/join-requests | 팀 가입 신청 제출 | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId/join-requests | 팀 PENDING 가입 신청 목록 조회 | 필요 | LEADER만 |
| PATCH | /api/teams/:teamId/join-requests/:requestId | 가입 신청 승인/거절 | 필요 | LEADER만 |
| GET | /api/me/tasks | 나의 할 일 목록 (전체 팀 PENDING 신청) | 필요 | LEADER만 |
| GET | /api/teams/:teamId/schedules | 팀 일정 목록 조회 (월/주/일) | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/schedules | 팀 일정 생성 | 필요 | LEADER만 |
| GET | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 상세 조회 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 수정 | 필요 | LEADER만 |
| DELETE | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 삭제 | 필요 | LEADER만 |
| GET | /api/teams/:teamId/messages | 채팅 메시지 조회 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/messages | 채팅 메시지 전송 | 필요 | LEADER·MEMBER |

---

## 8. 관련 문서

| 문서 | 경로 |
|------|------|
| 도메인 정의서 | docs/1-domain-definition.md |
| PRD | docs/2-prd.md |
| ERD | docs/6-erd.md |
