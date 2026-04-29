# TEAM WORKS 도메인 정의서

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-07 | 추적성·검증성 보강, TeamInvitation 추가, 수락 조건 추가 |
| 1.2 | 2026-04-08 | 팀 가입 신청(TeamJoinRequest) 방식으로 팀원 합류 흐름 전면 변경 — TeamInvitation 제거, TeamJoinRequest 추가, 나의 할 일(My Tasks) 개념 추가, 팀 공개 목록 조회 추가 |
| 1.3 | 2026-04-08 | 4.2 Team 엔티티에 팀장 생성 시점(팀 생성 시 자동 LEADER) 명시, UC-02 연관 규칙 BR-01 추가 |
| 1.4 | 2026-04-18 | 앱명 Team CalTalk → TEAM WORKS 반영. ChatMessage.type SCHEDULE_REQUEST → WORK_PERFORMANCE 변경 |
| 1.5 | 2026-04-18 | Team에 description/isPublic 추가, BR-02/BR-04 실제 구현 반영, 앱명 통일 |
| 1.6 | 2026-04-20 | Postit, WorkPerformancePermission, Project, ProjectSchedule, SubSchedule, Notice 엔티티 추가. 관련 역할/권한, 비즈니스 규칙, 유스케이스, CRUD 매핑 갱신 |
| 1.7 | 2026-04-28 | 백엔드 구현 일치화: 팀 정보 수정/삭제, 팀원 강제 탈퇴, 내 프로필 수정 도메인화. BR-11·BR-12 추가, UC-14·UC-15·UC-16 추가, 역할/권한 표 및 CRUD 매핑 갱신 |

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | TEAM WORKS |
| 목적 | 팀 단위 캘린더 기반 일정관리 + 채팅 통합 애플리케이션 |
| 핵심 가치 | 일정과 대화의 맥락을 한 곳에서 관리 |

### 1-1. 핵심 기능

#### I. 팀 관리 기능 — "우리 팀, 내가 직접 만들고 운영해요"
프로젝트 하나 시작할 때마다 IT팀에 "채널 만들어 주세요" 요청하거나, 단톡방 또 파서 사람 초대하던 경험 있으시죠. 팀웍스는 내가 직접 팀을 만들고, 팀을 만든 사람이 자동으로 팀장이 돼요.

팀을 공개로 설정해두면 다른 사람들이 "이 팀 재밌어 보이는데?" 하고 직접 가입 신청을 해옵니다. 팀장은 신청 목록 보면서 받을 사람만 골라서 승인하면 끝. 여러 팀을 이끌고 있어도 걱정 없어요. '나의 할 일' 화면에 가입 신청이 전부 모여 있어서 한 번에 처리할 수 있거든요.

#### II. 일정 관리 기능 — "팀 일정, 이제 헷갈릴 일 없어요"
**팀 캘린더**: "다음 주 수요일 회의 몇 시였지?" 단톡방 스크롤 끝까지 내려본 적 있으시죠. 팀 캘린더에 일정을 딱 올려두면 월·주·일 단위로 보고 싶은 대로 볼 수 있어요. 팀원 누구나 일정을 추가할 수 있고, 내가 올린 일정만 내가 수정·삭제할 수 있으니 누가 마음대로 지워버릴 걱정도 없습니다. 물론 우리 팀 일정은 우리 팀에만 보여요.

**포스트잇**: "내일 거래처 미팅 전에 이거 꼭 챙기기!" 같은 메모, 포스트잇처럼 날짜에 붙여둘 수 있어요. 색깔도 골라서 중요한 건 빨갛게, 참고사항은 파랗게 구분해두면 딱 봐도 뭐가 급한지 보입니다. 내 메모는 언제든 수정하거나 떼버릴 수 있어요.

#### III. 프로젝트 관리 기능 — "엑셀 간트차트, 이제 그만 수정해도 돼요"
`프로젝트_일정_v7_최종_진짜최종.xlsx` 이런 파일 만들어 본 적 있으시죠. 팀웍스는 프로젝트를 3단계로 정리해서 누가 봐도 한눈에 들어오게 만들어줘요. 진행률은 %로 바로 보이고, 일정이 밀린 업무는 색이 바뀌어서 팀장도 팀원도 "이거 빨리 처리해야겠다" 바로 알아챌 수 있습니다.

- **프로젝트**: 업무의 큰 틀이에요. "2분기 신제품 런칭" 같은 단위로 만들고, 그 안에 '기획 → 개발 → 출시' 같은 단계를 직접 정할 수 있어요.
- **프로젝트 일정**: 프로젝트 안의 구체적인 업무 덩어리예요. 각 업무마다 담당자, 기간, 진행도를 정해두면 "누가 뭘 언제까지" 한눈에 보입니다.
- **세부 일정**: 업무를 더 작게 쪼개놓은 할 일이에요. 큰 업무를 작은 단위로 나누면 관리도 쉽고, "오늘 이거 하나만 끝내자" 같은 목표도 세우기 좋아요.

팀원 누구나 만들 수 있지만, 내가 만든 건 나만 고칠 수 있어요.

#### IV. 팀 채팅 관리 기능 — "업무 대화와 사담, 이제 섞이지 않아요"
카톡에 업무 얘기 섞이다 보면 "아까 그 파일 어디 있더라?" 찾기 힘들잖아요. 팀웍스 채팅은 목적에 맞게 세 가지로 나뉘어 있어요. 메시지는 날짜별로 자동 정리되니까 "지난주 화요일에 뭐라고 했더라?" 바로 찾을 수 있습니다.

- **일반 대화**: 팀원끼리 편하게 나누는 일상 대화예요. 점심 뭐 먹을지, 회의 후기, 업무 잡담 다 여기서. 팀원 전부 볼 수 있어요.
- **업무보고**: 팀장에게 올리는 보고 메시지예요. 내 평가나 민감한 내용이 담길 수 있으니까, 기본은 팀장만 볼 수 있어요. 팀장이 "이건 다 같이 봐도 돼요"라고 허락한 사람만 추가로 볼 수 있습니다. 동료가 내 보고를 맘대로 훔쳐볼 수 없는 안전한 구조예요.
- **공지사항**: "내일 오전 10시 전체 회의!" 같은 중요한 알림, 채팅 맨 위에 딱 고정돼요. 팀원 누구나 올릴 수 있고, 지우는 건 올린 본인이나 팀장만 가능합니다.

### 1-2. 핵심 장점

#### "여러 앱 켜놓고 왔다갔다 하기, 이제 끝"
슬랙에서 일정 얘기하고, 구글캘린더에 옮기고, 노션에 정리하고, 엑셀로 간트차트 그리고... 이거 하루에 몇 번 해보셨어요? 팀웍스 하나만 켜두면 일정, 프로젝트, 채팅, 공지까지 다 되니까 창 여러 개 띄워놓고 헤맬 일이 없어요.

#### "팀 만들기부터 업무 완주까지, 한 앱에서 다 됩니다"
새 팀 꾸리기, 팀원 모으기, 일정 짜기, 업무 진행, 보고까지. 프로젝트 시작부터 끝까지 필요한 기능이 전부 들어 있어요. 중간에 "이건 다른 앱에서 해야 하네" 하고 끊어지는 순간이 없습니다.

#### "복잡한 업무도 그림 하나로 딱"
3단계로 쪼개진 프로젝트 뷰 덕분에 큰 그림과 세부 작업을 동시에 볼 수 있어요. 진행률도 눈에 보이고, 늦어지는 건 색깔로 표시되니까 "뭐가 급한지" 바로 감이 옵니다. 엑셀로 밤새 간트차트 그리던 시절이여 안녕.

#### "팀장님도, 팀원도 편해져요"
팀장은 업무보고를 누가 볼 수 있는지 직접 정할 수 있어서 민감한 정보가 엉뚱한 사람한테 새어나갈 일이 없어요. 여러 팀을 이끄는 팀장도 '나의 할 일'에서 가입 신청, 업무 현황을 한 화면에서 처리할 수 있으니까 이리저리 옮겨다닐 필요가 없습니다.

#### "지난주에 뭐 했더라? 1초 만에 확인"
그날 있었던 회의, 남겨놓은 메모, 주고받은 대화가 날짜별로 차곡차곡 정리돼요. 며칠 전 결정사항이 뭐였는지 확인하거나, 지난주 업무 회고할 때 단톡방 스크롤 무한히 내리지 않아도 됩니다.

---

## 2. 문제 정의

| # | 문제 | 해결 유스케이스 |
|---|------|----------------|
| P-01 | 팀 일정이 개인 캘린더·메신저·엑셀에 분산 → 충돌·누락 빈발 | UC-03, UC-04 |
| P-02 | 일정 관련 대화가 일정과 분리 → 맥락 추적 어려움 | UC-05, UC-06, UC-07 |
| P-03 | 팀장의 팀원 일정 가시성·통제력 부족 | UC-03, UC-04 |

---

## 3. 핵심 도메인 (Bounded Context)

```
┌─────────────────────────────────────────────────────────────┐
│                        TEAM WORKS                           │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐    ┌──────────────┐    │
│  │    Auth     │   │   Calendar   │    │     Chat     │    │
│  │  (인증)     │──▶│   (일정)     │◀──▶│   (채팅)     │    │
│  └─────────────┘   └──────┬───────┘    └──────┬───────┘    │
│         │                 │ [ScheduleCreated]  │            │
│         │                 └────────────────────┘            │
│         └────────────────────────────────────────────────▶  │
│                        Team (팀 관리)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 핵심 엔티티

### 4.1 User (사용자)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| email | String | unique, not null, 이메일 형식 |
| name | String | not null, 최대 50자 |
| password | String | not null, 암호화 저장 |

### 4.2 Team (팀)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| name | String | not null, 최대 100자 |
| description | String | nullable, 최대 500자 |
| isPublic | Boolean | not null, default false — 공개 팀 목록 노출 여부 |
| leaderId | UUID | FK → User.id, not null |

> **팀장 생성 시점:** 팀이 생성될 때 요청자가 자동으로 해당 팀의 `leaderId`로 설정되고, 동시에 `TeamMember(role: LEADER)` 레코드가 원자적으로 생성됩니다. 즉, **팀 생성 = LEADER 생성**입니다.
>
> **규칙:** `leaderId`가 권위(source of truth). 팀장 변경 시 `leaderId` 업데이트 + 기존 LEADER의 TeamMember.role → MEMBER로 동시 전환.

### 4.3 TeamMember (팀 구성원)
| 속성 | 타입 | 제약 |
|------|------|------|
| teamId | UUID | FK → Team.id, not null |
| userId | UUID | FK → User.id, not null |
| role | Enum | `LEADER` \| `MEMBER`, not null |

### 4.4 TeamJoinRequest (팀 가입 신청)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| requesterId | UUID | FK → User.id, not null — 가입을 신청한 사용자 |
| status | Enum | `PENDING` \| `APPROVED` \| `REJECTED`, default: PENDING |
| requestedAt | DateTime | not null — 신청 일시 (UTC) |
| respondedAt | DateTime | nullable — 팀장이 승인/거절한 일시 (UTC) |

> **규칙:** 이미 팀 구성원이거나 동일 팀에 PENDING 상태의 신청이 존재하는 경우 중복 신청 불가. APPROVED 처리 시 TeamMember(MEMBER)가 원자적으로 생성됨.

### 4.5 Schedule (팀 일정)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| title | String | not null, 최대 200자 |
| description | String | nullable |
| startAt | DateTime | not null |
| endAt | DateTime | not null, endAt > startAt |
| createdBy | UUID | FK → User.id, not null |

### 4.6 ChatMessage (채팅 메시지)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| type | Enum | `NORMAL` \| `WORK_PERFORMANCE`, default: NORMAL |
| senderId | UUID | FK → User.id, not null |
| content | String | not null, 최대 2000자 |
| sentAt | DateTime | not null |

> **날짜별 조회:** `sentAt` 기준 서버 시간(UTC+9 KST)의 날짜로 그룹핑.

### 4.7 Postit (포스트잇)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| createdBy | UUID | FK → User.id, not null |
| date | Date | not null — 해당 날짜 |
| color | String | not null, default 'amber' — indigo/blue/emerald/amber/rose |
| content | String | not null, default '' |

### 4.8 WorkPerformancePermission (업무보고 조회 권한)
| 속성 | 타입 | 제약 |
|------|------|------|
| teamId | UUID | FK → Team.id, not null, PK |
| userId | UUID | FK → User.id, not null, PK |
| grantedAt | DateTime | not null |

> **복합 PK:** (teamId, userId). 빈 배열이면 권한 제한 없음(전체 구성원 조회 가능).

### 4.9 Project (프로젝트)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| createdBy | UUID | FK → User.id, not null |
| name | String | not null, 최대 200자 |
| description | String | nullable |
| startDate | Date | not null |
| endDate | Date | not null, endDate >= startDate |
| progress | Integer | not null, 0~100, default 0 |
| manager | String | not null, default '' |
| phases | JSONB | not null, default [] — [{id, name, order}] |

### 4.10 ProjectSchedule (프로젝트 일정)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| projectId | UUID | FK → Project.id, not null |
| teamId | UUID | FK → Team.id, not null |
| createdBy | UUID | FK → User.id, not null |
| title | String | not null, 최대 200자 |
| description | String | nullable |
| color | String | not null, default 'indigo' |
| startDate | Date | not null |
| endDate | Date | not null, endDate >= startDate |
| leader | String | not null, default '' |
| progress | Integer | not null, 0~100, default 0 |
| isDelayed | Boolean | not null, default false |
| phaseId | UUID | nullable — projects.phases[].id 참조 |

### 4.11 SubSchedule (세부 일정)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| projectScheduleId | UUID | FK → ProjectSchedule.id, not null |
| projectId | UUID | FK → Project.id, not null |
| teamId | UUID | FK → Team.id, not null |
| createdBy | UUID | FK → User.id, not null |
| title | String | not null, 최대 200자 |
| description | String | nullable |
| color | String | not null, default 'indigo' |
| startDate | Date | not null |
| endDate | Date | not null, endDate >= startDate |
| leader | String | not null, default '' |
| progress | Integer | not null, 0~100, default 0 |
| isDelayed | Boolean | not null, default false |

### 4.12 Notice (공지사항)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| senderId | UUID | FK → User.id, not null |
| content | String | not null, 최대 2000자 |
| createdAt | DateTime | not null |

> **규칙:** 작성자 또는 팀장(LEADER)만 삭제 가능.

---

## 5. 역할 및 권한

| 기능 | 팀장 (LEADER) | 팀원 (MEMBER) | 관련 규칙 |
|------|:---:|:---:|-----------|
| 내 프로필(이름) 수정 | 본인만 | 본인만 | BR-01 |
| 팀 공개 목록 조회 | O | O | BR-07 |
| 팀 가입 신청 | O (타 팀에 대해) | O | BR-07 |
| 가입 신청 승인/거절 | O (자기 팀에 대해) | X | BR-03 |
| 나의 할 일 목록 조회 | O | X | BR-03 |
| 팀 정보 수정 | O | X | BR-11 |
| 팀 삭제 | O | X | BR-11 |
| 팀원 강제 탈퇴 | O (본인 제외) | X | BR-12 |
| 팀 일정 조회 | O | O | BR-01 |
| 팀 일정 생성 | O | O | BR-02 |
| 팀 일정 수정/삭제 | 생성자 본인만 | 생성자 본인만 | BR-02 |
| 채팅 송수신 | O | O | BR-01 |
| 업무보고 전송 | O | O | BR-04 |
| 포스트잇 생성/수정/삭제 | 생성자 본인만 | 생성자 본인만 | BR-08 |
| 프로젝트 생성 | O | O | BR-09 |
| 프로젝트 수정/삭제 | 생성자 본인만 | 생성자 본인만 | BR-09 |
| 프로젝트 일정 생성/수정/삭제 | 생성자 본인만 | 생성자 본인만 | BR-09 |
| 세부 일정 생성/수정/삭제 | 생성자 본인만 | 생성자 본인만 | BR-09 |
| 공지사항 작성 | O | O | BR-10 |
| 공지사항 삭제 | O (팀장 가능) | 작성자 본인만 | BR-10 |
| 업무보고 조회 권한 관리 | O | X | BR-04 |

---

## 6. 핵심 비즈니스 규칙

| ID | 규칙 |
|----|------|
| BR-01 | 모든 기능은 로그인한 사용자만 이용 가능 |
| BR-02 | 팀 일정 생성은 팀 구성원(LEADER/MEMBER) 모두 가능. 수정·삭제는 일정 생성자 본인만 가능 |
| BR-03 | 팀 가입 신청의 승인·거절은 해당 팀의 팀장(LEADER)만 수행 가능. 승인 시 신청자는 TeamMember(MEMBER)로 등록 |
| BR-04 | 팀원이 업무보고를 보낼 경우 WORK_PERFORMANCE 타입 채팅으로 전송. 팀장(LEADER)은 항상 열람 가능하며, 팀원(MEMBER)은 팀장이 권한을 부여한 경우에만 열람 가능 |
| BR-05 | 채팅 메시지는 sentAt 기준 날짜(KST)로 그룹핑하여 날짜별 조회 |
| BR-06 | 일정과 채팅은 팀 내부에서만 공유되며 타 팀에 노출되지 않음 |
| BR-07 | 로그인한 모든 사용자는 공개 팀 목록을 조회하고 원하는 팀에 가입 신청을 할 수 있음. 단, 이미 해당 팀의 구성원이거나 PENDING 상태의 신청이 존재하면 중복 신청 불가 |
| BR-08 | 포스트잇 생성은 팀 구성원(LEADER/MEMBER) 모두 가능. 수정·삭제는 생성자 본인만 가능 |
| BR-09 | 프로젝트·프로젝트 일정·세부 일정 생성은 팀 구성원(LEADER/MEMBER) 모두 가능. 수정·삭제는 생성자 본인만 가능 |
| BR-10 | 공지사항 작성은 팀 구성원(LEADER/MEMBER) 모두 가능. 삭제는 작성자 본인 또는 팀장(LEADER)만 가능 |
| BR-11 | 팀 정보 수정·삭제는 팀장(LEADER)만 가능. 팀 삭제 시 종속 데이터(TeamMember, TeamJoinRequest, Schedule, ChatMessage, Notice, Postit, Project, ProjectSchedule, SubSchedule, WorkPerformancePermission)는 CASCADE로 함께 정리 |
| BR-12 | 팀원 강제 탈퇴는 팀장(LEADER)만 가능. 팀장 본인은 강제 탈퇴 대상이 될 수 없음(요청 시 400 반환) |

---

## 7. 유스케이스

| ID | 유스케이스 | 주체 | 연관 규칙 |
|----|-----------|------|-----------|
| UC-01 | 회원가입 / 로그인 | 비인증 사용자 | - |
| UC-02 | 팀 생성 (생성자는 자동으로 LEADER 등록) | 로그인 사용자 | BR-01 |
| UC-02B | 팀 공개 목록 조회 및 가입 신청 | 로그인 사용자 | BR-07 |
| UC-02C | 가입 신청 승인/거절 (나의 할 일) | 팀장 | BR-03 |
| UC-03 | 월·주·일 단위 팀 일정 조회 | 팀장, 팀원 | BR-01, BR-06 |
| UC-04 | 팀 일정 추가·수정·삭제 | 팀장 | BR-01, BR-02 |
| UC-05 | 날짜별 채팅 메시지 조회 | 팀장, 팀원 | BR-01, BR-05, BR-06 |
| UC-06 | 채팅으로 일정 변경 요청 | 팀원 | BR-01, BR-04 |
| UC-07 | 캘린더·채팅 동시 화면 조회 | 팀장, 팀원 | BR-01, BR-06 |
| UC-08 | 포스트잇 작성·수정·삭제 | 팀장, 팀원 | BR-01, BR-08 |
| UC-09 | 프로젝트(간트차트) 생성·수정·삭제 | 팀장, 팀원 | BR-01, BR-09 |
| UC-10 | 프로젝트 일정 생성·수정·삭제 | 팀장, 팀원 | BR-01, BR-09 |
| UC-11 | 세부 일정 생성·수정·삭제 | 팀장, 팀원 | BR-01, BR-09 |
| UC-12 | 공지사항 작성·삭제 | 팀장, 팀원 | BR-01, BR-10 |
| UC-13 | 업무보고 조회 권한 설정 | 팀장 | BR-01, BR-04 |
| UC-14 | 팀 정보 수정·삭제 | 팀장 | BR-01, BR-11 |
| UC-15 | 팀원 강제 탈퇴 | 팀장 | BR-01, BR-12 |
| UC-16 | 내 프로필(이름) 수정 | 로그인 사용자 | BR-01 |

### 수락 조건 (Acceptance Criteria)

**UC-01 회원가입 / 로그인**
- Given: 미가입 사용자가 유효한 이메일·비밀번호 입력
- When: 회원가입 요청
- Then: 계정 생성, 로그인 토큰 발급
- Given: 가입된 사용자가 올바른 자격증명 입력
- When: 로그인 요청
- Then: 인증 토큰 발급, 앱 진입 가능

**UC-02 팀 생성**
- Given: 로그인한 사용자가 유효한 팀 이름(1~100자) 입력
- When: 팀 생성 요청
- Then: 201 Created, Team 레코드 생성, 요청자가 `leaderId`로 설정됨, TeamMember(role: LEADER) 원자적 등록
- Given: 팀 이름이 빈 값이거나 100자 초과
- When: 팀 생성 요청
- Then: 400 Bad Request

**UC-02B 팀 공개 목록 조회 및 가입 신청**
- Given: 로그인한 사용자
- When: 공개 팀 목록 조회
- Then: 전체 팀 목록(팀명, 구성원 수 포함) 반환
- Given: 로그인한 사용자, 아직 구성원이 아니고 PENDING 신청도 없는 팀
- When: 가입 신청 요청
- Then: 201 Created, TeamJoinRequest(PENDING) 생성
- Given: 이미 해당 팀의 구성원이거나 PENDING 신청이 존재하는 사용자
- When: 가입 신청 요청
- Then: 409 Conflict

**UC-02C 가입 신청 승인/거절**
- Given: LEADER 권한의 인증된 사용자
- When: PENDING 상태의 가입 신청에 대해 승인(APPROVE) 요청
- Then: TeamJoinRequest.status → APPROVED, TeamMember(MEMBER) 원자적 등록
- Given: LEADER 권한의 인증된 사용자
- When: PENDING 상태의 가입 신청에 대해 거절(REJECT) 요청
- Then: TeamJoinRequest.status → REJECTED, 팀 합류 미발생
- Given: MEMBER 권한의 사용자
- When: 승인/거절 시도
- Then: 403 Forbidden

**UC-03 월·주·일 단위 팀 일정 조회**
- Given: 팀 구성원(LEADER/MEMBER)이 view(month/week/day)와 date 파라미터를 전달
- When: 일정 조회 요청
- Then: 해당 기간 내 팀 일정 목록 반환 (startAt 오름차순)
- Given: 팀 구성원이 아닌 사용자
- When: 일정 조회 요청
- Then: 403 Forbidden

**UC-04 팀 일정 추가·수정·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 유효한 title, startAt < endAt 입력
- When: 일정 생성 요청
- Then: 201 Created, 팀 전체에 일정 노출
- Given: 일정의 생성자 본인이 수정 요청
- When: PATCH 요청
- Then: 200 OK, 변경된 필드만 수정
- Given: 일정 생성자가 아닌 사용자
- When: 수정·삭제 시도
- Then: 403 Forbidden
- Given: endAt <= startAt
- When: 일정 생성·수정 요청
- Then: 400 Bad Request

**UC-05 날짜별 채팅 메시지 조회**
- Given: 팀 구성원이 KST 기준 날짜(YYYY-MM-DD)를 date 파라미터로 전달
- When: 메시지 조회 요청
- Then: 해당 날짜(KST 00:00~23:59) 내 메시지 목록을 sentAt 오름차순으로 반환
- Given: 팀 구성원이 아닌 사용자
- When: 메시지 조회 요청
- Then: 403 Forbidden

**UC-06 채팅으로 업무보고 전송**
- Given: 팀 구성원(LEADER/MEMBER)이 content(최대 2000자) 입력
- When: type=WORK_PERFORMANCE 메시지 전송
- Then: 채팅 이력에 저장, 팀장에게 표시
- Given: content가 2000자 초과
- When: 메시지 전송
- Then: 400 Bad Request

**UC-07 캘린더·채팅 동시 화면 조회**
- Given: 팀 구성원이 메인 화면 접근
- When: 캘린더와 채팅 패널 동시 로드
- Then: 팀 일정 목록과 당일 채팅 메시지가 함께 표시됨

**UC-08 포스트잇 작성·수정·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 날짜와 내용 입력
- When: 포스트잇 생성 요청
- Then: 201 Created, 해당 날짜에 포스트잇 등록
- Given: 포스트잇 생성자 본인
- When: 수정·삭제 요청
- Then: 200 OK, 내용 수정 또는 삭제 완료
- Given: 생성자가 아닌 사용자
- When: 수정·삭제 시도
- Then: 403 Forbidden

**UC-09 프로젝트(간트차트) 생성·수정·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 유효한 name, startDate <= endDate 입력
- When: 프로젝트 생성 요청
- Then: 201 Created, 팀에 프로젝트 등록 (progress 기본 0, phases 기본 [])
- Given: 프로젝트 생성자 본인
- When: 수정·삭제 요청
- Then: 200 OK, 변경 반영 또는 삭제 완료 (하위 project_schedules·sub_schedules CASCADE 삭제)
- Given: 생성자가 아닌 사용자
- When: 수정·삭제 시도
- Then: 403 Forbidden
- Given: endDate < startDate
- When: 생성·수정 요청
- Then: 400 Bad Request

**UC-10 프로젝트 일정 생성·수정·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 유효한 title, startDate <= endDate, 존재하는 projectId 입력
- When: 프로젝트 일정 생성 요청
- Then: 201 Created, 프로젝트 간트차트에 행으로 표시
- Given: 프로젝트 일정 생성자 본인
- When: 수정·삭제 요청
- Then: 200 OK, 변경 반영 또는 삭제 완료 (하위 sub_schedules CASCADE 삭제)
- Given: 생성자가 아닌 사용자
- When: 수정·삭제 시도
- Then: 403 Forbidden

**UC-11 세부 일정 생성·수정·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 유효한 title, startDate <= endDate, 존재하는 projectScheduleId 입력
- When: 세부 일정 생성 요청
- Then: 201 Created, 상위 프로젝트 일정 하위에 등록
- Given: 세부 일정 생성자 본인
- When: 수정·삭제 요청
- Then: 200 OK, 변경 반영 또는 삭제 완료
- Given: 생성자가 아닌 사용자
- When: 수정·삭제 시도
- Then: 403 Forbidden

**UC-12 공지사항 작성·삭제**
- Given: 팀 구성원(LEADER/MEMBER)이 content(최대 2000자) 입력
- When: 공지사항 작성 요청
- Then: 201 Created, 팀 채팅 상단에 공지 고정
- Given: 공지사항 작성자 본인 또는 팀장(LEADER)
- When: 삭제 요청
- Then: 200 OK, 공지사항 삭제
- Given: 작성자도 팀장도 아닌 사용자
- When: 삭제 시도
- Then: 403 Forbidden
- Given: content가 2000자 초과
- When: 작성 요청
- Then: 400 Bad Request

**UC-13 업무보고 조회 권한 설정**
- Given: 팀장(LEADER)이 허용할 userIds 배열 전달
- When: PATCH /work-permissions 요청
- Then: 기존 권한 전부 교체, 전달된 userIds 목록으로 권한 설정
- Given: 빈 배열([]) 전달
- When: PATCH /work-permissions 요청
- Then: 전체 권한 해제 (모든 구성원 WORK_PERFORMANCE 조회 가능)
- Given: MEMBER 권한의 사용자
- When: 권한 설정 시도
- Then: 403 Forbidden

**UC-14 팀 정보 수정·삭제**
- Given: 팀장(LEADER)이 name(최대 100자)·description·isPublic 중 1개 이상 전달
- When: 팀 정보 수정 요청
- Then: 200 OK, 전달된 필드만 갱신
- Given: 팀장(LEADER)이 자신의 팀 삭제 요청
- When: 팀 삭제 요청
- Then: 200 OK, Team 레코드 및 종속 데이터 CASCADE 삭제
- Given: MEMBER 권한의 사용자
- When: 팀 정보 수정 또는 삭제 시도
- Then: 403 Forbidden

**UC-15 팀원 강제 탈퇴**
- Given: 팀장(LEADER)이 자신의 팀에 속한 MEMBER의 userId 지정
- When: DELETE /teams/:teamId/members/:userId 요청
- Then: 200 OK, 해당 TeamMember 레코드 제거
- Given: 팀장(LEADER)이 자기 자신(leaderId)의 userId 지정
- When: 강제 탈퇴 요청
- Then: 400 Bad Request — "팀장은 탈퇴시킬 수 없습니다."
- Given: MEMBER 권한의 사용자
- When: 강제 탈퇴 시도
- Then: 403 Forbidden
- Given: 해당 팀의 멤버가 아닌 userId 지정
- When: 강제 탈퇴 요청
- Then: 404 Not Found

**UC-16 내 프로필(이름) 수정**
- Given: 로그인 사용자가 trim 후 1~50자 범위의 name 전달
- When: PATCH /api/me 요청
- Then: 200 OK, User.name 갱신
- Given: name이 빈 문자열·공백뿐이거나 50자 초과
- When: 프로필 수정 요청
- Then: 400 Bad Request

---

## 8. 엔티티 CRUD 매핑

| 엔티티 | 생성 | 조회 | 수정 | 삭제 |
|--------|------|------|------|------|
| User | UC-01 | UC-01 | UC-16 | - |
| Team | UC-02 | UC-02B, UC-03, UC-07 | UC-14 | UC-14 |
| TeamMember | UC-02, UC-02C | UC-03 | - | UC-15 |
| TeamJoinRequest | UC-02B | UC-02C | UC-02C | - |
| Schedule | UC-04 | UC-03, UC-07 | UC-04 | UC-04 |
| ChatMessage | UC-05, UC-06 | UC-05, UC-07 | - | - |
| Postit | UC-08 | UC-08 | UC-08 | UC-08 |
| WorkPerformancePermission | UC-13 | UC-13 | UC-13 | - |
| Project | UC-09 | UC-09 | UC-09 | UC-09 |
| ProjectSchedule | UC-10 | UC-10 | UC-10 | UC-10 |
| SubSchedule | UC-11 | UC-11 | UC-11 | UC-11 |
| Notice | UC-12 | UC-12 | - | UC-12 |

---

## 9. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 채팅 메시지 응답 시간 | 500ms 이하 |
| 동시 접속 팀원 | 팀당 최소 50명 지원 |
| 인증 토큰 방식 | JWT (Access + Refresh Token) |
| 비밀번호 저장 | bcrypt 해싱 필수 |
| 타임존 | 서버 기준 KST (UTC+9) |

---

## 10. 관련 문서

| 문서 | 경로 |
|------|------|
| ERD | docs/6-erd.md |
| API 명세 | docs/7-api-spec.md |
| 사용자 시나리오 | docs/3-user-scenarios.md |
