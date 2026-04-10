# FE-07 팀 메인 화면 (S-05) — 반응형 완료 보고서

## 작업 개요

- **Task**: FE-07
- **설명**: 캘린더+채팅 동시 화면 (데스크탑 좌우 분할 / 모바일 탭 전환)
- **완료일**: 2026-04-10
- **테스트**: 23개 테스트, 100% 통과

## 구현 내용

### 핵심 파일

- `frontend/app/(main)/teams/[teamId]/page.tsx` — 팀 메인 페이지 컴포넌트
- `frontend/app/(main)/teams/[teamId]/__tests__/TeamMainPage.spec.tsx` — 테스트 코드

### 반응형 레이아웃

#### 데스크탑 (1024px 이상)
- 좌우 분할 레이아웃 구현
  - 캘린더: 60% 너비 (`w-[60%]`)
  - 채팅: 40% 너비 (`flex-1`)
- 헤더에 팀명, 나의 할 일 버튼(LEADER 전용), 로그아웃 버튼
- 날짜 선택 시 ChatPanel의 date prop으로 연동

#### 모바일 (640px 미만)
- 탭 전환 방식 레이아웃
  - [캘린더] 탭: 월/주/일 뷰 지원
  - [채팅] 탭: 3초 폴링 채팅
- 활성 탭에 primary-600 색상 + border-primary-500 하이라이트

### 권한 기반 UI 제어

- **LEADER**: "나의 할 일" 버튼 표시, ChatPanel에 `isLeader=true` 전달
- **MEMBER**: "나의 할 일" 버튼 숨김, ChatPanel에 `isLeader=false` 전달

### 상태 관리

- `useTeamStore`: selectedTeamId, selectedDate, calendarView 연동
- `useAuthStore`: currentUser, logout 기능
- `useTeamDetail`: 팀 상세 정보 조회 (TanStack Query)
- `useBreakpoint`: 반응형 분기 결정

## 테스트 결과

### 테스트 커버리지

- **총 테스트 수**: 23개
- **통과**: 23개 (100%)
- **실패**: 0개

### 테스트 카테고리

1. **Loading and Error States** (3개)
   - 로딩 상태 표시
   - 에러 상태 표시
   - 홈으로 돌아가기 버튼 동작

2. **Desktop Layout (1024px+)** (9개)
   - 좌우 분할 레이아웃 렌더링
   - 팀명 표시
   - LEADER/MEMBER별 UI 제어
   - 네비게이션 버튼 동작
   - ChatPanel prop 전달 검증

3. **Mobile Layout (<640px)** (5개)
   - 탭 기반 레이아웃
   - 기본 활성 탭
   - 탭 전환 동작
   - 활성 탭 스타일링
   - 뒤로가기 버튼 동작

4. **Store Integration** (3개)
   - selectedTeamId 설정
   - selectedDate 업데이트
   - calendarView 변경

5. **Role-Based UI Control** (2개)
   - LEADER UI 검증
   - MEMBER UI 검증

6. **Date Display** (1개)
   - 데스크탑 채팅 헤더 날짜 표시

## 완료 조건 체크리스트

- [x] 데스크탑: 좌우 분할 화면 렌더링
- [x] 모바일: 탭 전환 동작
- [x] 날짜 선택 → 채팅 목록 날짜 연동 확인
- [x] 테스트 23개 통과 (100%)
- [x] TypeScript 컴파일 오류 없음 (FE-07 파일 기준)
- [x] 기존 FE-05, FE-06 컴포넌트와 통합 완료

## 의존성

- ✅ FE-05 (캘린더 컴포넌트) — CalendarView, CalendarMonthView, CalendarWeekView, CalendarDayView
- ✅ FE-06 (채팅 컴포넌트) — ChatPanel, ChatMessageList, ChatMessageItem, ChatInput
- ✅ useBreakpoint 훅
- ✅ teamStore (selectedDate, calendarView, selectedTeamId)
- ✅ useTeamDetail (TanStack Query)

## 다음 단계

FE-08 (일정 폼 + 나의 할 일 화면)에서 다음 기능 추가 예정:
- ScheduleForm 컴포넌트
- ScheduleDetailModal 컴포넌트
- 나의 할 일 페이지 (/me/tasks)
- JoinRequestActions 컴포넌트
