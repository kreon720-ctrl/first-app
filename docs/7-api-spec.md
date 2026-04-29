# TEAM WORKS API 명세서

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-08 | 섹션 4(Invitations) 전면 제거 → 섹션 4(Join Requests)로 교체. GET /api/teams/public, POST /api/teams/:teamId/join-requests, GET /api/teams/:teamId/join-requests, PATCH /api/teams/:teamId/join-requests/:requestId, GET /api/me/tasks 추가. 엔드포인트 요약 테이블 갱신 |
| 1.2 | 2026-04-08 | POST /api/teams 비즈니스 규칙에서 잘못된 BR-03 참조 제거 (BR-01, FR-02-1 으로 수정) |
| 1.3 | 2026-04-18 | 앱명 Team CalTalk → TEAM WORKS 반영. 메시지 type WORK_PERFORMANCE → WORK_PERFORMANCE 변경 (실제 구현 반영). 섹션 7(업무보고 조회 권한) 추가: GET/PATCH /api/teams/:teamId/work-permissions |
| 1.4 | 2026-04-18 | 팀 응답에 description/isPublic 추가, 일정 응답에 color/creatorName 추가, 메시지 조회 쿼리파라미터 명확화, 일정 생성/수정/삭제 권한 실제 구현 반영, 포스트잇/인증/아키텍처 섹션 추가 |
| 1.5 | 2026-04-28 | 백엔드 구현 일치화: GET /api/auth/me, PATCH /api/me, PATCH/DELETE /api/teams/:teamId, DELETE /api/teams/:teamId/members/:userId, Notices/Postits/Projects/ProjectSchedules/SubSchedules 섹션 추가. 섹션 번호 재정렬 |

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
- 포스트잇·프로젝트·프로젝트 일정·서브 일정의 날짜 필드(`date`, `startDate`, `endDate`)는 시간 정보가 없는 **YYYY-MM-DD** 형식을 사용합니다.

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

### GET /api/auth/me

**설명**: 현재 Access Token에 대응하는 로그인 사용자의 기본 정보를 반환합니다. 클라이언트 부팅 시 세션 복구·표시 이름 동기화 용도로 사용됩니다.
**인증**: 필요
**권한**: 없음 (모든 인증 사용자)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path/Query/Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "name": "홍길동"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 사용자 UUID |
| email | string | 가입 이메일 |
| name | string | 표시 이름 |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Authorization 헤더 없음 |
| 401 | "유효하지 않은 토큰입니다." | Access Token 검증 실패 |
| 404 | "사용자를 찾을 수 없습니다." | 토큰의 userId가 DB에 없음(탈퇴 등) |

---

## 3. Profile (내 정보)

---

### PATCH /api/me

**설명**: 로그인 사용자의 프로필을 수정합니다. 현재는 표시 이름(`name`) 변경만 지원합니다.
**인증**: 필요
**권한**: 없음 (본인 프로필 한정)

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Body:

```json
{
  "name": "홍길동"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 새 표시 이름. 양 끝 공백은 trim 처리, 최대 50자 |

**Response**

- 성공: `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "name": "홍길동"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "이름은 필수입니다." | name 누락 또는 공백만 입력 |
| 400 | "이름은 최대 50자까지 입력 가능합니다." | trim 후 50자 초과 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 404 | "사용자를 찾을 수 없습니다." | 토큰의 userId에 해당하는 사용자 부재 |

---

## 4. Teams (팀 관리)

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
      "description": "백엔드·프론트엔드 개발팀",
      "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "isPublic": true,
      "myRole": "LEADER",
      "createdAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-ab2345678901",
      "name": "디자인팀",
      "description": null,
      "leaderId": "d4e5f6a7-b8c9-0123-defa-bc3456789012",
      "isPublic": false,
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
| description | string \| null | 팀 설명 (nullable) |
| leaderId | string | 팀장 사용자 UUID |
| isPublic | boolean | 공개 팀 목록 노출 여부 |
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
  "description": "백엔드·프론트엔드 개발팀",
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "isPublic": true,
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
  "description": "백엔드·프론트엔드 개발팀",
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "isPublic": true,
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

### PATCH /api/teams/:teamId

**설명**: 팀의 기본 정보를 수정합니다. 전달된 필드만 부분 갱신되며, 팀장만 호출할 수 있습니다.
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
| teamId | string (UUID) | 수정할 팀의 UUID |

- Body:

```json
{
  "name": "개발팀 (리브랜딩)",
  "description": "백엔드·프론트엔드 통합 개발팀",
  "isPublic": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | X | 팀 이름 (최대 100자) |
| description | string \| null | X | 팀 설명 |
| isPublic | boolean | X | 공개 팀 목록 노출 여부 |

> 최소 1개 이상의 필드를 포함해야 합니다.

**Response**

- 성공: `200 OK`

```json
{
  "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "name": "개발팀 (리브랜딩)",
  "description": "백엔드·프론트엔드 통합 개발팀",
  "isPublic": false,
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 접근할 수 있습니다." | 요청자가 해당 팀의 LEADER가 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 500 | "팀 수정에 실패했습니다." | DB 갱신 실패 |

**비즈니스 규칙**: BR-01, BR-03

---

### DELETE /api/teams/:teamId

**설명**: 팀을 삭제합니다. 팀에 종속된 모든 데이터(구성원·일정·메시지·공지·포스트잇·프로젝트 등)는 DB 외래키 정책(`ON DELETE CASCADE`)에 따라 함께 정리됩니다.
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
| teamId | string (UUID) | 삭제할 팀의 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "message": "팀이 삭제되었습니다."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 접근할 수 있습니다." | 요청자가 해당 팀의 LEADER가 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 500 | "팀 삭제에 실패했습니다." | DB 삭제 실패 |

**비즈니스 규칙**: BR-01, BR-03

---

### DELETE /api/teams/:teamId/members/:userId

**설명**: 팀장이 특정 팀원을 강제 탈퇴 처리합니다. 팀장 본인은 제거할 수 없습니다.
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
| userId | string (UUID) | 탈퇴 처리할 팀원의 사용자 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "message": "팀원이 탈퇴 처리되었습니다."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "팀장은 탈퇴시킬 수 없습니다." | 대상 userId가 팀의 leader_id 와 동일 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "팀장만 접근할 수 있습니다." | 요청자가 해당 팀의 LEADER가 아님 |
| 404 | "해당 팀원을 찾을 수 없습니다." | userId가 해당 팀의 멤버가 아님 |

**비즈니스 규칙**: BR-01, BR-03

---

## 5. Join Requests (팀 가입 신청)

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

## 6. Schedules (팀 일정)

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
      "color": "indigo",
      "startAt": "2026-04-07T01:00:00.000Z",
      "endAt": "2026-04-07T02:00:00.000Z",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorName": "홍길동",
      "createdAt": "2026-04-05T10:00:00.000Z",
      "updatedAt": "2026-04-05T10:00:00.000Z"
    }
  ],
  "view": "month",
  "date": "2026-04-07"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| schedules | array | 일정 배열 |
| schedules[].id | string | 일정 UUID |
| schedules[].teamId | string | 소속 팀 UUID |
| schedules[].title | string | 일정 제목 |
| schedules[].description | string \| null | 일정 상세 설명 |
| schedules[].color | string | 일정 색상 (indigo, blue, emerald, amber, rose) |
| schedules[].startAt | string | 시작 일시 (UTC ISO 8601) |
| schedules[].endAt | string | 종료 일시 (UTC ISO 8601) |
| schedules[].createdBy | string | 생성한 사용자의 UUID |
| schedules[].creatorName | string | 생성한 사용자의 표시 이름 |
| schedules[].createdAt | string | 레코드 생성 일시 (UTC ISO 8601) |
| schedules[].updatedAt | string | 최종 수정 일시 (UTC ISO 8601) |
| view | string | 요청한 뷰 타입 (month/week/day) |
| date | string | 요청한 기준 날짜 (YYYY-MM-DD) |

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

**설명**: 팀 일정을 생성합니다. 팀 구성원(LEADER/MEMBER) 모두 실행할 수 있습니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

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
  "color": "indigo",
  "startAt": "2026-04-07T01:00:00.000Z",
  "endAt": "2026-04-07T02:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "creatorName": "홍길동",
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

**설명**: 기존 팀 일정을 수정합니다. 일정 생성자만 실행할 수 있습니다. 전달된 필드만 수정합니다.
**인증**: 필요
**권한**: 일정 생성자 본인만

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
| 403 | "일정 수정 권한이 없습니다." | 요청자가 일정의 생성자가 아님 (BR-02) |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "일정을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 scheduleId |

**비즈니스 규칙**: BR-01, BR-02, BR-06, FR-04-2, FR-04-4

---

### DELETE /api/teams/:teamId/schedules/:scheduleId

**설명**: 팀 일정을 삭제합니다. 일정 생성자만 실행할 수 있습니다.
**인증**: 필요
**권한**: 일정 생성자 본인만

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
| 403 | "일정 삭제 권한이 없습니다." | 요청자가 일정의 생성자가 아님 (BR-02) |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |
| 404 | "일정을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 scheduleId |

**비즈니스 규칙**: BR-01, BR-02, BR-06, FR-04-3

---

## 7. Messages (채팅 메시지)

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
      "type": "WORK_PERFORMANCE",
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
| messages[].type | string | 메시지 유형: `NORMAL` 또는 `WORK_PERFORMANCE` |
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

**설명**: 팀 채팅 메시지를 전송합니다. `NORMAL` 타입의 일반 메시지와 `WORK_PERFORMANCE` 타입의 업무보고 메시지를 모두 처리합니다.
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
  "type": "WORK_PERFORMANCE",
  "content": "팀장님, 4월 10일 일정을 오후로 변경 부탁드립니다."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | X | 메시지 유형: `NORMAL` 또는 `WORK_PERFORMANCE`(업무보고). 미입력 시 기본값 `NORMAL` |
| content | string | O | 메시지 본문, 최대 2000자 |

**Response**

- 성공: `201 Created`

```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-ef7890123456",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "type": "WORK_PERFORMANCE",
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
| 400 | "잘못된 메시지 타입입니다." | 허용되지 않는 type 값 (`NORMAL`, `WORK_PERFORMANCE` 외) |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

**비즈니스 규칙**: BR-01, BR-04, BR-06, FR-05-1, FR-05-3, FR-05-5, FR-05-6

---

## 8. Notices (공지사항)

---

### GET /api/teams/:teamId/notices

**설명**: 팀의 공지사항 목록을 등록 시간 오름차순으로 조회합니다.
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
  "notices": [
    {
      "id": "c9d0e1f2-a3b4-5678-cdef-ab9012345678",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "senderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "senderName": "홍길동",
      "content": "다음 주 월요일은 휴무입니다.",
      "createdAt": "2026-04-20T01:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| notices | array | 공지사항 배열 (`createdAt` 오름차순) |
| notices[].id | string | 공지 UUID |
| notices[].teamId | string | 소속 팀 UUID |
| notices[].senderId | string | 작성자 사용자 UUID |
| notices[].senderName | string | 작성자 표시 이름 |
| notices[].content | string | 공지 본문 |
| notices[].createdAt | string | 작성 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### POST /api/teams/:teamId/notices

**설명**: 팀 공지사항을 등록합니다. 팀 구성원이면 누구나 작성할 수 있습니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 공지를 등록할 팀의 UUID |

- Body:

```json
{
  "content": "다음 주 월요일은 휴무입니다."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| content | string | O | 공지 본문, 최대 2000자 |

**Response**

- 성공: `201 Created`

```json
{
  "id": "c9d0e1f2-a3b4-5678-cdef-ab9012345678",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "senderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "senderName": "홍길동",
  "content": "다음 주 월요일은 휴무입니다.",
  "createdAt": "2026-04-20T01:00:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "내용은 필수입니다." | content 누락 |
| 400 | "내용은 최대 2000자까지 입력 가능합니다." | content 길이 초과 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### DELETE /api/teams/:teamId/notices/:noticeId

**설명**: 공지사항을 삭제합니다. 작성자 본인 또는 팀장만 삭제할 수 있습니다.
**인증**: 필요
**권한**: 작성자 본인 또는 LEADER

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| noticeId | string (UUID) | 삭제할 공지 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "message": "공지사항이 삭제되었습니다."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "작성자 또는 팀 리더만 삭제할 수 있습니다." | 요청자가 작성자도 LEADER도 아님 |
| 404 | "공지사항을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 noticeId |

---

## 9. Postits (포스트잇)

---

### GET /api/teams/:teamId/postits

**설명**: 특정 월(YYYY-MM)의 팀 포스트잇 목록을 조회합니다. 캘린더 위에 날짜별로 누적되는 메모용 카드입니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

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
| month | string | O | 조회 대상 월(YYYY-MM). 예: `2026-04` |

**Response**

- 성공: `200 OK`

```json
{
  "postits": [
    {
      "id": "d0e1f2a3-b4c5-6789-defa-bc0123456789",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorName": "홍길동",
      "date": "2026-04-12",
      "color": "amber",
      "content": "외부 미팅 자료 준비",
      "createdAt": "2026-04-10T03:00:00.000Z",
      "updatedAt": "2026-04-10T03:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| postits[].id | string | 포스트잇 UUID |
| postits[].teamId | string | 소속 팀 UUID |
| postits[].createdBy | string | 작성자 사용자 UUID |
| postits[].creatorName | string | 작성자 표시 이름 |
| postits[].date | string | 카드가 부착된 날짜 (YYYY-MM-DD) |
| postits[].color | string | 카드 색상 (`indigo`, `blue`, `emerald`, `amber`, `rose`) |
| postits[].content | string | 메모 본문 (생성 직후 빈 문자열일 수 있음) |
| postits[].createdAt | string | 생성 일시 (UTC ISO 8601) |
| postits[].updatedAt | string | 최종 수정 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "month 파라미터가 필요합니다. (YYYY-MM)" | month 누락 또는 형식 오류 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### POST /api/teams/:teamId/postits

**설명**: 특정 날짜에 빈 포스트잇 카드를 생성합니다. 본문(`content`)은 별도 PATCH로 채웁니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 포스트잇을 등록할 팀의 UUID |

- Body:

```json
{
  "date": "2026-04-12",
  "color": "amber"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| date | string | O | 부착할 날짜 (YYYY-MM-DD) |
| color | string | O | 카드 색상 (`indigo`, `blue`, `emerald`, `amber`, `rose` 중 하나) |

**Response**

- 성공: `201 Created` (응답 본문은 GET 응답의 `postits[]` 항목과 동일)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "date 파라미터가 필요합니다. (YYYY-MM-DD)" | date 누락 또는 형식 오류 |
| 400 | "유효하지 않은 색상입니다." | 허용되지 않는 color 값 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### PATCH /api/teams/:teamId/postits/:postitId

**설명**: 포스트잇의 본문을 수정합니다. 작성자 본인만 수정할 수 있습니다.
**인증**: 필요
**권한**: 작성자 본인만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| postitId | string (UUID) | 수정할 포스트잇 UUID |

- Body:

```json
{
  "content": "외부 미팅 자료 작성 — 14시까지"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| content | string | O | 메모 본문(빈 문자열 허용) |

**Response**

- 성공: `200 OK`

```json
{
  "id": "d0e1f2a3-b4c5-6789-defa-bc0123456789",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "date": "2026-04-12",
  "color": "amber",
  "content": "외부 미팅 자료 작성 — 14시까지",
  "updatedAt": "2026-04-10T05:30:00.000Z"
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "content는 문자열이어야 합니다." | content가 문자열이 아님 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "포스트잇 생성자만 수정할 수 있습니다." | 요청자가 작성자가 아님 |
| 404 | "포스트잇을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 postitId |

---

### DELETE /api/teams/:teamId/postits/:postitId

**설명**: 포스트잇을 삭제합니다. 작성자 본인만 삭제할 수 있습니다.
**인증**: 필요
**권한**: 작성자 본인만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| postitId | string (UUID) | 삭제할 포스트잇 UUID |

- Body: 없음

**Response**

- 성공: `200 OK`

```json
{
  "message": "포스트잇이 삭제되었습니다."
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "포스트잇 생성자만 삭제할 수 있습니다." | 요청자가 작성자가 아님 |
| 404 | "포스트잇을 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 postitId |

---

## 10. Projects (프로젝트)

프로젝트는 다음 3계층으로 구성됩니다.

```
Project
└─ ProjectSchedule (큰 단위 일정)
   └─ SubSchedule (세부 작업)
```

각 계층은 독립된 엔드포인트를 가지며 모두 `progress`, `color`, `leader/manager`, `isDelayed`(상위는 `phases`) 등의 메타데이터를 포함합니다. 모든 색상 필드의 허용값은 `indigo`, `blue`, `emerald`, `amber`, `rose` 입니다.

---

### GET /api/teams/:teamId/projects

**설명**: 팀의 프로젝트 목록을 조회합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

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
  "projects": [
    {
      "id": "e1f2a3b4-c5d6-7890-efab-cd1234567890",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "런칭 캠페인",
      "description": "Q2 신규 서비스 런칭",
      "startDate": "2026-04-01",
      "endDate": "2026-06-30",
      "progress": 35,
      "manager": "홍길동",
      "phases": [
        { "id": "p1", "name": "기획", "order": 1 },
        { "id": "p2", "name": "개발", "order": 2 }
      ],
      "createdAt": "2026-04-01T01:00:00.000Z",
      "updatedAt": "2026-04-15T02:30:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| projects[].id | string | 프로젝트 UUID |
| projects[].teamId | string | 소속 팀 UUID |
| projects[].createdBy | string | 생성자 사용자 UUID |
| projects[].name | string | 프로젝트 이름 |
| projects[].description | string \| null | 설명 |
| projects[].startDate | string | 시작일 (YYYY-MM-DD) |
| projects[].endDate | string | 종료일 (YYYY-MM-DD) |
| projects[].progress | number | 진행률 (0~100) |
| projects[].manager | string | 담당자(자유 문자열) |
| projects[].phases | array | 단계 목록 (`{ id, name, order }`) |
| projects[].createdAt | string | 생성 일시 (UTC ISO 8601) |
| projects[].updatedAt | string | 수정 일시 (UTC ISO 8601) |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### POST /api/teams/:teamId/projects

**설명**: 새 프로젝트를 생성합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 프로젝트를 생성할 팀의 UUID |

- Body:

```json
{
  "name": "런칭 캠페인",
  "description": "Q2 신규 서비스 런칭",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30",
  "progress": 0,
  "manager": "홍길동",
  "phases": [
    { "name": "기획", "order": 1 },
    { "name": "개발", "order": 2 }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 프로젝트 이름, 최대 200자 |
| description | string \| null | X | 프로젝트 설명 |
| startDate | string | O | 시작일 (YYYY-MM-DD) |
| endDate | string | O | 종료일 (YYYY-MM-DD), `startDate` 이상이어야 함 |
| progress | number | X | 진행률(0~100), 기본 0 |
| manager | string | X | 담당자 |
| phases | array | X | 단계 목록. `id` 미지정 시 서버에서 UUID 발급, `order` 미지정 시 1부터 자동 부여 |

**Response**

- 성공: `201 Created` (응답 형식은 GET의 `projects[]` 항목과 동일)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "프로젝트 이름은 필수입니다." | name 누락 |
| 400 | "프로젝트 이름은 최대 200자까지 입력 가능합니다." | name 길이 초과 |
| 400 | "시작일과 종료일은 필수입니다." | startDate/endDate 누락 |
| 400 | "종료일은 시작일보다 같거나 늦어야 합니다." | endDate < startDate |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |

---

### GET /api/teams/:teamId/projects/:projectId

**설명**: 프로젝트 상세를 조회합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| projectId | string (UUID) | 조회할 프로젝트 UUID |

- Body: 없음

**Response**

- 성공: `200 OK` (GET 목록의 `projects[]` 단건)
- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "프로젝트를 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 projectId |

---

### PATCH /api/teams/:teamId/projects/:projectId

**설명**: 프로젝트를 수정합니다. 생성자만 수정할 수 있습니다. 전달된 필드만 부분 갱신.
**인증**: 필요
**권한**: 생성자 본인만

**Request**

- Headers:
  ```
  Authorization: Bearer <accessToken>
  ```
- Path Parameters:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| teamId | string (UUID) | 소속 팀 UUID |
| projectId | string (UUID) | 수정할 프로젝트 UUID |

- Body: 모든 필드 선택. 키 존재 여부로 갱신 대상 결정.

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 이름, 최대 200자 |
| description | string \| null | 설명 |
| startDate | string | 시작일 (YYYY-MM-DD) |
| endDate | string | 종료일 (YYYY-MM-DD) |
| progress | number | 진행률 |
| manager | string | 담당자 |
| phases | array | 단계 목록. `id` 미지정 시 신규 발급, `order` 미지정 시 1부터 부여 |

> `startDate`/`endDate` 중 하나만 수정해도, 서버는 기존 값과 합쳐 `startDate <= endDate` 를 검증합니다.

**Response**

- 성공: `200 OK` (단건 응답)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "프로젝트 이름은 최대 200자까지 입력 가능합니다." | name 길이 초과 |
| 400 | "종료일은 시작일보다 같거나 늦어야 합니다." | 수정 후 endDate < startDate |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "프로젝트 생성자만 수정할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "프로젝트를 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 projectId |

---

### DELETE /api/teams/:teamId/projects/:projectId

**설명**: 프로젝트를 삭제합니다. 종속된 프로젝트 일정·서브 일정은 DB CASCADE 정책으로 함께 정리됩니다.
**인증**: 필요
**권한**: 생성자 본인만

**Response**

- 성공: `200 OK` `{"message": "프로젝트가 삭제되었습니다."}`

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "프로젝트 생성자만 삭제할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "프로젝트를 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 projectId |

---

### GET /api/teams/:teamId/projects/:projectId/schedules

**설명**: 프로젝트에 속한 일정(큰 단위) 목록을 조회합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Response**

- 성공: `200 OK`

```json
{
  "schedules": [
    {
      "id": "f1a2b3c4-d5e6-7890-fabc-de1234567890",
      "projectId": "e1f2a3b4-c5d6-7890-efab-cd1234567890",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "프론트엔드 개발",
      "description": null,
      "color": "indigo",
      "startDate": "2026-04-15",
      "endDate": "2026-05-15",
      "leader": "이영희",
      "progress": 20,
      "isDelayed": false,
      "phaseId": "p2",
      "createdAt": "2026-04-10T03:00:00.000Z",
      "updatedAt": "2026-04-15T05:00:00.000Z"
    }
  ]
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "프로젝트를 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 projectId |

---

### POST /api/teams/:teamId/projects/:projectId/schedules

**설명**: 프로젝트 일정을 생성합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request Body**

```json
{
  "title": "프론트엔드 개발",
  "description": null,
  "color": "indigo",
  "startDate": "2026-04-15",
  "endDate": "2026-05-15",
  "leader": "이영희",
  "progress": 0,
  "isDelayed": false,
  "phaseId": "p2"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 일정 제목, 최대 200자 |
| description | string \| null | X | 설명 |
| color | string | X | 색상 (`indigo` 기본) |
| startDate | string | O | 시작일 (YYYY-MM-DD) |
| endDate | string | O | 종료일 (YYYY-MM-DD), `startDate` 이상 |
| leader | string | X | 담당자 |
| progress | number | X | 진행률(0~100), 기본 0 |
| isDelayed | boolean | X | 지연 여부, 기본 false |
| phaseId | string \| null | X | 연결된 프로젝트 단계 ID. UUID 형식이어야 함 |

**Response**

- 성공: `201 Created` (단건)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "제목은 필수입니다." | title 누락 |
| 400 | "제목은 최대 200자까지 입력 가능합니다." | title 길이 초과 |
| 400 | "시작일과 종료일은 필수입니다." | startDate/endDate 누락 |
| 400 | "종료일은 시작일보다 같거나 늦어야 합니다." | endDate < startDate |
| 400 | "color는 indigo, blue, emerald, amber, rose 중 하나여야 합니다." | 허용되지 않는 color |
| 400 | "유효하지 않은 단계 ID입니다." | phaseId가 UUID 형식이 아님 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "프로젝트를 찾을 수 없습니다." | 존재하지 않거나 해당 팀 소속이 아닌 projectId |

---

### PATCH /api/teams/:teamId/projects/:projectId/schedules/:scheduleId

**설명**: 프로젝트 일정을 수정합니다. 생성자만 가능. 전달된 필드만 갱신.
**인증**: 필요
**권한**: 생성자 본인만

**Request Body**: POST와 동일한 필드 집합(모두 선택). `startDate`/`endDate` 중 하나만 변경 시 기존 값과 결합해 검증.

**Response**

- 성공: `200 OK` (단건)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "제목은 최대 200자까지 입력 가능합니다." | title 길이 초과 |
| 400 | "color는 indigo, blue, emerald, amber, rose 중 하나여야 합니다." | 허용되지 않는 color |
| 400 | "종료일은 시작일보다 같거나 늦어야 합니다." | 수정 후 endDate < startDate |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "프로젝트 일정 생성자만 수정할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "프로젝트 일정을 찾을 수 없습니다." | 존재하지 않거나 해당 프로젝트 소속이 아닌 scheduleId |

---

### DELETE /api/teams/:teamId/projects/:projectId/schedules/:scheduleId

**설명**: 프로젝트 일정을 삭제합니다. 종속된 서브 일정은 CASCADE로 함께 정리됩니다.
**인증**: 필요
**권한**: 생성자 본인만

**Response**

- 성공: `200 OK` `{"message": "프로젝트 일정이 삭제되었습니다."}`

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "프로젝트 일정 생성자만 삭제할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "프로젝트 일정을 찾을 수 없습니다." | 존재하지 않거나 해당 프로젝트 소속이 아닌 scheduleId |

---

### GET /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules

**설명**: 프로젝트 일정에 속한 서브 일정(세부 작업) 목록을 조회합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Response**

- 성공: `200 OK`

```json
{
  "subSchedules": [
    {
      "id": "a2b3c4d5-e6f7-8901-abcd-ef2345678901",
      "scheduleId": "f1a2b3c4-d5e6-7890-fabc-de1234567890",
      "projectId": "e1f2a3b4-c5d6-7890-efab-cd1234567890",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "로그인 화면 구현",
      "description": null,
      "color": "blue",
      "startDate": "2026-04-15",
      "endDate": "2026-04-22",
      "leader": "이영희",
      "progress": 50,
      "isDelayed": false,
      "createdAt": "2026-04-12T01:00:00.000Z",
      "updatedAt": "2026-04-18T03:30:00.000Z"
    }
  ]
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "프로젝트 일정을 찾을 수 없습니다." | 존재하지 않거나 해당 프로젝트 소속이 아닌 scheduleId |

---

### POST /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules

**설명**: 서브 일정을 생성합니다.
**인증**: 필요
**권한**: LEADER·MEMBER 모두

**Request Body**

```json
{
  "title": "로그인 화면 구현",
  "description": null,
  "color": "blue",
  "startDate": "2026-04-15",
  "endDate": "2026-04-22",
  "leader": "이영희",
  "progress": 0,
  "isDelayed": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 제목, 최대 200자 |
| description | string \| null | X | 설명 |
| color | string | X | 색상 (`indigo` 기본) |
| startDate | string | O | 시작일 (YYYY-MM-DD) |
| endDate | string | O | 종료일 (YYYY-MM-DD), `startDate` 이상 |
| leader | string | X | 담당자 |
| progress | number | X | 진행률, 기본 0 |
| isDelayed | boolean | X | 지연 여부, 기본 false |

**Response**

- 성공: `201 Created` (단건)

- 실패: 상위 일정의 색상/날짜 검증 룰과 동일. `404`는 `프로젝트 일정을 찾을 수 없습니다.` / `해당 팀에 접근 권한이 없습니다.`(상위 일정의 teamId 불일치).

---

### PATCH /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId

**설명**: 서브 일정을 수정합니다. 생성자만 가능. 전달된 필드만 갱신.
**인증**: 필요
**권한**: 생성자 본인만

**Request Body**: POST와 동일한 필드 집합(모두 선택).

**Response**

- 성공: `200 OK` (단건)

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "제목은 최대 200자까지 입력 가능합니다." | title 길이 초과 |
| 400 | "color는 indigo, blue, emerald, amber, rose 중 하나여야 합니다." | 허용되지 않는 color |
| 400 | "종료일은 시작일보다 같거나 늦어야 합니다." | 수정 후 endDate < startDate |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "서브 일정 생성자만 수정할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "서브 일정을 찾을 수 없습니다." | 존재하지 않거나 해당 프로젝트 일정 소속이 아닌 subId |

---

### DELETE /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId

**설명**: 서브 일정을 삭제합니다.
**인증**: 필요
**권한**: 생성자 본인만

**Response**

- 성공: `200 OK` `{"message": "서브 일정이 삭제되었습니다."}`

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 403 | "서브 일정 생성자만 삭제할 수 있습니다." | 요청자가 생성자가 아님 |
| 404 | "서브 일정을 찾을 수 없습니다." | 존재하지 않거나 해당 프로젝트 일정 소속이 아닌 subId |

---

## 11. Work Permissions (업무보고 조회 권한)

---

### GET /api/teams/:teamId/work-permissions

**설명**: 팀의 업무보고(`WORK_PERFORMANCE`) 메시지 조회 권한 목록을 반환합니다. 허용된 사용자 ID 배열을 반환하며, 빈 배열이면 전체 구성원이 조회 가능합니다.
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
  "permittedUserIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "d4e5f6a7-b8c9-0123-defa-bc3456789012"
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| permittedUserIds | string[] | 업무보고 조회가 허용된 사용자 UUID 배열 |

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 구성원이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

---

### PATCH /api/teams/:teamId/work-permissions

**설명**: 팀의 업무보고 조회 권한을 일괄 설정합니다. 전달된 `userIds`로 기존 권한을 전부 교체합니다. 빈 배열 전달 시 전체 권한 해제.
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
| teamId | string (UUID) | 권한을 설정할 팀의 UUID |

- Body:

```json
{
  "userIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "d4e5f6a7-b8c9-0123-defa-bc3456789012"
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| userIds | string[] | O | 업무보고 조회를 허용할 사용자 UUID 배열 (기존 설정 전부 교체) |

**Response**

- 성공: `200 OK`

```json
{
  "permittedUserIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "d4e5f6a7-b8c9-0123-defa-bc3456789012"
  ]
}
```

- 실패:

| 상태 코드 | 에러 메시지 | 원인 |
|-----------|-------------|------|
| 400 | "userIds는 배열이어야 합니다." | userIds 필드가 배열이 아님 |
| 401 | "인증이 필요합니다." | Access Token 없음 또는 만료 |
| 403 | "해당 팀에 접근 권한이 없습니다." | 요청자가 해당 팀의 팀장이 아님 |
| 404 | "팀을 찾을 수 없습니다." | 존재하지 않는 teamId |

---

## 12. 엔드포인트 요약

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | /api/auth/signup | 회원가입 | 불필요 | 없음 |
| POST | /api/auth/login | 로그인 | 불필요 | 없음 |
| POST | /api/auth/refresh | Access Token 재발급 | 불필요 | 없음 |
| GET | /api/auth/me | 내 정보 조회 (세션 복구) | 필요 | 인증 사용자 |
| PATCH | /api/me | 내 프로필(이름) 수정 | 필요 | 본인 |
| GET | /api/teams | 내 팀 목록 조회 | 필요 | LEADER·MEMBER |
| POST | /api/teams | 팀 생성 | 필요 | LEADER·MEMBER |
| GET | /api/teams/public | 공개 팀 목록 조회 (탐색) | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId | 팀 상세 조회 | 필요 | LEADER·MEMBER (팀 구성원) |
| PATCH | /api/teams/:teamId | 팀 정보 수정 | 필요 | LEADER만 |
| DELETE | /api/teams/:teamId | 팀 삭제 | 필요 | LEADER만 |
| DELETE | /api/teams/:teamId/members/:userId | 팀원 강제 탈퇴 | 필요 | LEADER만 |
| POST | /api/teams/:teamId/join-requests | 팀 가입 신청 제출 | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId/join-requests | 팀 PENDING 가입 신청 목록 조회 | 필요 | LEADER만 |
| PATCH | /api/teams/:teamId/join-requests/:requestId | 가입 신청 승인/거절 | 필요 | LEADER만 |
| GET | /api/me/tasks | 나의 할 일 목록 (전체 팀 PENDING 신청) | 필요 | LEADER만 |
| GET | /api/teams/:teamId/schedules | 팀 일정 목록 조회 (월/주/일) | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/schedules | 팀 일정 생성 | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 상세 조회 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 수정 | 필요 | 생성자 본인만 |
| DELETE | /api/teams/:teamId/schedules/:scheduleId | 팀 일정 삭제 | 필요 | 생성자 본인만 |
| GET | /api/teams/:teamId/messages | 채팅 메시지 조회 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/messages | 채팅 메시지 전송 | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId/notices | 공지사항 목록 조회 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/notices | 공지사항 등록 | 필요 | LEADER·MEMBER |
| DELETE | /api/teams/:teamId/notices/:noticeId | 공지사항 삭제 | 필요 | 작성자 또는 LEADER |
| GET | /api/teams/:teamId/postits | 월별 포스트잇 목록 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/postits | 포스트잇 생성 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/postits/:postitId | 포스트잇 본문 수정 | 필요 | 생성자 본인만 |
| DELETE | /api/teams/:teamId/postits/:postitId | 포스트잇 삭제 | 필요 | 생성자 본인만 |
| GET | /api/teams/:teamId/projects | 프로젝트 목록 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/projects | 프로젝트 생성 | 필요 | LEADER·MEMBER |
| GET | /api/teams/:teamId/projects/:projectId | 프로젝트 상세 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/projects/:projectId | 프로젝트 수정 | 필요 | 생성자 본인만 |
| DELETE | /api/teams/:teamId/projects/:projectId | 프로젝트 삭제 | 필요 | 생성자 본인만 |
| GET | /api/teams/:teamId/projects/:projectId/schedules | 프로젝트 일정 목록 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/projects/:projectId/schedules | 프로젝트 일정 생성 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId | 프로젝트 일정 수정 | 필요 | 생성자 본인만 |
| DELETE | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId | 프로젝트 일정 삭제 | 필요 | 생성자 본인만 |
| GET | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules | 서브 일정 목록 | 필요 | LEADER·MEMBER |
| POST | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules | 서브 일정 생성 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId | 서브 일정 수정 | 필요 | 생성자 본인만 |
| DELETE | /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId | 서브 일정 삭제 | 필요 | 생성자 본인만 |
| GET | /api/teams/:teamId/work-permissions | 업무보고 조회 권한 목록 조회 | 필요 | LEADER·MEMBER |
| PATCH | /api/teams/:teamId/work-permissions | 업무보고 조회 권한 일괄 설정 | 필요 | LEADER만 |

---

## 13. 관련 문서

| 문서 | 경로 |
|------|------|
| 도메인 정의서 | docs/1-domain-definition.md |
| PRD | docs/2-prd.md |
| ERD | docs/6-erd.md |
