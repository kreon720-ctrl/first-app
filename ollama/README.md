# TEAM WORKS RAG 지식베이스

이 디렉토리는 AI 비서 "찰떡"이 사용자의 사용법 질문에 답하기 위한 안내 컨텐츠를 담습니다. RAG 파이프라인이 모든 `.md` 파일을 청크로 쪼개 임베딩 인덱스(`rag/data/chunks.json`)를 만듭니다.

## 파일 구성

| 파일 | 내용 | 청킹 방식 |
|------|------|----------|
| `overview.md` | 제품 한 페이지 소개 | 섹션 단위 |
| `getting-started.md` | 첫 사용자 온보딩 흐름 | 섹션 단위 |
| `glossary.md` | 도메인 용어 사전 | 섹션 단위 |
| `faq.md` | 자주 묻는 질문 (Q&A 쌍 단위로 청크 생성) | Q/A 단위 |
| `features/teams.md` | 팀 만들기·가입·역할 | 섹션 단위 |
| `features/schedules.md` | 캘린더·일정 CRUD | 섹션 단위 |
| `features/postits.md` | 포스트잇(날짜 메모) | 섹션 단위 |
| `features/chat.md` | 일반 채팅·업무보고·공지사항 | 섹션 단위 |
| `features/projects.md` | 프로젝트·간트·세부 일정 | 섹션 단위 |
| `features/ai-assistant.md` | AI 비서 자체 능력·한계 | 섹션 단위 |

## 작성 원칙

- 각 H2 섹션은 **자기완결적** — 다른 섹션을 참조하지 않아도 의미가 통하게.
- **숫자 제약**(글자 수, 색상 가짓수 등)은 정확하게 인용.
- 권한 규칙은 **누가 / 무엇을 / 언제** 형식으로 명시.
- 사용자가 묻는 질문 표현(예: "어떻게 하나요", "왜 안 돼요")을 본문에 포함해 검색 적중률 향상.
- 코드/엔드포인트 경로는 일반적으로 생략 (사용자 대상이지 개발자 대상 아님).

## 인덱스 빌드 / 갱신

```bash
cd rag
node index.js          # ollama/**.md → rag/data/chunks.json
node server.js         # :8787 RAG 서버 기동
```

내용을 수정하면 `node index.js`를 다시 실행해 인덱스를 갱신해야 검색 결과에 반영됩니다.
