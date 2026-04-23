# AI 리뷰 — Gemma 기반 TEAM WORKS 사용법 챗봇 구성

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-23 | 최초 작성 — `ollama/` 디렉토리 문서 구성 및 Modelfile 단독 운용 결정 리뷰 |

---

## 1. 배경

TEAM WORKS 앱의 사용법을 사용자가 물어보면 챗봇이 답변하는 서비스를 로컬 환경에 구축한다. 모델은 **Gemma 2 9B**를 Ollama 런타임에 설치한 로컬 PC에서 구동한다. 외부 API 호출 없이 사내 PC에서 동작해야 하고, 컨텍스트 창은 8K 토큰으로 제한된다.

이 제약 하에 `ollama/` 디렉토리에 챗봇이 참고할 문서를 만들었고, 어떤 조합으로 운용할지 결정하기 위해 리뷰를 진행했다.

## 2. `ollama/` 디렉토리 파일 구성

| 파일 | 역할 |
|------|------|
| `Modelfile` | Ollama 커스텀 모델 레시피. `FROM gemma2:9b` + 파라미터 + `SYSTEM` 블록(핵심 사용법·페르소나·Few-shot 예시). |
| `system-prompt.md` | Modelfile의 SYSTEM 블록 설계 의도(톤/포맷/거부 패턴)를 풀어쓴 유지보수 참고 문서. |
| `knowledge-base.md` | 앱 전반을 한 파일에 압축한 레퍼런스(약 2,800 토큰). 풀 컨텍스트 주입용. |
| `faq.md` | Q&A 50+개. Few-shot 예시 또는 RAG 검색 대상으로 활용. |
| `glossary.md` | 한/영 용어 사전, 오류 코드 매핑. |
| `features/01-auth.md` | 회원가입·로그인 절차 상세. |
| `features/02-team.md` | 팀 생성·탐색·가입·승인 상세. |
| `features/03-calendar.md` | 캘린더·일정 CRUD 상세. |
| `features/04-postit.md` | 포스트잇 5색·권한 상세. |
| `features/05-project.md` | 프로젝트 3단계 계층·간트 상세. |
| `features/06-chat.md` | 채팅 3종(일반/업무보고/공지) 상세. |
| `features/07-permissions.md` | 역할·권한 매트릭스 정리. |
| `README.md` | 3가지 활용 시나리오(Modelfile 단독 / RAG / 풀 컨텍스트) 및 토큰 예산 가이드. |

## 3. 핵심 리뷰 포인트 — `ollama create -f Modelfile`의 실제 동작

- `ollama create teamworks-gemma -f Modelfile` 명령은 **Modelfile 하나만 읽는다.**
- 같은 디렉토리의 `system-prompt.md`, `knowledge-base.md`, `faq.md`, `features/*.md`, `glossary.md` 는 **자동으로 포함되지 않는다.**
- 따라서 Modelfile의 `SYSTEM """..."""` 블록 안에 들어 있는 텍스트가 Gemma에 "baked in" 되는 유일한 지식이다.

이 사실을 초기에 명확히 해야 "명령만 실행하면 모든 문서를 모델이 참고하겠지"라는 오해를 피할 수 있다.

## 4. Modelfile SYSTEM 블록에 들어 있는 것 vs 빠져 있는 것

### 들어 있음 (약 1,800 토큰)
- 답변 규칙 8개 (한국어 존댓말, 3~5문장, 버튼 `[...]` 표기, 문서 없는 기능 추측 금지, 범위 외 거부 등).
- 핵심 도메인 지식
  - 역할(LEADER/MEMBER)과 자동 지정 규칙.
  - **황금 규칙**: "누구나 생성, 수정·삭제는 만든 사람만" + 공지사항 삭제 예외.
  - 주요 기능 6개(팀/캘린더/포스트잇/프로젝트/채팅/폴링) 한줄 요약.
  - 화면 경로 7개.
  - 업무보고 열람 권한 특수 규칙.
  - 자주 혼동되는 포인트(초대 없음, 알림 없음, 메시지 수정 없음 등).
- Few-shot 예시 3개(긍정 케이스 2개 + 범위 외 거부 케이스 1개).

### 빠져 있음 (다른 `.md` 파일에만 존재)
- `features/*.md`의 단계별 절차(예: 일정 추가 1~3단계, 필드별 유효성 메시지 원문).
- `faq.md`의 50+ Q&A 디테일.
- `knowledge-base.md`의 오류 메시지 해석표, 반응형 동작, 비기능 요구사항.
- `glossary.md`의 용어 매핑과 오류 코드 표.

결과적으로 Modelfile 단독 구성은 **규칙·요약 질문에는 강하고, 세밀한 문자열·절차 질문에는 약하다.**

## 5. 세 가지 커버리지 옵션

| 옵션 | 방식 | 난이도 | 정확도 | 운영 비용 |
|------|------|--------|--------|----------|
| ① Modelfile 단독 | `ollama create -f Modelfile` 후 바로 사용 | 낮음 | 중 | 없음 |
| ② 풀 컨텍스트 주입 래퍼 | 앱 서버/스크립트가 매 질문에 `knowledge-base.md` 전체(~2,800 토큰)를 시스템 프롬프트로 덧붙여 호출 | 중 | 상 | 중 (래퍼 코드 필요) |
| ③ RAG 파이프라인 | `features/*.md`·`faq.md`를 임베딩해 벡터 DB에 저장, 질문마다 상위 1~3개 청크 검색·주입 | 상 | 최상 | 상 (벡터 DB + 임베딩 모델 + 검색 로직) |

## 6. 결정 — Modelfile 단독 유지

- 이유
  - 가장 빨리 동작 가능한 구성. 추가 인프라 없음.
  - 로컬 PC 1대에서 운용하는 시나리오에 오버엔지니어링을 피함.
  - 현재 챗봇의 1차 용도는 "규칙·개념 안내"이므로 Modelfile의 요약 지식으로도 상당 부분 커버됨.
- 보존 결정
  - `knowledge-base.md`, `faq.md`, `features/*.md`, `glossary.md`, `system-prompt.md` 는 제거하지 않고 미래 확장용 자산으로 남긴다.

## 7. 실행 명령 및 검증 방법

### 실행
```bash
cd C:\_vibe\team-works\ollama
ollama create teamworks-gemma -f Modelfile
ollama run teamworks-gemma
```

### 검증 테스트 질문
| 질문 | 기대 답변 포인트 |
|------|------------------|
| "팀에 어떻게 가입해?" | `[팀 탐색]` → 가입 신청 → 팀장 승인 흐름 언급, 초대 기능 없음 명시 |
| "내가 만든 일정인데 팀장이 못 고친대요. 버그인가요?" | "버그 아님. 생성자만 수정 가능. 팀장도 예외 아님" |
| "업무보고는 누가 볼 수 있어요?" | "기본은 팀장만. 팀장이 허용한 팀원 추가 열람 가능. 허용 목록 비우면 전체 공개" |
| "오늘 저녁 메뉴 추천해줘" | "TEAM WORKS 사용법 외에는 답하기 어려워요" 정중한 거부 |

답변이 규칙에서 벗어나면 Modelfile의 SYSTEM 블록을 수정하고 `ollama create` 를 다시 실행하여 모델을 갱신한다(동일 이름으로 재생성 가능).

## 8. 업그레이드 경로

세부 절차 질문에 대한 답변 품질이 문제가 되면 아래 순서로 확장한다.

1. **풀 컨텍스트 주입 래퍼(옵션 ②)로 업그레이드**
   - Node/Python으로 얇은 서버를 만들어 Ollama HTTP API(`/api/chat`)를 호출한다.
   - 매 요청에 `knowledge-base.md` 전체를 `system` 메시지로 덧붙인다.
   - 8K 컨텍스트 중 ~2,800 토큰을 지식, ~1,000 토큰을 응답 여유로 사용하고 나머지로 대화 히스토리를 관리한다.

2. **RAG 파이프라인(옵션 ③)으로 확장**
   - `features/*.md`와 `faq.md`를 문단/섹션 단위로 청크 분할.
   - 로컬 임베딩 모델(예: `nomic-embed-text` via Ollama)로 벡터화해 경량 벡터 저장소(SQLite + pgvector/Chroma)에 저장.
   - 질문이 들어오면 유사도 상위 1~3개 청크만 system 메시지에 주입.
   - Modelfile의 SYSTEM 블록은 페르소나·톤 유지용으로 계속 활용.

두 업그레이드 모두 현재 `ollama/` 디렉토리의 문서 자산을 그대로 재활용하므로 별도 재작성 비용이 없다.

## 9. 관련 문서

| 문서 | 경로 |
|------|------|
| 도메인 정의서 | `docs/1-domain-definition.md` |
| 사용자 시나리오 | `docs/3-user-scenarios.md` |
| 챗봇 문서 인덱스 | `ollama/README.md` |
| 모델 레시피 | `ollama/Modelfile` |
| 시스템 프롬프트 설계 | `ollama/system-prompt.md` |
