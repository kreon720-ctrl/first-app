# RAG 파이프라인 구축 방안 — TEAM WORKS Gemma 챗봇

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-23 | 최초 작성 — 로컬 Gemma 2 9B 챗봇의 RAG 업그레이드 방안 정리 |

---

## 1. 목표와 범위

### 목표
Modelfile 단독 구성에서 답변 품질이 부족했던 **"세밀한 절차·오류 메시지·버튼 이름" 같은 질문**에도 정확하게 답하는 TEAM WORKS 사용법 챗봇을 만든다. 이 한계의 실증 사례는 `docs/15-ai-review.md` 섹션 8에 기록되어 있다.

### 범위
- 로컬 PC 1대에서 인터넷 없이 동작.
- 이미 작성된 `ollama/` 디렉토리의 문서를 그대로 재활용(`features/*.md`, `faq.md`, `knowledge-base.md`, `glossary.md`).
- 모델은 **Gemma 2 9B** (Ollama 런타임) 고정.

### 성공 기준
- "업무보고를 어떻게 보내나?" 같은 절차 질문에 `features/06-chat.md`의 정확한 절차를 재현.
- "종료 시각이 시작보다 앞서면 어떤 오류가 뜨나?" 같은 문자열 질문에 `knowledge-base.md`의 오류 메시지표 내용을 재현.
- 범위 외 질문은 여전히 정중히 거부.

---

## 2. 전체 아키텍처

```
┌─────────────────────────── 오프라인(인덱싱) ───────────────────────────┐
│                                                                        │
│   ollama/features/*.md         chunker         embedder                │
│   ollama/faq.md        ───▶   (섹션/QA) ─▶  nomic-embed-text  ─┐       │
│   ollama/knowledge-base.md                   (Ollama 내장)      │       │
│   ollama/glossary.md                                            │       │
│                                                                 ▼       │
│                                                         SQLite + vec   │
│                                                         (벡터 저장소)   │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── 온라인(질의) ──────────────────────────────┐
│                                                                        │
│  사용자 질문                                                           │
│     │                                                                  │
│     ▼                                                                  │
│  ① embedder(질문)  ───▶  ② 벡터 검색 top-k=3                           │
│                                  │                                     │
│                                  ▼                                     │
│                         ③ 프롬프트 조립:                               │
│                            [SYSTEM: Modelfile 페르소나]                │
│                            [CONTEXT: 상위 3개 청크]                    │
│                            [USER: 질문]                                │
│                                  │                                     │
│                                  ▼                                     │
│                         ④ Ollama `/api/chat`  (Gemma 2 9B)             │
│                                  │                                     │
│                                  ▼                                     │
│                              답변 반환                                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 컴포넌트 선택

| 역할 | 권장 | 이유 |
|------|------|------|
| LLM | **`gemma2:9b`** (Ollama, 이미 설치됨) | 재사용. Modelfile은 페르소나 전달용으로만 유지. |
| 임베딩 모델 | **`nomic-embed-text`** (Ollama로 `ollama pull nomic-embed-text`) | 768차원, 한국어 포함 멀티링구얼, CPU에서도 빠름, Ollama 런타임 재활용으로 추가 프로세스 불필요. |
| 벡터 저장소 | **SQLite + `sqlite-vec` 확장** | 단일 파일, 의존성 최소, `docs/*.md`처럼 소규모(수백~수천 청크) 문서에 충분. 별도 서버 불필요. |
| 서버 프레임워크 | **Python + FastAPI** | Ollama/sqlite-vec 예제 풍부, 작성 분량 적음. Node도 가능하나 sqlite-vec 바인딩 성숙도는 Python이 더 높음. |
| 청킹 라이브러리 | **표준 라이브러리 + 정규식** | 문서가 이미 구조화돼 있어 복잡한 청킹 툴 불필요. |

대안
- 벡터 저장소를 Chroma·LanceDB로 바꿔도 되지만, 기능 대비 의존성이 커서 SQLite를 우선 권장.
- 서버 프레임워크를 Node.js(Fastify/Express)로 해도 무방. Ollama JS SDK 존재.

---

## 4. 문서 청킹 전략

청크는 "검색 단위"와 "주입 단위"를 동시에 겸한다. 너무 크면 컨텍스트 낭비, 너무 작으면 맥락 손실이 생긴다. 목표 크기는 **200~500 토큰**(한국어 기준 약 400~900자).

| 원본 파일 | 청킹 단위 | 예상 청크 수 |
|-----------|-----------|--------------|
| `features/01-auth.md` ~ `07-permissions.md` | `##` 섹션 단위. 섹션이 600토큰 초과면 `###` 단위로 더 쪼갬 | 약 40~60개 |
| `faq.md` | **Q&A 한 쌍 = 1청크**. Q와 A를 함께 묶어야 검색 정확도 상승 | 약 50개 |
| `knowledge-base.md` | `##` 섹션 단위, 특히 "오류 메시지 해석" 표는 독립 청크 | 약 12개 |
| `glossary.md` | 카테고리별(`##`) 단위 | 약 10개 |

### 청크 메타데이터(각 청크와 함께 저장)
```
{
  source_file: "features/06-chat.md",
  section_path: "업무보고 전송 (WORK_PERFORMANCE)",
  chunk_type: "procedure" | "qa" | "reference" | "glossary",
  token_count: 312,
  text: "..."
}
```
- `chunk_type`은 추후 재랭킹·필터링 용도로 유용(예: 절차 질문 → `procedure` 가중치 ↑).

---

## 5. 인덱싱 파이프라인 (오프라인)

### 실행 스크립트 `scripts/index.py` 의사코드
```python
def index():
    chunks = []
    for md in glob("ollama/**/*.md"):
        chunks.extend(chunk_markdown(md))     # 섹션 또는 QA 단위
    for c in chunks:
        c.embedding = ollama.embed("nomic-embed-text", c.text)
        db.insert(c)                          # sqlite-vec 테이블
    print(f"인덱싱 완료: {len(chunks)}개 청크")
```

### 실행 조건
- 문서 수정 시 **전체 재인덱싱**(수백 청크라 수 초 이내 완료).
- CI에 연결할 필요 없음. 로컬에서 수동 실행으로 충분.

---

## 6. 질의 파이프라인 (온라인)

### FastAPI 엔드포인트 `POST /chat`
```python
@app.post("/chat")
def chat(req: ChatRequest):
    # 1. 질문 임베딩
    q_vec = ollama.embed("nomic-embed-text", req.question)

    # 2. 벡터 검색 top-k=3
    chunks = db.search(q_vec, top_k=3)

    # 3. 프롬프트 조립
    system_prompt = load_modelfile_system_block()   # 페르소나·톤
    context = "\n\n---\n\n".join(
        f"[{c.source_file} / {c.section_path}]\n{c.text}" for c in chunks
    )
    messages = [
        {"role": "system", "content": system_prompt + "\n\n# 참고 자료\n\n" + context},
        {"role": "user", "content": req.question},
    ]

    # 4. Ollama 호출
    return ollama.chat(model="gemma2:9b", messages=messages)
```

### top-k 튜닝 기준
- 시작값: **k=3**.
- 청크 평균 400토큰 × 3 = 약 1,200토큰. 페르소나 1,800 + 참조 1,200 + 응답 여유 ≈ 5,000토큰 내외로 8K 한도에 여유.
- 답변 품질이 낮으면 k=5로 올리거나 섹션 평균 크기를 줄인다.

---

## 7. 프롬프트 구성 원칙

### 시스템 프롬프트 레이어
```
[페르소나] - 기존 Modelfile의 SYSTEM 블록 전문 재사용 (톤, 답변 규칙 8개, 거부 패턴)
[규칙 추가] - "아래 '참고 자료'에 명시된 내용에만 근거해 답하세요. 참고 자료에 없는 사실은 '안내되어 있지 않아요'로 응답하세요."
[참고 자료] - 검색된 3개 청크를 소스 경로와 함께 병합
```

### 주의 사항
- 참고 자료 앞뒤로 명확한 구분선(`---`)을 넣어 모델이 섞어 버리지 않도록.
- 각 청크 상단에 `[source_file / section_path]` 를 붙이면 모델이 출처를 언급하도록 유도 가능(선택).
- Modelfile의 Few-shot 예시 3개는 시스템 프롬프트에 그대로 유지해 톤 고정.

---

## 8. 구현 순서 (실행 계획)

1. **의존성 설치**
   - `ollama pull nomic-embed-text`
   - `pip install fastapi uvicorn sqlite-vec ollama`
2. **스키마 설계** — `scripts/schema.sql`에 `chunks(id, source_file, section_path, chunk_type, text, embedding)` 정의. `sqlite-vec`의 `vec0` 가상 테이블 사용.
3. **청커 작성** — `scripts/chunker.py`:
   - `features/*.md`, `knowledge-base.md`, `glossary.md` 용 섹션 기반 청커.
   - `faq.md` 용 Q/A 페어 청커(정규식 `\*\*Q\*\*:.*?\*\*A\*\*:` 매칭).
4. **인덱싱 스크립트** — `scripts/index.py`.
5. **검색·답변 서버** — `scripts/server.py` (FastAPI).
6. **CLI 클라이언트(선택)** — `scripts/ask.py`로 터미널에서 바로 질문 테스트.
7. **검증** — 섹션 10의 테스트 질문 세트 실행, 절차 답변이 `features/*.md` 원문과 일치하는지 비교.

각 단계는 독립적이고 이전 단계가 끝난 뒤 진행된다. 전체 초기 구현은 평균 반나절 ~ 하루 예상.

---

## 9. 디렉토리 구조 (제안)

```
team-works/
├── ollama/                    # 기존 문서 (변경 없음)
│   ├── Modelfile
│   ├── knowledge-base.md
│   ├── faq.md
│   ├── glossary.md
│   └── features/*.md
└── rag/                       # 신규
    ├── chunker.py
    ├── index.py
    ├── server.py
    ├── ask.py                 # CLI 테스트 도구
    ├── schema.sql
    ├── requirements.txt
    ├── data/
    │   └── chunks.db          # SQLite + sqlite-vec 파일
    └── README.md              # 실행 방법
```

---

## 10. 검증 & 튜닝

### 회귀 테스트 질문 세트
`docs/15-ai-review.md`의 검증 질문에 **절차 질문을 추가**한다.

| 질문 | 기대 근거 청크 |
|------|---------------|
| "업무보고 어떻게 보내?" | `features/06-chat.md` → "업무보고 전송" 섹션 |
| "종료 시각이 시작보다 앞서면 어떤 오류가 나?" | `knowledge-base.md` → "오류 메시지 해석" 표 |
| "포스트잇 색깔 종류 알려줘" | `features/04-postit.md` → "색상" 섹션 |
| "프로젝트 삭제하면 하위 일정 어떻게 돼?" | `features/05-project.md` → "공통 규칙 — 연쇄 삭제" |
| "팀에 어떻게 가입해?" | `features/02-team.md` → "공개 팀 탐색" 섹션 |
| "오늘 저녁 메뉴 추천해줘" | (검색 결과 무관, 페르소나 거부) |

### 튜닝 포인트
- **검색 정확도가 낮을 때**: 청크 크기를 줄이거나, 메타데이터 필터(`chunk_type`)를 추가, 질문을 재작성해 임베딩(HyDE).
- **답변이 장황할 때**: 시스템 프롬프트에 "3~5문장으로 간결하게" 재강조.
- **환각이 남을 때**: `top_k` 를 5로 올리거나, 프롬프트에 "참고 자료 밖의 내용은 answer 금지" 문구를 강하게.

---

## 11. 제약과 한계

- 청크가 섹션 경계로만 나뉘므로, 답이 섹션 사이 경계를 가로지르는 질문에는 약할 수 있다. 필요시 **오버랩 청킹**(인접 섹션 50토큰 공유) 도입.
- `nomic-embed-text`는 한국어를 지원하지만 한국어 전용 모델(`KoSimCSE` 등)보다 정확도가 낮을 수 있다. 품질 이슈 시 전용 모델로 교체.
- SQLite + sqlite-vec는 수만 청크 이하에 적합. 문서가 수십 배로 늘면 pgvector/Qdrant로 이전 검토.
- Ollama의 임베딩 API는 한 번에 한 문자열만 받으므로 대량 인덱싱 시 병렬 호출을 조절해야 한다.

---

## 12. 이후 단계

- 이 문서는 설계에 해당하며, 실제 코드(`rag/*.py`) 작성은 별도 작업에서 진행한다.
- 구현이 끝나면 `docs/15-ai-review.md`에 "RAG 도입 이후 결과" 섹션을 추가해 before/after 품질 비교를 기록한다.

## 13. 관련 문서

| 문서 | 경로 |
|------|------|
| AI 리뷰 (Modelfile 단독 한계 근거) | `docs/15-ai-review.md` |
| 도메인 정의서 | `docs/1-domain-definition.md` |
| 챗봇 문서 인덱스 | `ollama/README.md` |
| Gemma 모델 레시피 | `ollama/Modelfile` |
