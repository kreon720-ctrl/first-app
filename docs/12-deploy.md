# TEAM WORKS — Vercel 배포 가이드

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-18 | 앱명 TEAM WORKS 반영, 로컬 PC 배포는 docs/deploy_local.md로 분리 |
| 1.2 | 2026-04-20 | 실제 구현 반영: DB 테이블 6→12개, 배포 확인 체크리스트 확장(포스트잇/공지/업무보고 권한/프로젝트), 로컬 개발 포트 충돌 주의사항, CORS preflight 트러블슈팅 추가 |

---

## 개요

TEAM WORKS는 **frontend**(React 클라이언트)와 **backend**(Next.js API 서버) 두 개의 독립적인 Next.js 앱으로 구성됩니다. Vercel에 각각 별도 프로젝트로 배포합니다.

```
GitHub: github.com/kreon720-ctrl/team-works
  ├── backend/   → Vercel 프로젝트 A (API 서버, Next.js 16.2.2)
  └── frontend/  → Vercel 프로젝트 B (React 클라이언트, Next.js 16.2.3)
```

> **배포 순서**: backend 먼저 배포 → URL 확인 → frontend 배포 → frontend URL을 backend CORS에 설정 후 재배포

---

## 사전 준비

### 필요 계정
- [Vercel](https://vercel.com) 계정 (GitHub 연동)
- PostgreSQL 데이터베이스 (권장: [Neon](https://neon.tech) 무료 플랜 또는 [Supabase](https://supabase.com))

### 로컬 빌드 사전 확인

배포 전에 로컬에서 빌드가 성공하는지 확인합니다.

```bash
# backend 빌드 확인 (Next.js 16.2.2)
cd backend
npm run build

# frontend 빌드 확인 (Next.js 16.2.3)
cd frontend
npm run build
```

두 빌드 모두 오류 없이 완료되어야 합니다.

> **로컬 개발 포트 충돌 주의**  
> `backend`와 `frontend` 모두 `next dev` 기본 포트가 3000입니다.  
> 로컬에서 동시에 실행하려면 backend를 다른 포트로 지정해야 합니다.
> ```bash
> # backend: 3001 포트로 실행
> cd backend && npx next dev --port 3001
> 
> # frontend: 기본 3000 포트 (frontend/.env.local에 아래 설정)
> # NEXT_PUBLIC_API_URL=http://localhost:3001
> cd frontend && next dev
> ```

---

## Step 1. 데이터베이스 준비

### Neon (권장) 사용 시

1. [https://neon.tech](https://neon.tech) 접속 → 가입 → 새 프로젝트 생성
2. 프로젝트 생성 후 **Connection string** 복사
   - 형식: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
3. **Database URL** 메모해 둡니다 (Step 2에서 사용)

### 스키마 초기화

Neon 또는 Supabase의 SQL 에디터에서 `database/schema.sql` 내용을 실행합니다.

```sql
-- database/schema.sql 전체 내용을 복사해 SQL 에디터에 붙여넣고 실행
-- 또는 psql CLI 사용:
psql "postgresql://user:password@host/dbname?sslmode=require" -f database/schema.sql
```

실행 후 다음 **12개 테이블**이 생성됩니다:

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 계정 |
| `teams` | 팀 정보 |
| `team_members` | 팀 구성원 및 역할(LEADER/MEMBER) |
| `team_join_requests` | 팀 가입 신청 (PENDING/APPROVED/REJECTED) |
| `schedules` | 팀 일정 |
| `postits` | 팀 포스트잇 |
| `chat_messages` | 채팅 메시지 (NORMAL/WORK_PERFORMANCE) |
| `work_performance_permissions` | 업무보고 조회 권한 |
| `projects` | 프로젝트 |
| `project_schedules` | 프로젝트 일정 |
| `sub_schedules` | 세부 일정 |
| `notices` | 공지사항 |

---

## Step 2. Backend 배포

### 2-1. Vercel 프로젝트 생성

1. [https://vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → `kreon720-ctrl/team-works` 선택
3. **Configure Project** 화면에서:
   - **Project Name**: `teamworks-backend` (원하는 이름)
   - **Root Directory**: `backend` 입력 후 확인 (**중요!**)
   - **Framework Preset**: Next.js (자동 감지)
4. **Environment Variables** 섹션에서 아래 변수 모두 입력:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Step 1에서 복사한 DB 연결 문자열 |
| `JWT_ACCESS_SECRET` | 임의의 긴 랜덤 문자열 | Access Token 서명 키 (예: `openssl rand -hex 32` 결과) |
| `JWT_REFRESH_SECRET` | 임의의 긴 랜덤 문자열 | Refresh Token 서명 키 (JWT_ACCESS_SECRET과 **다른 값**) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token 만료 시간 |
| `FRONTEND_URL` | `https://teamworks-frontend.vercel.app` | 임시값 입력 (Step 3 완료 후 실제 URL로 수정) |

> **JWT Secret 생성 예시** (터미널):
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> 위 명령을 두 번 실행해 서로 다른 값을 각 Secret에 사용합니다.

5. **Deploy** 클릭 → 빌드 완료 대기 (약 1~2분)
6. 배포 완료 후 **도메인 URL 복사** (예: `https://teamworks-backend.vercel.app`)

### 2-2. Backend 배포 확인

브라우저 또는 curl에서 아래 URL로 응답을 확인합니다:

```bash
curl https://teamworks-backend.vercel.app/api/teams/public
```

> `/api/teams/public`은 인증 필요 엔드포인트입니다.  
> 아래 401 응답이 오면 backend가 정상 동작 중입니다.

```json
{ "error": "인증 토큰이 필요합니다." }
```

---

## Step 3. Frontend 배포

### 3-1. Vercel 프로젝트 생성

1. [https://vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → `kreon720-ctrl/team-works` 선택
3. **Configure Project** 화면에서:
   - **Project Name**: `teamworks-frontend` (원하는 이름)
   - **Root Directory**: `frontend` 입력 후 확인 (**중요!**)
   - **Framework Preset**: Next.js (자동 감지)
4. **Environment Variables** 섹션에서 아래 변수 입력:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://teamworks-backend.vercel.app` | Step 2에서 확인한 backend URL |

> `NEXT_PUBLIC_` 접두사는 빌드 시 클라이언트 번들에 포함됩니다.  
> URL이 변경되면 반드시 **재배포**해야 합니다.

5. **Deploy** 클릭 → 빌드 완료 대기
6. 배포 완료 후 **도메인 URL 복사** (예: `https://teamworks-frontend.vercel.app`)

---

## Step 4. Backend CORS 설정 업데이트

Frontend URL이 확정되면 Backend의 `FRONTEND_URL` 환경변수를 실제 값으로 수정합니다.

1. Vercel Dashboard → `teamworks-backend` 프로젝트 선택
2. **Settings** → **Environment Variables** 탭
3. `FRONTEND_URL` 값을 `https://teamworks-frontend.vercel.app` 으로 수정
4. **Save** 후 **Deployments** 탭 → 최신 배포 우측 `...` → **Redeploy** 클릭

> CORS가 올바르게 설정되지 않으면 브라우저에서 `Access to fetch has been blocked by CORS policy` 오류가 발생합니다.

---

## Step 5. 배포 후 동작 확인

브라우저에서 `https://teamworks-frontend.vercel.app` 접속 후 순서대로 확인합니다.

### 기본 기능 체크리스트

- [ ] **회원가입** — `/signup` 이메일·이름·비밀번호 입력 → 홈으로 이동
- [ ] **로그인** — `/login` 가입 계정으로 로그인 → 홈으로 이동
- [ ] **팀 목록** — `/` 내 팀 목록 화면 표시
- [ ] **팀 생성** — `/teams/new` 팀명 입력 → 생성 성공
- [ ] **팀 탐색** — `/teams/explore` 공개 팀 목록 조회, 가입 신청 버튼 동작
- [ ] **팀 메인** — `/teams/[teamId]` 캘린더 + 채팅 화면 표시
- [ ] **채팅** — 메시지 전송 → 3초 후 자동 갱신 확인 (폴링)
- [ ] **나의 할 일** — `/me/tasks` 가입 신청 목록, 팀장 계정에서 승인/거절 동작

### 신규 기능 체크리스트

- [ ] **포스트잇** — 날짜 선택 → 포스트잇 작성 → 캘린더 우측 표시, 수정/삭제 동작
- [ ] **업무보고** — 채팅 입력에서 업무보고 타입 선택 → 전송 (WORK_PERFORMANCE 스타일 구분)
- [ ] **업무보고 조회 권한** — 팀장 계정에서 특정 팀원에게만 권한 부여 → 해당 팀원만 열람 가능 확인
- [ ] **공지사항** — 팀 채팅에서 공지 작성 → 채팅 최상단 배너 고정 표시
- [ ] **프로젝트** — 프로젝트 탭에서 생성 → 간트차트 표시
- [ ] **프로젝트 일정** — 프로젝트 내 일정 추가 → 간트바 렌더링
- [ ] **세부 일정** — 프로젝트 일정 내 세부 일정 추가 → 서브바 표시
- [ ] **모바일 레이아웃** — 640px 미만에서 탭 전환 방식 확인

---

## 환경변수 전체 목록

### backend 환경변수 (`.env.example` 참고)

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `postgresql://user:pw@host/db?sslmode=require` | PostgreSQL 연결 문자열 |
| `JWT_ACCESS_SECRET` | ✅ | 64자 이상 랜덤 hex | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | ✅ | 64자 이상 랜덤 hex | Refresh Token 서명 키 (Access와 다른 값) |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | `7d` | Refresh Token 만료 시간 |
| `FRONTEND_URL` | ✅ | `https://teamworks-frontend.vercel.app` | CORS Allow-Origin 도메인 (trailing slash 없이) |

### frontend 환경변수 (`.env.example` 참고)

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://teamworks-backend.vercel.app` | Backend API 기본 URL (trailing slash 없이) |

---

## 재배포 (코드 업데이트 시)

GitHub `main` 브랜치에 push하면 Vercel이 자동으로 재배포합니다 (자동 배포 설정 시).

수동 재배포:
1. Vercel Dashboard → 해당 프로젝트 → **Deployments** 탭
2. 최신 배포 우측 `...` → **Redeploy**

---

## 문제 해결 (Troubleshooting)

### CORS 오류: `Access to fetch has been blocked`

- `FRONTEND_URL` 환경변수가 정확한지 확인 (trailing slash 없이, `https://` 포함)
- backend를 **Redeploy** 했는지 확인 (환경변수 변경 후 반드시 재배포 필요)
- 브라우저 개발자 도구 → Network 탭 → 실패한 요청의 **Response Headers**에 `Access-Control-Allow-Origin`이 있는지 확인

### CORS preflight(OPTIONS) 실패

- CORS preflight는 브라우저가 실제 요청 전에 OPTIONS 메서드로 먼저 확인합니다
- backend의 `next.config.ts`에서 `/api/:path*`에 CORS 헤더를 설정했으므로 일반적으로 자동 처리됩니다
- 만약 OPTIONS 요청이 405를 반환한다면 해당 route.ts에 OPTIONS 핸들러를 추가합니다:
  ```typescript
  export async function OPTIONS() {
    return new Response(null, { status: 204 });
  }
  ```

### 로그인 후 토큰이 저장되지 않음

- 브라우저 개발자 도구 → **Application** → **Local Storage** 확인
  - `accessToken`, `refreshToken` 키가 저장되어 있어야 합니다
- `NEXT_PUBLIC_API_URL`이 올바른 backend URL인지 확인
- backend URL에 trailing slash가 없는지 확인 (`https://...app/` → `https://...app`)

### `Internal Server Error` (500)

- Vercel Dashboard → `teamworks-backend` → **Functions** 탭 → 로그 확인
- `DATABASE_URL`이 올바른지 확인 (Neon의 경우 `?sslmode=require` 포함 필수)
- `database/schema.sql`의 12개 테이블이 모두 생성됐는지 확인:
  ```sql
  -- DB 접속 후 테이블 목록 확인
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name;
  ```

### 빌드 실패: `Cannot find module`

- Vercel 프로젝트의 **Root Directory** 설정이 `backend` 또는 `frontend`인지 확인
- 프로젝트 루트(`.`)가 아닌 서브디렉토리로 지정해야 합니다

### 채팅 메시지가 갱신되지 않음

- ChatPanel 컴포넌트는 3초(3000ms) 간격 폴링 방식 사용 (WebSocket 미지원)
- 브라우저 Network 탭에서 `/api/teams/[teamId]/messages` 요청이 3초마다 반복되는지 확인

### 업무보고 메시지가 보이지 않음

- 업무보고 조회 권한 설정이 필요합니다 (팀장만 설정 가능)
- 팀장 계정 → 팀 설정 → 업무보고 권한 → 열람할 팀원 선택 후 저장

### 간트차트(프로젝트)가 표시되지 않음

- `database/schema.sql`에서 `projects`, `project_schedules`, `sub_schedules` 테이블이 생성됐는지 확인
- Vercel Functions 로그에서 500 오류 여부 확인

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| 로컬 PC 서버 배포 | docs/13-local-deploy.md |
| PRD | docs/2-prd.md |
| API 명세 | docs/7-api-spec.md |
| DB 스키마 | database/schema.sql |
| 실행 계획 | docs/8-execution-plan.md |
