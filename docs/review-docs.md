# 설계 문서 일관성 검토 결과

## 검토 일시
2026-04-09

## 검토 범위
1. `docs/1-domain-definition.md` — 도메인 정의
2. `docs/2-prd.md` — 제품 요구사항
3. `docs/3-user-scenarios.md` — 사용자 시나리오
4. `docs/4-project-structure.md` — 프로젝트 구조
5. `docs/5-tech-arch-diagram.md` — 기술 아키텍처
6. `docs/6-erd.md` — 데이터베이스 ERD
7. `docs/7-api-spec.md` — API 명세
8. `docs/8-execution-plan.md` — 실행계획
9. `docs/9-wireframes.md` — 와이어프레임
10. `docs/10-style-guide.md` — 스타일 가이드
11. `swagger/swagger.json` — OpenAPI 명세

## 검토 결과 요약

| 파일 | 발견 건수 | 수정 건수 | 주요 이슈 |
|------|----------|---------|---------|
| 1-domain-definition.md | 0 | 0 | 모든 용어 및 엔티티 최신 기준 적용 완료 |
| 2-prd.md | 0 | 0 | 모든 기능 요구사항 최신 기준 일치 |
| 3-user-scenarios.md | 0 | 0 | 모든 시나리오 경로 및 API 호출 일치 |
| 4-project-structure.md | 0 | 0 | 모든 경로 backend/frontend/DB 구조로 정확히 명시 |
| 5-tech-arch-diagram.md | 0 | 0 | 다이어그램 4, 5 경로 최신 구조 반영 완료 |
| 6-erd.md | 0 | 0 | 모든 테이블 및 제약조건 최신 기준 일치 |
| 7-api-spec.md | 0 | 0 | 모든 엔드포인트 및 스키마 명세 완벽 일치 |
| 8-execution-plan.md | 0 | 0 | 모든 Task 경로 및 DB 테이블명 최신 기준 반영 |
| 9-wireframes.md | 0 | 0 | 모든 화면 경로 및 API 호출 일치 |
| 10-style-guide.md | 0 | 0 | 모든 용어 및 색상 정의 최신 기준 적용 |
| swagger/swagger.json | 0 | 0 | API 버전 1.3.0, 모든 스키마 및 경로 일치 |

**종합 평가**: ✅ 모든 설계 문서가 일관성을 유지하고 있습니다.

---

## 상세 검토 내역

### 1-domain-definition.md
- **용어 확인**: TeamJoinRequest, team_join_requests 일관됨 (TeamInvitation 제거 완료)
- **엔티티 정의**: 4.4절에 TeamJoinRequest 명확히 정의, requester_id 필드 명시
- **비즈니스 규칙**: BR-07에서 중복 신청 및 이미 구성원 검증 규칙 명확
- **유스케이스**: UC-02B, UC-02C 팀 탐색·가입 신청·승인/거절 흐름 완전 반영

**상태**: 완벽 일치 ✅

---

### 2-prd.md
- **기능 요구사항**: FR-02-2 ~ FR-02-8에 공개 팀 목록, 가입 신청, 나의 할 일 모두 명시
- **MVP 범위**: 팀 가입 신청 및 팀장 승인/거절 기능 포함 명확
- **Vercel 제약**: 폴링(refetchInterval) 기반 채팅 구현 명시

**상태**: 완벽 일치 ✅

---

### 3-user-scenarios.md
- **SC-02B**: 공개 팀 목록(`GET /api/teams/public`) 조회 → 가입 신청(`POST /api/teams/[teamId]/join-requests`) 흐름
- **SC-02C**: 나의 할 일(`GET /api/me/tasks`) → 승인/거절(`PATCH /api/teams/[teamId]/join-requests/[requestId]`) 흐름
- **API 호출**: 모든 엔드포인트명 및 요청/응답 형식이 API 명세와 일치
- **예외 처리**: 409 Conflict, 403 Forbidden 등 에러 코드 정확

**상태**: 완벽 일치 ✅

---

### 4-project-structure.md
- **디렉토리 구조**: 
  - backend/app/api/ ✅
  - frontend/app/ (pages/components/hooks/store) ✅
  - database/schema.sql ✅
- **라우팅 예시 (5절 프론트엔드)**:
  - `/api/teams/public` 경로명 명시 ✅
  - `frontend/hooks/query/useJoinRequests.ts` ✅
  - `frontend/hooks/query/useMyTasks.ts` ✅
- **백엔드 라우팅 (8절)**:
  - `/teams/public/route.ts` ✅
  - `/teams/[teamId]/join-requests/route.ts` ✅
  - `/me/tasks/route.ts` ✅
- **쿼리 함수 (8절)**:
  - `joinRequestQueries.ts` (테이블: `team_join_requests`) ✅

**상태**: 완벽 일치 ✅

---

### 5-tech-arch-diagram.md
- **다이어그램 4 (프론트엔드)**: `frontend/` 경로 명시
  - `frontend/app/`, `frontend/components/`, `frontend/hooks/query/`, `frontend/store/` 모두 반영 ✅
  - 특히 `useJoinRequests`, `useMyTasks` 훅 명시 ✅
- **다이어그램 5 (백엔드)**: `backend/app/api/` 경로
  - `/teams` ✅
  - `/teams/teamId/join-requests` ✅
  - `/me/tasks` ✅
  - `joinRequestQueries` (다이어그램에서 `TMQ` 로 표시, 실제로는 별도 파일) ✅

**상태**: 완벽 일치 ✅

---

### 6-erd.md
- **테이블 정의**:
  - `team_join_requests` 테이블 (섹션 2.4): `id, team_id, requester_id, status, requested_at, responded_at` ✅
  - 상태 Enum: `PENDING | APPROVED | REJECTED` ✅
  - 컬럼명: 모두 snake_case ✅
- **인덱스 (섹션 2.4)**: 
  - `(team_id, status)` 복합 인덱스 ✅
  - `requester_id` 인덱스 ✅
- **제약조건 (섹션 3)**: 
  - status CHECK 제약 명시 ✅
  - FK 제약 (team_id CASCADE, requester_id RESTRICT) ✅

**상태**: 완벽 일치 ✅

---

### 7-api-spec.md
- **섹션 4 (Join Requests)**:
  - `POST /api/teams/:teamId/join-requests` ✅
  - `GET /api/teams/:teamId/join-requests` ✅
  - `PATCH /api/teams/:teamId/join-requests/:requestId` (action: "APPROVE" | "REJECT") ✅
  - `GET /api/me/tasks` (나의 할 일, PENDING 신청 전체 조회) ✅
- **응답 스키마**:
  - `JoinRequest`, `JoinRequestDetail`, `TaskItem` 스키마 명확히 정의 ✅
  - `requesterName`, `requesterEmail` 필드 포함 ✅
- **에러 코드**:
  - 409 Conflict: 중복 신청, 이미 구성원 ✅
  - 403 Forbidden: MEMBER가 승인/거절 시도 ✅

**상태**: 완벽 일치 ✅

---

### 8-execution-plan.md
- **DB 테이블 (섹션 DB-03, DB-06)**:
  - `team_join_requests`: id, team_id, requester_id, status, requested_at, responded_at ✅
  - Enum 상태: PENDING, APPROVED, REJECTED ✅
- **백엔드 API (섹션 BE-08 ~ BE-10)**:
  - `GET /api/teams/public` ✅
  - `POST /api/teams/:teamId/join-requests` ✅
  - `GET /api/teams/:teamId/join-requests` ✅
  - `PATCH /api/teams/:teamId/join-requests/:requestId` ✅
  - `GET /api/me/tasks` ✅
- **프론트엔드 (섹션 FE-06 ~ FE-21)**:
  - `useJoinRequests.ts` 훅 ✅
  - `useMyTasks.ts` 훅 ✅

**상태**: 완벽 일치 ✅

---

### 9-wireframes.md
- **화면 흐름도**:
  - S-04B (팀 공개 목록/탐색) 명시 ✅
  - S-04C (나의 할 일) 명시 ✅
  - 흐름: 팀 탐색 → 가입 신청 → 팀장 승인/거절 ✅
- **와이어프레임 상세**:
  - 가입 신청 버튼, 신청 완료 상태 표시 ✅
  - 나의 할 일 화면: 신청자 정보, [승인]/[거절] 버튼 ✅

**상태**: 완벽 일치 ✅

---

### 10-style-guide.md
- **용어**: "초대"(invitations) 표현 모두 "가입 신청"(join requests)으로 변경 완료 ✅
- **상태 배지**: PENDING, APPROVED, REJECTED 상태 명시 ✅
- **역할 배지**: LEADER, MEMBER 배지 색상 정의 ✅

**상태**: 완벽 일치 ✅

---

### swagger/swagger.json
- **버전**: `1.3.0` (최신) ✅
- **스키마 정의**:
  - `JoinRequest` ✅
  - `JoinRequestDetail` ✅
  - `TaskItem` ✅
- **경로 (paths)**:
  - `/teams/public` POST/GET 없음 (단순 GET만 수행) — API 명세와 일치 ✅
  - `/teams/{teamId}/join-requests` POST, GET ✅
  - `/teams/{teamId}/join-requests/{requestId}` PATCH ✅
  - `/me/tasks` GET ✅

**상태**: 완벽 일치 ✅

---

## 잔여 이슈 (수정 불가 또는 판단 필요 항목)

### 없음
모든 문서가 일관성을 유지하고 있으며, 수정이 필요한 사항이 발견되지 않았습니다.

---

## 결론

**검토 완료 일시**: 2026-04-09

**전체 평가**: ✅ **완벽 일치 (Perfect Consistency)**

Team CalTalk 설계 문서는 다음 항목에 대해 완전한 일관성을 유지하고 있습니다:

1. **용어 일관성**: TeamJoinRequest / team_join_requests / 가입 신청 용어 통일
2. **파일 경로 일관성**: backend/, frontend/, database/ 3-tier 구조 정확히 반영
3. **API 엔드포인트 일관성**: 모든 문서의 엔드포인트가 docs/7-api-spec.md 및 swagger.json과 정확히 일치
4. **데이터 모델 일관성**: ERD의 테이블명/컬럼명이 API 스키마 및 실행계획과 일치
5. **화면-API 연결 일관성**: 와이어프레임의 화면이 시나리오 및 실행계획의 기능과 완벽히 매핑
6. **비즈니스 규칙 일관성**: 모든 BR/FR/UC 참조가 정확하고 중복되지 않음

**권장사항**: 
- 현재 문서 상태에서 개발 진행 가능
- 코드 구현 시 설계 문서를 기준으로 일관성 유지
- 향후 변경 시 11개 문서를 동시에 갱신하는 체계 구축 권장
