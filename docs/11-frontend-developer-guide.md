# 프론트엔드 개발자 API 참조 가이드

## 목차
1. [개요](#개요)
2. [CORS 정책](#cors-정책)
3. [인증 (Authentication)](#인증)
4. [공통 응답 형식](#공통-응답-형식)
5. [API 엔드포인트 레퍼런스](#api-엔드포인트-레퍼런스)
6. [권한 체계](#권한-체계)
7. [날짜/시간 처리](#날짜시간-처리)
8. [채팅 폴링 패턴](#채팅-폴링-패턴)
9. [에러 처리 가이드](#에러-처리-가이드)
10. [개발 환경 설정](#개발-환경-설정)
11. [API 클라이언트 구현 예시](#api-클라이언트-구현-예시)

---

## 개요

### 서버 정보

- **프로덕션 Base URL**: `https://your-vercel-deployment.vercel.app`
- **로컬 개발 Base URL**: `http://localhost:3000`
- **API Prefix**: 모든 엔드포인트는 `/api`로 시작합니다 (예: `http://localhost:3000/api/auth/login`)

### 기술 스택

- **프레임워크**: Next.js 14+ (App Router)
- **데이터베이스**: PostgreSQL
- **인증**: JWT (JSON Web Token)
- **API 문서**: OpenAPI/Swagger

### Swagger UI 접근

로컬 개발 중 Swagger UI에서 모든 API를 대화형으로 테스트할 수 있습니다:

```
http://localhost:3000/swagger-ui
```

Swagger JSON 스키마:
```
GET http://localhost:3000/swagger.json
```

### 응답 언어

모든 API 응답은 한국어로 제공됩니다.

---

## CORS 정책

### 설정 현황

현재 `next.config.ts`에서 명시적인 CORS 설정이 없으므로, 기본 Next.js CORS 규칙이 적용됩니다.

### Credentials 포함 여부

**현재 구현에서는 credentials를 사용하지 않습니다.** 대신 Authorization 헤더의 Bearer 토큰으로 인증합니다.

### 권장 fetch 설정

```typescript
// 기본 fetch 요청 (credentials 불필요)
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
})

// 인증이 필요한 요청
const response = await fetch('http://localhost:3000/api/teams', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
})
```

### Preflight 요청

OPTIONS 요청이 발생하는 경우:
- Content-Type이 `application/json`일 때: 일부 브라우저에서 preflight 발생 가능
- 상황: Cross-origin 요청 + Custom header(Authorization) 사용 시
- 처리: 백엔드가 자동으로 처리하므로 클라이언트는 추가 작업 불필요

---

## 인증

### JWT 토큰 구조

#### Access Token
- **유효시간**: 15분 (기본값, `JWT_ACCESS_EXPIRES_IN` 환경변수로 변경 가능)
- **페이로드**:
  ```json
  {
    "userId": "user-uuid",
    "email": "user@example.com",
    "type": "access",
    "iat": 1234567890,
    "exp": 1234569690
  }
  ```
- **용도**: 모든 보호된 API 엔드포인트 접근

#### Refresh Token
- **유효시간**: 7일 (기본값, `JWT_REFRESH_EXPIRES_IN` 환경변수로 변경 가능)
- **페이로드**:
  ```json
  {
    "userId": "user-uuid",
    "email": "user@example.com",
    "type": "refresh",
    "iat": 1234567890,
    "exp": 1234876490
  }
  ```
- **용도**: Access Token 재발급

### 토큰 저장 전략

#### LocalStorage 방식 (권장)
- **장점**: 간단한 구현, XSS 취약점 제외 시 안전
- **단점**: XSS 공격에 취약
- **사용**:
  ```typescript
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  ```

#### HttpOnly Cookie 방식
- **현재 백엔드 미지원**: 현재 구현에서는 httpOnly 쿠키 사용 불가
- **향후 개선**: 백엔드에서 Set-Cookie 헤더 추가 필요

#### 권장안

**보안과 편의의 균형을 위해 다음 방식을 권장합니다**:
1. **Refresh Token**: 별도의 secure storage (가능하면 httpOnly cookie, 불가능하면 메모리)
2. **Access Token**: localStorage (짧은 유효시간으로 보안 강화)
3. **추가 보안**: HTTPS 사용 필수 (프로덕션)

### Bearer 토큰 사용법

모든 인증이 필요한 요청에서:

```http
Authorization: Bearer <accessToken>
```

예:
```typescript
const response = await fetch('http://localhost:3000/api/teams', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`,
  },
})
```

### Access Token 만료 및 갱신

#### 만료 감지

1. **상태 코드 401 확인**: API 응답이 401 반환 시 토큰 만료
2. **에러 메시지**: `유효하지 않거나 만료된 토큰입니다.`

#### 갱신 절차

```typescript
// 1. Refresh Token으로 새 Access Token 요청
const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: storedRefreshToken }),
})

// 2. 응답 처리
if (refreshResponse.ok) {
  const { accessToken } = await refreshResponse.json()
  localStorage.setItem('accessToken', accessToken)
  
  // 3. 원래 요청 재시도
  // ... 
} else if (refreshResponse.status === 401) {
  // Refresh Token도 만료됨 → 재로그인 필요
  redirectToLogin()
}
```

### 인증 실패 응답

```json
{
  "error": "인증이 필요합니다."
}
```

상태 코드: `401`

---

## 공통 응답 형식

### 성공 응답 (200, 201)

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

또는 단순 객체/배열:

```json
{
  "teams": [
    { "id": "...", "name": "개발팀", ... }
  ]
}
```

### 에러 응답 (400, 401, 403, 404, 409, 500)

```json
{
  "error": "에러 메시지"
}
```

### HTTP 상태 코드 목록

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 (조회, 수정) |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 (필드 누락, 유효하지 않은 데이터) |
| 401 | Unauthorized | 인증 필요 (토큰 없음, 만료, 유효하지 않음) |
| 403 | Forbidden | 권한 없음 (팀 멤버 아님, 팀장이 아님) |
| 404 | Not Found | 리소스 없음 (팀, 일정, 메시지 등) |
| 409 | Conflict | 충돌 (중복된 이메일, 이미 구성원, 중복 신청) |
| 500 | Internal Server Error | 서버 오류 |

---

## API 엔드포인트 레퍼런스

### 인증 (Authentication)

#### POST /api/auth/signup

신규 사용자 회원가입

**인증**: 불필요

**Request Body**

```json
{
  "email": "newuser@example.com",
  "name": "새사용자",
  "password": "SecurePass123!"
}
```

**필드 설명**
- `email` (string, 필수): 이메일 주소 (형식 검증)
- `name` (string, 필수): 사용자 이름 (최대 50자)
- `password` (string, 필수): 비밀번호 (강도 검증 적용)

**비밀번호 요구사항**
- 최소 8자
- 대문자 1개 이상
- 소문자 1개 이상
- 숫자 1개 이상

**Response (201 Created)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "newuser@example.com",
    "name": "새사용자"
  }
}
```

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 400 | 필수 입력 항목이 누락되었습니다. | email, name, password 중 하나 누락 |
| 400 | 이메일 형식이 올바르지 않습니다. | 유효하지 않은 이메일 |
| 400 | 이름은 최대 50자까지 입력 가능합니다. | name 길이 초과 |
| 400 | 비밀번호는 최소 8자 이상이어야 합니다... | 비밀번호 강도 미달 |
| 409 | 이미 사용 중인 이메일입니다. | 중복된 이메일 |
| 500 | 서버 내부 오류가 발생했습니다. | 서버 오류 |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    name: '새사용자',
    password: 'SecurePass123!',
  }),
})

if (response.ok) {
  const data = await response.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  // 로그인 완료
} else {
  const error = await response.json()
  console.error('회원가입 실패:', error.error)
}
```

---

#### POST /api/auth/login

이메일과 비밀번호로 로그인

**인증**: 불필요

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**필드 설명**
- `email` (string, 필수): 등록된 이메일
- `password` (string, 필수): 등록된 비밀번호

**Response (200 OK)**

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

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | 필수 입력 항목이 누락되었습니다. |
| 401 | 이메일 또는 비밀번호가 올바르지 않습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
  }),
})

if (response.ok) {
  const data = await response.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  // 로그인 완료
} else {
  const error = await response.json()
  alert(error.error) // "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

---

#### POST /api/auth/refresh

Refresh Token으로 새 Access Token 발급

**인증**: 불필요

**Request Body**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**필드 설명**
- `refreshToken` (string, 필수): 유효한 Refresh Token

**Response (200 OK)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**주의**: Refresh Token은 재발급되지 않습니다. 저장된 Refresh Token을 계속 사용합니다.

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | refreshToken이 누락되었습니다. |
| 401 | 유효하지 않거나 만료된 Refresh Token입니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
// Access Token 만료 시 갱신
const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken'),
  }),
})

if (refreshResponse.ok) {
  const { accessToken } = await refreshResponse.json()
  localStorage.setItem('accessToken', accessToken)
  // 원래 요청 재시도
} else {
  // 재로그인 필요
  localStorage.clear()
  window.location.href = '/login'
}
```

---

#### GET /api/auth/me

현재 Access Token에 대응하는 로그인 사용자 정보를 반환 (세션 복구 / 부팅 시 사용자 식별)

**인증**: 필수

**Request Body**: 없음

**Response (200 OK)**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "name": "홍길동"
}
```

**필드 설명**
- `id`: 사용자 UUID
- `email`: 이메일
- `name`: 표시 이름

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 401 | 인증이 필요합니다. | Authorization 헤더 없음 |
| 401 | 유효하지 않은 토큰입니다. | Access Token 검증 실패 |
| 404 | 사용자를 찾을 수 없습니다. | 토큰의 userId 가 DB에 없음(탈퇴 등) |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/auth/me', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${accessToken}` },
})

if (response.ok) {
  const me = await response.json()
  // Zustand 등 전역 사용자 상태 hydration
  setCurrentUser(me)
}
```

> **사용 시점**: 앱 부팅 시 localStorage 의 Access Token 으로 본인 정보를 한 번 호출해 사용자 상태를 복구하는 패턴이 가장 흔합니다. JWT 페이로드를 직접 디코딩하지 말고 이 엔드포인트를 사용하세요(이름 변경 등이 토큰 재발급 없이 즉시 반영되어야 하므로).

---

### 팀 (Teams)

#### GET /api/teams

현재 사용자가 속한 팀 목록 조회

**인증**: 필수 (Authorization 헤더)

**Query Parameters**: 없음

**Response (200 OK)**

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
      "id": "c2d3e4f5-a6b7-8901-cdef-b1234567890a",
      "name": "마케팅팀",
      "leaderId": "e5f6a7b8-c9d0-1234-efgh-c1234567890b",
      "myRole": "MEMBER",
      "createdAt": "2026-03-15T00:00:00.000Z"
    }
  ]
}
```

**필드 설명**
- `id`: 팀 UUID
- `name`: 팀 이름
- `leaderId`: 팀장 사용자 ID
- `myRole`: 현재 사용자의 역할 (LEADER 또는 MEMBER)
- `createdAt`: 팀 생성 일시 (ISO 8601)

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/teams', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
})

const { teams } = await response.json()
```

---

#### POST /api/teams

새 팀 생성

**인증**: 필수

**Request Body**

```json
{
  "name": "새로운팀"
}
```

**필드 설명**
- `name` (string, 필수): 팀 이름 (최대 100자)

**Response (201 Created)**

```json
{
  "id": "d3e4f5a6-b7c8-9012-defg-d1234567890c",
  "name": "새로운팀",
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "myRole": "LEADER",
  "createdAt": "2026-04-09T00:00:00.000Z"
}
```

**주의**: 팀을 생성한 사용자는 자동으로 LEADER로 등록됩니다.

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | 팀 이름은 필수입니다. |
| 400 | 팀 이름은 최대 100자까지 입력 가능합니다. |
| 401 | 인증이 필요합니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/teams', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ name: '새로운팀' }),
})

if (response.ok) {
  const newTeam = await response.json()
  console.log('팀 생성 완료:', newTeam.id)
}
```

---

#### GET /api/teams/public

공개 팀 목록 조회 (팀 탐색)

**인증**: 필수

**Query Parameters**: 없음

**Response (200 OK)**

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
    }
  ]
}
```

**필드 설명**
- `memberCount`: 팀 구성원 수
- `leaderName`: 팀장 이름

**특징**
- 팀명 오름차순 정렬
- 최대 100개 팀 반환

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/teams/public', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
})

const { teams } = await response.json()
```

---

#### GET /api/teams/:teamId

팀 상세 정보 조회

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID

**Response (200 OK)**

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
      "email": "hong@example.com",
      "role": "LEADER",
      "joinedAt": "2026-04-01T00:00:00.000Z"
    },
    {
      "userId": "e5f6a7b8-c9d0-1234-efgh-c1234567890b",
      "name": "김철수",
      "email": "kim@example.com",
      "role": "MEMBER",
      "joinedAt": "2026-04-05T00:00:00.000Z"
    }
  ]
}
```

**접근 조건**
- 현재 사용자가 해당 팀의 구성원이어야 함 (403 반환)

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 해당 팀에 접근 권한이 없습니다. |
| 404 | 팀을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(`http://localhost:3000/api/teams/${teamId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
})

if (response.ok) {
  const team = await response.json()
  console.log('팀 구성원:', team.members)
}
```

---

#### PATCH /api/teams/:teamId

팀 정보 수정 (LEADER 전용)

**인증**: 필수
**권한**: LEADER만

**URL Parameters**
- `teamId` (string): 팀 ID

**Request Body** (부분 수정 지원)

```json
{
  "name": "개발팀 (리브랜딩)",
  "description": "백엔드·프론트엔드 통합",
  "isPublic": false
}
```

**필드 설명**
- `name` (string, 선택): 팀 이름 (최대 100자)
- `description` (string \| null, 선택): 팀 설명
- `isPublic` (boolean, 선택): 공개 팀 목록 노출 여부

**Response (200 OK)**

```json
{
  "id": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "name": "개발팀 (리브랜딩)",
  "description": "백엔드·프론트엔드 통합",
  "isPublic": false,
  "leaderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 401 | 인증이 필요합니다. | 토큰 없음/만료 |
| 403 | 팀장만 접근할 수 있습니다. | LEADER 가 아님 |
| 404 | 팀을 찾을 수 없습니다. | 존재하지 않는 teamId |
| 500 | 팀 수정에 실패했습니다. | DB 갱신 실패 |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isPublic: false }),
  }
)
```

---

#### DELETE /api/teams/:teamId

팀 삭제 (LEADER 전용). DB CASCADE 로 종속 데이터(구성원·일정·메시지·공지·포스트잇·프로젝트·서브일정·업무보고 권한)가 함께 정리됩니다.

**인증**: 필수
**권한**: LEADER만

**URL Parameters**
- `teamId` (string): 팀 ID

**Response (200 OK)**

```json
{ "message": "팀이 삭제되었습니다." }
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 접근할 수 있습니다. |
| 404 | 팀을 찾을 수 없습니다. |
| 500 | 팀 삭제에 실패했습니다. |

**fetch 예시**

```typescript
// 사용자 확인 다이얼로그를 반드시 거친 뒤 호출하세요.
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }
)

if (response.ok) {
  // 팀 목록(GET /api/teams)을 invalidate 후 홈으로 이동
  navigate('/')
}
```

> **주의**: 삭제 후 복구 불가. UI 에서 "삭제하시겠습니까?" 모달 + 팀명 재입력 같은 안전장치를 권장합니다.

---

#### DELETE /api/teams/:teamId/members/:userId

팀원 강제 탈퇴 (LEADER 전용)

**인증**: 필수
**권한**: LEADER만. **팀장 본인은 대상이 될 수 없음** (요청 시 400)

**URL Parameters**
- `teamId` (string): 팀 ID
- `userId` (string): 탈퇴 처리할 팀원의 사용자 ID

**Request Body**: 없음

**Response (200 OK)**

```json
{ "message": "팀원이 탈퇴 처리되었습니다." }
```

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 400 | 팀장은 탈퇴시킬 수 없습니다. | 대상 userId 가 팀의 leader_id 와 동일 |
| 401 | 인증이 필요합니다. | 토큰 없음/만료 |
| 403 | 팀장만 접근할 수 있습니다. | LEADER 가 아님 |
| 404 | 해당 팀원을 찾을 수 없습니다. | userId 가 해당 팀의 멤버가 아님 |

**fetch 예시**

```typescript
// 구성원 목록(GET /api/teams/:teamId)에서 탈퇴 대상의 userId 를 받아 호출
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/members/${userId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }
)

if (response.ok) {
  // 팀 상세(GET /api/teams/:teamId) refetch → 구성원 목록 갱신
}
```

> **UI 가이드**: 구성원 목록에서 본인(leaderId) 행에는 [탈퇴 처리] 버튼을 절대 노출하지 마세요. 잘못 누른 경우에도 서버가 400 으로 차단하지만, 클라이언트 단에서 미리 거르는 것이 UX 측면에서 자연스럽습니다.

---

### 가입 신청 (Join Requests)

#### POST /api/teams/:teamId/join-requests

팀 가입 신청 제출

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID

**Request Body**: 없음 (body 전송 불필요)

**Response (201 Created)**

```json
{
  "id": "f6a7b8c9-d0e1-2345-fghi-d1234567890d",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "requesterId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "PENDING",
  "requestedAt": "2026-04-09T10:30:00.000Z",
  "respondedAt": null
}
```

**필드 설명**
- `status`: 항상 PENDING (승인/거절 대기)
- `respondedAt`: null (팀장이 처리할 때까지)

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 401 | 인증이 필요합니다. | 토큰 없음 |
| 404 | 팀을 찾을 수 없습니다. | 팀 ID 오류 |
| 409 | 이미 해당 팀의 구성원입니다. | 이미 팀 멤버 |
| 409 | 이미 가입 신청이 진행 중입니다. | PENDING 중복 신청 |
| 500 | 서버 내부 오류가 발생했습니다. | 서버 오류 |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/join-requests`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

if (response.status === 201) {
  const joinRequest = await response.json()
  alert('가입 신청이 제출되었습니다. 팀장의 승인을 기다려주세요.')
}
```

---

#### GET /api/teams/:teamId/join-requests

팀의 PENDING 가입 신청 목록 조회

**인증**: 필수

**권한**: LEADER만 접근 가능

**URL Parameters**
- `teamId` (string): 팀 ID

**Response (200 OK)**

```json
{
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "joinRequests": [
    {
      "id": "f6a7b8c9-d0e1-2345-fghi-d1234567890d",
      "requesterId": "c2d3e4f5-a6b7-8901-cdef-b1234567890a",
      "requesterName": "이영희",
      "requesterEmail": "lee@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-09T10:30:00.000Z",
      "respondedAt": null
    }
  ]
}
```

**특징**
- PENDING 상태의 신청만 조회
- APPROVED/REJECTED는 조회되지 않음

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 이 작업을 수행할 수 있습니다. |
| 404 | 팀을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/join-requests`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

if (response.ok) {
  const { joinRequests } = await response.json()
  // 가입 신청 목록 표시
}
```

---

#### PATCH /api/teams/:teamId/join-requests/:requestId

가입 신청 승인/거절

**인증**: 필수

**권한**: LEADER만 접근 가능

**URL Parameters**
- `teamId` (string): 팀 ID
- `requestId` (string): 가입 신청 ID

**Request Body**

```json
{
  "action": "APPROVE"
}
```

또는

```json
{
  "action": "REJECT"
}
```

**필드 설명**
- `action` (string, 필수): "APPROVE" 또는 "REJECT"

**Response (200 OK)**

```json
{
  "id": "f6a7b8c9-d0e1-2345-fghi-d1234567890d",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "teamName": "개발팀",
  "requesterId": "c2d3e4f5-a6b7-8901-cdef-b1234567890a",
  "requesterName": "이영희",
  "status": "APPROVED",
  "requestedAt": "2026-04-09T10:30:00.000Z",
  "respondedAt": "2026-04-09T14:00:00.000Z"
}
```

**APPROVE의 부작용**
- 신청자가 팀에 MEMBER로 추가됨
- team_members 테이블에 새 행 삽입

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | action은 필수입니다. |
| 400 | action은 APPROVE 또는 REJECT이어야 합니다. |
| 400 | 이미 처리된 가입 신청입니다. |
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 이 작업을 수행할 수 있습니다. |
| 404 | 팀을 찾을 수 없습니다. |
| 404 | 가입 신청을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
// 승인
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/join-requests/${requestId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'APPROVE' }),
  }
)

if (response.ok) {
  const result = await response.json()
  alert(`${result.requesterName}님을 승인했습니다.`)
}

// 거절
const rejectResponse = await fetch(
  `http://localhost:3000/api/teams/${teamId}/join-requests/${requestId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'REJECT' }),
  }
)
```

---

### 일정 (Schedules)

#### GET /api/teams/:teamId/schedules

일정 목록 조회 (월/주/일 뷰)

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `view` | string | 선택 | `month` | 뷰 타입: `month`, `week`, `day` |
| `date` | string | 선택 | 오늘 | KST 기준 날짜 (YYYY-MM-DD) |

**Response (200 OK)**

```json
{
  "schedules": [
    {
      "id": "s1t2u3v4-w5x6-7890-yzab-e1234567890e",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "title": "팀 회의",
      "description": "주간 회의",
      "startAt": "2026-04-09T09:00:00.000Z",
      "endAt": "2026-04-09T10:00:00.000Z",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "createdAt": "2026-04-08T15:00:00.000Z",
      "updatedAt": "2026-04-08T15:00:00.000Z"
    }
  ],
  "view": "month",
  "date": "2026-04-09"
}
```

**필드 설명**
- `startAt`, `endAt`: ISO 8601 형식 (UTC)
- `date`: 요청한 KST 기준 날짜

**달력 뷰 범위 설명**

- **month**: 해당 월의 1일부터 다음 달 1일 이전까지 (UTC로 자동 변환)
- **week**: 일요일부터 토요일 (KST 기준)
- **day**: 해당 날짜 1일 (자정부터 다음날 자정 이전)

**예시**
```typescript
// 2026-04-09 기준 월 뷰
// http://localhost:3000/api/teams/{teamId}/schedules?view=month&date=2026-04-09

// 2026-04-09 기준 주 뷰 (일요일 2026-04-06 ~ 토요일 2026-04-12)
// http://localhost:3000/api/teams/{teamId}/schedules?view=week&date=2026-04-09

// 2026-04-09 일정만 조회
// http://localhost:3000/api/teams/{teamId}/schedules?view=day&date=2026-04-09
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | view는 month, week, day 중 하나여야 합니다. |
| 401 | 인증이 필요합니다. |
| 403 | 해당 팀에 접근 권한이 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
// 월 뷰 (기본값)
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

// 특정 날짜 기준 주 뷰
const weekResponse = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules?view=week&date=2026-04-09`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

const { schedules } = await weekResponse.json()
```

---

#### POST /api/teams/:teamId/schedules

일정 생성 (LEADER 전용)

**인증**: 필수

**권한**: LEADER만 생성 가능

**URL Parameters**
- `teamId` (string): 팀 ID

**Request Body**

```json
{
  "title": "팀 회의",
  "description": "주간 회의",
  "startAt": "2026-04-09T09:00:00.000Z",
  "endAt": "2026-04-09T10:00:00.000Z"
}
```

**필드 설명**
- `title` (string, 필수): 일정 제목 (최대 200자)
- `description` (string, 선택): 일정 설명
- `startAt` (string, 필수): 시작 일시 (ISO 8601)
- `endAt` (string, 필수): 종료 일시 (ISO 8601)

**검증 규칙**
- `endAt > startAt` (종료가 시작보다 뒤에 있어야 함)

**Response (201 Created)**

```json
{
  "id": "s1t2u3v4-w5x6-7890-yzab-e1234567890e",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "팀 회의",
  "description": "주간 회의",
  "startAt": "2026-04-09T09:00:00.000Z",
  "endAt": "2026-04-09T10:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-08T15:00:00.000Z",
  "updatedAt": "2026-04-08T15:00:00.000Z"
}
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | 제목은 필수입니다. |
| 400 | 제목은 최대 200자까지 입력 가능합니다. |
| 400 | 시작일과 종료일은 필수입니다. |
| 400 | 날짜 형식이 올바르지 않습니다. |
| 400 | 종료일은 시작일보다 늦어야 합니다. |
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 이 작업을 수행할 수 있습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: '팀 회의',
      description: '주간 회의',
      startAt: new Date('2026-04-09T09:00:00Z').toISOString(),
      endAt: new Date('2026-04-09T10:00:00Z').toISOString(),
    }),
  }
)

if (response.status === 201) {
  const schedule = await response.json()
  console.log('일정 생성됨:', schedule.id)
}
```

---

#### GET /api/teams/:teamId/schedules/:scheduleId

일정 상세 조회

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID
- `scheduleId` (string): 일정 ID

**Response (200 OK)**

```json
{
  "id": "s1t2u3v4-w5x6-7890-yzab-e1234567890e",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "팀 회의",
  "description": "주간 회의",
  "startAt": "2026-04-09T09:00:00.000Z",
  "endAt": "2026-04-09T10:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-08T15:00:00.000Z",
  "updatedAt": "2026-04-08T15:00:00.000Z"
}
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 해당 팀에 접근 권한이 없습니다. |
| 404 | 일정을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules/${scheduleId}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

const schedule = await response.json()
```

---

#### PATCH /api/teams/:teamId/schedules/:scheduleId

일정 수정 (LEADER 전용)

**인증**: 필수

**권한**: LEADER만 수정 가능

**URL Parameters**
- `teamId` (string): 팀 ID
- `scheduleId` (string): 일정 ID

**Request Body** (부분 수정 지원)

```json
{
  "title": "수정된 팀 회의",
  "startAt": "2026-04-09T10:00:00.000Z",
  "endAt": "2026-04-09T11:00:00.000Z"
}
```

**필드 설명**
- 모든 필드 선택사항 (전송된 필드만 수정)
- 변경하지 않을 필드는 생략 가능

**Response (200 OK)**

```json
{
  "id": "s1t2u3v4-w5x6-7890-yzab-e1234567890e",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "title": "수정된 팀 회의",
  "description": "주간 회의",
  "startAt": "2026-04-09T10:00:00.000Z",
  "endAt": "2026-04-09T11:00:00.000Z",
  "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-04-08T15:00:00.000Z",
  "updatedAt": "2026-04-09T16:00:00.000Z"
}
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | 날짜 형식이 올바르지 않습니다. |
| 400 | 종료일은 시작일보다 늦어야 합니다. |
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 이 작업을 수행할 수 있습니다. |
| 404 | 일정을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules/${scheduleId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: '수정된 팀 회의',
    }),
  }
)

if (response.ok) {
  const updated = await response.json()
  console.log('일정 수정됨')
}
```

---

#### DELETE /api/teams/:teamId/schedules/:scheduleId

일정 삭제 (LEADER 전용)

**인증**: 필수

**권한**: LEADER만 삭제 가능

**URL Parameters**
- `teamId` (string): 팀 ID
- `scheduleId` (string): 일정 ID

**Response (200 OK)**

```json
{
  "message": "일정이 삭제되었습니다."
}
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 팀장만 이 작업을 수행할 수 있습니다. |
| 404 | 일정을 찾을 수 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules/${scheduleId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

if (response.ok) {
  alert('일정이 삭제되었습니다.')
}
```

---

### 채팅 (Messages)

#### GET /api/teams/:teamId/messages

채팅 메시지 조회 (폴링용)

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `date` | string | 선택 | - | KST 기준 날짜 (YYYY-MM-DD) |
| `limit` | number | 선택 | `50` | 조회 개수 (date 미제공 시만 사용) |
| `before` | string | 선택 | - | ISO 8601 형식 커서 (date 미제공 시만 사용) |

**Response (200 OK)**

```json
{
  "messages": [
    {
      "id": "m1n2o3p4-q5r6-7890-qrst-f1234567890f",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "senderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "senderName": "홍길동",
      "type": "NORMAL",
      "content": "안녕하세요!",
      "sentAt": "2026-04-09T10:30:00.000Z",
      "createdAt": "2026-04-09T10:30:00.000Z"
    },
    {
      "id": "m2o3p4q5-r6s7-8901-rstu-g1234567890g",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "senderId": "e5f6a7b8-c9d0-1234-efgh-c1234567890b",
      "senderName": "김철수",
      "type": "WORK_PERFORMANCE",
      "content": "내일 회의 추가 부탁합니다.",
      "sentAt": "2026-04-09T11:00:00.000Z",
      "createdAt": "2026-04-09T11:00:00.000Z"
    }
  ]
}
```

**필드 설명**
- `type`: "NORMAL" (일반 메시지) 또는 "WORK_PERFORMANCE" (일정 요청)
- `sentAt`: 메시지 전송 시간 (ISO 8601, UTC)
- 메시지는 `sentAt` 오름차순 정렬

**조회 모드**

**모드 1: 날짜별 조회 (date 파라미터 제공)**
```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/messages?date=2026-04-09`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)
```
- KST 기준 해당 날짜의 모든 메시지 반환
- limit/before 무시됨

**모드 2: 커서 기반 조회 (date 미제공, limit/before 사용)**
```typescript
// 최신 50개 메시지
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/messages?limit=50`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)

// before 커서로 이전 메시지 조회 (폴링용)
const olderMessages = await fetch(
  `http://localhost:3000/api/teams/${teamId}/messages?limit=50&before=2026-04-09T10:30:00.000Z`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 403 | 해당 팀에 접근 권한이 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

---

#### POST /api/teams/:teamId/messages

채팅 메시지 전송

**인증**: 필수

**URL Parameters**
- `teamId` (string): 팀 ID

**Request Body**

```json
{
  "type": "NORMAL",
  "content": "안녕하세요!"
}
```

또는

```json
{
  "type": "WORK_PERFORMANCE",
  "content": "내일 회의 추가 부탁합니다."
}
```

**필드 설명**
- `type` (string, 선택): "NORMAL" (기본값) 또는 "WORK_PERFORMANCE"
- `content` (string, 필수): 메시지 내용 (최대 2000자)

**Response (201 Created)**

```json
{
  "id": "m1n2o3p4-q5r6-7890-qrst-f1234567890f",
  "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
  "senderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "senderName": "홍길동",
  "type": "NORMAL",
  "content": "안녕하세요!",
  "sentAt": "2026-04-09T10:30:00.000Z",
  "createdAt": "2026-04-09T10:30:00.000Z"
}
```

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 400 | 메시지 내용은 필수입니다. |
| 400 | 메시지는 최대 2000자까지 입력 가능합니다. |
| 400 | 잘못된 메시지 타입입니다. |
| 401 | 인증이 필요합니다. |
| 403 | 해당 팀에 접근 권한이 없습니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/messages`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      type: 'NORMAL',
      content: '안녕하세요!',
    }),
  }
)

if (response.status === 201) {
  const message = await response.json()
  console.log('메시지 전송됨')
}
```

---

### 공지사항 (Notices)

팀 채팅 상단에 고정되는 알림. 팀 구성원이면 누구나 작성할 수 있고, 삭제는 작성자 본인 또는 LEADER만 가능합니다.

#### GET /api/teams/:teamId/notices

**인증**: 필수 / **권한**: 팀 소속 구성원

**Response (200 OK)** — `createdAt` 오름차순

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

**에러**: 401 / 403(팀 소속 아님)

---

#### POST /api/teams/:teamId/notices

**인증**: 필수 / **권한**: 팀 소속 구성원

**Request Body**

```json
{ "content": "다음 주 월요일은 휴무입니다." }
```

- `content` (string, 필수, 최대 2000자)

**Response (201 Created)**: GET 의 `notices[]` 단건

**에러**: 400(content 누락/2000자 초과) / 401 / 403

---

#### DELETE /api/teams/:teamId/notices/:noticeId

**인증**: 필수 / **권한**: 작성자 본인 또는 팀 LEADER

**Response (200 OK)**: `{ "message": "공지사항이 삭제되었습니다." }`

**에러**: 401 / 403(팀 소속 아님 또는 작성자·LEADER 아님) / 404

> **UI 가이드**: 목록 렌더링 시 `senderId === currentUser.id || myRole === 'LEADER'` 일 때만 [삭제] 버튼을 노출하세요.

---

### 포스트잇 (Postits)

날짜에 부착되는 컬러 메모. 팀 구성원이면 누구나 생성하지만, 수정·삭제는 작성자 본인만 가능합니다. **목록은 월(YYYY-MM) 단위 조회**입니다.

#### GET /api/teams/:teamId/postits?month=YYYY-MM

**인증**: 필수 / **권한**: 팀 소속 구성원

**Query**: `month` (필수, `2026-04` 형식)

**Response (200 OK)**

```json
{
  "postits": [
    {
      "id": "d0e1f2a3-b4c5-6789-defa-bc0123456789",
      "teamId": "...",
      "createdBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorName": "홍길동",
      "date": "2026-04-12",
      "color": "amber",
      "content": "외부 미팅 자료 준비",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

- `color`: `indigo` | `blue` | `emerald` | `amber` | `rose`
- `content`: 생성 직후 빈 문자열일 수 있음 (PATCH 로 채움)

**에러**: 400(month 누락/형식 오류) / 401 / 403

---

#### POST /api/teams/:teamId/postits

**인증**: 필수 / **권한**: 팀 소속 구성원

**Request Body**

```json
{ "date": "2026-04-12", "color": "amber" }
```

- `date` (필수, YYYY-MM-DD)
- `color` (필수, 위 5가지 중 하나)

**Response (201 Created)**: GET 의 `postits[]` 단건. `content` 는 빈 문자열로 시작.

---

#### PATCH /api/teams/:teamId/postits/:postitId

**인증**: 필수 / **권한**: 작성자 본인만

**Request Body**

```json
{ "content": "외부 미팅 자료 작성 — 14시까지" }
```

- `content` (필수, 문자열, 빈 문자열 허용)

**Response (200 OK)**: 업데이트된 단건 (응답에 `creatorName` 은 미포함, `updatedAt` 갱신됨)

**에러**: 400(content가 문자열 아님) / 401 / 403(작성자 아님 또는 팀 소속 아님) / 404

---

#### DELETE /api/teams/:teamId/postits/:postitId

**인증**: 필수 / **권한**: 작성자 본인만

**Response (200 OK)**: `{ "message": "포스트잇이 삭제되었습니다." }`

> **UI 가이드**: `createdBy === currentUser.id` 일 때만 [수정]·[삭제] 버튼 노출. 색상 선택은 5색 팔레트 컴포넌트로 통일하세요.

---

### 업무보고 조회 권한 (Work Permissions)

`type=WORK_PERFORMANCE` 메시지를 어떤 MEMBER 가 열람할 수 있는지 제어합니다. **LEADER 는 항상 열람 가능**하며 권한 목록은 일괄 교체 방식.

#### GET /api/teams/:teamId/work-permissions

**인증**: 필수 / **권한**: 팀 소속 구성원

**Response (200 OK)**

```json
{
  "permittedUserIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "d4e5f6a7-b8c9-0123-defa-bc3456789012"
  ]
}
```

- 빈 배열(`[]`) = **전체 구성원이 열람 가능**

---

#### PATCH /api/teams/:teamId/work-permissions

**인증**: 필수 / **권한**: LEADER만

**Request Body**

```json
{
  "userIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "d4e5f6a7-b8c9-0123-defa-bc3456789012"
  ]
}
```

- `userIds` (필수, string[]): 기존 권한을 **전부 교체**. 빈 배열 전달 시 전체 권한 해제(전 구성원 열람 허용)

**Response (200 OK)**: GET 과 동일 형식의 갱신된 목록

**에러**: 400(userIds 가 배열 아님) / 401 / 403(LEADER 아님) / 404

> **UI 가이드**: 다중 선택 체크박스 + [전체 허용] 토글 패턴. `permittedUserIds.length === 0` 일 때 "전체 허용" 상태로 표시하고, 일부만 선택할 경우 그 userIds 배열을 그대로 PATCH 하면 됩니다.

---

### 프로젝트 (Projects)

3계층 구조: **Project → ProjectSchedule → SubSchedule**. 각 계층은 팀 구성원 누구나 생성하고, **수정·삭제는 생성자 본인만** 가능합니다.

**공통 규칙**
- 색상 (`color`): `indigo` | `blue` | `emerald` | `amber` | `rose`
- 날짜 (`startDate`, `endDate`): `YYYY-MM-DD`. **`endDate >= startDate`** 검증
- 진행률 (`progress`): 0~100 정수
- `isDelayed`: 지연 여부 boolean

---

#### GET /api/teams/:teamId/projects

**인증**: 필수 / **권한**: 팀 소속 구성원

**Response (200 OK)**

```json
{
  "projects": [
    {
      "id": "e1f2a3b4-c5d6-7890-efab-cd1234567890",
      "teamId": "...",
      "createdBy": "...",
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
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

- `phases`: 프로젝트 내부 단계 목록. 하위 ProjectSchedule 의 `phaseId` 가 이 배열의 `id` 를 참조합니다.

---

#### POST /api/teams/:teamId/projects

**인증**: 필수 / **권한**: 팀 소속 구성원

**Request Body**

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

- `name` 필수(최대 200자), `startDate`/`endDate` 필수
- `phases[].id` 미지정 시 서버에서 UUID 자동 발급, `order` 미지정 시 1부터 자동 부여

**Response (201 Created)**: GET 의 `projects[]` 단건

**에러**: 400(name 누락/200자 초과·날짜 누락·endDate < startDate) / 401 / 403

---

#### GET /api/teams/:teamId/projects/:projectId

**Response (200 OK)**: 단건 (`projects[]` 형식). 404 가능.

---

#### PATCH /api/teams/:teamId/projects/:projectId

**권한**: **생성자 본인만**

모든 필드 선택. **키 존재 여부**로 갱신 대상이 결정됩니다(undefined 는 무시, null 은 명시적 비우기).

**Body 필드**: `name`, `description`, `startDate`, `endDate`, `progress`, `manager`, `phases`

> `startDate` 또는 `endDate` 만 변경해도 서버가 기존 값과 합쳐 `startDate <= endDate` 를 검증합니다.

**Response (200 OK)**: 업데이트된 단건

**에러**: 400(name 200자 초과·날짜 역전) / 401 / 403(생성자 아님) / 404

---

#### DELETE /api/teams/:teamId/projects/:projectId

**권한**: **생성자 본인만**. 하위 ProjectSchedule·SubSchedule 은 CASCADE 정리.

**Response (200 OK)**: `{ "message": "프로젝트가 삭제되었습니다." }`

---

#### GET /api/teams/:teamId/projects/:projectId/schedules

**인증**: 필수 / **권한**: 팀 소속 구성원

**Response (200 OK)**

```json
{
  "schedules": [
    {
      "id": "f1a2b3c4-d5e6-7890-fabc-de1234567890",
      "projectId": "e1f2a3b4-c5d6-7890-efab-cd1234567890",
      "teamId": "...",
      "createdBy": "...",
      "title": "프론트엔드 개발",
      "description": null,
      "color": "indigo",
      "startDate": "2026-04-15",
      "endDate": "2026-05-15",
      "leader": "이영희",
      "progress": 20,
      "isDelayed": false,
      "phaseId": "p2",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

#### POST /api/teams/:teamId/projects/:projectId/schedules

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

- `title`(필수, 최대 200자), `startDate`/`endDate`(필수)
- `color` 미지정 시 `indigo`
- `phaseId` (선택): UUID 형식. 부모 Project 의 `phases[].id` 와 매칭(서버는 형식만 검증)

**Response (201 Created)**: 단건

**에러**: 400(title·날짜·color 5색 외·phaseId UUID 형식 외) / 401 / 403 / 404(프로젝트 부재)

---

#### PATCH /api/teams/:teamId/projects/:projectId/schedules/:scheduleId

**권한**: **생성자 본인만**. 모든 필드 선택. `startDate`/`endDate` 부분 변경 시 기존값과 결합 검증.

**Response (200 OK)**: 단건

---

#### DELETE /api/teams/:teamId/projects/:projectId/schedules/:scheduleId

**권한**: **생성자 본인만**. 하위 SubSchedule 은 CASCADE 정리.

**Response (200 OK)**: `{ "message": "프로젝트 일정이 삭제되었습니다." }`

---

#### GET /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules

**Response (200 OK)**

```json
{
  "subSchedules": [
    {
      "id": "a2b3c4d5-e6f7-8901-abcd-ef2345678901",
      "scheduleId": "f1a2b3c4-d5e6-7890-fabc-de1234567890",
      "projectId": "...",
      "teamId": "...",
      "createdBy": "...",
      "title": "로그인 화면 구현",
      "description": null,
      "color": "blue",
      "startDate": "2026-04-15",
      "endDate": "2026-04-22",
      "leader": "이영희",
      "progress": 50,
      "isDelayed": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

> SubSchedule 은 `phaseId` 가 없습니다(상위 ProjectSchedule 에 종속).

---

#### POST /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules

**Request Body**: ProjectSchedule POST 와 동일 (단 `phaseId` 없음)

**Response (201 Created)**: 단건

---

#### PATCH /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId

**권한**: **생성자 본인만**

---

#### DELETE /api/teams/:teamId/projects/:projectId/schedules/:scheduleId/sub-schedules/:subId

**권한**: **생성자 본인만**. **Response (200 OK)**: `{ "message": "서브 일정이 삭제되었습니다." }`

> **간트차트 UI 팁**: 계층 트리(Project → Schedule → Sub) 구조라 한 화면에서 다층을 그릴 때 `phaseId` 를 컬럼/스윔레인 키로 활용하면 단계별 그룹핑이 깔끔합니다. 진행률·`isDelayed` 는 막대 색상 강조용으로 자주 쓰입니다.

---

### 내 정보 (Me)

#### PATCH /api/me

내 프로필(표시 이름) 수정. 본인 한정.

**인증**: 필수

**Request Body**

```json
{ "name": "홍길동" }
```

**필드 설명**
- `name` (string, 필수): 새 표시 이름. 양 끝 공백은 trim 처리, **trim 후 1~50자**

**Response (200 OK)**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "name": "홍길동"
}
```

**에러 케이스**

| 상태 | 메시지 | 원인 |
|------|--------|------|
| 400 | 이름은 필수입니다. | name 누락 또는 공백만 입력 |
| 400 | 이름은 최대 50자까지 입력 가능합니다. | trim 후 50자 초과 |
| 401 | 인증이 필요합니다. | 토큰 없음/만료 |
| 404 | 사용자를 찾을 수 없습니다. | 토큰의 userId 에 해당하는 사용자 부재 |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/me', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ name: trimmedName }),
})

if (response.ok) {
  const updated = await response.json()
  setCurrentUser(updated)               // 전역 사용자 상태 갱신
  // 팀 상세·일정·메시지의 creatorName/senderName 은 다음 fetch 시 자동 갱신
}
```

> **클라이언트 검증**: 서버가 trim·길이 검증을 다시 수행하지만, UX 를 위해 입력 직후 길이 카운터(예: `15/50`)와 trim 미리보기를 보여주는 것을 권장합니다.

---

#### GET /api/me/tasks

나의 할 일 조회

**인증**: 필수

**설명**: 현재 사용자가 LEADER인 팀들의 PENDING 가입 신청 전체 조회

**Response (200 OK)**

```json
{
  "totalPendingCount": 2,
  "tasks": [
    {
      "id": "f6a7b8c9-d0e1-2345-fghi-d1234567890d",
      "teamId": "b1c2d3e4-f5a6-7890-bcde-fa1234567890",
      "teamName": "개발팀",
      "requesterId": "c2d3e4f5-a6b7-8901-cdef-b1234567890a",
      "requesterName": "이영희",
      "requesterEmail": "lee@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-09T10:30:00.000Z",
      "respondedAt": null
    },
    {
      "id": "g7h8i9j0-k1l2-3456-ijkl-h1234567890h",
      "teamId": "c2d3e4f5-a6b7-8901-cdef-b1234567890a",
      "teamName": "마케팅팀",
      "requesterId": "d3e4f5a6-b7c8-9012-defg-d1234567890c",
      "requesterName": "박준호",
      "requesterEmail": "park@example.com",
      "status": "PENDING",
      "requestedAt": "2026-04-08T15:00:00.000Z",
      "respondedAt": null
    }
  ]
}
```

**필드 설명**
- `totalPendingCount`: PENDING 상태의 가입 신청 총 개수
- `tasks`: PENDING 가입 신청 목록

**특징**
- LEADER인 모든 팀의 PENDING 신청을 통합하여 반환
- MEMBER만인 사용자는 빈 배열 반환
- 팀명으로 쉽게 필터링 가능

**에러 케이스**

| 상태 | 메시지 |
|------|--------|
| 401 | 인증이 필요합니다. |
| 500 | 서버 내부 오류가 발생했습니다. |

**fetch 예시**

```typescript
const response = await fetch('http://localhost:3000/api/me/tasks', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
})

if (response.ok) {
  const { totalPendingCount, tasks } = await response.json()
  console.log(`처리 대기 중: ${totalPendingCount}건`)
  
  // 팀별로 그룹화
  const byTeam = {}
  tasks.forEach(task => {
    if (!byTeam[task.teamId]) {
      byTeam[task.teamId] = []
    }
    byTeam[task.teamId].push(task)
  })
}
```

---

## 권한 체계

### 역할별 접근 제어

| 기능 | LEADER | MEMBER | 비회원 |
|------|--------|--------|--------|
| 내 정보 조회 / 프로필(이름) 수정 | ✓ | ✓ | ✗ |
| 팀 생성 | ✓ | ✓ | ✗ |
| 팀 상세 조회 | ✓ (소속) | ✓ (소속) | ✗ |
| 팀 정보 수정 | ✓ | ✗ | ✗ |
| 팀 삭제 | ✓ | ✗ | ✗ |
| 팀원 강제 탈퇴 | ✓ (본인 제외) | ✗ | ✗ |
| 팀 가입 신청 | ✓ (타 팀) | ✓ (타 팀) | ✗ |
| 가입 신청 조회 | ✓ | ✗ | ✗ |
| 가입 신청 처리 | ✓ | ✗ | ✗ |
| 일정 조회 | ✓ | ✓ | ✗ |
| 일정 생성 | ✓ | ✓ | ✗ |
| 일정 수정·삭제 | 생성자 본인 | 생성자 본인 | ✗ |
| 메시지 송수신 | ✓ | ✓ | ✗ |
| 공지사항 조회·작성 | ✓ | ✓ | ✗ |
| 공지사항 삭제 | ✓ (모두) | 작성자 본인 | ✗ |
| 포스트잇 조회·생성 | ✓ | ✓ | ✗ |
| 포스트잇 수정·삭제 | 생성자 본인 | 생성자 본인 | ✗ |
| 업무보고 조회 권한 목록 조회 | ✓ | ✓ | ✗ |
| 업무보고 조회 권한 설정 | ✓ | ✗ | ✗ |
| 프로젝트·프로젝트 일정·서브 일정 조회·생성 | ✓ | ✓ | ✗ |
| 프로젝트·프로젝트 일정·서브 일정 수정·삭제 | 생성자 본인 | 생성자 본인 | ✗ |
| 내 할 일 조회 | ✓ | (빈 배열) | ✗ |

### 권한 에러 처리 (403)

```json
{
  "error": "팀장만 이 작업을 수행할 수 있습니다."
}
```

또는

```json
{
  "error": "해당 팀에 접근 권한이 없습니다."
}
```

**프론트엔드에서의 처리**

```typescript
if (response.status === 403) {
  // 접근 거부 화면 표시
  alert('이 작업을 수행할 권한이 없습니다.')
  
  // 또는 UI 비활성화
  disableLeaderOnlyButtons()
}
```

---

## 날짜/시간 처리

### 핵심 원칙

**백엔드**: 모든 시간을 UTC로 저장
**프론트엔드**: 사용자는 KST (UTC+9)로 조회

### KST (한국 표준시)

```
KST = UTC + 9시간
예: UTC 2026-04-07T15:00:00.000Z = KST 2026-04-08 (자정)
```

### 날짜 전달 형식

#### 캘린더 조회 (KST 날짜)

```typescript
// KST 기준 "2026-04-09" 형식으로 전달
// = 한국 시간 2026년 4월 9일 자정부터 다음날 자정 이전까지

const kstDate = '2026-04-09'
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules?date=${kstDate}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
)
```

#### 시간 기반 조회 (ISO 8601 UTC)

```typescript
// 일정, 메시지의 startAt, endAt, sentAt 등은 ISO 8601 형식 (UTC)

const startDate = new Date('2026-04-09T09:00:00Z') // UTC
const response = await fetch(
  `http://localhost:3000/api/teams/${teamId}/schedules`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: '팀 회의',
      startAt: startDate.toISOString(),
      endAt: new Date(startDate.getTime() + 3600000).toISOString(),
    }),
  }
)
```

### 프론트엔드 날짜 처리 유틸

```typescript
/**
 * KST 날짜 문자열 (YYYY-MM-DD) 생성
 */
function formatKstDate(date: Date): string {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kstDate.toISOString().split('T')[0]
}

/**
 * KST 기준 오늘 날짜
 */
function getTodayKstDate(): string {
  return formatKstDate(new Date())
}

/**
 * KST 날짜에서 요일 계산
 */
function getKstDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

/**
 * 월 뷰용 달력 배열 생성
 */
function getKstCalendarDays(yearMonth: string): Date[] {
  const year = parseInt(yearMonth.split('-')[0])
  const month = parseInt(yearMonth.split('-')[1]) - 1
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate))
    startDate.setDate(startDate.getDate() + 1)
  }
  
  return days
}
```

### 캘린더 뷰 범위

#### Month (월 뷰)

```
입력: date=2026-04-15 (4월 15일)
범위: 4월 1일 ~ 4월 30일 (다음달 1일 이전)
```

#### Week (주 뷰)

```
입력: date=2026-04-15 (수요일)
범위: 일요일 4월 12일 ~ 토요일 4월 18일
```

#### Day (일 뷰)

```
입력: date=2026-04-15
범위: 4월 15일 자정 ~ 4월 16일 자정 이전
```

---

## 채팅 폴링 패턴

### 폴링 구현 권장 방식

```typescript
class ChatPoller {
  private teamId: string
  private accessToken: string
  private pollingInterval: NodeJS.Timeout | null = null
  private lastFetchTime: Date | null = null

  constructor(teamId: string, accessToken: string) {
    this.teamId = teamId
    this.accessToken = accessToken
  }

  /**
   * 폴링 시작
   * @param intervalMs 폴링 간격 (기본 3000ms = 3초)
   */
  start(intervalMs: number = 3000) {
    this.pollingInterval = setInterval(() => {
      this.fetchNewMessages()
    }, intervalMs)
  }

  /**
   * 폴링 중지
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  /**
   * 최신 메시지 조회 (커서 기반)
   */
  private async fetchNewMessages() {
    try {
      let url = `http://localhost:3000/api/teams/${this.teamId}/messages?limit=50`
      
      // before 커서가 있으면 이전 메시지 조회
      if (this.lastFetchTime) {
        url += `&before=${this.lastFetchTime.toISOString()}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        console.error('메시지 조회 실패:', response.status)
        return
      }

      const { messages } = await response.json()
      
      if (messages.length > 0) {
        // 가장 오래된 메시지 시간을 다음 before으로 설정
        this.lastFetchTime = new Date(messages[0].sentAt)
        
        // 메시지 콜백 호출 (UI 업데이트)
        this.onMessagesReceived?.(messages)
      }
    } catch (error) {
      console.error('폴링 오류:', error)
    }
  }

  /**
   * 특정 날짜의 메시지 조회
   */
  async fetchMessagesByDate(date: string) {
    try {
      const response = await fetch(
        `http://localhost:3000/api/teams/${this.teamId}/messages?date=${date}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        console.error('메시지 조회 실패:', response.status)
        return
      }

      const { messages } = await response.json()
      return messages
    } catch (error) {
      console.error('날짜별 조회 오류:', error)
      return []
    }
  }

  // 콜백
  onMessagesReceived?: (messages: any[]) => void
}

// 사용 예시
const poller = new ChatPoller(teamId, accessToken)
poller.onMessagesReceived = (messages) => {
  console.log('새 메시지:', messages)
  // UI 업데이트
  updateChatUI(messages)
}
poller.start(3000) // 3초마다 폴링

// 컴포넌트 언마운트 시
poller.stop()
```

### Date vs Limit/Before 선택

| 상황 | 추천 | 이유 |
|------|------|------|
| 채팅 창 처음 열기 | limit/before | 최신 50개 메시지로 빠른 로딩 |
| 과거 메시지 스크롤 | limit/before + before 커서 | 무한 스크롤 구현 용이 |
| 특정 날짜 전체 조회 | date | "2026-04-09 메시지" 등 일일 채팅 보기 |

---

## 에러 처리 가이드

### 401 Unauthorized (인증 오류)

**원인**
- Authorization 헤더 없음
- 토큰 누락 또는 잘못된 형식
- Access Token 만료
- 유효하지 않은 토큰

**프론트엔드 처리**

```typescript
if (response.status === 401) {
  // 1. 토큰 갱신 시도
  const refreshed = await refreshAccessToken()
  
  if (refreshed) {
    // 원래 요청 재시도
    return retryOriginalRequest()
  } else {
    // 재로그인 필요
    localStorage.clear()
    window.location.href = '/login'
  }
}
```

### 403 Forbidden (권한 오류)

**원인**
- 팀 멤버가 아님
- LEADER 권한 없음
- 다른 팀의 리소스 접근 시도

**프론트엔드 처리**

```typescript
if (response.status === 403) {
  // UI에서 권한 없음 표시
  showAccessDeniedMessage()
  
  // 권한 필요한 버튼 비활성화
  disableLeaderOnlyFeatures()
}
```

### 404 Not Found (리소스 없음)

**원인**
- 팀, 일정, 메시지 등 리소스 삭제됨
- 잘못된 ID로 조회

**프론트�encode드 처리**

```typescript
if (response.status === 404) {
  // 목록으로 돌아가기
  alert('요청한 리소스를 찾을 수 없습니다.')
  navigate('/teams')
}
```

### 409 Conflict (충돌)

**원인**
- 중복된 이메일 (회원가입)
- 이미 팀 멤버
- 이미 진행 중인 가입 신청

**프론트엔드 처리**

```typescript
if (response.status === 409) {
  const { error } = await response.json()
  
  if (error.includes('이메일')) {
    // 이메일 중복 처리
    showDuplicateEmailError()
  } else if (error.includes('구성원')) {
    // 이미 멤버 처리
    showAlreadyMemberError()
  } else if (error.includes('신청')) {
    // 중복 신청 처리
    showPendingRequestError()
  }
}
```

### 500 Internal Server Error

**일반적 처리**

```typescript
if (response.status === 500) {
  // 사용자에게 일반적 에러 메시지
  alert('일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  
  // 로그 기록
  console.error('서버 오류:', response)
  
  // 선택: 에러 트래킹 서비스에 보고
  logErrorToService(response)
}
```

### 네트워크 에러 vs API 에러

```typescript
async function makeRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      // API 에러
      const error = await response.json()
      handleApiError(response.status, error)
      return
    }
    
    return await response.json()
  } catch (error) {
    // 네트워크 에러
    if (error instanceof TypeError) {
      alert('네트워크 연결을 확인해주세요.')
    } else {
      alert('예상치 못한 오류가 발생했습니다.')
    }
    console.error('네트워크 오류:', error)
  }
}

function handleApiError(status: number, error: any) {
  switch (status) {
    case 400:
      alert(`입력 오류: ${error.error}`)
      break
    case 401:
      redirectToLogin()
      break
    case 403:
      alert('접근 권한이 없습니다.')
      break
    case 404:
      alert('요청한 리소스를 찾을 수 없습니다.')
      break
    case 409:
      alert(`충돌: ${error.error}`)
      break
    case 500:
      alert('서버 오류입니다. 잠시 후 다시 시도해주세요.')
      break
    default:
      alert(`오류: ${error.error}`)
  }
}
```

---

## 개발 환경 설정

### 백엔드 실행

#### 1. 저장소 클론 및 설정

```bash
cd ~/_vibe/team-works/backend

# 의존성 설치
npm install

# 환경변수 설정
# .env.local 파일 생성
```

#### 2. 환경변수 (.env.local)

```env
# 데이터베이스 (Docker 컨테이너 postgres-db — 자세한 설정은 docs/30-docker-container-gen.md §10 실행 절차 참고)
DATABASE_URL=postgresql://teamworks-manager:Nts123%21%40%23@localhost:5432/teamworks

# JWT 토큰
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### 3. 데이터베이스 마이그레이션

```bash
npm run migrate
```

#### 4. 개발 서버 실행

```bash
npm run dev
```

백엔드가 `http://localhost:3000`에서 실행됩니다.

### Swagger UI 확인

```
http://localhost:3000/swagger-ui
```

모든 API 엔드포인트를 대화형으로 테스트할 수 있습니다.

### 프론트엔드 개발 팁

#### CORS 이슈 처리

로컬 개발 중 다른 포트에서 프론트엔드를 실행하는 경우, CORS 정책이 적용됩니다.

**권장 설정**:
- 프론트엔드: `http://localhost:3001` 또는 다른 포트
- 백엔드: `http://localhost:3000`

프론트엔드 fetch 요청 시 전체 경로 사용:
```typescript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
```

#### 토큰 디버깅

로컬 스토리지 확인:
```typescript
console.log(localStorage.getItem('accessToken'))
console.log(localStorage.getItem('refreshToken'))

// JWT 디코딩 (jwt-decode 라이브러리 사용)
import { jwtDecode } from 'jwt-decode'
const decoded = jwtDecode(localStorage.getItem('accessToken'))
console.log(decoded)
```

---

## API 클라이언트 구현 예시

### 자동 토큰 갱신 기능이 있는 API 클라이언트

```typescript
/**
 * API 클라이언트: 자동 토큰 갱신 포함
 */
class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.loadTokens()
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('accessToken')
    this.refreshToken = localStorage.getItem('refreshToken')
  }

  private saveTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    localStorage.setItem('accessToken', accessToken)
    
    if (refreshToken) {
      this.refreshToken = refreshToken
      localStorage.setItem('refreshToken', refreshToken)
    }
  }

  private clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  /**
   * Refresh Token으로 새 Access Token 발급
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (response.ok) {
        const { accessToken } = await response.json()
        this.saveTokens(accessToken)
        return true
      } else {
        // Refresh Token도 만료됨
        this.clearTokens()
        return false
      }
    } catch (error) {
      console.error('토큰 갱신 오류:', error)
      return false
    }
  }

  /**
   * API 요청 (자동 인증 헤더 추가, 토큰 갱신 처리)
   */
  async request<T>(
    path: string,
    options: RequestInit & { retry?: boolean } = {}
  ): Promise<T> {
    const { retry = true, ...fetchOptions } = options
    
    const url = `${this.baseUrl}${path}`
    const headers = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    }

    // Authorization 헤더 추가
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // 401 응답: 토큰 갱신 후 재시도
    if (response.status === 401 && retry) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        // 재시도 (무한 재귀 방지를 위해 retry = false)
        return this.request<T>(path, { ...options, retry: false })
      } else {
        // 재로그인 필요
        throw new Error('인증 만료: 로그인이 필요합니다.')
      }
    }

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(response.status, error.error)
    }

    return response.json()
  }

  // 편의 메서드들

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async patch<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }

  // 인증 메서드들

  async signup(email: string, name: string, password: string) {
    const data = await this.post<any>('/api/auth/signup', {
      email,
      name,
      password,
    })
    this.saveTokens(data.accessToken, data.refreshToken)
    return data
  }

  async login(email: string, password: string) {
    const data = await this.post<any>('/api/auth/login', {
      email,
      password,
    })
    this.saveTokens(data.accessToken, data.refreshToken)
    return data
  }

  logout() {
    this.clearTokens()
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  // 내 정보 메서드들

  async getMe() {
    return this.get<{ id: string; email: string; name: string }>('/api/auth/me')
  }

  async updateMyName(name: string) {
    return this.patch<{ id: string; email: string; name: string }>(
      '/api/me',
      { name }
    )
  }

  // 팀 메서드들

  async getMyTeams() {
    return this.get<{ teams: any[] }>('/api/teams')
  }

  async createTeam(name: string) {
    return this.post<any>('/api/teams', { name })
  }

  async getPublicTeams() {
    return this.get<{ teams: any[] }>('/api/teams/public')
  }

  async getTeamDetail(teamId: string) {
    return this.get<any>(`/api/teams/${teamId}`)
  }

  async updateTeam(
    teamId: string,
    payload: { name?: string; description?: string | null; isPublic?: boolean }
  ) {
    return this.patch<any>(`/api/teams/${teamId}`, payload)
  }

  async deleteTeam(teamId: string) {
    return this.delete<{ message: string }>(`/api/teams/${teamId}`)
  }

  async removeTeamMember(teamId: string, userId: string) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/members/${userId}`
    )
  }

  // 가입 신청 메서드들

  async requestTeamJoin(teamId: string) {
    return this.post<any>(`/api/teams/${teamId}/join-requests`, {})
  }

  async getJoinRequests(teamId: string) {
    return this.get<any>(`/api/teams/${teamId}/join-requests`)
  }

  async respondToJoinRequest(
    teamId: string,
    requestId: string,
    action: 'APPROVE' | 'REJECT'
  ) {
    return this.patch<any>(
      `/api/teams/${teamId}/join-requests/${requestId}`,
      { action }
    )
  }

  // 일정 메서드들

  async getSchedules(
    teamId: string,
    options?: { view?: 'month' | 'week' | 'day'; date?: string }
  ) {
    let path = `/api/teams/${teamId}/schedules`
    if (options) {
      const params = new URLSearchParams()
      if (options.view) params.append('view', options.view)
      if (options.date) params.append('date', options.date)
      if (params.toString()) path += `?${params.toString()}`
    }
    return this.get<any>(path)
  }

  async createSchedule(
    teamId: string,
    schedule: {
      title: string
      description?: string
      startAt: string
      endAt: string
    }
  ) {
    return this.post<any>(`/api/teams/${teamId}/schedules`, schedule)
  }

  async getScheduleDetail(teamId: string, scheduleId: string) {
    return this.get<any>(`/api/teams/${teamId}/schedules/${scheduleId}`)
  }

  async updateSchedule(
    teamId: string,
    scheduleId: string,
    schedule: any
  ) {
    return this.patch<any>(
      `/api/teams/${teamId}/schedules/${scheduleId}`,
      schedule
    )
  }

  async deleteSchedule(teamId: string, scheduleId: string) {
    return this.delete<any>(`/api/teams/${teamId}/schedules/${scheduleId}`)
  }

  // 메시지 메서드들

  async getMessages(
    teamId: string,
    options?: { date?: string; limit?: number; before?: Date }
  ) {
    let path = `/api/teams/${teamId}/messages`
    if (options) {
      const params = new URLSearchParams()
      if (options.date) params.append('date', options.date)
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.before) params.append('before', options.before.toISOString())
      if (params.toString()) path += `?${params.toString()}`
    }
    return this.get<any>(path)
  }

  async sendMessage(
    teamId: string,
    message: { type?: 'NORMAL' | 'WORK_PERFORMANCE'; content: string }
  ) {
    return this.post<any>(`/api/teams/${teamId}/messages`, message)
  }

  // 공지사항 메서드들

  async getNotices(teamId: string) {
    return this.get<{ notices: any[] }>(`/api/teams/${teamId}/notices`)
  }

  async createNotice(teamId: string, content: string) {
    return this.post<any>(`/api/teams/${teamId}/notices`, { content })
  }

  async deleteNotice(teamId: string, noticeId: string) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/notices/${noticeId}`
    )
  }

  // 포스트잇 메서드들

  async getPostits(teamId: string, month: string) {
    return this.get<{ postits: any[] }>(
      `/api/teams/${teamId}/postits?month=${month}`
    )
  }

  async createPostit(
    teamId: string,
    payload: { date: string; color: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose' }
  ) {
    return this.post<any>(`/api/teams/${teamId}/postits`, payload)
  }

  async updatePostit(teamId: string, postitId: string, content: string) {
    return this.patch<any>(`/api/teams/${teamId}/postits/${postitId}`, {
      content,
    })
  }

  async deletePostit(teamId: string, postitId: string) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/postits/${postitId}`
    )
  }

  // 업무보고 조회 권한 메서드들

  async getWorkPermissions(teamId: string) {
    return this.get<{ permittedUserIds: string[] }>(
      `/api/teams/${teamId}/work-permissions`
    )
  }

  async setWorkPermissions(teamId: string, userIds: string[]) {
    return this.patch<{ permittedUserIds: string[] }>(
      `/api/teams/${teamId}/work-permissions`,
      { userIds }
    )
  }

  // 프로젝트 메서드들

  async getProjects(teamId: string) {
    return this.get<{ projects: any[] }>(`/api/teams/${teamId}/projects`)
  }

  async createProject(teamId: string, payload: any) {
    return this.post<any>(`/api/teams/${teamId}/projects`, payload)
  }

  async getProject(teamId: string, projectId: string) {
    return this.get<any>(`/api/teams/${teamId}/projects/${projectId}`)
  }

  async updateProject(teamId: string, projectId: string, payload: any) {
    return this.patch<any>(
      `/api/teams/${teamId}/projects/${projectId}`,
      payload
    )
  }

  async deleteProject(teamId: string, projectId: string) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/projects/${projectId}`
    )
  }

  // 프로젝트 일정 메서드들

  async getProjectSchedules(teamId: string, projectId: string) {
    return this.get<{ schedules: any[] }>(
      `/api/teams/${teamId}/projects/${projectId}/schedules`
    )
  }

  async createProjectSchedule(
    teamId: string,
    projectId: string,
    payload: any
  ) {
    return this.post<any>(
      `/api/teams/${teamId}/projects/${projectId}/schedules`,
      payload
    )
  }

  async updateProjectSchedule(
    teamId: string,
    projectId: string,
    scheduleId: string,
    payload: any
  ) {
    return this.patch<any>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}`,
      payload
    )
  }

  async deleteProjectSchedule(
    teamId: string,
    projectId: string,
    scheduleId: string
  ) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}`
    )
  }

  // 서브 일정 메서드들

  async getSubSchedules(teamId: string, projectId: string, scheduleId: string) {
    return this.get<{ subSchedules: any[] }>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}/sub-schedules`
    )
  }

  async createSubSchedule(
    teamId: string,
    projectId: string,
    scheduleId: string,
    payload: any
  ) {
    return this.post<any>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}/sub-schedules`,
      payload
    )
  }

  async updateSubSchedule(
    teamId: string,
    projectId: string,
    scheduleId: string,
    subId: string,
    payload: any
  ) {
    return this.patch<any>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}/sub-schedules/${subId}`,
      payload
    )
  }

  async deleteSubSchedule(
    teamId: string,
    projectId: string,
    scheduleId: string,
    subId: string
  ) {
    return this.delete<{ message: string }>(
      `/api/teams/${teamId}/projects/${projectId}/schedules/${scheduleId}/sub-schedules/${subId}`
    )
  }

  // 내 정보 메서드들

  async getMyTasks() {
    return this.get<any>('/api/me/tasks')
  }
}

// 커스텀 에러 클래스
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// 사용 예시
const api = new ApiClient()

// 회원가입
try {
  const user = await api.signup('user@example.com', '홍길동', 'SecurePass123!')
  console.log('회원가입 완료:', user)
} catch (error) {
  console.error('회원가입 실패:', error)
}

// 팀 목록 조회
const { teams } = await api.getMyTeams()
console.log('내 팀:', teams)

// 일정 생성
const schedule = await api.createSchedule(teamId, {
  title: '팀 회의',
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 3600000).toISOString(),
})

// 자동 토큰 갱신 테스트
// Access Token이 만료되어도 자동으로 갱신된 후 요청 재시도됨
const data = await api.get('/api/teams')
```

### React Hook으로 API 클라이언트 통합

```typescript
// useApi.ts
import { useCallback, useState } from 'react'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { request, loading, error }
}

// 사용 예시
function TeamList() {
  const api = useApiClient() // 전역 API 클라이언트
  const { request, loading, error } = useApi()
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    const loadTeams = async () => {
      const data = await request(() => api.getMyTeams())
      if (data) {
        setTeams(data.teams)
      }
    }

    loadTeams()
  }, [])

  if (loading) return <div>로딩 중...</div>
  if (error) return <div>오류: {error}</div>

  return (
    <ul>
      {teams.map(team => (
        <li key={team.id}>{team.name}</li>
      ))}
    </ul>
  )
}
```

---

## 요약

이 문서는 프론트엔드 개발자가 필요한 모든 정보를 포함합니다:

1. **기본 설정**: 서버 주소, 기술 스택, 인증 방식
2. **인증 구현**: JWT 토큰 관리, 자동 갱신 로직
3. **API 명세**: 모든 엔드포인트의 요청/응답 형식
4. **실제 코드 예시**: fetch 사용, 클라이언트 구현 패턴
5. **에러 처리**: 상태 코드별 대응 방법
6. **고급 기능**: 폴링, 날짜 처리, 권한 관리

**시작하기**:
1. 로컬에서 백엔드 실행
2. `http://localhost:3000/swagger-ui` 방문하여 API 미리보기
3. API 클라이언트 구현 (위의 예시 참고)
4. 각 엔드포인트 테스트

질문이나 문제가 있으면 API 응답의 에러 메시지를 확인하고 해당 섹션을 참조하세요.
