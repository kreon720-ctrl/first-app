# TEAM WORKS 스타일 가이드

## 문서 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2026-04-07 | - | 최초 작성 |
| 1.1 | 2026-04-08 | - | Semantic 컬러 설명에서 "초대" 표현 제거, 상태 배지 예시를 가입 신청 상태(PENDING/APPROVED/REJECTED)로 교체, 아이콘 매핑에서 "팀원 초대" → "가입 신청" 수정 |
| 1.2 | 2026-04-18 | - | 앱명 Team CalTalk → TEAM WORKS 반영. SCHEDULE_REQUEST → WORK_PERFORMANCE 변경 |
| 1.3 | 2026-04-23 | - | 다크 모드 일정바·프로젝트바·세부일정바·포스트잇 컬러 팔레트 정의 (Royal Amber / Electric Indigo / Deep Emerald / Crimson Red / Ice Silver) |
| 1.4 | 2026-04-28 | - | 라이트 5색 팔레트(indigo/blue/emerald/amber/rose) 정식화 §2.5, NoticeBanner / PostItCard / GanttBar / SubBar / AIAssistantButton 컴포넌트 토큰 §5.11 추가 |

---

## 개요

본 문서는 TEAM WORKS(팀 캘린더 + 채팅 통합 앱)의 UI 개발을 위한 스타일 가이드입니다. Google 검색 페이지의 미니멀 디자인 원칙을 참조하여 TEAM WORKS 고유의 시각적 언어를 정의합니다. 기술 스택(React 19 + TypeScript + Tailwind CSS)과 모바일 우선 반응형 플랫폼을 기준으로 작성되었습니다.

---

## 1. 디자인 원칙 (Design Principles)

### P-01 콘텐츠 우선 (Content First)
캘린더 일정과 채팅 메시지가 주인공입니다. 장식적 요소를 최소화하고 정보가 명확하게 드러나도록 합니다. 불필요한 그래픽, 과도한 그라데이션, 복잡한 패턴을 사용하지 않습니다.

### P-02 명확한 시각적 계층 (Clear Visual Hierarchy)
LEADER 권한 UI, 일정 카드, WORK_PERFORMANCE 메시지처럼 중요도가 다른 요소들은 크기·색상·굵기·여백을 통해 즉시 구별할 수 있어야 합니다.

### P-03 충분한 여백 (Generous Whitespace)
모바일 화면에서도 각 요소가 숨을 쉴 공간을 확보합니다. 좁은 화면일수록 더 엄격하게 여백을 지킵니다. 요소를 빽빽하게 채우는 것보다 덜어내는 방향으로 결정합니다.

### P-04 일관된 패턴 (Consistent Patterns)
동일한 기능은 동일한 시각 언어를 사용합니다. 버튼, 입력창, 카드 등 컴포넌트는 모든 화면에서 동일한 규칙을 따릅니다. 예외를 최소화하여 사용자의 학습 비용을 낮춥니다.

### P-05 역할 기반 명확성 (Role-Based Clarity)
LEADER와 MEMBER의 권한 차이가 UI에서 즉시 인식되어야 합니다. WORK_PERFORMANCE(업무보고) 메시지는 일반 메시지와 시각적으로 명확히 구분됩니다. 권한이 없는 사용자에게는 해당 UI 요소를 숨깁니다(비활성화가 아닌 숨김).

### P-06 모바일 우선 (Mobile First)
모든 컴포넌트와 레이아웃은 375px 모바일 기준으로 먼저 설계하고, 태블릿/데스크탑으로 확장합니다. 터치 타겟 최소 크기를 44px 이상으로 유지합니다.

---

## 2. 컬러 시스템

### 2.1 Primary 컬러 팔레트

TEAM WORKS의 브랜드 컬러는 신뢰·협업·효율을 상징하는 인디고-블루 계열입니다. Google Blue(#1a0dab)를 참조하되, 보다 현대적이고 친근한 톤으로 조정합니다.

| 토큰명 | HEX | Tailwind 클래스 | 용도 |
|--------|-----|-----------------|------|
| `primary-50` | `#EEF2FF` | `bg-primary-50` | 매우 연한 배경, hover 상태 |
| `primary-100` | `#E0E7FF` | `bg-primary-100` | 연한 배경, 선택 상태 배경 |
| `primary-200` | `#C7D2FE` | `bg-primary-200` | 비활성 버튼 배경 |
| `primary-300` | `#A5B4FC` | `bg-primary-300` | - |
| `primary-400` | `#818CF8` | `bg-primary-400` | - |
| `primary-500` | `#6366F1` | `bg-primary-500` | Primary 버튼, 링크, 활성 탭 인디케이터 |
| `primary-600` | `#4F46E5` | `bg-primary-600` | Primary 버튼 hover 상태 |
| `primary-700` | `#4338CA` | `bg-primary-700` | Primary 버튼 active 상태 |
| `primary-800` | `#3730A3` | `bg-primary-800` | - |
| `primary-900` | `#312E81` | `bg-primary-900` | 진한 강조 텍스트 |

**Tailwind CSS v4 `@theme` 설정** (`app/globals.css`):

> ⚠️ Tailwind v4에서는 `tailwind.config.js`가 아닌 CSS의 `@theme` 블록으로 커스텀 토큰을 등록합니다.
> `:root`에 CSS 변수만 정의하면 유틸리티 클래스(`bg-primary-500` 등)가 생성되지 않습니다.

```css
@theme {
  --color-primary-50:  #EEF2FF;
  --color-primary-100: #E0E7FF;
  --color-primary-200: #C7D2FE;
  --color-primary-300: #A5B4FC;
  --color-primary-400: #818CF8;
  --color-primary-500: #6366F1;
  --color-primary-600: #4F46E5;
  --color-primary-700: #4338CA;
  --color-primary-800: #3730A3;
  --color-primary-900: #312E81;
}
```

### 2.2 Semantic 컬러

| 역할 | 이름 | HEX | Tailwind 클래스 | 사용처 |
|------|------|-----|-----------------|--------|
| 성공 (Success) | `success-500` | `#22C55E` | `text-success-500`, `bg-success-50` | 가입 신청 승인 성공, 저장 완료, 인라인 유효성 통과 메시지 |
| 경고 (Warning) | `warning-500` | `#F59E0B` | `text-warning-500`, `bg-warning-50` | 폴링 갱신 안내, 주의 필요 상태 |
| 에러 (Error) | `error-500` | `#EF4444` | `text-error-500`, `bg-error-50` | 로그인 실패, 폼 유효성 오류, API 에러, Danger 버튼 |
| 정보 (Info) | `info-500` | `#3B82F6` | `text-info-500`, `bg-info-50` | 일반 안내 메시지, 가입 신청 대기 상태 |

**Tailwind CSS 커스텀 설정:**

```js
colors: {
  success: {
    50:  '#F0FDF4',
    500: '#22C55E',
    700: '#15803D',
  },
  warning: {
    50:  '#FFFBEB',
    500: '#F59E0B',
    700: '#B45309',
  },
  error: {
    50:  '#FEF2F2',
    500: '#EF4444',
    700: '#B91C1C',
  },
  info: {
    50:  '#EFF6FF',
    500: '#3B82F6',
    700: '#1D4ED8',
  },
},
```

### 2.3 Neutral 컬러 (배경 / 텍스트 / 경계선)

Google 검색 페이지의 순백 배경과 회색 계열 텍스트를 기반으로 합니다.

| 토큰명 | HEX | Tailwind 클래스 | 용도 |
|--------|-----|-----------------|------|
| `neutral-0` | `#FFFFFF` | `bg-white` | 기본 페이지 배경, 카드 배경, 입력창 배경 |
| `neutral-50` | `#F9FAFB` | `bg-gray-50` | 채팅 영역 배경, 비활성 입력창 배경 |
| `neutral-100` | `#F3F4F6` | `bg-gray-100` | hover 배경, 구분 배경 |
| `neutral-200` | `#E5E7EB` | `bg-gray-200` | 구분선(Divider), 입력창 테두리 기본값 |
| `neutral-300` | `#D1D5DB` | `bg-gray-300` | 비활성 상태 테두리 |
| `neutral-400` | `#9CA3AF` | `text-gray-400` | 플레이스홀더 텍스트 |
| `neutral-500` | `#6B7280` | `text-gray-500` | 보조 텍스트, 날짜/시간 표시 |
| `neutral-600` | `#4B5563` | `text-gray-600` | 설명 텍스트, 부제목 |
| `neutral-700` | `#374151` | `text-gray-700` | 일반 본문 텍스트 |
| `neutral-800` | `#1F2937` | `text-gray-800` | 주요 본문, 카드 제목 |
| `neutral-900` | `#111827` | `text-gray-900` | 헤더 타이틀, 가장 강조된 텍스트 |

> Tailwind CSS 기본 `gray` 팔레트를 그대로 활용합니다. 별도 커스텀 불필요.

### 2.4 특수 컬러 — 역할 배지 & WORK_PERFORMANCE(업무보고)

| 용도 | 배경색 | 텍스트색 | Tailwind 클래스 조합 |
|------|--------|----------|----------------------|
| LEADER 배지 | `#FEF3C7` | `#92400E` | `bg-amber-100 text-amber-800` |
| MEMBER 배지 | `#E0E7FF` | `#3730A3` | `bg-indigo-100 text-indigo-800` |
| WORK_PERFORMANCE 메시지 배경 | `#FFF7ED` | `#9A3412` | `bg-orange-50 border-orange-300 text-orange-900` |
| 오늘 날짜 셀 | `#6366F1` | `#FFFFFF` | `bg-primary-500 text-white` |

### 2.5 5색 팔레트 (일정·포스트잇·간트차트 공통)

팀 일정·포스트잇·프로젝트 일정·세부 일정·공지 배지 등에서 사용하는 라벨 색상은 5종으로 통일한다. DB 의 `color` 컬럼·`color` 검증 룰(`indigo|blue|emerald|amber|rose`)과 1:1 매핑.

| 토큰 | 100 (배경) | 300 (border) | 500 (강조) | 700 (텍스트) | 주 용도 |
|------|-----------|--------------|------------|--------------|---------|
| indigo | `#E0E7FF` | `#A5B4FC` | `#6366F1` | `#4338CA` | 일정·일반 메모 (default) |
| blue | `#DBEAFE` | `#93C5FD` | `#3B82F6` | `#1D4ED8` | 정보·참고 |
| emerald | `#D1FAE5` | `#6EE7B7` | `#10B981` | `#047857` | 완료·정상 진행 |
| amber | `#FEF3C7` | `#FCD34D` | `#F59E0B` | `#B45309` | 강조·공지 배너 |
| rose | `#FFE4E6` | `#FDA4AF` | `#F43F5E` | `#BE123C` | 긴급·지연(`is_delayed`) |

**적용 규칙**
- 배경은 `*-100`, 카드 경계선은 `*-300`. 본문 텍스트는 흑(`gray-900`) 위주, 강조 텍스트는 `*-700`.
- 다크모드(v1.3) 색상은 별도. 본 표는 라이트 기준.
- DB 에 새 색을 추가할 때는 백엔드 `validColors` (`backend/app/api/.../postits/route.ts` 등) 와 본 표를 동시에 갱신.

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

한국어 사용자(40대 팀장, 20~30대 팀원)를 대상으로 하므로 한글 최적화 폰트를 우선 적용합니다.

| 용도 | 폰트 | 대체(fallback) |
|------|------|----------------|
| 기본 UI 텍스트 | **Pretendard** | `Noto Sans KR`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif` |
| 코드/날짜 등 고정폭 | `ui-monospace` | `SFMono-Regular`, `Consolas`, `monospace` |

**Google Fonts / CDN 설정 (`_app.tsx` 또는 `layout.tsx`):**

```html
<!-- Pretendard CDN (jsDelivr) -->
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
```

**Tailwind CSS `tailwind.config.js`:**

```js
theme: {
  extend: {
    fontFamily: {
      sans: ['Pretendard', 'Noto Sans KR', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
  },
},
```

### 3.2 폰트 사이즈 스케일

Tailwind CSS 기본 스케일을 활용하되, 모바일 우선 기준으로 정의합니다.

| 토큰 | 크기 | 사용처 | Tailwind 클래스 |
|------|------|--------|-----------------|
| `text-xs` | 12px | URL 텍스트, 글자 수 카운터, 타임스탬프 | `text-xs` |
| `text-sm` | 14px | 채팅 메시지 본문, 설명 텍스트, 에러 메시지, 배지 | `text-sm` |
| `text-base` | 16px | 입력창 텍스트, 일반 본문, 버튼 기본 | `text-base` |
| `text-lg` | 18px | 카드 제목, 팀 이름 | `text-lg` |
| `text-xl` | 20px | 화면 헤더 타이틀, 섹션 제목 | `text-xl` |
| `text-2xl` | 24px | 서비스 로고/타이틀 (S-01, S-02) | `text-2xl` |

### 3.3 폰트 웨이트

| 토큰 | 값 | 사용처 | Tailwind 클래스 |
|------|-----|--------|-----------------|
| Regular | 400 | 일반 본문, 설명 텍스트, 채팅 메시지 | `font-normal` |
| Medium | 500 | 버튼, 탭 메뉴, 입력창 레이블, 배지 | `font-medium` |
| SemiBold | 600 | 카드 제목, 날짜 헤더, 팀 이름 | `font-semibold` |
| Bold | 700 | 서비스 타이틀, 화면 헤더 | `font-bold` |

### 3.4 줄간격 (Line-height)

| 용도 | 줄간격 | Tailwind 클래스 |
|------|--------|-----------------|
| 제목류 (1줄) | 1.25 | `leading-tight` |
| UI 라벨, 버튼 | 1.375 | `leading-snug` |
| 일반 본문 | 1.5 | `leading-normal` |
| 채팅 메시지 (다줄) | 1.625 | `leading-relaxed` |

### 3.5 주요 텍스트 조합 예시

```
서비스 타이틀 (S-01/S-02):
  text-2xl font-bold text-gray-900 leading-tight

화면 헤더 타이틀:
  text-xl font-semibold text-gray-900 leading-tight

섹션 제목 / 카드 제목:
  text-lg font-semibold text-gray-800 leading-snug

일반 본문 / 폼 레이블:
  text-base font-medium text-gray-700 leading-normal

채팅 메시지 본문:
  text-sm font-normal text-gray-800 leading-relaxed

보조 텍스트 / 설명:
  text-sm font-normal text-gray-500 leading-normal

타임스탬프 / 카운터:
  text-xs font-normal text-gray-400 leading-normal
```

---

## 4. 간격 시스템 (Spacing)

### 4.1 기본 그리드

**4px 베이스 그리드**를 기반으로 하며, Tailwind CSS의 기본 spacing scale(1unit = 4px)과 완전히 일치합니다.

| spacing 단위 | px | 설명 | Tailwind 클래스 |
|-------------|-----|------|-----------------|
| 1 | 4px | 최소 간격 (아이콘-텍스트 사이 등) | `gap-1`, `p-1`, `m-1` |
| 2 | 8px | 인라인 요소 간 간격 | `gap-2`, `p-2`, `m-2` |
| 3 | 12px | 폼 요소 내 패딩, 배지 패딩 | `gap-3`, `p-3`, `m-3` |
| 4 | 16px | 컴포넌트 내부 기본 패딩, 카드 패딩 | `gap-4`, `p-4`, `m-4` |
| 6 | 24px | 섹션 내부 요소 간 간격 | `gap-6`, `py-6`, `my-6` |
| 8 | 32px | 섹션 간 간격 | `gap-8`, `py-8`, `my-8` |
| 12 | 48px | 페이지 상하 패딩, 큰 섹션 간격 | `gap-12`, `py-12` |

### 4.2 컴포넌트 내부 패딩 기준

| 컴포넌트 | 내부 패딩 | Tailwind 클래스 |
|----------|-----------|-----------------|
| Button (sm) | 상하 6px / 좌우 12px | `py-1.5 px-3` |
| Button (md) | 상하 8px / 좌우 16px | `py-2 px-4` |
| Button (lg) | 상하 12px / 좌우 24px | `py-3 px-6` |
| Input / SearchBar | 상하 10px / 좌우 16px | `py-2.5 px-4` |
| Card | 16px 전체 | `p-4` |
| Modal | 24px 전체 | `p-6` |
| Badge / Tag | 상하 2px / 좌우 8px | `py-0.5 px-2` |
| Tab item | 상하 12px / 좌우 16px | `py-3 px-4` |
| 채팅 메시지 버블 | 상하 8px / 좌우 12px | `py-2 px-3` |
| 화면 좌우 여백 (모바일) | 16px | `px-4` |
| 화면 좌우 여백 (데스크탑) | 24px | `px-6` |

---

## 5. 컴포넌트 스타일 명세

### 5.1 Input / SearchBar

**디자인 원칙:** Google 검색창처럼 둥근 형태, 여유로운 패딩, 미세한 그림자, 명확한 포커스 링.

#### 기본 Input 필드

```
상태: 기본(default)
  border border-gray-300 rounded-xl bg-white px-4 py-2.5
  text-base font-normal text-gray-900 placeholder:text-gray-400
  shadow-sm

상태: 포커스(focus)
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent

상태: 에러(error)
  border-error-500 focus:ring-error-500 bg-error-50

상태: 비활성(disabled)
  bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed
```

**완성된 클래스 조합 (기본):**
```
className="w-full border border-gray-300 rounded-xl bg-white px-4 py-2.5
           text-base font-normal text-gray-900 placeholder:text-gray-400
           shadow-sm transition-colors duration-150
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
           disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400
           disabled:cursor-not-allowed"
```

#### 검색바 스타일 (pill 형태 — 캘린더 날짜 이동 등)

```
className="w-full border border-gray-300 rounded-full bg-white px-5 py-2.5
           text-base font-normal text-gray-900 placeholder:text-gray-400
           shadow-sm transition-colors duration-150
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
```

#### 텍스트에리어 (채팅 입력창)

```
className="w-full border border-gray-300 rounded-xl bg-white px-4 py-2.5
           text-sm font-normal text-gray-800 placeholder:text-gray-400
           shadow-sm resize-none transition-colors duration-150
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
```

### 5.2 Button

4종(Primary / Secondary / Ghost / Danger), 3크기(sm / md / lg).

#### 크기별 기본 클래스

```
sm: "inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-sm font-medium transition-colors duration-150"
md: "inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-base font-medium transition-colors duration-150"
lg: "inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-base font-semibold transition-colors duration-150"
```

#### Primary 버튼 (로그인, 회원가입, 팀 생성 등 핵심 CTA)

```
기본: "bg-primary-500 text-white shadow-sm"
hover: "hover:bg-primary-600"
active: "active:bg-primary-700"
비활성: "disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"

전체 조합 (md):
className="inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4
           text-base font-medium bg-primary-500 text-white shadow-sm
           hover:bg-primary-600 active:bg-primary-700
           disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
           transition-colors duration-150"
```

#### Secondary 버튼 (뒤로가기, 취소, 보조 액션)

```
기본: "bg-white border border-gray-300 text-gray-700 shadow-sm"
hover: "hover:bg-gray-50 hover:border-gray-400"
active: "active:bg-gray-100"

전체 조합 (md):
className="inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4
           text-base font-medium bg-white border border-gray-300 text-gray-700 shadow-sm
           hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100
           transition-colors duration-150"
```

#### Ghost 버튼 (아이콘 버튼, 로그아웃, 더보기 메뉴)

```
기본: "bg-transparent text-gray-600"
hover: "hover:bg-gray-100 hover:text-gray-900"
active: "active:bg-gray-200"

전체 조합 (md):
className="inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4
           text-base font-medium bg-transparent text-gray-600
           hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200
           transition-colors duration-150"
```

#### Danger 버튼 (일정 삭제 등 파괴적 액션)

```
기본: "bg-error-500 text-white shadow-sm"
hover: "hover:bg-error-700"
active: "active:bg-red-800"

전체 조합 (md):
className="inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4
           text-base font-medium bg-error-500 text-white shadow-sm
           hover:bg-error-700 active:bg-red-800
           transition-colors duration-150"
```

#### FAB 버튼 (팀 생성 플로팅 버튼 — S-03)

```
className="fixed bottom-6 right-4 z-10
           inline-flex items-center justify-center gap-2 rounded-full py-3 px-5
           text-base font-semibold bg-primary-500 text-white
           shadow-lg hover:bg-primary-600 active:bg-primary-700
           transition-colors duration-150"
```

### 5.3 Tab Navigation

모바일(S-05)의 캘린더/채팅 탭 전환과 캘린더 뷰(월/주/일) 탭에 사용합니다. Google 검색의 하단 밑줄 방식을 채택합니다.

#### 탭 컨테이너

```
className="flex border-b border-gray-200 bg-white"
```

#### 탭 아이템 — 기본(비활성)

```
className="flex-1 py-3 px-4 text-sm font-medium text-gray-500
           border-b-2 border-transparent
           hover:text-gray-700 hover:border-gray-300
           transition-colors duration-150 text-center cursor-pointer"
```

#### 탭 아이템 — 활성(active)

```
className="flex-1 py-3 px-4 text-sm font-medium text-primary-600
           border-b-2 border-primary-500
           text-center cursor-pointer"
```

#### React 컴포넌트 패턴 예시

```tsx
<div className="flex border-b border-gray-200 bg-white">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex-1 py-3 px-4 text-sm font-medium text-center
                  border-b-2 transition-colors duration-150
                  ${activeTab === tab.id
                    ? 'text-primary-600 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### 5.4 Card

팀 목록 카드(S-03), 일정 카드, 채팅 WORK_PERFORMANCE(업무보고) 카드에 사용합니다.

#### 기본 카드 (팀 목록 카드)

```
className="w-full bg-white rounded-xl border border-gray-200
           p-4 shadow-sm
           hover:shadow-md hover:border-gray-300
           active:bg-gray-50
           transition-all duration-150 cursor-pointer"
```

#### 일정 카드 (캘린더 셀 내부)

```
className="w-full bg-primary-100 rounded-md px-2 py-1
           text-xs font-medium text-primary-800
           truncate cursor-pointer
           hover:bg-primary-200 transition-colors duration-150"
```

#### WORK_PERFORMANCE(업무보고) 메시지 카드

```
className="w-full bg-orange-50 border border-orange-300 rounded-xl
           p-3 my-1"

메시지 헤더 (타입 배지):
  className="inline-flex items-center gap-1.5 text-xs font-semibold
             text-orange-700 mb-1.5"

메시지 본문:
  className="text-sm font-normal text-orange-900 leading-relaxed"
```

### 5.5 Modal

일정 상세 팝업(S-05 데스크탑에서 일정 클릭 시)에 사용합니다.

#### 오버레이 (배경)

```
className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
           flex items-center justify-center p-4"
```

#### 모달 패널

```
className="relative z-50 w-full max-w-md bg-white rounded-2xl
           shadow-xl p-6
           max-h-[90vh] overflow-y-auto"
```

#### 모달 헤더

```
className="flex items-center justify-between mb-5"

제목: "text-xl font-semibold text-gray-900"
닫기 버튼(X): Ghost 버튼 sm 규격, "rounded-full p-1.5"
```

#### React 컴포넌트 패턴 예시

```tsx
{isOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 모달 내용 */}
    </div>
  </div>
)}
```

### 5.6 Badge / Tag

역할 표시(LEADER/MEMBER)와 메시지 타입 표시(WORK_PERFORMANCE)에 사용합니다.

#### LEADER 배지

```
className="inline-flex items-center rounded-md px-2 py-0.5
           text-xs font-semibold bg-amber-100 text-amber-800"
```

#### MEMBER 배지

```
className="inline-flex items-center rounded-md px-2 py-0.5
           text-xs font-semibold bg-indigo-100 text-indigo-800"
```

#### WORK_PERFORMANCE 타입 배지 (채팅 메시지 내 상단)

```
className="inline-flex items-center gap-1 rounded-md px-2 py-0.5
           text-xs font-bold bg-orange-100 text-orange-700"
```

#### 일반 태그 / 상태 배지

```
PENDING(신청 대기):
  className="inline-flex items-center rounded-md px-2 py-0.5
             text-xs font-medium bg-yellow-100 text-yellow-700"

APPROVED(승인):
  className="inline-flex items-center rounded-md px-2 py-0.5
             text-xs font-medium bg-green-100 text-green-700"

REJECTED(거절):
  className="inline-flex items-center rounded-md px-2 py-0.5
             text-xs font-medium bg-gray-100 text-gray-500"
```

### 5.7 Divider (구분선)

날짜별 채팅 구분선, 목록 구분선에 사용합니다.

#### 수평 구분선 (기본)

```
<hr className="border-0 border-t border-gray-200 my-4" />
```

#### 날짜 헤더 구분선 (채팅 날짜 그룹)

```
<div className="flex items-center gap-3 my-4">
  <div className="flex-1 h-px bg-gray-200" />
  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
    2026년 4월 11일 (금)
  </span>
  <div className="flex-1 h-px bg-gray-200" />
</div>
```

### 5.8 Navigation (상단 헤더)

#### 앱 헤더 (모바일)

```
<header className="flex items-center justify-between
                   h-14 px-4 bg-white border-b border-gray-200
                   sticky top-0 z-30">
  뒤로가기/로고 영역: "flex items-center gap-2"
  타이틀: "text-lg font-semibold text-gray-900 truncate"
  우측 액션: "flex items-center gap-1"
</header>
```

#### 앱 헤더 (데스크탑)

```
<header className="flex items-center justify-between
                   h-16 px-6 bg-white border-b border-gray-200
                   sticky top-0 z-30">
```

### 5.9 Empty State (빈 상태)

팀이 없을 때(S-03), 채팅이 없을 때 사용합니다.

```
<div className="flex flex-col items-center justify-center
                py-16 px-6 text-center">
  아이콘: "w-12 h-12 text-gray-300 mb-4"
  제목: "text-lg font-semibold text-gray-600 mb-2"
  설명: "text-sm font-normal text-gray-400 mb-6 max-w-xs"
  CTA 버튼: Primary md 규격
</div>
```

### 5.10 Form 구조

```tsx
// 폼 그룹 (레이블 + 입력창 + 에러)
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-gray-700">
    팀 이름 <span className="text-error-500">*</span>
  </label>
  <input className="{Input 기본 클래스}" />
  {/* 에러 메시지 */}
  <p className="text-sm font-normal text-error-500 flex items-center gap-1">
    {errorMessage}
  </p>
  {/* 성공 메시지 */}
  <p className="text-sm font-normal text-success-500 flex items-center gap-1">
    {successMessage}
  </p>
  {/* 글자 수 카운터 */}
  <p className="text-xs text-gray-400 text-right">{count} / {max}자</p>
</div>
```

### 5.11 도메인 컴포넌트 (Notices / Postits / Projects / AI 비서)

§2.5 5색 팔레트와 §5.4 Card 베이스 위에 얹는 도메인 컴포넌트들. 색상 토큰은 항상 5색 중 하나로 제한.

**NoticeBanner** — 채팅 영역 상단 sticky 공지

| 속성 | 값 |
|------|-----|
| 배경 | `bg-amber-50` |
| 경계선 | `border-l-4 border-amber-300` |
| 본문 텍스트 | `text-amber-900 text-sm` |
| 작성자/타임스탬프 | `text-xs text-amber-700` |
| [✕ 삭제] 버튼 | 작성자 본인 또는 LEADER 만 노출. `text-amber-600 hover:text-amber-800` |
| 위치 | `sticky top-0 z-10 px-4 py-2` |
| 반응형 | 모바일은 `whitespace-pre-wrap`, 데스크탑은 1줄 클램프 + hover 시 펼침 |

**PostItCard** — 캘린더 셀 또는 우측 패널의 메모 카드

| 속성 | 값 |
|------|-----|
| 배경 | `bg-{color}-100` (5색 중 하나, 기본 amber) |
| 경계선 | `border border-{color}-300` |
| 그림자 | `shadow-sm` (호버 시 `shadow-md`) |
| 회전 | `rotate-[-1deg]` (호버 시 `rotate-0`) |
| 패딩 | `p-3` |
| 본문 폰트 | `text-sm leading-relaxed` |
| 작성자 | `text-xs text-gray-600 mt-2` |
| [수정]/[삭제] | 작성자 본인만 노출 (`createdBy === currentUser.id`). 우상단 아이콘 |

**GanttBar** — 프로젝트 일정 막대

| 속성 | 값 |
|------|-----|
| 기본 색 | `bg-{color}-500` (`color` 컬럼 매핑) |
| 진행률 채움 | 좌→우 그라데이션 또는 inner div 너비 = `progress`% |
| 지연 강조 | `is_delayed === true` 시 `border-2 border-rose-500 ring-2 ring-rose-200` |
| 높이 | `h-6` |
| 라벨 | 막대 안 또는 좌측. `text-xs text-white font-medium` |
| 호버 | 툴팁으로 `title`·`leader`·`startDate ~ endDate`·`progress%` |

**SubBar** — 세부 일정(서브)

| 속성 | 값 |
|------|-----|
| 배경 | GanttBar 동일 5색 |
| 높이 | `h-3` (GanttBar 절반) |
| 종속 표시 | `border-dashed border-l-2 border-{color}-400` 또는 좌측 끌림선 |
| 위치 | 부모 GanttBar 바로 아래 들여쓰기 (`ml-6`) |

**AIAssistantButton** — 헤더 우측 AI 비서 진입점

| 속성 | 값 |
|------|-----|
| 색상 | `text-amber-500` (시그니처 #FFB800), 호버 `text-amber-600` |
| 크기 | 아이콘 `w-6 h-6`, 터치 타겟 44×44 |
| 호버 효과 | `hover:scale-110 transition-transform` |
| 동작 | `window.open('/ai-assistant', 'teamworks-ai-assistant', 'width=480,height=720,...')` — 같은 창 이름으로 재사용 |
| 라벨 (스크린리더) | `aria-label="AI 비서 찰떡 열기"` |
| 위치 | 헤더 우측, 사용자 아바타 좌측 |

> 위 컴포넌트들은 모두 `frontend/components/common/` 또는 도메인 디렉토리 하위에 구현되며, 이 가이드의 토큰 외에는 새 색을 도입하지 않는다. 추가 색이 필요하면 §2.5 의 5색 안에서 의미를 재배치하거나 본 가이드를 먼저 갱신.

---

## 6. 반응형 브레이크포인트

PRD 비기능 요구사항(모바일 우선 반응형)을 기준으로 합니다.

| 이름 | 범위 | Tailwind prefix | 레이아웃 |
|------|------|-----------------|----------|
| mobile | 640px 미만 | (없음, 기본값) | 단일 컬럼, 탭 전환 방식 |
| tablet | 640px ~ 1023px | `sm:` | 유연한 2컬럼 레이아웃 |
| desktop | 1024px 이상 | `lg:` | 캘린더 + 채팅 좌우 분할(S-05) |

### 6.1 S-05 팀 메인 레이아웃

```tsx
// 모바일: 탭 전환 / 데스크탑: 좌우 분할
<div className="flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)]">
  {/* 캘린더 영역 */}
  <div className={`lg:w-[55%] lg:border-r lg:border-gray-200 overflow-y-auto
                   ${activeTab === 'calendar' ? 'block' : 'hidden'} lg:block`}>
    {/* 캘린더 컴포넌트 */}
  </div>
  {/* 채팅 영역 */}
  <div className={`lg:flex-1 flex flex-col overflow-hidden
                   ${activeTab === 'chat' ? 'flex' : 'hidden'} lg:flex`}>
    {/* 채팅 컴포넌트 */}
  </div>
</div>
```

### 6.2 컨테이너 최대 너비

```
인증 전 페이지 (S-01, S-02, S-04, S-08):
  className="min-h-screen flex flex-col items-center justify-center px-4"
  내부 폼 카드: "w-full max-w-sm" (모바일) / "max-w-md" (더 넓은 경우)

팀 목록 (S-03):
  className="max-w-2xl mx-auto px-4 py-6"

팀 메인 (S-05):
  전체 너비 사용 (max-width 없음)
```

---

## 7. 아이콘 가이드

### 7.1 추천 라이브러리

**Lucide React**를 우선 사용합니다. Tailwind CSS와 친화적이며, React 19와 호환성이 검증되었고 번들 크기가 작습니다.

```
npm install lucide-react
```

대안: **Heroicons** (`@heroicons/react`) — Tailwind Labs 공식 아이콘 라이브러리.

### 7.2 사용 크기 기준

| 크기 | 용도 | Tailwind 클래스 |
|------|------|-----------------|
| 16px (w-4 h-4) | 배지 내 아이콘, 인라인 텍스트 옆 아이콘 | `w-4 h-4` |
| 20px (w-5 h-5) | 버튼 내 아이콘, 입력창 내 아이콘 | `w-5 h-5` |
| 24px (w-6 h-6) | 네비게이션 아이콘, 독립형 액션 아이콘 | `w-6 h-6` |

### 7.3 주요 아이콘 매핑

| 용도 | Lucide 컴포넌트 |
|------|----------------|
| 뒤로가기 | `<ChevronLeft />` |
| 이전 월 | `<ChevronLeft />` |
| 다음 월 | `<ChevronRight />` |
| 팀 생성 (FAB) | `<Plus />` |
| 메시지 전송 | `<Send />` |
| 더보기 메뉴 | `<MoreVertical />` |
| 로그아웃 | `<LogOut />` |
| 일정 추가 | `<CalendarPlus />` |
| 가입 신청 (팀 탐색) | `<UserPlus />` |
| 일정 변경 요청 | `<MessageSquare />` |
| 에러 경고 | `<AlertCircle />` |
| 성공 체크 | `<CheckCircle />` |
| 닫기 | `<X />` |
| 일정 상세 | `<Calendar />` |

### 7.4 아이콘 사용 규칙

- 아이콘 단독 사용 시 반드시 `aria-label` 또는 시각적으로 숨긴 텍스트(`sr-only`)를 제공합니다.
- 아이콘 색상은 부모 텍스트 색상을 상속(`currentColor`)하도록 별도 색상을 지정하지 않습니다. 단, 강조 아이콘은 예외로 색상을 명시합니다.
- strokeWidth는 기본값(2) 유지를 원칙으로 합니다.

```tsx
// 텍스트와 함께 사용
<button className="...">
  <Plus className="w-5 h-5" />
  팀 생성
</button>

// 아이콘 단독 사용
<button className="..." aria-label="뒤로가기">
  <ChevronLeft className="w-6 h-6" />
</button>
```

---

## 8. 애니메이션 & 트랜지션

### 8.1 기본 트랜지션

| 용도 | 속도 | Tailwind 클래스 |
|------|------|-----------------|
| 버튼 색상 변화, 링크 hover | 150ms | `transition-colors duration-150` |
| 카드 shadow 변화, 탭 전환 밑줄 | 150ms | `transition-all duration-150` |
| 모달 등장/퇴장, 드롭다운 | 300ms | `transition-all duration-300` |
| 탭 뷰 전환 (캘린더 ↔ 채팅) | 200ms | `transition-opacity duration-200` |

### 8.2 Tailwind CSS 기본 transition 활용

```
버튼 기본: "transition-colors duration-150 ease-in-out"
카드 hover: "transition-shadow duration-150 ease-in-out"
모달 오버레이: "transition-opacity duration-300 ease-in-out"
```

### 8.3 모달 등장 애니메이션

Tailwind CSS `@keyframes` 없이 클래스 조합으로 구현합니다.

```tsx
// tailwind.config.js에 추가
theme: {
  extend: {
    keyframes: {
      'fade-in': {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      'slide-up': {
        '0%': { opacity: '0', transform: 'translateY(8px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
    },
    animation: {
      'fade-in': 'fade-in 200ms ease-out',
      'slide-up': 'slide-up 250ms ease-out',
    },
  },
},

// 사용
<div className="animate-fade-in">오버레이</div>
<div className="animate-slide-up">모달 패널</div>
```

### 8.4 애니메이션 사용 가이드 (금지 및 허용)

**허용:**
- 버튼/카드 hover 시 색상·그림자 변화 (150ms)
- 탭 전환 시 밑줄 이동 (150ms)
- 모달 등장/퇴장 페이드+슬라이드 (200~300ms)
- 채팅 새 메시지 등장 페이드인 (150ms)

**금지:**
- 3초 이상 지속되는 애니메이션
- 사용자가 트리거하지 않은 자동 움직임 (폴링 갱신 시 전체 화면 깜빡임 등)
- 무한 반복 애니메이션 (로딩 스피너 제외)
- 복잡한 모션이나 파티클 효과

**폴링 갱신 UX:**
- 채팅 메시지 폴링(3~5초)으로 새 메시지 추가 시, 스크롤 하단에 있는 경우에만 자동 스크롤. 새 메시지를 즉시 목록에 추가(opacity 0 → 1, 150ms).
- 전체 목록을 깜빡이거나 리렌더링을 강제하지 않습니다.

### 8.5 감소된 모션 지원 (prefers-reduced-motion)

MVP 범위에서는 접근성 완전 대응을 제외했으나, 트랜지션 클래스에 다음 Tailwind 설정을 권장합니다.

```
// tailwind.config.js
plugins: [
  // motion-safe / motion-reduce utility 자동 지원 (Tailwind v3+)
]

// 사용 예시
className="transition-colors duration-150 motion-reduce:transition-none"
```

---

## 9. 그림자 시스템

Google 검색창의 미세한 그림자를 기반으로 레이어 깊이를 표현합니다.

| 단계 | 용도 | Tailwind 클래스 |
|------|------|-----------------|
| 없음 | 탭 아이템, 인라인 요소 | (없음) |
| `shadow-sm` | 기본 버튼, 입력창, 카드 | `shadow-sm` |
| `shadow` | hover 상태 카드 | `shadow` |
| `shadow-md` | hover 상태 중요 카드 | `shadow-md` |
| `shadow-lg` | FAB 버튼 | `shadow-lg` |
| `shadow-xl` | 모달 패널 | `shadow-xl` |

---

## 10. Z-index 레이어

| 레이어 | 값 | 용도 | Tailwind 클래스 |
|--------|-----|------|-----------------|
| Base | 0 | 기본 콘텐츠 | (기본값) |
| Sticky | 30 | 상단 네비게이션 헤더 | `z-30` |
| FAB | 10 | 플로팅 액션 버튼 | `z-10` |
| Overlay | 40 | 모달 배경 오버레이 | `z-40` |
| Modal | 50 | 모달 패널 | `z-50` |

---

## 11. 컬러 사용 요약 빠른 참조

| 상황 | 클래스 조합 |
|------|-------------|
| 페이지 배경 | `bg-white` |
| 섹션 구분 배경 | `bg-gray-50` |
| 주요 제목 | `text-gray-900 font-bold` |
| 일반 본문 | `text-gray-800 font-normal` |
| 보조 설명 | `text-gray-500 font-normal` |
| 플레이스홀더 | `placeholder:text-gray-400` |
| 구분선 | `border-gray-200` |
| Primary 액션 | `bg-primary-500 text-white` |
| Primary hover | `hover:bg-primary-600` |
| 에러 텍스트 | `text-error-500` |
| 성공 텍스트 | `text-success-500` |
| LEADER 배지 | `bg-amber-100 text-amber-800` |
| MEMBER 배지 | `bg-indigo-100 text-indigo-800` |
| WORK_PERFORMANCE | `bg-orange-50 border-orange-300` |
| 오늘 날짜 | `bg-primary-500 text-white` |
| 활성 탭 밑줄 | `border-b-2 border-primary-500` |

---

## 12. 다크 모드 (Dark Mode)

참조 디자인: `refs/DESIGN.md` (Aethelred Authority), `refs/screen.png`

다크 모드는 **Executive Minimalism** 원칙을 따릅니다. 깊은 차콜 계열 배경에 앰버 골드 포인트 컬러를 소량 사용해 고급스럽고 집중적인 업무 환경을 구현합니다. Tailwind CSS `dark:` variant를 기반으로 하며, `<html>` 태그에 `class="dark"` 를 추가하면 활성화됩니다.

### 12.1 다크 모드 컬러 팔레트

#### 서피스(Surface) 계층 — Tonal Layering

그림자 대신 배경색 단계로 계층을 표현합니다.

| 레벨 | 용도 | HEX | Tailwind 커스텀 토큰 |
|------|------|-----|----------------------|
| Level 0 — Base | 페이지 전체 배경 | `#141313` | `dark:bg-dark-base` |
| Level 1 — Container | 카드, 패널, 사이드바 | `#201f1f` | `dark:bg-dark-surface` |
| Level 2 — Elevated | 팝오버, 모달, 드롭다운 | `#2b2a2a` | `dark:bg-dark-elevated` |
| Level 3 — Highest | 툴팁, 최상위 오버레이 | `#353434` | `dark:bg-dark-highest` |

#### 텍스트 및 아이콘

| 역할 | HEX | Tailwind 클래스 |
|------|-----|-----------------|
| 기본 텍스트 (on-surface) | `#e5e2e1` | `dark:text-dark-text` |
| 보조 텍스트 (on-surface-variant) | `#c4c7c7` | `dark:text-dark-text-muted` |
| 비활성/플레이스홀더 | `#8e9192` | `dark:text-dark-text-disabled` |

#### 테두리(Border)

| 역할 | HEX | Tailwind 클래스 |
|------|-----|-----------------|
| 기본 구분선 | `#444748` | `dark:border-dark-border` |
| 미세 구분선 (outline-variant) | `#444748` | `dark:divide-dark-border` |

#### 포인트 컬러 — Amber Gold

앰버 골드는 **화면 면적의 10% 이내**로 제한합니다. Primary 버튼 CTA, 활성 상태 강조, 데이터 하이라이트에만 사용합니다.

| 역할 | HEX | Tailwind 클래스 |
|------|-----|-----------------|
| 기본 포인트 | `#ffd795` | `dark:text-dark-accent` |
| 강조 배경 (버튼 등) | `#fbb400` | `dark:bg-dark-accent-strong` |
| 서브틀한 배지 배경 | `rgba(251,180,0,0.10)` | `dark:bg-dark-accent-muted` |

#### 에러 / 시맨틱 컬러

| 역할 | HEX | Tailwind 클래스 |
|------|-----|-----------------|
| 에러 텍스트 | `#ffb4ab` | `dark:text-dark-error` |
| 에러 컨테이너 | `#93000a` | `dark:bg-dark-error-container` |

---

### 12.2 Tailwind CSS v4 `@theme` 설정

`app/globals.css` 의 `@theme` 블록에 다크 모드 커스텀 토큰을 추가합니다.

```css
@theme {
  /* === 다크 모드 Surface === */
  --color-dark-base:            #141313;
  --color-dark-surface:         #201f1f;
  --color-dark-elevated:        #2b2a2a;
  --color-dark-highest:         #353434;

  /* === 다크 모드 텍스트 === */
  --color-dark-text:            #e5e2e1;
  --color-dark-text-muted:      #c4c7c7;
  --color-dark-text-disabled:   #8e9192;

  /* === 다크 모드 Border === */
  --color-dark-border:          #444748;

  /* === 다크 모드 포인트 (Amber Gold) === */
  --color-dark-accent:          #ffd795;
  --color-dark-accent-strong:   #fbb400;

  /* === 다크 모드 에러 === */
  --color-dark-error:           #ffb4ab;
  --color-dark-error-container: #93000a;
}
```

`tailwind.config.js` 에서 다크 모드를 `class` 전략으로 설정합니다.

```js
module.exports = {
  darkMode: 'class',
  // ...
}
```

---

### 12.3 컴포넌트별 다크 모드 명세

#### Input / SearchBar

라이트 모드의 `border-gray-300 bg-white` 를 다크 토큰으로 오버라이드합니다. 포커스 시 하단 보더만 앰버 골드로 강조하는 bottom-border 방식을 권장합니다.

```
기본(default):
  dark:bg-dark-surface dark:border-dark-border dark:text-dark-text
  dark:placeholder:text-dark-text-disabled

포커스(focus):
  dark:focus:ring-dark-accent dark:focus:border-dark-accent

완성된 클래스 조합 예시:
className="w-full border border-gray-300 rounded-xl bg-white px-4 py-2.5
           text-base font-normal text-gray-900 placeholder:text-gray-400
           shadow-sm transition-colors duration-150
           focus:outline-none focus:ring-2 focus:ring-primary-500
           dark:bg-dark-surface dark:border-dark-border dark:text-dark-text
           dark:placeholder:text-dark-text-disabled
           dark:focus:ring-dark-accent dark:focus:border-dark-accent"
```

#### Button

**Primary (다크 모드)** — 앰버 골드 채움 + 어두운 텍스트 (이미지 참조: "Deploy Now" 스타일)

```
기본:  "dark:bg-dark-accent-strong dark:text-gray-900 dark:shadow-none"
hover: "dark:hover:brightness-110"
active:"dark:active:brightness-95"
비활성:"dark:disabled:bg-dark-elevated dark:disabled:text-dark-text-disabled"
```

**Secondary (다크 모드)** — 투명 배경 + 흰색 테두리 + 흰색 텍스트 Outline 스타일 (이미지 참조: "Request Executive Briefing" 스타일)

```
기본:  "dark:bg-transparent dark:border-dark-text dark:text-dark-text dark:shadow-none"
hover: "dark:hover:bg-dark-surface dark:hover:border-dark-text-muted"
active:"dark:active:bg-dark-elevated"
```

**Ghost (다크 모드)**

```
기본: "dark:text-dark-text-muted"
hover: "dark:hover:bg-dark-surface dark:hover:text-dark-text"
active:"dark:active:bg-dark-elevated"
```

**Danger (다크 모드)**

```
기본: "dark:bg-dark-error-container dark:text-dark-error"
hover: "dark:hover:brightness-110"
```

#### Card

카드는 배경색으로만 계층을 표현합니다. 그림자를 사용하지 않고, Premium 카드는 좌측에 2px 앰버 골드 세로 액센트 바를 추가합니다.

```
기본 카드:
  dark:bg-dark-surface dark:border-dark-border
  dark:hover:bg-dark-elevated

Premium 카드 (좌측 액센트 바):
  dark:bg-dark-surface dark:border-dark-border
  dark:border-l-2 dark:border-l-dark-accent-strong
```

#### Modal

```
오버레이: "dark:bg-black/70"

모달 패널:
  dark:bg-dark-elevated dark:border dark:border-dark-border

모달 제목:
  dark:text-dark-text

닫기 버튼:
  dark:text-dark-text-muted dark:hover:bg-dark-highest dark:hover:text-dark-text
```

#### Tab Navigation

```
탭 컨테이너: "dark:border-dark-border dark:bg-dark-surface"

비활성 탭: "dark:text-dark-text-muted dark:hover:text-dark-text dark:hover:border-dark-border"

활성 탭: "dark:text-dark-accent dark:border-dark-accent"
```

#### Badge / Tag

| 용도 | 다크 모드 클래스 조합 |
|------|----------------------|
| LEADER 배지 | `dark:bg-dark-accent-muted dark:text-dark-accent` |
| MEMBER 배지 | `dark:bg-dark-surface dark:text-dark-text-muted` |
| WORK_PERFORMANCE | `dark:bg-dark-surface dark:border-dark-border dark:text-dark-text` |
| PENDING | `dark:bg-dark-elevated dark:text-dark-accent` |
| APPROVED | `dark:bg-dark-surface dark:text-green-400` |
| REJECTED | `dark:bg-dark-surface dark:text-dark-text-disabled` |

#### Divider

```
수평 구분선: "dark:border-dark-border"

날짜 헤더 구분선:
  라인: "dark:bg-dark-border"
  텍스트: "dark:text-dark-text-disabled"
```

#### Gantt Bar (프로젝트 일정)

간트차트 배경과 행은 서피스 계층을 사용합니다.

```
차트 영역 배경: "dark:bg-dark-base"
행 hover:      "dark:hover:bg-dark-surface"
주 구분선:     "dark:border-dark-border"
오늘 날짜 선:  "dark:bg-dark-accent-strong"
```

#### 일정바 / 프로젝트바 / 세부일정바 / 포스트잇 — 다크 모드 컬러 팔레트

다크 배경(`#141313`)에서 충분한 명도 대비를 확보하면서 과도한 채도를 피하기 위해 아래 5가지 색상을 UI 요소별로 사용합니다.

| 컬러명 | HEX | 느낌 및 용도 |
|--------|-----|-------------|
| **Royal Amber** | `#FFB800` | 핵심 강조·CTA — 가장 눈에 띄어야 하는 바나 포스트잇 |
| **Electric Indigo** | `#6366F1` | 세련된 기술적 강조 — 기본 일정바·프로젝트바 기준색 |
| **Deep Emerald** | `#10B981` | 신뢰·완료·성장 — 완료 상태 바, 긍정 지표 |
| **Crimson Red** | `#EF4444` | 긴급·지연·경고 — 지연 상태 바, 마감 임박 일정 |
| **Ice Silver** | `#E2E8F0` | 보조·중립 — 낮은 우선순위 포스트잇, 보조 아이콘 텍스트 |

---

##### 일정바 (Calendar Event Bar) — 다크 모드

| 상태 | 컬러명 | HEX | Tailwind 클래스 조합 |
|------|--------|-----|----------------------|
| 기본 일정 | Electric Indigo | `#6366F1` | `dark:bg-[#6366F1] dark:text-white` |
| 강조 / 핵심 마감 | Royal Amber | `#FFB800` | `dark:bg-[#FFB800] dark:text-gray-900` |
| 완료 일정 | Deep Emerald | `#10B981` | `dark:bg-[#10B981] dark:text-white` |
| 지연 / 긴급 일정 | Crimson Red | `#EF4444` | `dark:bg-[#EF4444] dark:text-white` |
| 보조 / 낮은 우선순위 | Ice Silver | `#E2E8F0` | `dark:bg-[#E2E8F0] dark:text-gray-800` |

> **텍스트 대비 원칙:** Royal Amber(`#FFB800`)·Ice Silver(`#E2E8F0`) 배경은 어두운 텍스트(`dark:text-gray-900` / `dark:text-gray-800`), 나머지 3가지 배경은 흰색(`dark:text-white`) 사용.

---

##### 프로젝트바 (Gantt Project Bar) — 다크 모드

| 상태 | 컬러명 | HEX | Tailwind 클래스 |
|------|--------|-----|-----------------|
| 진행 중 | Electric Indigo | `#6366F1` | `dark:bg-[#6366F1] dark:text-white` |
| 완료 | Deep Emerald | `#10B981` | `dark:bg-[#10B981] dark:text-white` |
| 지연 | Crimson Red | `#EF4444` | `dark:bg-[#EF4444] dark:text-white` |
| 핵심 마일스톤 | Royal Amber | `#FFB800` | `dark:bg-[#FFB800] dark:text-gray-900` |

---

##### 세부일정바 (Sub-schedule Gantt Bar) — 다크 모드

기존 `GanttBarColor` 타입(`indigo | blue | emerald | amber | rose`)과 1:1 대응합니다.

| GanttBarColor | 컬러명 | HEX | Tailwind 클래스 | 텍스트 |
|---------------|--------|-----|-----------------|--------|
| `indigo` | Electric Indigo | `#6366F1` | `dark:bg-[#6366F1]` | `dark:text-white` |
| `blue` | Electric Indigo | `#6366F1` | `dark:bg-[#6366F1]` | `dark:text-white` |
| `emerald` | Deep Emerald | `#10B981` | `dark:bg-[#10B981]` | `dark:text-white` |
| `amber` | Royal Amber | `#FFB800` | `dark:bg-[#FFB800]` | `dark:text-gray-900` |
| `rose` | Crimson Red | `#EF4444` | `dark:bg-[#EF4444]` | `dark:text-white` |

> `indigo`와 `blue`는 다크 모드에서 동일한 Electric Indigo(`#6366F1`)로 통일합니다. amber(`#FFB800`)는 밝은 배경이므로 텍스트를 `dark:text-gray-900`으로 지정해 대비를 확보합니다.

---

##### 포스트잇 (Post-it) — 다크 모드

라이트 모드의 선명한 노랑 계열 대신, 다크 배경과 자연스럽게 어우러지도록 **반투명 틴트 배경 + 컬러 테두리** 조합을 사용합니다.

| 포스트잇 색상 | 컬러명 | 배경 (15% 불투명도) | 테두리 | 텍스트 |
|--------------|--------|---------------------|--------|--------|
| 기본 (노랑) | Royal Amber | `dark:bg-[#FFB800]/15` | `dark:border-[#FFB800]/40` | `dark:text-dark-text` |
| 인디고 | Electric Indigo | `dark:bg-[#6366F1]/15` | `dark:border-[#6366F1]/40` | `dark:text-dark-text` |
| 초록 | Deep Emerald | `dark:bg-[#10B981]/15` | `dark:border-[#10B981]/40` | `dark:text-dark-text` |
| 빨강 | Crimson Red | `dark:bg-[#EF4444]/15` | `dark:border-[#EF4444]/40` | `dark:text-dark-text` |
| 회색 | Ice Silver | `dark:bg-[#E2E8F0]/10` | `dark:border-[#E2E8F0]/20` | `dark:text-dark-text-muted` |

> 완전 채움(solid) 배경은 다크 화면에서 지나치게 튀므로 반드시 투명도(`/15`)를 적용합니다. 테두리 투명도(`/40`)로 색상 힌트를 유지합니다.

---

### 12.4 컬러 사용 요약 (다크 모드)

| 상황 | 클래스 조합 |
|------|-------------|
| 페이지 배경 | `dark:bg-dark-base` |
| 카드 / 패널 배경 | `dark:bg-dark-surface` |
| 팝오버 / 모달 배경 | `dark:bg-dark-elevated` |
| 주요 제목 | `dark:text-dark-text` |
| 보조 설명 | `dark:text-dark-text-muted` |
| 비활성 / 플레이스홀더 | `dark:text-dark-text-disabled` |
| 구분선 | `dark:border-dark-border` |
| Primary 액션 | `dark:bg-dark-accent-strong dark:text-gray-900` |
| 포인트 텍스트 / 아이콘 | `dark:text-dark-accent` |
| 에러 텍스트 | `dark:text-dark-error` |
| 활성 탭 밑줄 | `dark:border-b-2 dark:border-dark-accent` |
| 오늘 날짜 | `dark:bg-dark-accent-strong dark:text-gray-900` |
| 기본 일정바 | `dark:bg-[#6366F1] dark:text-white` |
| 강조 일정바 / 핵심 마일스톤 | `dark:bg-[#FFB800] dark:text-gray-900` |
| 완료 일정바 / 프로젝트바 | `dark:bg-[#10B981] dark:text-white` |
| 지연 / 긴급 바 | `dark:bg-[#EF4444] dark:text-white` |
| 포스트잇 기본 (노랑) | `dark:bg-[#FFB800]/15 dark:border-[#FFB800]/40 dark:text-dark-text` |
| 포스트잇 보조 (회색) | `dark:bg-[#E2E8F0]/10 dark:border-[#E2E8F0]/20 dark:text-dark-text-muted` |

---

### 12.5 React 다크 모드 토글 패턴

```tsx
// 다크 모드 토글 훅 예시
function useDarkMode() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

// 토글 버튼
<button
  onClick={toggle}
  aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100
             dark:text-dark-text-muted dark:hover:bg-dark-elevated
             transition-colors duration-150"
>
  {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

---

## 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| PRD | `docs/2-prd.md` | 기술 스택, 플랫폼, 기능 요구사항 |
| 와이어프레임 | `docs/9-wireframes.md` | 화면 구성 및 컴포넌트 목록 |
| 도메인 정의서 | `docs/1-domain-definition.md` | 핵심 엔티티, 비즈니스 규칙 |
| 다크 모드 참조 디자인 | `refs/DESIGN.md`, `refs/screen.png` | Aethelred Authority 디자인 시스템 |
