# Team CalTalk — Vercel 배포 가이드

## 개요

Team CalTalk은 **frontend**(React 클라이언트)와 **backend**(Next.js API 서버) 두 개의 독립적인 Next.js 16 앱으로 구성됩니다. Vercel에 각각 별도 프로젝트로 배포합니다.

```
GitHub: github.com/kreon720-ctrl/first-app
  ├── backend/   → Vercel 프로젝트 A (API 서버)
  └── frontend/  → Vercel 프로젝트 B (React 클라이언트)
```

> **배포 순서**: backend 먼저 배포 → URL 확인 → frontend 배포 → frontend URL을 backend에 설정 후 재배포

---

## 사전 준비

### 필요 계정
- [Vercel](https://vercel.com) 계정 (GitHub 연동)
- PostgreSQL 데이터베이스 (권장: [Neon](https://neon.tech) 무료 플랜 또는 [Supabase](https://supabase.com))

### 로컬 빌드 사전 확인
배포 전에 로컬에서 빌드가 성공하는지 확인합니다.

```bash
# backend 빌드 확인
cd backend
npm run build

# frontend 빌드 확인
cd frontend
npm run build
```

두 빌드 모두 경고·오류 없이 `✓ Compiled successfully` 가 출력되어야 합니다.

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

실행 후 다음 6개 테이블이 생성됩니다:
- `users`, `teams`, `team_members`, `team_join_requests`, `schedules`, `chat_messages`

---

## Step 2. Backend 배포

### 2-1. Vercel 프로젝트 생성

1. [https://vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → `kreon720-ctrl/first-app` 선택
3. **Configure Project** 화면에서:
   - **Project Name**: `caltalk-backend` (원하는 이름)
   - **Root Directory**: `backend` 입력 후 확인 (중요!)
   - **Framework Preset**: Next.js (자동 감지)
4. **Environment Variables** 섹션에서 아래 변수 모두 입력:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Step 1에서 복사한 DB 연결 문자열 |
| `JWT_ACCESS_SECRET` | 임의의 긴 랜덤 문자열 | Access Token 서명 키 (예: `openssl rand -hex 32` 결과) |
| `JWT_REFRESH_SECRET` | 임의의 긴 랜덤 문자열 | Refresh Token 서명 키 (JWT_ACCESS_SECRET과 다른 값) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token 만료 시간 |
| `FRONTEND_URL` | `https://caltalk-frontend.vercel.app` | 임시값 입력 (Step 3 완료 후 실제 URL로 수정) |

> **JWT Secret 생성 예시** (터미널):
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

5. **Deploy** 클릭 → 빌드 완료 대기 (약 1~2분)
6. 배포 완료 후 **도메인 URL 복사** (예: `https://caltalk-backend.vercel.app`)

### 2-2. Backend 배포 확인

브라우저에서 다음 URL 접속하여 응답 확인:

```
GET https://caltalk-backend.vercel.app/api/teams/public
```

응답 예시 (`401 Unauthorized` 또는 `{ "teams": [] }` — 정상):
```json
{"error": "인증 토큰이 필요합니다."}
```

---

## Step 3. Frontend 배포

### 3-1. Vercel 프로젝트 생성

1. [https://vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → `kreon720-ctrl/first-app` 선택
3. **Configure Project** 화면에서:
   - **Project Name**: `caltalk-frontend` (원하는 이름)
   - **Root Directory**: `frontend` 입력 후 확인 (중요!)
   - **Framework Preset**: Next.js (자동 감지)
4. **Environment Variables** 섹션에서 아래 변수 입력:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://caltalk-backend.vercel.app` | Step 2에서 확인한 backend URL |

> `NEXT_PUBLIC_` 접두사는 빌드 시 클라이언트 번들에 포함됩니다. 배포 후 URL이 변경되면 반드시 재배포해야 합니다.

5. **Deploy** 클릭 → 빌드 완료 대기
6. 배포 완료 후 **도메인 URL 복사** (예: `https://caltalk-frontend.vercel.app`)

---

## Step 4. Backend CORS 설정 업데이트

Frontend URL이 확정되면 Backend의 `FRONTEND_URL` 환경변수를 실제 값으로 수정합니다.

1. Vercel Dashboard → `caltalk-backend` 프로젝트 선택
2. **Settings** → **Environment Variables** 탭
3. `FRONTEND_URL` 값을 `https://caltalk-frontend.vercel.app` 으로 수정
4. **Save** 후 **Deployments** 탭 → 최신 배포 우측 `...` → **Redeploy** 클릭

> CORS가 올바르게 설정되지 않으면 브라우저에서 `Access to fetch has been blocked by CORS policy` 오류가 발생합니다.

---

## Step 5. 배포 후 동작 확인

브라우저에서 `https://caltalk-frontend.vercel.app` 접속 후 순서대로 확인합니다.

### 체크리스트

- [ ] `/signup` — 회원가입 (이메일/이름/비밀번호 입력 → 홈으로 이동)
- [ ] `/login` — 로그인 (가입한 계정으로 로그인 → 홈으로 이동)
- [ ] `/` — 내 팀 목록 화면 표시
- [ ] `/teams/new` — 팀 생성 (팀명 입력 → 생성 성공)
- [ ] `/teams/explore` — 공개 팀 목록 조회, 가입 신청 버튼 동작
- [ ] `/teams/[teamId]` — 캘린더 + 채팅 동시 화면
- [ ] 채팅 메시지 전송 → 3초 후 자동 갱신 확인 (폴링)
- [ ] `/me/tasks` — 나의 할 일 (팀장 계정만 접근 가능)
- [ ] 모바일 화면(640px 미만)에서 탭 전환 방식 확인

---

## 환경변수 전체 목록

### backend 환경변수

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `postgresql://user:pw@host/db?sslmode=require` | PostgreSQL 연결 문자열 |
| `JWT_ACCESS_SECRET` | ✅ | 64자 이상 랜덤 hex | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | ✅ | 64자 이상 랜덤 hex | Refresh Token 서명 키 |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | `7d` | Refresh Token 만료 시간 |
| `FRONTEND_URL` | ✅ | `https://caltalk-frontend.vercel.app` | CORS Allow-Origin 도메인 |

### frontend 환경변수

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://caltalk-backend.vercel.app` | Backend API 기본 URL |

---

## 문제 해결 (Troubleshooting)

### CORS 오류: `Access to fetch has been blocked`
- backend 환경변수 `FRONTEND_URL`이 정확한지 확인 (trailing slash 없이)
- backend를 Redeploy했는지 확인

### 로그인 후 토큰이 저장되지 않음
- 브라우저 개발자 도구 → Application → Local Storage 확인
- `NEXT_PUBLIC_API_URL`이 올바른 backend URL인지 확인

### `Internal Server Error` (500)
- Vercel Dashboard → `caltalk-backend` → **Functions** 탭 → 로그 확인
- `DATABASE_URL`이 올바른지 확인
- 데이터베이스 스키마(`database/schema.sql`)가 실행됐는지 확인

### 빌드 실패: `Cannot find module`
- Vercel 프로젝트의 **Root Directory** 설정이 `backend` 또는 `frontend`인지 확인 (루트 디렉토리가 아닌 서브디렉토리로 설정)

### 채팅 메시지가 갱신되지 않음
- ChatPanel 컴포넌트는 3초(3000ms) 간격 폴링 방식 사용
- WebSocket은 사용하지 않음 (Vercel Serverless 제약)
- 브라우저 네트워크 탭에서 `/api/teams/[teamId]/messages` 요청이 3초마다 반복되는지 확인

---

## 재배포 (코드 업데이트 시)

GitHub `main` 브랜치에 push하면 Vercel이 자동으로 재배포합니다 (자동 배포 설정 시).

수동 재배포:
1. Vercel Dashboard → 해당 프로젝트 → **Deployments** 탭
2. 최신 배포 우측 `...` → **Redeploy**

---

## 관련 문서

| 문서 | 경로 |
|------|------|
| PRD | docs/2-prd.md |
| API 명세 | docs/7-api-spec.md |
| DB 스키마 | database/schema.sql |
| 실행 계획 | docs/8-execution-plan.md |
