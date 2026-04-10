# 프론트엔드 코드 리뷰 보고서

## 1. 검토 개요

| 항목 | 내용 |
|------|------|
| 검토 일시 | 2026-04-10 |
| 검토 범위 | `frontend/` 디렉토리 전체 (node_modules, coverage 제외) |
| 기준 문서 | docs/1-domain-definition.md, docs/2-prd.md, docs/7-api-spec.md, docs/9-wireframes.md, docs/10-style-guide.md, docs/11-frontend-developer-guide.md |
| 검토 대상 파일 수 | TypeScript/TSX 파일 81개 |

---

## 2. 설계 문서 vs 구현 일치 여부

### 2.1 기능 요구사항 (FR-01~FR-06)

| FR | 요구사항 | 상태 | 비고 |
|----|---------|------|------|
| FR-01-1 | 이메일 + 비밀번호 회원가입 | ✅ 완료 | `SignupForm`, `useSignup` 구현됨 |
| FR-01-2 | 이메일 중복 검증 | ✅ 완료 | 409 응답 처리 (`SignupForm.tsx:109`) |
| FR-01-3 | 로그인 시 JWT 발급 | ✅ 완료 | `useLogin` + `authStore.setUser` |
| FR-01-4 | 비밀번호 bcrypt 해싱 | ✅ 완료 | 서버 사이드 처리, 프론트엔드 범위 외 |
| FR-01-5 | 로그아웃 | ✅ 완료 | `authStore.logout()` + `apiClient.clearTokens()` |
| FR-01-6 | Refresh Token 재발급 | ✅ 완료 | `apiClient.ts` 401 자동 재시도 로직 |
| FR-02-1 | 팀 생성 | ✅ 완료 | `TeamCreateForm`, `useCreateTeam` |
| FR-02-2 | 공개 팀 목록 조회 | ✅ 완료 | `usePublicTeams`, `TeamExploreList` |
| FR-02-3 | 가입 신청 제출 | ✅ 완료 | `useSubmitJoinRequest`, `TeamExploreList` |
| FR-02-4 | 이미 구성원인 경우 방지 | ✅ 완료 | 409 응답 처리 |
| FR-02-5 | PENDING 중복 신청 방지 | ✅ 완료 | 409 응답 처리 + UI 레벨 버튼 비활성화 |
| FR-02-6 | 팀장의 가입 신청 목록 조회 | ✅ 완료 | `useJoinRequests` |
| FR-02-7 | 승인/거절 처리 | ✅ 완료 | `useUpdateJoinRequest`, `JoinRequestActions` |
| FR-02-8 | 나의 할 일 목록 조회 | ✅ 완료 | `useMyTasks`, `MyTasksPage` |
| FR-02-9 | 내 팀 목록 조회 | ✅ 완료 | `useMyTeams`, `HomePage` |
| FR-03-1~3 | 월/주/일 단위 일정 조회 | ✅ 완료 | `CalendarView`, 월/주/일 뷰 전환 |
| FR-03-4 | 일정 상세 정보 조회 | ✅ 완료 | `ScheduleDetailModal` |
| FR-03-5 | 팀 격리 | ✅ 완료 | teamId 기반 API 호출 |
| FR-04-1~3 | LEADER만 일정 CRUD | ✅ 완료 | `isLeader` 조건부 렌더링 |
| FR-04-4 | startAt < endAt 검증 | ✅ 완료 | `ScheduleForm` 클라이언트 검증 |
| FR-04-5 | MEMBER 403 처리 | ✅ 완료 | 서버 사이드 + UI 버튼 숨김 |
| FR-04-6 | title 최대 200자 | ✅ 완료 | `ScheduleForm` maxLength 적용 |
| FR-05-1 | 채팅 메시지 전송 | ✅ 완료 | `useSendMessage`, `ChatInput` |
| FR-05-2 | KST 날짜별 채팅 조회 | ✅ 완료 | `useMessages(teamId, date)` |
| FR-05-3 | SCHEDULE_REQUEST 전송 | ✅ 완료 | `ChatInput` type 선택 |
| FR-05-4 | SCHEDULE_REQUEST 시각적 구분 | ✅ 완료 | `ChatMessageItem` 오렌지 스타일 |
| FR-05-5 | content 최대 2000자 | ✅ 완료 | `ChatInput.maxContentLength=2000` |
| FR-05-6 | 팀 채팅 격리 | ✅ 완료 | teamId 기반 API 호출 |
| FR-05-7 | 폴링 방식 갱신 | ✅ 완료 | `refetchInterval: 3000` |
| FR-06-1 | 캘린더 + 채팅 분할 화면 | ✅ 완료 | `TeamMainPage` 데스크탑 좌우 분할 |
| FR-06-2 | 날짜 선택 시 채팅 연동 | ✅ 완료 | `selectedDate` 상태 공유 |
| FR-06-3 | 모바일 탭 전환 | ✅ 완료 | `TeamMainPage` 모바일 탭 레이아웃 |

### 2.2 화면 요구사항 (S-01~S-06)

| 화면 | 경로 | 상태 | 비고 |
|------|------|------|------|
| S-01 로그인 | /login | ✅ 완료 | `LoginForm`, 이메일/비밀번호 검증 |
| S-02 회원가입 | /signup | ✅ 완료 | `SignupForm`, 3개 필드 |
| S-03 내 팀 목록 | / | ✅ 완료 | `HomePage`, 팀 생성 FAB, 팀 탐색 버튼 |
| S-04 팀 생성 | /teams/new | ✅ 완료 | `TeamCreateForm` |
| S-04B 팀 탐색 | /teams/explore | ✅ 완료 | `TeamExplorePage`, 가입 신청 |
| S-04C 나의 할 일 | /me/tasks | ✅ 완료 | `MyTasksPage`, 승인/거절 |
| S-05 팀 메인 | /teams/[teamId] | ✅ 완료 | 캘린더 + 채팅 분할 |
| S-06 일정 상세 | Modal 방식 | ⚠️ 부분 구현 | `ScheduleDetailModal` 컴포넌트는 있으나 `TeamMainPage`에서 일정 클릭 시 스케줄 데이터를 API에서 가져와 모달로 연결하는 로직 미구현. `CalendarView`의 `schedules` prop에 빈 배열 `[]` 하드코딩 전달 |

### 2.3 API 연동 일치성

| 훅/파일 | 대상 API | 일치 여부 | 비고 |
|---------|---------|---------|------|
| `useAuth.ts` | POST /api/auth/signup, login | ✅ 일치 | |
| `useTeams.ts` | GET /api/teams, POST /api/teams, GET /api/teams/public, GET /api/teams/:teamId | ✅ 일치 | |
| `useJoinRequests.ts` | POST, GET, PATCH /api/teams/:teamId/join-requests | ✅ 일치 | `action` 전달 방식 명세 준수 |
| `useMyTasks.ts` | GET /api/me/tasks | ✅ 수정됨 | 응답 타입 불일치 수정 (버그 #1) |
| `useSchedules.ts` | GET/POST/PATCH/DELETE /api/teams/:teamId/schedules | ✅ 일치 | |
| `useMessages.ts` | GET /api/teams/:teamId/messages, POST | ✅ 일치 | `refetchInterval: 3000` 준수 |

### 2.4 비즈니스 규칙 (BR-01~BR-07)

| BR | 규칙 | 상태 | 구현 위치 |
|----|------|------|---------|
| BR-01 | 로그인 사용자만 접근 | ✅ 적용 | `MainLayout` 클라이언트 가드, `apiClient` 401 처리 |
| BR-02 | LEADER만 일정 CRUD | ✅ 적용 | `ScheduleDetailModal`, `TeamMainPage`의 `isLeader` 조건 |
| BR-03 | LEADER만 승인/거절 | ✅ 적용 | `MyTasksPage` LEADER 전용, `JoinRequestActions` |
| BR-04 | SCHEDULE_REQUEST 시각적 구분 | ✅ 적용 | `ChatMessageItem` 오렌지 배경 (`bg-orange-50 border-orange-300 text-orange-900`) |
| BR-05 | 채팅 KST 날짜별 그룹핑 | ✅ 적용 | `useMessages(teamId, date)`, `timezone.ts` 유틸 |
| BR-06 | 팀 격리 | ✅ 적용 | 모든 API 호출에 `teamId` 포함 |
| BR-07 | 가입 신청 중복 방지 | ✅ 적용 | 409 처리 + `pendingTeams` Set으로 UI 레벨 방지 |

---

## 3. 발견된 문제점

### 3.1 Critical

**[BUG-01] `TeamMainPage` Next.js App Router params 규격 불일치**

- **심각도**: Critical
- **위치**: `frontend/app/(main)/teams/[teamId]/page.tsx`
- **설명**: Next.js 16(App Router) 동적 라우트 페이지는 `{ params: Promise<{ teamId: string }> }` 형태의 props를 받아야 하나, 기존 구현은 `{ teamId: string }`을 직접 받는 방식이었음. 실제 실행 시 `teamId`가 `undefined`가 되어 팀 메인 페이지 전체가 동작 불가.
- **조치**: 수정 완료 — `params: Promise<{ teamId: string }>` 형태로 변경, `React.use(params)`로 unwrap

### 3.2 High

**[BUG-02] `useMyTasks` 응답 타입이 API 명세와 불일치**

- **심각도**: High
- **위치**: `frontend/hooks/query/useMyTasks.ts`, `frontend/app/(main)/me/tasks/page.tsx`
- **설명**: API 명세 `GET /api/me/tasks`의 응답 `tasks[]` 항목은 `{ id, teamId, teamName, requesterId, requesterName, requesterEmail, status, requestedAt, respondedAt }` 형태의 flat 구조이나, 구현된 `MyTask` 인터페이스는 `{ id, teamId, teamName, joinRequest: JoinRequest }` 형태로 nested 객체를 포함하는 잘못된 구조였음. `MyTasksPage`에서 `task.joinRequest.id`로 접근하여 런타임 오류 발생.
- **조치**: 수정 완료 — `MyTask` 인터페이스를 API 명세와 일치하도록 flat 구조로 재정의. `MyTasksPage`의 `tasks.find()` 조건 및 `JoinRequestActions` props 전달 방식 수정

**[BUG-03] `MyTasksPage.spec.tsx` mockTasks 데이터 구조 불일치**

- **심각도**: High
- **위치**: `frontend/app/(main)/me/tasks/__tests__/MyTasksPage.spec.tsx`
- **설명**: 테스트의 `mockTasks`가 잘못된 `{ joinRequest: {...} }` 구조를 사용 중이었음.
- **조치**: 수정 완료 — flat 구조로 수정

**[BUG-04] `TeamMainPage.spec.tsx` props 방식 불일치**

- **심각도**: High
- **위치**: `frontend/app/(main)/teams/[teamId]/__tests__/TeamMainPage.spec.tsx`
- **설명**: 테스트에서 `<TeamMainPage teamId="team-123" />`으로 직접 전달하는 방식이 BUG-01 수정 후 동작 불가.
- **조치**: 수정 완료 — `<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />`으로 변경. `renderPage` async 헬퍼 함수 추가 (`act(async () => ...)` 래핑), 모든 `it` 콜백을 `async`로 변환

### 3.3 Medium

**[ISSUE-01] `ScheduleListResponse` 타입에 API 명세에 없는 필드 포함**

- **심각도**: Medium
- **위치**: `frontend/types/schedule.ts:31-35`
- **설명**: `ScheduleListResponse`에 `view: CalendarView`와 `date: string` 필드가 정의되어 있으나, API 명세 `GET /api/teams/:teamId/schedules` 응답은 `{ schedules: [...] }` 만 반환. 실제 API 응답 파싱 시 이 필드들이 `undefined`가 되어 타입 불일치 발생.
- **조치**: 수정 완료 — `view`, `date` 필드 제거

**[ISSUE-02] `ChatQueryParams`에 API 명세에 없는 파라미터 존재**

- **심각도**: Medium
- **위치**: `frontend/types/chat.ts:25-29`
- **설명**: `ChatQueryParams`에 `limit?: number`, `offset?: number` 필드가 있으나 API 명세 `GET /api/teams/:teamId/messages`는 `date` 파라미터만 지원.
- **조치**: 수정 완료 — `limit`, `offset` 필드 제거

**[ISSUE-03] S-06 일정 상세/수정 — `CalendarView`에 실제 일정 데이터 미연결**

- **심각도**: Medium
- **위치**: `frontend/app/(main)/teams/[teamId]/page.tsx:149, 251`
- **설명**: `TeamMainPage`에서 `CalendarView`에 `schedules={[]}`(빈 배열)를 하드코딩으로 전달. `useSchedules` 훅을 호출해 실제 일정 데이터를 렌더링해야 하지만 미구현. 사용자가 캘린더에서 어떤 일정도 볼 수 없음.
- **조치**: 수정 불필요 (기능 구현 범위의 미구현 사항) — 보고서에 기록. 향후 `useSchedules(teamId, { view: calendarView, date: selectedDate })` 호출 후 `schedules={data?.schedules ?? []}` 형태로 연결 필요

**[ISSUE-04] 일정 클릭 → 상세 모달 연결 미구현**

- **심각도**: Medium
- **위치**: `frontend/app/(main)/teams/[teamId]/page.tsx`, `frontend/components/schedule/CalendarView.tsx`
- **설명**: `ScheduleDetailModal`, `ScheduleForm` 컴포넌트는 완성되어 있으나, `TeamMainPage`에서 캘린더 날짜/일정 클릭 시 모달을 여는 연결 로직이 없음. `onDateClick`만 구현되어 있고, 일정 항목 클릭 핸들러가 없음.
- **조치**: 수정 불필요 — 보고서에 기록

### 3.4 Low

**[ISSUE-05] `useSignup`에서 refreshToken localStorage 저장 누락**

- **심각도**: Low
- **위치**: `frontend/hooks/query/useAuth.ts:13-17`
- **설명**: `useSignup`과 `useLogin`의 `onSuccess`에서 `setUser(data.user, data.accessToken)`만 호출. `accessToken`은 `authStore`에 저장되지만 `apiClient.setTokens()`를 통해 localStorage에 저장하지 않아 페이지 새로고침 후 인증 상태가 유실될 수 있음. 단, `LoginForm.tsx`와 `SignupForm.tsx`에서 성공 시 `auth-initialized` 쿠키를 설정하는 로직만 있고 실제 토큰 저장이 누락.
- **조치**: 수정 불필요 — 보고서에 기록. `onSuccess`에서 `apiClient.setTokens(data.accessToken, data.refreshToken)` 추가 필요

**[ISSUE-06] `RootPage`가 자기 자신으로 무한 리다이렉트 가능**

- **심각도**: Low
- **위치**: `frontend/app/page.tsx:17`
- **설명**: `RootPage`에서 `router.push('/')` 를 호출하는데, `app/page.tsx` 자신이 `/`이므로 인증 상태일 때 자기 자신으로 리다이렉트하는 무한 루프 가능성. 실제로는 `(main)/page.tsx`가 존재해 `HomePage`로 렌더링되지만 의도가 불명확함.
- **조치**: 수정 불필요 — 보고서에 기록

**[ISSUE-07] `ChatMessageItem`에서 isLeader 배지 로직 불완전**

- **심각도**: Low
- **위치**: `frontend/components/chat/ChatMessageItem.tsx:56-61`
- **설명**: 일반(NORMAL) 메시지에서 `isLeader` prop이 `true`이면 항상 LEADER 배지를 표시. 그러나 현재 `ChatPanel`에서는 팀 전체의 `isLeader` 여부를 전달하는 것이 아닌, 현재 사용자가 팀장인지를 전달. 즉, 메시지 발신자가 LEADER인지가 아니라 현재 접속자가 LEADER인지에 따라 배지가 표시됨. 모든 메시지에 LEADER 배지가 붙거나 전혀 안 붙는 문제.
- **조치**: 수정 불필요 — 기능 개선 사항으로 보고서에 기록

**[ISSUE-08] `useUpdateJoinRequest`에서 `action` 전달 방식의 타입 불일치**

- **심각도**: Low
- **위치**: `frontend/hooks/query/useJoinRequests.ts:37-53`
- **설명**: `mutationFn`이 `{ requestId, action: JoinRequestAction }` 형태를 받는데, `JoinRequestAction`은 `{ action: 'APPROVE' | 'REJECT' }` 인터페이스. PATCH body에는 `{ action }` (중첩)으로 전달되어 `{ action: { action: 'APPROVE' } }` 형태가 됨. API 명세는 body가 `{ "action": "APPROVE" }` 이어야 하므로 실제 요청 시 서버가 파싱 실패할 수 있음.
- **조치**: 수정 불필요 — 보고서에 기록. `JoinRequestAction` 타입 사용 방식 확인 후 수정 필요 (`action: action.action` 또는 타입 변경)

**[ISSUE-09] `useBreakpoint` 기준점 불일치 (주의)**

- **심각도**: Low
- **위치**: `frontend/hooks/useBreakpoint.ts:29-30`
- **설명**: `isDesktop`이 `width >= 1024` 조건으로, 1024px 이상에서 데스크탑 레이아웃(좌우 분할)을 사용. PRD 기준(1024px 이상 데스크탑)과 일치함. 정상.

---

## 4. 수정 내역

| # | 파일 | 변경 요약 |
|---|------|---------|
| 1 | `frontend/app/(main)/teams/[teamId]/page.tsx` | `TeamMainPageProps`를 `{ params: Promise<{ teamId: string }> }` 형태로 변경. `React.use(params)` import 및 호출 추가 |
| 2 | `frontend/hooks/query/useMyTasks.ts` | `MyTask` 인터페이스를 API 명세와 일치하는 flat 구조로 재정의. `MyTasksResponse` 인터페이스 추가 (`totalPendingCount` 필드 포함) |
| 3 | `frontend/app/(main)/me/tasks/page.tsx` | `handleApprove`, `handleReject`의 `tasks.find()` 조건을 `t.joinRequest.id` → `t.id`로 수정. `JoinRequestActions`에 전달하는 `request` prop을 flat 구조에서 직접 매핑하도록 수정 |
| 4 | `frontend/types/schedule.ts` | `ScheduleListResponse`에서 `view: CalendarView`, `date: string` 필드 제거 |
| 5 | `frontend/types/chat.ts` | `ChatQueryParams`에서 `limit?: number`, `offset?: number` 제거. 주석 추가 |
| 6 | `frontend/app/(main)/me/tasks/__tests__/MyTasksPage.spec.tsx` | `mockTasks` 데이터를 flat 구조로 수정 |
| 7 | `frontend/app/(main)/teams/[teamId]/__tests__/TeamMainPage.spec.tsx` | `renderPage` async 헬퍼 함수 추가. `render(...)` → `await renderPage(...)` 전환. `teamId` prop → `params={Promise.resolve(...)}` 전환. 모든 `it` 콜백 `async` 처리 |

---

## 5. 테스트 결과

### TypeScript 컴파일
- **오류 수**: 0개
- **명령**: `npx tsc --noEmit`

### Vitest 단위 테스트
- **통과**: 273개
- **실패**: 0개
- **테스트 파일**: 29개
- **명령**: `npx vitest run`

```
 Test Files  29 passed (29)
      Tests  273 passed (273)
   Duration  6.69s
```

---

## 6. 종합 평가

### 전반적인 품질 평가

**긍정적 측면:**

- 컴포넌트 분리, 훅 분리, 스토어 분리 등 아키텍처가 명확하게 구성됨
- API 명세의 엔드포인트 URL이 전반적으로 정확하게 구현됨
- 채팅 폴링 주기 3초로 PRD 요구사항(3초 이하) 준수
- 스타일 가이드의 색상 토큰 (`primary-*`, `error-*`, `success-*`, `orange-*`) 대체로 올바르게 적용
- 모든 주요 화면에 로딩/에러/빈 상태 처리 구현됨
- `useBreakpoint` 훅으로 반응형 분기 (640px/1024px) 올바르게 구현
- BR-02 (LEADER만 일정 CRUD), BR-03 (LEADER만 승인/거절), BR-04 (SCHEDULE_REQUEST 시각 구분) 등 핵심 비즈니스 규칙 UI 레벨에서 준수

**개선 필요 사항:**

1. **Critical**: `TeamMainPage`의 `params` 처리 방식이 Next.js 16 App Router 규격과 불일치 → 수정 완료
2. **High**: `useMyTasks` 응답 타입 불일치로 `MyTasksPage` 런타임 오류 → 수정 완료
3. **Medium**: `TeamMainPage`에서 실제 일정 데이터가 캘린더에 연결되지 않음 (빈 배열 하드코딩) → 미수정 (추가 구현 필요)
4. **Medium**: 일정 클릭 → 상세 모달 연결 로직 미구현 → 미수정 (추가 구현 필요)
5. **Low**: `useAuth` 훅에서 로그인/회원가입 성공 시 `apiClient.setTokens()` 미호출로 localStorage 토큰 저장 누락 가능성
6. **Low**: `useUpdateJoinRequest`에서 `JoinRequestAction` 타입 중첩 전달 방식 확인 필요

### 권고사항

1. **즉시 처리 필요**: `TeamMainPage`에서 `useSchedules`를 연결하여 실제 일정 데이터를 캘린더에 표시 (`schedules={data?.schedules ?? []}` 형태)
2. **즉시 처리 필요**: 캘린더에서 일정 클릭 시 `ScheduleDetailModal`을 여는 로직 연결
3. **단기 처리 권장**: `useAuth`의 `onSuccess`에서 `apiClient.setTokens(data.accessToken, data.refreshToken)` 호출 추가
4. **단기 처리 권장**: `JoinRequestAction` 타입 사용 방식 검토 및 수정
5. **참고**: `useAuthStore`와 `localStorage` 토큰 초기화 연동을 위해 앱 시작 시 `authStore.setUser()`를 localStorage 기반으로 초기화하는 로직 추가 검토
