# Team CalTalk 도메인 정의서

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-07 | 최초 작성 |
| 1.1 | 2026-04-07 | 추적성·검증성 보강, TeamInvitation 추가, 수락 조건 추가 |

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | Team CalTalk |
| 목적 | 팀 단위 캘린더 기반 일정관리 + 채팅 통합 애플리케이션 |
| 핵심 가치 | 일정과 대화의 맥락을 한 곳에서 관리 |

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
│                        Team CalTalk                         │
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
| leaderId | UUID | FK → User.id, not null |

> **규칙:** `leaderId`가 권위(source of truth). 팀장 변경 시 `leaderId` 업데이트 + 기존 LEADER의 TeamMember.role → MEMBER로 동시 전환.

### 4.3 TeamMember (팀 구성원)
| 속성 | 타입 | 제약 |
|------|------|------|
| teamId | UUID | FK → Team.id, not null |
| userId | UUID | FK → User.id, not null |
| role | Enum | `LEADER` \| `MEMBER`, not null |

### 4.4 TeamInvitation (팀 초대)
| 속성 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK, not null |
| teamId | UUID | FK → Team.id, not null |
| inviteeEmail | String | not null, 이메일 형식 |
| status | Enum | `PENDING` \| `ACCEPTED` \| `REJECTED`, default: PENDING |
| invitedAt | DateTime | not null |
| respondedAt | DateTime | nullable |

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
| type | Enum | `NORMAL` \| `SCHEDULE_REQUEST`, default: NORMAL |
| senderId | UUID | FK → User.id, not null |
| content | String | not null, 최대 2000자 |
| sentAt | DateTime | not null |

> **날짜별 조회:** `sentAt` 기준 서버 시간(UTC+9 KST)의 날짜로 그룹핑.

---

## 5. 역할 및 권한

| 기능 | 팀장 (LEADER) | 팀원 (MEMBER) | 관련 규칙 |
|------|:---:|:---:|-----------|
| 팀 일정 조회 | O | O | BR-01 |
| 팀 일정 생성 | O | X | BR-02 |
| 팀 일정 수정/삭제 | O | X | BR-02 |
| 팀원 초대 | O | X | BR-03 |
| 채팅 송수신 | O | O | BR-01 |
| 일정 변경 채팅 요청 | O | O | BR-04 |

---

## 6. 핵심 비즈니스 규칙

| ID | 규칙 |
|----|------|
| BR-01 | 모든 기능은 로그인한 사용자만 이용 가능 |
| BR-02 | 팀 일정의 생성·수정·삭제는 팀장(LEADER)만 수행 가능 |
| BR-03 | 팀원 초대는 팀장만 가능하며, 피초대자가 수락해야 팀에 합류 |
| BR-04 | 팀원이 일정 변경을 원할 경우 SCHEDULE_REQUEST 타입 채팅으로 팀장에게 요청 |
| BR-05 | 채팅 메시지는 sentAt 기준 날짜(KST)로 그룹핑하여 날짜별 조회 |
| BR-06 | 일정과 채팅은 팀 내부에서만 공유되며 타 팀에 노출되지 않음 |

---

## 7. 유스케이스

| ID | 유스케이스 | 주체 | 연관 규칙 |
|----|-----------|------|-----------|
| UC-01 | 회원가입 / 로그인 | 비인증 사용자 | - |
| UC-02 | 팀 생성 및 팀원 초대 | 팀장 | BR-03 |
| UC-03 | 월·주·일 단위 팀 일정 조회 | 팀장, 팀원 | BR-01, BR-06 |
| UC-04 | 팀 일정 추가·수정·삭제 | 팀장 | BR-01, BR-02 |
| UC-05 | 날짜별 채팅 메시지 조회 | 팀장, 팀원 | BR-01, BR-05, BR-06 |
| UC-06 | 채팅으로 일정 변경 요청 | 팀원 | BR-01, BR-04 |
| UC-07 | 캘린더·채팅 동시 화면 조회 | 팀장, 팀원 | BR-01, BR-06 |

### 수락 조건 (Acceptance Criteria)

**UC-01 회원가입 / 로그인**
- Given: 미가입 사용자가 유효한 이메일·비밀번호 입력
- When: 회원가입 요청
- Then: 계정 생성, 로그인 토큰 발급
- Given: 가입된 사용자가 올바른 자격증명 입력
- When: 로그인 요청
- Then: 인증 토큰 발급, 앱 진입 가능

**UC-04 팀 일정 추가·수정·삭제**
- Given: LEADER 권한의 인증된 사용자, 유효한 startAt < endAt
- When: 일정 생성 요청
- Then: 201 Created, 팀 전체에 일정 노출
- Given: MEMBER 권한의 인증된 사용자
- When: 일정 생성·수정·삭제 시도
- Then: 403 Forbidden

**UC-06 채팅으로 일정 변경 요청**
- Given: MEMBER 권한의 인증된 사용자
- When: type=SCHEDULE_REQUEST 메시지 전송
- Then: 채팅 이력에 저장, 팀장에게 표시

---

## 8. 엔티티 CRUD 매핑

| 엔티티 | 생성 | 조회 | 수정 | 삭제 |
|--------|------|------|------|------|
| User | UC-01 | UC-01 | - | - |
| Team | UC-02 | UC-03, UC-07 | - | - |
| TeamMember | UC-02 | UC-03 | - | - |
| TeamInvitation | UC-02 | UC-02 | UC-02 | - |
| Schedule | UC-04 | UC-03, UC-07 | UC-04 | UC-04 |
| ChatMessage | UC-05, UC-06 | UC-05, UC-07 | - | - |

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
| ERD | docs/2-erd.md |
| API 명세 | docs/3-api-spec.md |
| 시퀀스 다이어그램 | docs/4-sequence.md |
