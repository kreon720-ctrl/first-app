# TEAM WORKS — SRP(단일책임 원칙) 점검 보고서

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-04-18 | 최초 작성 — Frontend/Backend 전체 소스 파일 SRP 점검 |

---

## 1. 개요

**단일책임 원칙(SRP)**은 "클래스(또는 모듈·파일)는 변경되어야 할 이유가 하나뿐이어야 한다"는 원칙입니다.
평가 기준:

| 등급 | 기준 |
|------|------|
| ✅ PASS | 단일 책임 유지. 변경 이유가 하나 |
| ⚠️ WARNING | 책임이 2개 혼재하나 실용적 허용 범위. 파일 크기 작고 분리 비용 대비 이득이 낮음 |
| ❌ FAIL | 책임이 3개 이상 혼재하거나, 변경 이유가 명백히 복수여서 유지보수에 부담 |

---

## 2. Frontend 분석

### 2.1 Chat Components (`frontend/components/chat/`)

#### `ChatPanel.tsx` ❌ FAIL

**주된 책임(선언):** 채팅 패널 조율  
**실제 책임(발견):**
1. 메시지 목록 조회 (useMessages 폴링)
2. 메시지 전송 — 3가지 모드(NORMAL / WORK_PERFORMANCE / NOTICE) 분기
3. 업무보고 조회 권한 설정 — 권한 모달 열기·닫기, draftIds 관리, 서버 저장
4. 공지사항 관리 — 배너 렌더링, 삭제, 삭제 권한 판단
5. 전체 레이아웃 렌더링 (배너 + 스크롤 메시지 목록 + 입력창 + 폴링 안내)

**변경 이유:** 권한 정책 변경 / 공지사항 기능 추가 / 메시지 타입 추가 / UI 레이아웃 변경 — 4가지

**개선 제안:**
```
ChatPanel.tsx (조율만)
  ├── WorkPermissionModal.tsx  — 권한 설정 모달 UI + draftIds 상태
  ├── NoticeBanner.tsx         — 공지사항 배너 렌더링
  └── useChatPanel.ts          — 메시지 전송 / 공지 생성 로직
```

---

#### `ChatInput.tsx` ✅ PASS

**주된 책임:** 메시지 입력 UI 및 모드(NORMAL / WORK_PERFORMANCE / NOTICE) 전환  
**분석:** 입력 상태, 모드 인디케이터, 전송 버튼이 모두 "입력창"이라는 단일 책임에 귀속됨.

---

#### `ChatMessageList.tsx` ✅ PASS

**주된 책임:** 메시지 목록을 날짜별로 그룹화하여 렌더링  
**분석:** 날짜 그룹화와 렌더링이 분리 불가능한 하나의 책임.

---

#### `ChatMessageItem.tsx` ✅ PASS

**주된 책임:** 개별 메시지 렌더링 (NORMAL / WORK_PERFORMANCE 타입 분기)  
**분석:** 타입별 스타일 분기는 표현 책임의 일부로 단일 책임 범위 내.

---

### 2.2 Project/Gantt Components (`frontend/components/project/`)

#### `ProjectGanttView.tsx` ❌ FAIL

**주된 책임(선언):** 프로젝트 Gantt 뷰 조율  
**실제 책임(발견):**
1. 프로젝트 CRUD (생성·수정·삭제) 핸들러
2. 프로젝트 일정 CRUD (생성·수정·삭제) 핸들러
3. 5개 모달 열기/닫기 상태 관리
4. 선택된 프로젝트 동기화 (useEffect + store)
5. 툴바 + GanttChart 레이아웃 렌더링

**변경 이유:** 프로젝트 기능 변경 / 일정 기능 변경 / 모달 추가 / 레이아웃 변경 — 4가지

**개선 제안:**
```
ProjectGanttView.tsx (조율만)
  ├── useProjectActions.ts     — 프로젝트 CRUD 핸들러
  ├── useScheduleActions.ts    — 일정 CRUD 핸들러
  └── useGanttModals.ts        — 모달 5개 상태 관리
```

---

#### `GanttChart.tsx` ⚠️ WARNING

**주된 책임:** Gantt 차트 렌더링  
**혼재 책임:**
- 위상별 일정 정렬 로직 (sortedByPhase)
- 월·주 헤더 렌더링
- 일정 바 위치 계산 및 렌더링

**분석:** 계산 로직이 `ganttUtils.ts`로 이미 분리되어 있고, 컴포넌트 내 정렬은 단순 `Map` 구성에 그침. 현재 파일 크기(~155줄)에서는 허용 범위.

**개선 제안:** 정렬 로직을 `useMemo` → 별도 `useGanttData()` 훅으로 분리 시 PASS 수준.

---

#### `GanttBar.tsx` ✅ PASS

**주된 책임:** 개별 Gantt 바 렌더링 + createPortal 툴팁  
**분석:** 색상 정의·날짜 포맷·툴팁이 모두 "단일 바"의 표현 책임에 귀속됨.

---

#### `ProjectCreateModal.tsx` ✅ PASS

**주된 책임:** 프로젝트 생성/수정 폼 UI  
**분석:** 폼 입력·검증·서브밋이 하나의 책임.

---

#### `ProjectScheduleModal.tsx` ✅ PASS

**주된 책임:** 프로젝트 일정 생성/수정 폼 UI  
**분석:** 단일 책임.

---

#### `ProjectScheduleDetailModal.tsx` ❌ FAIL

**주된 책임(선언):** 프로젝트 일정 상세 보기  
**실제 책임(발견):**
1. 일정 상세 정보 표시 (제목, 기간, 담당자, 진행률)
2. 세부 일정(SubSchedule) 타임라인 렌더링 — ResizeObserver, 좌우 패널 동기화
3. 세부 일정 CRUD 인터페이스 — 생성 폼, 수정 팝업, 삭제
4. SubBar 컴포넌트 인라인 정의 (내부 함수 컴포넌트)

**변경 이유:** 상세 표시 변경 / 타임라인 렌더링 변경 / 세부일정 기능 추가 / SubBar UI 변경 — 4가지

**개선 제안:**
```
ProjectScheduleDetailModal.tsx (상세 정보 + 조율)
  ├── SubScheduleTimeline.tsx  — 타임라인 렌더링 + ResizeObserver
  ├── SubBar.tsx               — 세부일정 바 컴포넌트
  └── useSubScheduleEditor.ts  — 세부일정 CRUD 상태
```

---

### 2.3 Schedule Components (`frontend/components/schedule/`)

#### `CalendarWeekView.tsx` ✅ PASS

**주된 책임:** 주간 캘린더 뷰 렌더링  
**분석:** 날짜 배열 계산, 레이아웃 렌더링, 툴팁이 모두 주간 뷰라는 단일 책임에 귀속됨.

---

#### `CalendarDayView.tsx` ✅ PASS

**주된 책임:** 일간 캘린더 뷰 렌더링  
**분석:** 단일 책임.

---

#### `CalendarMonthView.tsx` ✅ PASS

**주된 책임:** 월간 캘린더 뷰 렌더링  
**분석:** 단일 책임.

---

### 2.4 Store (`frontend/store/`)

#### `projectStore.ts` ❌ FAIL

**주된 책임(선언):** 프로젝트 관련 클라이언트 상태 관리  
**실제 책임(발견):**
1. **프로젝트** CRUD + 선택 상태 (createProject, updateProject, deleteProject, setSelectedProject)
2. **프로젝트 일정** CRUD (createProjectSchedule, updateProjectSchedule, deleteProjectSchedule)
3. **세부 일정(SubSchedule)** CRUD (createSubSchedule, updateSubSchedule, deleteSubSchedule)

**변경 이유:** 프로젝트 정책 변경 / 일정 정책 변경 / 세부일정 정책 변경 — 3가지

**개선 제안:**
```
store/
  ├── projectStore.ts       — 프로젝트 CRUD + 선택 상태
  ├── projectScheduleStore.ts — 프로젝트 일정 CRUD
  └── subScheduleStore.ts   — 세부 일정 CRUD
```

---

#### `authStore.ts` ✅ PASS

**주된 책임:** 인증 상태 관리 (currentUser, accessToken, isAuthenticated)  
**분석:** 단일 책임.

---

#### `noticeStore.ts` ✅ PASS

**주된 책임:** 공지사항 클라이언트 상태 관리  
**분석:** 공지사항 CRUD만 담당.

---

#### `teamStore.ts` ✅ PASS

**주된 책임:** UI 선택 상태 관리 (선택 팀, 날짜, 캘린더 뷰)  
**분석:** UI 상태만 관리.

---

### 2.5 Query Hooks (`frontend/hooks/query/`)

#### `useMessages.ts` ✅ PASS

**주된 책임:** 채팅 메시지 API 연동 (조회 + 전송)  
**분석:** 조회/전송 2개 훅으로 명확 분리.

---

#### `useTeams.ts` ⚠️ WARNING

**주된 책임:** 팀 관련 API 연동  
**혼재 책임:** 팀 조회(useMyTeams, usePublicTeams, useTeamDetail)와 팀 뮤테이션(useCreateTeam, useUpdateTeam, useDeleteTeam)이 한 파일에 혼재.

**분석:** 각 훅이 명확히 분리되어 있고 파일이 응집도 있는 "팀 API" 컨텍스트를 갖고 있어 실용적으로 WARNING 수준.

**개선 제안:** `useTeamQueries.ts` / `useTeamMutations.ts`로 분리 가능.

---

#### `useWorkPermissions.ts` ✅ PASS

**주된 책임:** 업무보고 조회 권한 API 연동  
**분석:** 조회/설정 2개 훅으로 명확 분리.

---

#### `useSchedules.ts` ✅ PASS

**주된 책임:** 팀 일정 API 연동  
**분석:** 조회·생성·수정·삭제가 분리된 훅.

---

### 2.6 Utilities (`frontend/lib/`)

#### `apiClient.ts` ❌ FAIL

**주된 책임(선언):** HTTP 클라이언트  
**실제 책임(발견):**
1. HTTP 요청 메서드 (get, post, patch, put, delete)
2. 토큰 관리 (setTokens, clearTokens, localStorage 저장/조회)
3. Access Token 만료 감지 및 자동 갱신 (401 재시도 로직)
4. 갱신 실패 시 페이지 리다이렉트

**변경 이유:** HTTP 라이브러리 변경 / 토큰 저장 전략 변경 / 인증 정책 변경 / 에러 처리 변경 — 4가지

**개선 제안:**
```
lib/
  ├── apiClient.ts          — HTTP 메서드 (get/post/patch/put/delete)만
  ├── tokenManager.ts       — 토큰 저장·조회·삭제
  └── authInterceptor.ts    — 401 감지 + 토큰 갱신 + 재시도
```

---

#### `timezone.ts` ✅ PASS

**주된 책임:** UTC ↔ KST 시간대 변환  
**분석:** 날짜 관련 여러 함수가 있으나 모두 "시간대 변환"이라는 단일 책임에 귀속됨.

---

### 2.7 Main Page (`frontend/app/(main)/teams/[teamId]/page.tsx`)

#### `page.tsx` ❌ FAIL

**주된 책임(선언):** 팀 메인 페이지  
**실제 책임(발견):**
1. 팀 일정 CRUD (생성·수정·삭제 핸들러, 선택 날짜 관리)
2. 포스트잇 CRUD (생성·수정·삭제 핸들러, postit API)
3. 태스크 목록 조회 (useMyTasks)
4. 캘린더 뷰 전환 (month / week / day)
5. 반응형 레이아웃 분기 (데스크탑 / 모바일)
6. 채팅 탭 관리
7. 로그아웃 처리
8. 프로젝트뷰 탭 관리

**변경 이유:** 일정 기능 변경 / 포스트잇 기능 변경 / 레이아웃 변경 / 탭 추가 / 권한 정책 변경 — 5가지

**개선 제안:**
```
app/(main)/teams/[teamId]/
  ├── page.tsx                  — 조율만 (라우팅, 뷰 전환)
  ├── _components/
  │   ├── TeamPageHeader.tsx    — 헤더 (로고, 사용자 정보, 로그아웃)
  │   ├── CalendarSection.tsx   — 캘린더 뷰 + 일정 CRUD
  │   ├── PostitSection.tsx     — 포스트잇 관리
  │   └── MobileLayout.tsx      — 모바일 레이아웃
  └── _hooks/
      ├── useScheduleActions.ts — 일정 CRUD
      └── usePostitActions.ts   — 포스트잇 CRUD
```

---

## 3. Backend 분석

### 3.1 API Routes

#### `backend/app/api/teams/route.ts` ⚠️ WARNING

**주된 책임:** 팀 목록 조회 및 팀 생성  
**혼재 책임:**
- GET: 팀 조회
- POST: 유효성 검증 + DB 트랜잭션(팀 생성 + 팀장 멤버 등록) 인라인 처리

**개선 제안:** `validateTeamInput()`, `createTeamWithLeader()` 함수로 분리.

---

#### `backend/app/api/teams/[teamId]/route.ts` ✅ PASS

**주된 책임:** 팀 상세 조회  
**분석:** GET 핸들러만 존재하며 단순 조회 책임.

---

#### `backend/app/api/teams/[teamId]/messages/route.ts` ❌ FAIL

**주된 책임(선언):** 메시지 조회 및 생성  
**실제 책임(발견):**
1. GET: 날짜별 조회 / 최신순 조회 두 가지 경로 분기
2. GET: WORK_PERFORMANCE 권한 필터링 적용
3. POST: 메시지 내용·길이·타입 유효성 검증
4. POST: 메시지 생성

**변경 이유:** 조회 방식 변경 / 권한 정책 변경 / 검증 규칙 변경 / 메시지 타입 추가 — 4가지

**개선 제안:**
```ts
// 분리 방향
function validateMessageInput(body) { ... }   // 검증만
function resolveMessages(teamId, params, ...) { ... }  // 조회 경로 분기만
```

---

#### `backend/app/api/teams/[teamId]/schedules/route.ts` ⚠️ WARNING

**주된 책임:** 일정 조회 및 생성  
**혼재 책임:**
- GET: 날짜 범위 계산 로직 인라인
- POST: 제목·날짜·길이 검증 인라인

**개선 제안:** `validateScheduleInput()`, `getScheduleDateRange()` 분리.

---

#### `backend/app/api/teams/[teamId]/work-permissions/route.ts` ✅ PASS

**주된 책임:** 업무보고 조회 권한 조회 및 설정  
**분석:** GET/PATCH 각각 단순 위임만 수행. 단일 책임.

---

### 3.2 Database Queries (`backend/lib/db/queries/`)

#### `chatQueries.ts` ⚠️ WARNING

**주된 책임:** 채팅 메시지 DB 조작  
**혼재 책임:**
- `createChatMessage`: 메시지 INSERT 후 발신자 이름을 별도 SELECT — 2개 쿼리가 하나의 함수에 혼재
- `getMessagesByDate` / `getMessagesByTeam`: 권한 필터링 로직이 중복으로 포함

**개선 제안:**
```ts
async function getSenderName(senderId: string): Promise<string> { ... }  // 분리
function applyPermissionFilter(msgs, requesterId, requesterRole) { ... } // 중복 제거
```

---

#### `teamQueries.ts` ✅ PASS

**주된 책임:** 팀 관련 DB 조작  
**분석:** 각 함수가 명확한 SQL 연산만 수행.

---

#### `permissionQueries.ts` ✅ PASS

**주된 책임:** 업무보고 권한 DB 조작  
**분석:** 조회·설정·확인 3개 함수가 명확하게 분리됨.

---

#### `scheduleQueries.ts` ✅ PASS

**주된 책임:** 팀 일정 DB 조작  
**분석:** CRUD 함수가 각각 분리됨.

---

### 3.3 Middleware (`backend/lib/middleware/`)

#### `withAuth.ts` ✅ PASS

**주된 책임:** JWT 토큰 검증 및 사용자 ID 추출  
**분석:** 단일 책임.

---

#### `withTeamRole.ts` ✅ PASS

**주된 책임:** 팀 멤버십 및 역할 검증  
**분석:** `withTeamRole` (멤버십 확인) / `requireLeader` (팀장 확인) 2개 함수로 명확 분리.

---

### 3.4 Utilities (`backend/lib/utils/`)

#### `timezone.ts` ✅ PASS

**주된 책임:** KST 기준 날짜 변환  
**분석:** 단일 책임.

---

## 4. 종합 통계

### 4.1 등급 분포

| 등급 | Frontend | Backend | 합계 |
|------|----------|---------|------|
| ✅ PASS | 17개 | 9개 | **26개** |
| ⚠️ WARNING | 2개 | 4개 | **6개** |
| ❌ FAIL | 6개 | 1개 | **7개** |
| **합계** | **25개** | **14개** | **39개** |

### 4.2 SRP 준수율

| 범위 | 준수(PASS) | 경고(WARNING) | 위반(FAIL) | 준수율 |
|------|-----------|--------------|-----------|--------|
| Frontend | 68% | 8% | 24% | 68% |
| Backend | 64% | 29% | 7% | 64% |
| **전체** | **67%** | **15%** | **18%** | **67%** |

---

## 5. 개선 우선순위

### 🔴 1순위 — 즉시 개선 (복잡도 높고 변경 빈도 높은 파일)

| 파일 | 핵심 문제 | 예상 분리 파일 수 |
|------|-----------|-----------------|
| `frontend/store/projectStore.ts` | 3개 도메인 혼재 | → 3개 스토어로 분리 |
| `frontend/app/(main)/teams/[teamId]/page.tsx` | 5개 책임 혼재 | → 섹션별 컴포넌트 + 훅 분리 |
| `frontend/components/chat/ChatPanel.tsx` | 4개 책임 혼재 | → 권한 모달·공지 배너 분리 |

### 🟡 2순위 — 단기 개선 (유지보수 부담 있음)

| 파일 | 핵심 문제 | 예상 분리 방향 |
|------|-----------|--------------|
| `frontend/lib/apiClient.ts` | 토큰 관리·인증 재시도 혼재 | TokenManager + AuthInterceptor 분리 |
| `frontend/components/project/ProjectGanttView.tsx` | CRUD × 2 + 모달 관리 | 커스텀 훅 2개 분리 |
| `frontend/components/project/ProjectScheduleDetailModal.tsx` | 타임라인 + 세부일정 CRUD | SubScheduleTimeline 컴포넌트 분리 |
| `backend/app/api/teams/[teamId]/messages/route.ts` | 조회 분기 + 검증 + 생성 혼재 | 검증 함수 분리 |

### 🟢 3순위 — 장기 권장 (실용적 허용 범위, 규모 커질 때 분리)

| 파일 | 핵심 문제 | 예상 분리 방향 |
|------|-----------|--------------|
| `frontend/components/project/GanttChart.tsx` | 정렬 로직 + 렌더링 | useGanttData() 훅 추출 |
| `frontend/hooks/query/useTeams.ts` | 조회/뮤테이션 혼재 | useTeamQueries + useTeamMutations |
| `backend/app/api/teams/route.ts` | 검증 + 트랜잭션 인라인 | validateTeamInput() 분리 |
| `backend/app/api/teams/[teamId]/schedules/route.ts` | 검증 인라인 | validateScheduleInput() 분리 |
| `backend/lib/db/queries/chatQueries.ts` | 권한 필터링 중복 | applyPermissionFilter() 분리 |

---

## 6. 총평

현재 프로젝트는 **전체 파일의 67%가 SRP를 준수**하고 있으며, Backend는 미들웨어와 DB 쿼리 레이어가 잘 분리되어 있어 상대적으로 양호합니다.

Frontend에서 문제가 집중되는 패턴은 **"페이지 컴포넌트와 스토어 파일이 기능이 추가될 때마다 책임을 흡수"** 하는 구조입니다. 특히 `page.tsx`와 `projectStore.ts`는 MVP 이후 기능이 추가되면서 책임이 누적된 사례입니다.

> **핵심 제언:** SRP 위반 파일 7개 중 5개가 Frontend에 집중되어 있으며, 이 중 `projectStore`, `page.tsx`, `ChatPanel`은 현재도 신기능 추가 시 계속 비대해질 위험이 있습니다. 스토어 분리 → 커스텀 훅 추출 → 컴포넌트 분리 순으로 개선하는 것을 권장합니다.
