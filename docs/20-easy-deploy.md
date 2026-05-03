# 게이밍 노트북으로 TEAM WORKS 운영하기 (쉬운 배포 가이드)

> **누가 읽나요**: IT 전문가가 아닌 분이 본인 게이밍 노트북에 TEAM WORKS 를 띄워 가족·동호회·소규모 팀(~10명) 에게 서비스하려는 경우.
> **무엇을 만드나요**: 노트북에서 24/7 켜져 돌아가는 TEAM WORKS 웹서비스. `https://teamworks.my` 로 어디서나 접속 가능 (랜딩 페이지는 `/landing`). AI 찰떡이도 함께.
> **예상 소요 시간**: 처음이면 **3~5시간** (다운로드 시간 포함). 두 번째부터는 1시간.
> **준비물**: 관리자 계정 윈도우 노트북, 인터넷, 이메일 1개, 본인 의지.

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-05-01 | 최초 작성 — Windows 11 + RTX 3070 8GB + 16GB RAM 게이밍 노트북 기준 비전문가용 배포 절차 |
| 1.1 | 2026-05-02 | Open WebUI API 키 발급·등록 절차 추가 (STEP 4.3, 5.7). 일반 질문 경로에서 `OPEN_WEBUI_API_KEY` 에러로 막히던 문제 해결. 루트 `.env` 작성·frontend 재기동 절차 명시. |
| 1.2 | 2026-05-02 | STEP 5.7 간소화 — 모델 프리셋(`gemma4-web`) 생성·Web Search 권한 부여 단계 제거. frontend(`route.ts`) 가 system prompt 와 SearxNG 검색 결과를 매 요청마다 직접 보내므로 Open WebUI 의 프리셋·검색 권한은 미사용. `OPEN_WEBUI_MODEL` 기본값을 `gemma4-web` → `gemma3:4b` (실제 Ollama 모델명) 로 변경. FAQ 도 동기화. |
| 1.3 | 2026-05-02 | API 키 복사 시 `sk-` 접두사 제외 안내 추가 (STEP 5.7.3, 5.7.5, FAQ). |
| 1.4 | 2026-05-02 | Open WebUI 모델 이름 자동 해석 도입 (`frontend/lib/openWebUiModel.ts`). frontend 가 Open WebUI `/api/models` 를 조회해 등록된 모델 중 chat 가능한 첫 번째 (arena-model·nomic-embed 제외) 를 자동 선택. `.env` 의 `OPEN_WEBUI_MODEL` 명시 불필요. STEP 4.3 의 `.env` 항목 4개 → 2개로 축소, STEP 5.7 단계 6개 → 5개로 축소 (모델 이름 확인 단계 제거), FAQ "모델 못 찾음" 항목을 "AI 모델에 연결할 수 없습니다" 로 재작성. |
| 1.5 | 2026-05-02 | STEP 5.7 에 실제 운영 환경설정 walkthrough 추가 — 5.7.3 웹 검색 활성화(SearxNG 연결 + 결과 수·동시 요청 수·임베딩 우회·SSL 등 토글 표), 5.7.4 연결·모델은 별도 설정 불필요. 기존 5.7.3~5.7.5 → 5.7.5~5.7.7 로 번호 재정렬. |
| 1.6 | 2026-05-02 | STEP 6.5 추가 — 새 기능 운영 반영 (Update) 절차. `git pull origin main` + `docker compose restart frontend backend` 두 줄 표준. 추가 작업 매트릭스(DB·RAG·compose) + `update.bat` 자동화 스크립트 + 롤백. 기존 6.5 (영구 터널) → 6.6 으로 재번호. |
| 1.7 | 2026-05-02 | API 키 안내 정정 — `sk-` 접두사를 **포함**해서 그대로 사용해야 정상 동작 (이전 v1.3 의 "sk- 제외" 안내가 잘못됐음). STEP 5.7.5 / 5.7.6 / FAQ 모두 갱신. |

---

## 0. 시작 전에 꼭 알아두기

### 0.1. 현재 컴퓨터 사양 분석

| 항목 | 사양 | 평가 |
|---|---|---|
| CPU | AMD Ryzen 7 5800H (8코어 16스레드) | ✅ 충분 |
| 메모리 (RAM) | 16 GB | ⚠️ 빠듯하지만 가능 |
| GPU | NVIDIA RTX 3070 (노트북판, **VRAM 8GB**) | ⚠️ 작은 AI 모델만 가능 |
| OS | Windows 11 Pro | ✅ Docker Desktop 호환 |

핵심 제약 두 가지를 먼저 짚어드립니다.

#### 제약 1) GPU VRAM 8GB → 작은 AI 모델만 가속됨
- 큰 모델(예: gemma4:26b, 17GB) 은 그래픽 카드에 안 들어가서 **CPU 로만 돌게 됨 → 답변 30~120초**.
- 이 노트북에는 **gemma4:4bit (4-bit 양자화, ~3 GB)** 정도가 적당. 답변 속도 5~15초로 쾌적.
- 한국어 자연어 일정 등록 같은 기본 기능은 4B 모델로 충분히 가능.

#### 제약 2) RAM 16GB → 동시 사용자 ~10명, 추가 작업 자제
- Postgres + 백엔드 + 프론트 + 검색엔진 + 웹UI + AI = 약 8~10GB 사용.
- 윈도우 자체가 4GB 사용 → 남는 메모리 2~4GB.
- 게이밍·영상편집 같이 무거운 작업 동시에 돌리면 **서비스 멈춤**.
- 전용 운영 노트북으로 쓰시기를 강력 권장.

### 0.2. 운영 한계 솔직 고지

| 항목 | 한계 |
|---|---|
| 동시 접속자 | 안정적: 5~10명. 최대: 20명 (반응 느려짐) |
| 가용성 | 노트북이 켜져 있어야 서비스됨 (정전·재부팅·업데이트 시 다운) |
| 응답 속도 | AI 답변 5~15초, 일반 페이지 즉시 |
| 데이터 안전성 | 노트북 SSD 가 망가지면 데이터 사라짐 → **외장 디스크 백업 필수** |
| 24/7 운영 | 발열·팬 소음·배터리 보호 회로가 받쳐줘야 함 |

이 한계들을 받아들일 수 있다면 시작합니다. 안 된다면 클라우드 VPS(월 1~5만원) 가 더 안정적입니다.

### 0.3. 전체 그림 한 눈에 보기

```
[인터넷의 사용자]
       ↓ https://teamworks.my  (랜딩: /landing)
[Cloudflare 무료 터널]   ← 외부 접속, HTTPS 자동, 공유기 설정 불필요
       ↓ 암호화된 통로
[내 노트북]
   ├── nginx (8080 포트)        ← 입구. 모든 요청을 받아 분배
   ├── 프론트엔드 (Next.js)      ← 화면
   ├── 백엔드 (Next.js API)     ← DB·로직
   ├── PostgreSQL DB             ← 모든 데이터
   ├── Open WebUI + SearxNG      ← AI 일반 질문 처리
   ├── RAG 서버 (Node.js)        ← 사용법 문서 검색
   └── Ollama + AI 모델          ← 찰떡이 두뇌. RTX 3070 가속
```

복잡해 보이지만 **한 번 띄우면 자동으로 다 같이 돌아갑니다**. 매번 따로 켤 필요 없습니다.

### 0.4. 사전 준비물 체크리스트

- [ ] 윈도우 관리자 권한 계정
- [ ] 인터넷 (속도는 100Mbps 이상 권장)
- [ ] 이메일 주소 1개 (Cloudflare 가입용)
- [ ] 약 30 GB 빈 디스크 공간 (Docker 이미지 + AI 모델)
- [ ] 외장 SSD 또는 USB 메모리 (백업용, 64GB 이상)
- [ ] (선택) 본인 도메인 — 없어도 Cloudflare 무료 도메인 사용 가능

이메일·도메인 외에는 모두 무료입니다.

---

## STEP 1. 윈도우 환경 준비하기

이 단계는 **한 번만** 하면 됩니다. 다음에 다시 안 해도 돼요.

### 1.1. 윈도우 업데이트

`설정` → `Windows 업데이트` → `업데이트 확인` → 모두 설치 → **재부팅**.

> 왜? Docker 와 WSL2 가 최신 윈도우에서만 안정적으로 동작합니다.

### 1.2. NVIDIA 드라이버 최신 버전으로 설치

1. https://www.nvidia.com/Download/index.aspx 접속.
2. 본인 그래픽 카드 선택 (RTX 3070 노트북판).
3. **Studio** 또는 **Game Ready** 드라이버 다운로드 (어느 쪽이든 OK).
4. 설치 → 재부팅.

설치 확인:
- 시작 메뉴에서 `cmd` 검색 → `명령 프롬프트` 실행
- `nvidia-smi` 입력 → GPU 이름과 드라이버 버전이 표시되면 OK
- 표시 안 되면 드라이버 설치 실패 — 다시 설치

### 1.3. WSL2 (Linux 가상 환경) 활성화

WSL2 는 **윈도우 안에서 리눅스를 돌리는 기능**입니다. Docker 가 이걸 사용해요.

1. 시작 메뉴 → `Windows PowerShell` 우클릭 → <strong style="color:#FFB800">관리자 권한</strong>**으로 실행**.
2. 다음 명령 입력:
   ```powershell
   wsl --install
   ```
3. 설치 완료 후 **재부팅**.
4. 재부팅 후 자동으로 Ubuntu 가 열리면 사용자 이름 / 비밀번호 설정 (잊지 마세요 — 적어두기 권장).
5. PowerShell 에서 확인:
   ```powershell
   wsl --version
   wsl -l -v
   ```
   `VERSION 2` 표시되면 OK.

> 중간에 "재부팅 후 다시 시도" 메시지가 나오면 재부팅 후 PowerShell 다시 열고 같은 명령.

### 1.4. WSL2 메모리 제한 설정 (중요!)

기본 설정에서는 WSL2 가 메모리를 무제한으로 가져갈 수 있어 윈도우가 느려질 수 있어요. 8GB 로 제한합니다.

1. 시작 메뉴 → `메모장` 실행.
2. 다음 내용 입력:
   ```
   [wsl2]
   memory=8GB
   processors=8
   swap=4GB
   ```
3. `파일` → `다른 이름으로 저장` → 다음 설정:
   - 파일 형식: `모든 파일 (*.*)`
   - 위치: `C:\Users\(내사용자명)`
   - 파일 이름: `.wslconfig` (앞에 점이 있고 확장자 없음)
4. 저장 후 PowerShell 에서:
   ```powershell
   wsl --shutdown
   ```

> 8GB 는 컨테이너용. 윈도우 자체가 별도로 4~6GB 사용. AI 모델은 GPU VRAM 에 들어가서 시스템 메모리 적게 씀.

### 1.5. Docker Desktop 설치

1. https://www.docker.com/products/docker-desktop/ 접속.
2. **Download for Windows (AMD64)** 클릭.
3. `Docker Desktop Installer.exe` 실행 → 기본 옵션 그대로 → 설치.
4. 설치 후 자동으로 Docker Desktop 실행됨.
5. 처음 실행되면 **Use WSL 2 instead of Hyper-V** 옵션이 켜져 있는지 확인.
6. 우측 상단 톱니바퀴 → **Settings** → **General** →
   - ✅ `Start Docker Desktop when you sign in to your computer` 체크
   - ✅ `Use the WSL 2 based engine` 체크
7. **Settings** → **Resources** → **WSL Integration** → 본인 Ubuntu 활성화.
8. **Apply & Restart**.

설치 확인:
- PowerShell 에서:
  ```powershell
  docker --version
  docker compose version
  ```
  버전이 표시되면 OK.

### 1.6. Git (소스 코드 받기 도구) 설치

1. https://git-scm.com/download/win 접속 → 자동 다운로드.
2. 설치 마법사 모든 옵션 **기본값** 그대로 진행.
3. PowerShell 에서:
   ```powershell
   git --version
   ```
   버전 표시되면 OK.

### 1.7. Ollama (AI 두뇌 엔진) 설치

1. https://ollama.com/download 접속 → **Download for Windows** 클릭.
2. `OllamaSetup.exe` 실행 → 설치.
3. 설치 후 자동 실행. 시스템 트레이에 라마 아이콘이 보입니다.
4. Ollama 는 **부팅 시 자동 시작** 으로 기본 설정되어 있어요.

설치 확인:
- PowerShell 에서:
  ```powershell
  ollama --version
  ```

이제 윈도우 기본 환경 준비 끝.

---

## STEP 2. AI 모델 다운로드하기

GPU 가 작아서(8GB) 큰 모델은 못 써요. 우리 사양에 맞는 모델을 받습니다.

### 2.1. 추천 모델: gemma4:4bitit (4-bit 양자화 GGUF 직접 등록)

`ollama pull` 로는 Gemma 4 시리즈 4-bit 4B 모델을 곧장 받기 어렵습니다 (Ollama 라이브러리 등록이 작은 양자화 변종까지 모두 커버하지 않음). Hugging Face 의 GGUF 파일을 받아 Ollama 의 `Modelfile` 로 직접 등록하면 됩니다 — 한 번만 하면 끝.

#### 1) Hugging Face 에서 4-bit GGUF 다운로드

1. Hugging Face 에서 **Gemma 4 4bit GGUF** 로 검색하거나 해당 모델 저장소의 **Files and versions** 탭으로 이동.
2. 파일명에 **`q4_k_m.gguf`** 또는 **`q4_0.gguf`** 가 들어간 파일을 찾습니다. (보통 **`q4_k_m`** 가 품질·속도 균형이 가장 좋음.)
3. 그 파일을 본인 PC 의 특정 폴더에 다운로드. 예:
   - Windows: `C:\llm_models\`
   - macOS·Linux: `~/models/`

#### 2) `Modelfile` 작성

Ollama 는 **`Modelfile`** 이라는 설정 파일로 외부 모델을 인식합니다. 메모장 또는 VS Code 로 새 파일을 만들어 아래 내용을 입력하고 **확장자 없이** `Modelfile` 로 저장:

```dockerfile
# 다운로드한 GGUF 파일의 실제 경로 (Windows 예시)
FROM "C:/llm_models/gemma-4-e4b-q4_k_m.gguf"

# 모델 파라미터 (선택)
PARAMETER temperature 0.7
PARAMETER top_p 0.9

# 시스템 프롬프트 (선택)
SYSTEM """
당신은 유능하고 친절한 AI 어시스턴트입니다. 한국어로 답변해 주세요.
"""
```

> **경로 작성 주의**:
> - Windows 도 `Modelfile` 안에서는 `/` 또는 `\\` (이스케이프) 둘 다 OK. `\` 단일은 X.
> - 경로에 한글·공백이 있으면 **반드시 큰따옴표(`"`)** 로 감쌈.

#### 3) Ollama 에 모델 등록 (`ollama create`)

터미널을 열고 `Modelfile` 이 있는 폴더로 이동한 뒤:

```powershell
# ollama create [원하는 모델 이름] -f Modelfile
ollama create gemma4:4bitit -f Modelfile
```

- Ollama 가 GGUF 파일을 자체 라이브러리(`~/.ollama/models/`) 로 복사·등록합니다.
- 등록이 끝나면 **원본 GGUF 파일은 지워도 무관** (디스크 공간 회수 가능).

#### 4) 실행 확인

```powershell
ollama list                # 등록된 모델 목록 — gemma4:4bitit 가 보여야 함
ollama run gemma4:4bitit     # 대화 모드 진입 (Ctrl+D 로 종료)
```

이후 Open WebUI (`http://localhost:8081`) 좌상단 모델 드롭다운에도 **`gemma4:4bitit`** 가 자동으로 등록됩니다 (Open WebUI 가 Ollama 모델을 주기적으로 sync). 안 보이면 `docker compose restart open-webui` 한 번.

> 이후 본 가이드의 다른 곳에서 `gemma4:4bit` 라고 표기된 부분은 모두 본인이 위 3단계에서 정한 이름(`gemma4:4bitit`) 으로 읽으시면 됩니다.

### 2.2. 임베딩 모델: nomic-embed-text

문서 검색용 작은 모델 (300MB).

```powershell
ollama pull nomic-embed-text
```

### 2.3. 다운로드 확인

```powershell
ollama list
```

다음과 같이 두 모델이 보여야 합니다:
```
NAME                        SIZE
gemma4:4bit                   ~3 GB
nomic-embed-text:latest     274 MB
```

### 2.4. 동작 테스트

```powershell
ollama run gemma4:4bit "안녕"
```

답변이 나오면 OK. `Ctrl+D` 로 종료.

> AI 모델 다운로드는 **딱 한 번** 하면 영구히 남습니다.

### 2.5. 모델 자동 언로드 끄기 (영구 상주 설정)

Ollama 는 기본적으로 **5 분 idle** 이면 메모리에서 모델을 내립니다. 그러면 다음 질문 때 모델을 다시 GPU/RAM 에 로드하느라 첫 답변이 수십 초~1 분 가까이 느려집니다 (특히 큰 모델). 사내 상시 운영용이면 항상 메모리에 띄워두는 게 사용감이 훨씬 낫습니다.

**Windows 시스템 환경변수로 영구 설정:**

1. PowerShell **관리자 권한** 으로 실행 (`Win + X` → **Windows Terminal (관리자)** 또는 **PowerShell (관리자)**).
2. 다음 명령 실행:
   ```powershell
   [Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "-1", "Machine")
   ```
   - `-1` = 무제한 (Ollama 가 종료되기 전까지 모델 메모리 유지).
   - 시간으로 제한하고 싶으면 `"24h"`, `"60m"` 등으로 지정 가능.

3. **Ollama 재시작** (환경변수는 프로세스 시작 시점에만 읽힘):
   - 시스템 트레이의 Ollama 아이콘 → 우클릭 → **Quit Ollama**.
   - 시작 메뉴에서 **Ollama** 다시 실행.

4. 적용 확인:
   ```powershell
   ollama run gemma4:4bit "한 단어로 답해: hello"
   ollama ps
   ```
   `ollama ps` 출력의 **UNTIL** 컬럼이 `Forever` 로 표시되면 OK. (시간 지정 시엔 `24 hours from now` 같은 표시)

> ⚠️ VRAM/RAM 이 항상 점유됩니다. gemma4:4bit (~16GB) + nomic-embed-text (~0.3GB) 가 상주하므로 GPU 메모리가 빠듯한 환경이면 시간 제한(`"4h"` 등)을 검토.
>
> 이 설정은 **Open WebUI 일반 질문 경로 / RAG 답변 / 임베딩** 모두에 적용됩니다 — 별도 설정 불필요.

---

## STEP 3. TEAM WORKS 코드 받기

### 3.1. 코드 저장 폴더 만들기

본인이 알아보기 쉬운 곳에 둡니다. 예: `C:\TeamWorks`

PowerShell 에서:
```powershell
cd C:\
mkdir TeamWorks
cd TeamWorks
```

### 3.2. Git Clone

```powershell
git clone https://github.com/kreon720-ctrl/team-works.git
cd team-works
```

> 만약 본인 GitHub 저장소면 그 URL 로 바꿔주세요.

폴더 구조 확인:
```powershell
dir
```

`backend`, `frontend`, `rag`, `ollama`, `docker` 등 폴더가 보이면 정상.

---

## STEP 4. 비밀번호·환경설정 만들기

### 4.1. 데이터베이스 비밀번호 설정

`backend\.env.local` 파일을 만들어야 합니다.

1. 메모장 실행.
2. 다음 내용 입력 (`!@#$%` 부분은 본인 강력한 비밀번호로 변경):
   ```
   DATABASE_URL=postgresql://teamworks-manager:내강력한비밀번호@postgres-db:5432/teamworks
   JWT_ACCESS_SECRET=긴랜덤문자열_64자이상
   JWT_REFRESH_SECRET=다른긴랜덤문자열_64자이상
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:8080
   ```

3. JWT 시크릿용 랜덤 문자열 만들기:
   PowerShell 에서:
   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
   ```
   두 번 실행해서 두 시크릿에 각각 복사.

4. `다른 이름으로 저장`:
   - 위치: `C:\TeamWorks\team-works\backend`
   - 파일 형식: 모든 파일
   - 파일 이름: `.env.local`

### 4.2. docker-compose 의 DB 비밀번호도 동일하게 변경

1. `C:\TeamWorks\team-works\docker-compose.yml` 메모장으로 열기.
2. 두 곳을 동일한 비밀번호로 수정:
   - `POSTGRES_PASSWORD: '내강력한비밀번호'`
   - `DATABASE_URL: postgresql://teamworks-manager:URL인코딩된비밀번호@postgres-db:5432/teamworks`

> URL 인코딩: 비밀번호에 `!@#$%` 같은 특수문자가 있으면 URL 에 그대로 못 씀. https://www.urlencoder.org 에서 변환.

### 4.3. 루트 `.env` 파일 만들기 (Open WebUI 용)

찰떡이가 일반 질문(날씨·뉴스·시사 등) 답변에 사용하는 **Open WebUI** 컨테이너가 환경변수 2개를 요구합니다. 비워두면 일반 질문 호출 시 "**OPEN_WEBUI_API_KEY 가 설정되어 있지 않습니다**" 에러가 뜹니다.

이 단계에서는 **API 키 자리만 비워두고** 만들어두고, 실제 키는 STEP 5.7 에서 발급받아 채웁니다.

1. 메모장 실행.
2. 다음 내용 그대로 입력:
   ```
   OPEN_WEBUI_SECRET_KEY=
   OPEN_WEBUI_API_KEY=

   # 브라우저가 보는 외부 base URL (스킴·포트 포함).
   # CORS Allow-Origin 과 NEXT_PUBLIC_API_URL 양쪽에 같은 값이 들어가므로
   # 실제 접근 URL 과 정확히 일치해야 함.
   #
   # 아래 3 줄 중 본인 환경에 맞는 1 줄만 주석 해제하고 나머지는 # 처리.
   # 변경 후엔 backend/frontend 컨테이너 재기동 필요:
   #   docker compose up -d --force-recreate backend frontend

   # (1) 로컬 — 호스트 머신 자체 브라우저로만 접근
   PUBLIC_BASE_URL=http://localhost:8080

   # (2) 동일 서브넷 — 같은 LAN 의 다른 PC/모바일에서 접근 (호스트 머신의 LAN IP 로)
   #PUBLIC_BASE_URL=http://192.168.1.42:8080

   # (3) 도메인 — Cloudflare Tunnel 등으로 외부 공개 (HTTPS, 포트 없음)
   # 앱은 apex 도메인 (teamworks.my) 에서, 랜딩은 teamworks.my/landing 에서 서빙.
   #PUBLIC_BASE_URL=https://teamworks.my
   ```
   > 모델 이름은 frontend 가 Open WebUI `/api/models` 로 자동 감지합니다 — `OPEN_WEBUI_MODEL` 명시 불필요. 운영자가 Open WebUI 에 chat 모델 1개만 노출시키면 그 모델로 자동 동작.
3. `OPEN_WEBUI_SECRET_KEY` 값 채우기 — PowerShell 에서:
   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
   ```
   결과를 `=` 뒤에 붙여넣기. (예: `OPEN_WEBUI_SECRET_KEY=aB3xY9zKp...`)
4. `OPEN_WEBUI_API_KEY` 는 **STEP 5.7 까지 비워둠**.
5. `PUBLIC_BASE_URL` 은 본인 접근 환경에 맞춰 선택:
   - 호스트 머신 자체 브라우저로만 접근 → `(1) http://localhost:8080` 그대로.
   - 사내 LAN 의 다른 PC/모바일에서 접근 → `(1)` 을 주석 처리하고 `(2)` 의 `#` 를 떼고 호스트 머신의 LAN IP 로 변경.
     - LAN IP 확인: Windows `ipconfig` → "IPv4 주소" / macOS `ipconfig getifaddr en0`
   - 외부에서 도메인으로 접근 (Cloudflare Tunnel) → `(1)` 을 주석 처리하고 `(3)` 의 `#` 를 떼고 본인 apex 도메인으로 변경 (예: `https://teamworks.my`). **반드시 `https://` + 포트 없음** (Cloudflare 가 443 으로 받아서 내부 8080 으로 포워딩).
   > 이 값은 docker-compose 가 `FRONTEND_URL` (백엔드 CORS Allow-Origin) 와 `NEXT_PUBLIC_API_URL` (프론트 빌드 시 client bundle 에 인라인) 에 그대로 주입합니다. 실제 브라우저 주소창의 origin (스킴+호스트+포트) 과 정확히 같지 않으면 CORS 차단으로 API 호출이 깨집니다.
6. `다른 이름으로 저장`:
   - 위치: `C:\TeamWorks\team-works` (프로젝트 루트, docker-compose.yml 과 같은 폴더)
   - 파일 형식: 모든 파일
   - 파일 이름: `.env` (앞에 점 있고 확장자 없음)

> 이 `.env` 는 docker-compose 가 자동으로 읽어서 컨테이너에 주입합니다. **`backend\.env.local` 과 다른 파일** 이니 헷갈리지 마세요.

### 4.4. AI 모델 자동 감지 — 별도 설정 불필요

코드는 실행 시점에 Ollama 에 떠 있는 모델을 자동으로 사용합니다. `gemma4:4bit` 만 띄워두면 그 모델로 동작합니다.

---

## STEP 5. 서버 처음 시작 + DB 초기화

### 5.1. 모든 서비스 시작

PowerShell 에서 (반드시 team-works 폴더 안에서):
```powershell
cd C:\TeamWorks\team-works
docker compose up -d
```

처음 실행 시 모든 이미지 다운로드 — 약 5~15분. 인내심.

### 5.2. 컨테이너 상태 확인

```powershell
docker compose ps
```

모든 컨테이너가 `Up` 또는 `running` 상태이어야 합니다:
```
team-works-backend-1     running
team-works-frontend-1    running
team-works-nginx-1       running
postgres-db              running
teamworks-open-webui     running
teamworks-searxng        running
```

### 5.3. 데이터베이스 스키마 적용 (테이블 만들기)

```powershell
docker exec -i postgres-db psql -U teamworks-manager -d teamworks < database\schema.sql
```

`CREATE TABLE`, `CREATE INDEX` 같은 메시지가 쭉 흘러가면 OK.

#### (선택) 시연·개발용 테스트 데이터 넣기

빈 DB 로 시작하면 회원가입부터 직접 해야 합니다. 데모/시연용으로 **사용자 8명, 팀 4개, 일정·게시판·포스트잇** 등이 미리 채워진 상태로 시작하려면 아래를 추가 실행:

```powershell
docker exec -i postgres-db psql -U teamworks-manager -d teamworks < database\seed-dev.sql
```

`INSERT 0 8`, `INSERT 0 4` 같은 메시지가 흘러가면 OK.

로그인 정보:
- **메인 운영자**: `dev0@naver.com` (기획팀 LEADER)
- 그 외 계정: `dev1@naver.com` ~ `dev4@naver.com`, `demo1@naver.com` ~ `demo3@naver.com`
- **모든 계정 비밀번호 공통**: `Abc123!@#`

> ⚠️ 운영 배포에는 사용 금지 — 알려진 비밀번호로 계정이 미리 만들어집니다. 시연·개발 환경에서만 실행하세요.
>
> 데이터를 다시 깨끗하게 지우려면: `database\reset-and-reapply.sql` 실행 후 다시 5.3 부터.

### 5.4. RAG 인덱스 빌드 (사용법 문서 검색용)

먼저 Node.js 를 설치합니다:
1. https://nodejs.org/ko 접속 → **LTS** 버전 다운로드 (예: 22.x).
2. 기본 옵션으로 설치.
3. PowerShell 새로 열어서:
   ```powershell
   node --version
   ```
   버전 표시되면 OK.

이제 RAG 데이터 빌드:
```powershell
cd C:\TeamWorks\team-works\rag
npm install
npm run index
```

170여 개 청크가 임베딩됩니다 (1~2분).

### 5.5. RAG 서버 시작

```powershell
npm run server
```

화면에 `RAG server listening on http://127.0.0.1:8787` 이 보이면 성공.

> 이 PowerShell 창은 **닫지 마세요**. 닫으면 RAG 서버 꺼집니다. 자동 시작은 STEP 8 에서.

### 5.6. 서비스 동작 확인

웹 브라우저에서 `http://localhost:8080` 접속. 로그인 화면이 보이면 성공.

회원 가입 → 팀 만들기 → 일정 등록 → 캘린더·채팅 — 모두 동작하면 OK.

> ⚠️ 이 시점에 AI 찰떡이에게 **"오늘 뉴스"** 같은 일반 질문을 하면 "**OPEN_WEBUI_API_KEY 가 설정되어 있지 않습니다**" 에러가 정상입니다. 다음 5.7 단계에서 해결합니다. **사용법 질문**(예: "포스트잇 등록법") 과 **일정 조회·등록**은 이미 동작합니다.

### 5.7. Open WebUI 초기 설정 (일반 질문 활성화)

찰떡이의 **일반 질문 답변** (날씨·뉴스·시사·일반 지식) 은 별도 컨테이너인 Open WebUI 가 처리합니다. 4단계만 거치면 됩니다.

> **간소화 배경**: frontend (`route.ts`) 가 매 요청마다 system prompt 와 사용자 메시지를 직접 보내고, 웹 검색도 SearxNG 를 직접 호출(`features.web_search: false`) 합니다. 사용할 **모델 이름은 Ollama `/api/ps` 로 자동 감지** (`frontend/lib/openWebUiModel.ts`). 따라서 Open WebUI 의 모델 프리셋·시스템 프롬프트·Web Search 권한 모두 미사용. `.env` 에 모델 이름 명시도 불필요.
>
> Open WebUI 버전: `ghcr.io/open-webui/open-webui:main` (v0.9.x 기준).

#### 5.7.1. Open WebUI 첫 접속 + admin 계정 생성

1. 브라우저에서 `http://localhost:8081` 접속 (8080 아님 — 한 자리 다름).
2. **Sign Up** 화면. 첫 가입자가 자동으로 admin 권한을 받습니다:
   - 이름: 본인 이름 (예: `admin`)
   - 이메일: 본인 이메일 (식별용, 외부 노출 X)
   - 비밀번호: 강력하게 (잊지 마세요 — 분실 시 STEP 9 FAQ 참고)
3. **Sign Up** → 자동 로그인됨.

#### 5.7.2. 새 가입 차단 (보안)

admin 1명만 쓰는 패턴이라 외부에서 가입 못 하도록 즉시 막습니다.

1. 좌측 사이드바 **하단의 본인 아바타** (이름 옆 동그라미) 클릭.
2. 드롭다운 → **Admin Panel** (관리자 패널).
3. 좌측 메뉴 **Settings** → 상단 탭 **General**.
4. **Enable New Sign Ups** (또는 **새 회원가입 활성화**) 토글 **OFF** → 하단 **Save**.

> 기본값은 **ON** 으로 만들어집니다. 반드시 OFF 로 바꾼 뒤 저장하세요.

#### 5.7.3. 웹 검색 활성화 (SearxNG 연결)

찰떡이의 일반 질문 답변에 사용할 웹 검색 백엔드를 SearxNG 컨테이너로 연결합니다.

1. **Admin Panel** → 좌측 **Settings** → **웹 검색** (또는 **Web Search**) 메뉴.
2. 다음과 같이 설정:

   | 항목 | 값 |
   |---|---|
   | **웹 검색** (Web Search) | **ON** |
   | **웹 검색 엔진** (Web Search Engine) | `searxng` |
   | **Searxng 쿼리 URL** | `http://searxng:8080/search?q=<query>&format=json` |
   | **검색 결과 수** (Search Result Count) | `3~5` |
   | **동시 요청 수** (Concurrent Requests) | `3~5` |
   | **임베딩 검색 우회** (Bypass Embedding & Retrieval) | **ON** |
   | **웹 컨텐츠 불러오기 생략** (Bypass Web Loader) | **OFF** |
   | **신뢰할 수 있는 프록시 환경** (Trust Proxy Environment) | **OFF** |
   | **SSL 인증서 확인** (SSL Verification) | **ON** |

3. 하단 **Save** (저장).

> ⚠️ **Searxng 쿼리 URL** 의 호스트는 반드시 `searxng` (컨테이너 네트워크 이름). `localhost` 나 `127.0.0.1` 로 두면 Open WebUI 컨테이너 내부 자기 자신을 가리켜서 검색이 실패합니다.
>
> 결과 수·동시 요청 수는 **3~5** 범위 권장. 게이밍 노트북(RAM 16GB) 기본값은 `3`, RAM·CPU 여유 있으면 `5` 까지 올려 답변 컨텍스트를 더 풍부하게. 5 초과 시 Open WebUI 가 SearxNG 응답 대기로 첫 토큰까지 시간이 늘어남.

#### 5.7.4. 연결·모델 — 별도 설정 불필요

- **연결 (Connections)**: Ollama 가 호스트에서 떠 있고 docker-compose.yml 의 `OLLAMA_BASE_URL=http://host.docker.internal:11434` 가 자동 주입되므로 **건드리지 않음**.
- **모델 (Models)**: Open WebUI 가 부팅·새로고침 시 Ollama 의 모델을 자동 import. 좌측 사이드바 **하단 Workspace 아이콘 → Models** 에서 `gemma4:4bit`, `gemma4:e4b` 같은 본인이 받아둔 모델이 보이면 OK. 별도 프리셋(예: `gemma4-web`) 만들 필요 없음 — frontend 가 `/api/models` 조회로 자동 선택합니다.

#### 5.7.5. API 키 발급

1. 좌측 사이드바 **하단의 본인 아바타** 클릭.
2. 드롭다운에서 **Settings** (설정) 선택.
3. 좌측 카테고리 **Account** (계정) 클릭.
4. 하단으로 스크롤 → **API Keys** 섹션.
5. **Create new secret key** (또는 **+ Create API Key**) 클릭.
6. 표시된 키를 **즉시 복사**. **다시 못 봅니다 — 창 닫으면 끝**.

> ⚠️ **`sk-` 접두사를 포함한 전체 키를 그대로 복사하세요.** `sk-` 까지가 키의 일부라 빼면 Authorization 검증 실패로 401 에러가 납니다.
>
> 예: 화면에 `sk-1234567890abcdef...` 표시 → `.env` 에 `OPEN_WEBUI_API_KEY=sk-1234567890abcdef...` (전체 그대로).

#### 5.7.6. 루트 `.env` 채우기

1. 메모장으로 `C:\TeamWorks\team-works\.env` 열기.
2. 2개 항목을 모두 채웁니다:
   ```
   OPEN_WEBUI_SECRET_KEY=aB3xY9zKp...           ← 4.3 에서 만든 32자, 그대로
   OPEN_WEBUI_API_KEY=sk-1234567890abcdef...    ← 5.7.5 에서 복사한 키 (sk- 포함 전체)
   ```
3. 저장 (`Ctrl+S`).

> **모델 이름 (`OPEN_WEBUI_MODEL`) 은 명시 불필요** — frontend 가 Ollama 에 떠 있는 chat 모델을 자동으로 골라 사용합니다. 운영자가 강제로 특정 프리셋·모델을 쓰고 싶을 때만 `.env` 에 `OPEN_WEBUI_MODEL=원하는이름` 한 줄 추가하면 그 값이 우선 적용됨.
>
> **`.env` 파일은 절대 git 에 올리지 마세요**. 프로젝트의 `.gitignore` 에 이미 등록되어 있지만 혹시 다른 사람과 폴더 공유 시 주의.

#### 5.7.7. frontend 컨테이너 재기동 + 동작 확인

`.env` 변경은 컨테이너 재기동 시점에만 반영됩니다.

```powershell
cd C:\TeamWorks\team-works
docker compose restart frontend
```

10~20초 대기 후:

1. `http://localhost:8080` → 찰떡이 탭.
2. 입력: **"오늘 서울 날씨 어때?"** 또는 **"오늘 뉴스 검색해줘"**.
3. 30초~1분 (게이밍 노트북) 안에 다음이 나와야 성공:
   - 한국어 답변
   - 답변 끝에 **출처 URL 1~3개** (frontend 가 SearxNG 를 직접 호출해 결과를 모델에 주입)

답변에 출처 URL 이 0건이거나 모델 이름 못 찾는 에러가 나면 STEP 9 FAQ 참고.

---

## STEP 6. 인터넷에 공개하기 (Cloudflare Tunnel)

집에서 노트북을 외부에 공개하는 가장 쉬운 방법은 **Cloudflare Tunnel** 입니다. 무료. HTTPS 자동. 공유기 설정 불필요.

### 6.1. Cloudflare 계정 만들기

1. https://dash.cloudflare.com/sign-up 가입.
2. 이메일 인증.

### 6.2. (선택) 본인 도메인 연결

본인 도메인이 없어도 다음 단계의 무료 임시 도메인을 쓸 수 있어요. 본인 도메인을 쓰고 싶다면 아래 3 단계 — **A) 가비아 도메인 구입 → B) Cloudflare 에 사이트 등록 후 네임서버 확인 → C) 가비아의 네임서버를 Cloudflare 것으로 교체** — 를 진행합니다.

#### A. 가비아에서 도메인 구입

1. https://www.gabia.com 접속 → 상단 검색창에 원하는 도메인 입력 (이 가이드 예시: `teamworks.my`).
2. 결과 화면에서 사용 가능한 TLD 선택 → **신청하기** → 결제 (1년 1~2 만원 내외, TLD 별 상이).
3. 결제 완료까지 대기 — 도메인이 본인 가비아 계정에 등록됩니다.

#### B. Cloudflare 에 사이트 등록 → 할당된 네임서버 확인

1. https://dash.cloudflare.com 로그인.
2. 대시보드 상단 **Add a Site** (또는 **+ Add** → **Existing domain**) 클릭.
3. 구입한 도메인 입력 (예: `teamworks.my`) → **Continue**.
4. 요금제 선택 화면에서 **Free** 플랜 선택 → **Continue**.
5. (DNS 레코드 자동 스캔 화면이 뜨면) 그대로 **Continue**.
6. **Change your nameservers** 화면에 표시되는 **네임서버 2 개** (예: `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`) 를 메모장에 복사 — 다음 단계에서 사용합니다.
   > 네임서버를 까먹었으면: 대시보드 → 해당 도메인 클릭 → 좌측 메뉴 **DNS** → **Records** → 페이지 하단 **Cloudflare Nameservers** 영역에서 다시 확인 가능.

#### C. 가비아 네임서버를 Cloudflare 것으로 교체

1. https://www.gabia.com 로그인 → 우측 상단 **My가비아** 클릭.
2. My가비아 화면 우측 하단 **도메인 통합 관리툴** 클릭.
3. 좌측 메뉴 패널 **도메인 정보 변경** 클릭.
4. 도메인 목록에서 변경할 도메인의 **체크박스** 체크.
5. 상단 가로 메뉴 중 **첫 번째 항목 "네임서버"** 선택.
6. 1차/2차 네임서버 입력란에 위 B-6 에서 복사한 Cloudflare 네임서버 2 개를 각각 붙여넣기.
   - **1차** → `xxx.ns.cloudflare.com`
   - **2차** → `yyy.ns.cloudflare.com`
7. **3차/4차/5차 네임서버 칸은 비우기** (기존 가비아 기본값이 들어 있으면 모두 삭제). Cloudflare 는 2 개만 사용합니다.
8. 하단 **소유자 인증** (휴대폰/이메일 인증) 후 **저장**.

#### D. 전파 대기 및 확인

- 보통 **5 분 ~ 1 시간** 내에 Cloudflare 가 네임서버 변경을 감지합니다 (최대 24~48 시간).
- 감지되면 Cloudflare 대시보드의 해당 도메인 상태가 **Active** (초록색) 로 바뀌고, 등록한 이메일로 *"Your domain is now active on Cloudflare"* 안내 메일이 옵니다.
- 직접 확인하려면 PowerShell 에서:
  ```powershell
  nslookup -type=NS teamworks.my
  ```
  결과의 nameserver 가 `*.ns.cloudflare.com` 으로 나오면 전파 완료.

> **Active** 가 되기 전엔 다음 단계 (6.3 영구 터널의 도메인 라우팅) 가 동작하지 않습니다. 기다리는 동안엔 STEP 5.6 까지 진행해서 호스트 머신 자체에서 `http://localhost:8080` 접속 테스트로 동작 확인 가능.

### 6.3. cloudflared 로 본인 도메인 영구 연결

**전제:** 6.2 가 모두 끝나서 Cloudflare 대시보드의 도메인 상태가 **Active** (초록).

총 4 단계 — **A. 설치 → B. 터널 만들고 토큰 받기 → C. 토큰을 서비스로 등록 → D. 도메인 연결** — 으로 끝납니다. 끝나면 PC 재부팅 후에도 자동 시작.

---

#### A. cloudflared 설치

PowerShell **관리자 권한** 으로:
```powershell
winget install --id Cloudflare.cloudflared
```

새 PowerShell 창을 열어서 설치 확인:
```powershell
cloudflared --version
```
버전 번호가 보이면 OK.

---

#### B. Cloudflare 대시보드에서 터널 만들고 토큰 복사

1. https://one.dash.cloudflare.com 로그인 (또는 https://dash.cloudflare.com → 좌측 **Zero Trust**).
2. 좌측 메뉴 → **Networks** → **Connectors** → **Add a tunnel** (구버전 대시보드에서는 **Networks → Tunnels → Create a tunnel**).
3. **터널 타입 선택** — 두 가지 중 **a. Cloudflared** 를 선택 → **Next**.
   - **a. Cloudflared** ← 우리가 쓸 것. 노트북에서 인터넷으로 서비스(`teamworks.my`)를 공개하는 표준 터널.
   - **b. WARP Connector (Mesh)** — 사설망끼리 site-to-site 로 연결할 때 쓰는 VPN 형태. 이 가이드 용도와 무관.
4. 커넥터 종류 화면에서 **Cloudflared** 한 번 더 확인 → **Next** (UI 버전에 따라 3 번 단계와 합쳐져 있을 수 있음 — 그땐 건너뛰기).
5. 터널 이름 입력 (예: `teamworks-laptop`) → **Save tunnel**.
6. 다음 화면 **Install and run a connector** 에서 환경 **Windows** 선택.
7. 화면에 표시된 명령어 중 **`<긴토큰>` 부분만** 복사 (다음 단계에서 사용).

---

#### C. 토큰을 Windows 서비스로 등록 (자동 시작 포함)

PowerShell **관리자 권한** 으로:
```powershell
cloudflared service install <B에서_복사한_긴토큰>
```

설치되면 Windows 서비스로 등록되어 **PC 재부팅 후 자동 시작**.

확인:
```powershell
Get-Service cloudflared
```
`Status` 가 `Running` 이면 OK.

Cloudflare 대시보드의 같은 터널 화면에서 **Connector status: Healthy** (초록) 로 바뀌면 성공 → **Next** 클릭.

---

#### D. 도메인을 localhost:8080 에 연결 (Public Hostname)

이어지는 **Public Hostnames** 단계에서 **Add a public hostname** — 다음 표대로 입력:

| 항목 | 입력값 |
|---|---|
| Subdomain | **(비워둠)** ← apex 도메인 (`teamworks.my`) 자체로 서빙 |
| Domain | 6.2 에서 등록한 본인 도메인 선택 (드롭다운, 예: `teamworks.my`) |
| Path | (비워둠) |
| Type | `HTTP` |
| URL | `localhost:8080` |

**Save hostname** 클릭.

> 💡 Cloudflare 는 **CNAME flattening** 으로 apex 도메인 라우팅을 자동 처리합니다 — 별도 DNS 레코드 추가 불필요.
>
> `www.teamworks.my` 로 들어오는 사용자도 받고 싶다면 같은 화면에서 **Add a public hostname** 을 한 번 더: Subdomain `www`, 나머지 동일. 또는 Cloudflare 대시보드 → **Rules → Redirect Rules** 로 `www.teamworks.my → teamworks.my` 영구 리다이렉트.

> 마법사를 이미 닫았다면: **Networks → Connectors → 터널 이름 클릭 → Configure → Public Hostname 탭 → Add a public hostname** 으로 들어가서 위 표대로 입력해도 동일합니다 (구버전: **Networks → Tunnels → ...**).

---

#### E. 접속 확인

1~2 분 후 브라우저에서 `https://teamworks.my` 접속 → TEAM WORKS 로그인 화면이 보이면 성공. HTTPS 인증서는 Cloudflare 가 자동 발급·갱신.

랜딩 페이지는 `https://teamworks.my/landing` 에서 같은 도메인의 **하위 경로**로 서빙됩니다 (Next.js 라우트 `frontend/app/landing/page.tsx`).
- 도메인 1 개로 앱 + 랜딩을 모두 커버 → 추가 Public Hostname 불필요.
- 마케팅 헤더/푸터 등은 Next.js 라우트 그룹 외부 (`(auth)`/`(main)` 와 별개) 라서 앱 글로벌 레이아웃과 자연스럽게 분리됨.

> ⚠️ 로그인은 되는데 일정/팀 등 데이터 호출이 CORS 에러로 막힌다면 → STEP 4.3 의 `PUBLIC_BASE_URL` 을 `https://teamworks.my` 로 바꾸고 `docker compose up -d --force-recreate backend frontend` 로 재기동.

> 별도 도메인이 필요한 다른 서비스 (예: 8081 의 Open WebUI 관리 콘솔) 는 **D** 와 동일한 방식으로 **Public Hostname** 을 추가 (Subdomain `webui`, URL `localhost:8081` → `https://webui.teamworks.my`).

---

### 6.4. 새 기능 운영 반영 (Update)

GitHub 저장소에 새 코드가 push 됐을 때 운영 PC 에 반영하려면 PowerShell 에서 다음 두 줄:

```powershell
cd C:\TeamWorks\team-works
git pull origin main
docker compose restart frontend backend
```

frontend·backend 컨테이너가 재기동되면서:
- `npm install` 자동 재실행 → `package.json` 의존성 변경 흡수
- Next.js dev 서버 fresh 시작 → hot-reload 가 놓쳤을 수 있는 **신규 라우트·신규 파일** 도 모두 인덱싱

일반적인 코드 수정은 이 두 줄로 충분합니다.

> **추가 작업이 필요한 경우** (PR 설명에 따라 판별):
>
> | 변경 종류 | 추가 명령 |
> |---|---|
> | DB 스키마 변경 (`database/add-*.sql` 새로 추가됨) | `docker exec -i postgres-db psql -U teamworks-manager -d teamworks < database\add-*.sql` |
> | RAG 문서 변경 (`ollama/*.md`) | `cd rag && npm run index` 후 RAG 서버 재기동 |
> | `docker-compose.yml` 또는 루트 `.env` 변경 | `docker compose restart` 가 아니라 `docker compose up -d` (compose 파일·env 재평가) |

#### (선택) 자동화 스크립트

매번 두 줄 입력하기 번거로우면 `C:\TeamWorks\update.bat` 으로 만들어 두기:

```bat
@echo off
echo TEAM WORKS 업데이트 시작...
cd /d C:\TeamWorks\team-works
git pull origin main
docker compose restart frontend backend
echo 업데이트 완료. 브라우저에서 동작 확인하세요.
pause
```

바탕화면에 바로가기로 빼두면 더블클릭 한 번으로 끝.

#### 롤백 (문제 생겼을 때)

```powershell
cd C:\TeamWorks\team-works
git log --oneline -10                       # 이전 커밋 해시 확인
git reset --hard <이전커밋해시>             # 코드 되돌리기
docker compose restart frontend backend     # 적용
```

DB 까지 되돌리려면 STEP 9 FAQ 의 "백업 파일 복원은 어떻게 하나?" 참고.

---

## STEP 7. 자동 시작 + 자동 백업 설정

노트북 재부팅 후에도 자동으로 모든 서비스가 켜지도록 설정합니다.

### 7.1. Docker Desktop 자동 시작 (이미 STEP 1.5 에서 설정함)

확인: Docker Desktop → Settings → General → `Start Docker Desktop when you sign in` 체크 표시.

### 7.2. RAG 서버 자동 시작 스크립트 만들기

1. 메모장 실행.
2. 다음 내용 입력:
   ```bat
   @echo off
   cd /d C:\TeamWorks\team-works\rag
   npm run server
   ```
3. 저장:
   - 위치: `C:\TeamWorks`
   - 파일 이름: `start-rag.bat`
   - 파일 형식: 모든 파일

### 7.3. Docker Compose 자동 시작 스크립트

같은 방식으로 메모장에:
```bat
@echo off
cd /d C:\TeamWorks\team-works
docker compose up -d
```
저장 — `C:\TeamWorks\start-services.bat`

### 7.4. 통합 시작 스크립트

메모장에:
```bat
@echo off
echo TEAM WORKS 시작 중...
timeout /t 30 /nobreak >nul
echo Docker 컨테이너 기동...
call C:\TeamWorks\start-services.bat
echo RAG 서버 기동...
start "RAG Server" /min cmd /c C:\TeamWorks\start-rag.bat
echo 완료!
```
저장 — `C:\TeamWorks\start-all.bat`

> `timeout 30` 은 부팅 직후 Docker Desktop 이 완전히 뜨기를 기다리는 시간.

### 7.5. 부팅 시 자동 실행 등록 (작업 스케줄러)

1. 시작 메뉴 → `작업 스케줄러` 검색 → 실행.
2. 우측 **작업 만들기** 클릭.
3. **일반** 탭:
   - 이름: `TeamWorks AutoStart`
   - 설명: 부팅 시 TEAM WORKS 자동 시작
   - ✅ `사용자가 로그온할 때만 실행`
   - ✅ `가장 높은 수준의 권한으로 실행`
4. **트리거** 탭 → **새로 만들기** →
   - 작업 시작: `로그온할 때`
   - 지연 시간: 30 초
   - **확인**.
5. **동작** 탭 → **새로 만들기** →
   - 동작: `프로그램 시작`
   - 프로그램: `C:\TeamWorks\start-all.bat`
   - **확인**.
6. **확인** 으로 저장.

테스트: 노트북 재부팅 → 30초 후 `http://localhost:8080` 접속 → 잘 뜨면 성공.

### 7.6. 매일 자동 백업 스크립트

데이터 손실 방지. 매일 새벽 3시에 DB 백업.

1. 외장 디스크 연결 (예: `D:\` 드라이브로 인식).
2. 메모장에:
   ```bat
   @echo off
   set BACKUP_DIR=D:\TeamWorksBackup
   if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
   set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%
   docker exec postgres-db pg_dump -U teamworks-manager teamworks > "%BACKUP_DIR%\teamworks_%TIMESTAMP%.sql"
   echo 백업 완료: %BACKUP_DIR%\teamworks_%TIMESTAMP%.sql
   ```
3. 저장 — `C:\TeamWorks\backup.bat`.

4. 작업 스케줄러에 등록:
   - 이름: `TeamWorks DailyBackup`
   - 트리거: `매일`, 새벽 03:00
   - 동작: `C:\TeamWorks\backup.bat`

5. 일주일 뒤 외장 디스크에 `teamworks_20260508.sql` 같은 파일이 매일 쌓이면 성공.

### 7.7. 백업 파일 7일 이상 자동 삭제 (선택)

`C:\TeamWorks\cleanup-backup.bat`:
```bat
@echo off
forfiles /p D:\TeamWorksBackup /m *.sql /d -7 /c "cmd /c del @path"
```

작업 스케줄러: 매주 일요일 04:00 실행.

---

## STEP 8. 모니터링 — 잘 돌아가는지 확인하기

### 8.1. 컨테이너 상태 빠르게 확인

PowerShell:
```powershell
cd C:\TeamWorks\team-works
docker compose ps
```

모두 `Up` 이어야 정상.

### 8.2. 로그 보기 (문제 생겼을 때)

```powershell
# 백엔드 로그 마지막 50줄
docker logs --tail 50 team-works-backend-1

# 프론트엔드 로그
docker logs --tail 50 team-works-frontend-1

# 실시간 로그 (Ctrl+C 로 종료)
docker logs -f team-works-backend-1
```

### 8.3. AI 모델 메모리 사용량

```powershell
ollama ps
```

지금 떠 있는 모델과 VRAM 사용량 표시.

### 8.4. 디스크 공간 확인

```powershell
docker system df
```

Docker 가 점유한 공간 확인. 30GB 넘으면 정리 필요:
```powershell
docker system prune -a
```
(주의: 사용 중이지 않은 이미지·캐시 삭제. 데이터는 안 지워짐.)

### 8.5. 윈도우 작업 관리자

`Ctrl+Shift+Esc` → **성능** 탭:
- CPU 사용률 70% 미만 권장
- 메모리 사용률 80% 미만 권장
- GPU 사용률 (Ollama 답변 중일 때만 50~90% 정상)

---

## STEP 9. 자주 묻는 질문 / 문제 해결

### Q. 컨테이너 하나가 안 뜬다 / 자꾸 재시작된다
```powershell
docker logs team-works-backend-1
```
로그를 보고 에러 메시지로 검색. 90% 는 환경변수(`backend\.env.local`) 비밀번호 불일치.

### Q. AI 찰떡이 답변이 너무 느리다 (30초 이상)
1. `ollama ps` 로 모델 GPU 사용 확인.
2. GPU 가 비어 있으면 → `ollama run gemma4:4bit ""` 로 다시 띄우기.
3. 그래도 느리면 더 작은 모델로 교체:
   ```powershell
   ollama pull gemma3:1b
   ```
   1B 모델은 답변 속도 2~3초, 단 정확도가 살짝 낮음.

### Q. AI 가 "AI 모델에 연결할 수 없습니다" 에러
- Ollama 가 안 떠있거나 모델이 unload 됨.
- 시스템 트레이의 라마 아이콘 확인. 없으면 시작 메뉴에서 `Ollama` 실행.
- `ollama run gemma4:4bit ""` 로 모델 메모리에 올림.

### Q. AI 일반 질문 시 "OPEN_WEBUI_API_KEY 가 설정되어 있지 않습니다" 에러
**원인**: 루트 `.env` 의 `OPEN_WEBUI_API_KEY` 가 비어있거나 frontend 컨테이너에 반영 안 됨.

**해결**:
1. **STEP 5.7 을 안 했으면** 5.7 전체 진행 — admin 계정 + API 키 발급 + `.env` 채우기.
2. **이미 했는데도 에러** 면:
   - `C:\TeamWorks\team-works\.env` 메모장으로 열어 `OPEN_WEBUI_API_KEY=` 뒤 값이 비어있지 않은지 확인.
   - 값이 `sk-` 로 시작하는 전체 키인지 확인 (5.7.5 의 ⚠️ 참고).
   - frontend 재기동: `docker compose restart frontend`
   - 컨테이너 환경변수 확인:
     ```powershell
     docker exec team-works-frontend-1 sh -c "echo $OPEN_WEBUI_API_KEY"
     ```
     키 값이 출력되면 정상. 빈 줄이면 `.env` 파일 위치(`team-works\` 루트) 또는 파일명 확인.

### Q. AI 일반 질문 시 "AI 모델에 연결할 수 없습니다" 에러
**원인**: Open WebUI 가 인식하는 chat 모델이 없거나 자동 해석이 실패. frontend 는 `OPEN_WEBUI_BASE_URL/api/models` 를 조회해 chat 모델을 자동 선택합니다.

**해결**:
1. `http://localhost:8081` 접속 → 좌상단 모델 드롭다운에 본인이 받아둔 모델 (`gemma4:4bit` 등) 이 보이는지 확인.
2. 안 보이면 — Ollama 에 모델이 떠있는데 Open WebUI 가 sync 못 한 상태:
   ```powershell
   ollama run gemma4:4bit ""        # 모델 메모리에 로드
   docker compose restart open-webui   # Open WebUI 가 모델 list 재로드
   ```
3. 그래도 안 보이면 — `ollama list` 에 모델 자체가 없는 것. STEP 2.1 의 GGUF 다운로드 + `ollama create gemma4:4bit -f Modelfile` 절차 다시.
4. (드물게) 강제로 특정 프리셋·모델을 쓰고 싶다면 `.env` 에 `OPEN_WEBUI_MODEL=원하는이름` 한 줄 추가 후 `docker compose restart frontend`.

### Q. AI 일반 질문 답변에 출처 URL 이 없거나 거짓 정보 (할루시네이션)
**원인**: SearxNG 가 호출 안 되거나 검색 결과 0건. (Open WebUI 의 Web Search 권한과 무관 — frontend 가 SearxNG 를 직접 호출하므로.)

**해결**: 아래 "SearxNG 가 호출 안 되는 듯" 항목 참고.

판별 시그널:
- 답변에 `"인터넷에 접속할 수 없어"`, `"검색을 할 수 없어"` 같은 문구 → SearxNG 호출 실패
- 출처 URL 이 0개 → 위와 동일

### Q. 코드베이스 디렉토리 이름을 바꾸려는데 "사용 중" 또는 "권한 거부" 로 안 된다
**원인**: Docker Desktop·WSL2·Node.js 프로세스 중 하나가 `team-works` 폴더 안의 파일을 잠그고 있어 Windows 가 폴더 이름을 못 바꿈.

**해결 — 잠금 해제 후 이름 변경**:

1. **Docker Desktop 종료** — 윈도우 우측 하단 시스템 트레이의 **고래(Docker) 아이콘** 우클릭 → **Quit Docker Desktop**.
2. **WSL2 종료** — PowerShell 에서:
   ```powershell
   wsl --shutdown
   ```
3. **Node.js 프로세스 종료** — 작업 관리자(`Ctrl+Shift+Esc`) → 상단 검색창에 **`node`** 입력 → 검색된 모든 `Node.js: ...` 또는 `node.exe` 항목 우클릭 → **작업 끝내기**.
4. 이제 탐색기에서 `C:\TeamWorks\team-works` 폴더를 우클릭 → **이름 바꾸기** 가능.
5. 이름 바꾼 뒤 Docker Desktop 다시 시작 → `docker compose up -d` 로 컨테이너 재기동.

> 폴더 경로가 바뀌면 본 가이드의 모든 `C:\TeamWorks\team-works\...` 경로도 새 경로로 함께 읽어 주세요. `.env`·`backend\.env.local`·작업 스케줄러의 `start-all.bat` 안의 절대 경로도 업데이트 필요.

### Q. SearxNG 가 호출 안 되는 듯 / 검색 결과가 0 건
**원인**: 컨테이너 네트워크 또는 SearxNG 자체 문제.

**해결**:
1. SearxNG 컨테이너 살아있는지: `docker compose ps` → `teamworks-searxng` 가 `running` 인지.
2. 직접 호출 테스트 (호스트에서):
   ```powershell
   docker exec teamworks-searxng wget -qO- "http://localhost:8080/search?q=hello&format=json" | head -c 200
   ```
   JSON 결과가 나오면 SearxNG 정상.
3. SearxNG 설정 파일은 `C:\TeamWorks\team-works\docker\searxng-settings.yml` — 변경 후 `docker compose restart searxng`.

### Q. 외부에서 접속이 안 된다
1. 노트북에서 `http://localhost:8080` 으로 먼저 접속 — 안 되면 Docker 문제, 됩니다 → Cloudflare 문제.
2. Cloudflare Tunnel 상태 확인:
   - 윈도우 서비스(`services.msc`) → `Cloudflared` 서비스 실행 중?
   - 안 됨 → 우클릭 → 시작.
3. Cloudflare 대시보드 → **Networks → Connectors** (구버전: **Tunnels**) → 본인 터널의 상태가 `HEALTHY` 인지 확인.

### Q. 디스크가 가득 찼다
1. `docker system df` 로 점유 공간 확인.
2. `docker system prune -a` 로 정리.
3. AI 모델 안 쓰는 거 삭제: `ollama rm 모델이름`.
4. 백업 파일 오래된 것 삭제 (`D:\TeamWorksBackup`).
5. 윈도우 임시 파일 정리: `cleanmgr.exe`.

### Q. 노트북을 잠깐 닫으면 (덮개) 서비스가 멈춘다
`설정` → `시스템` → `전원 및 배터리` → `덮개 및 전원 단추 동작` →
- 덮개 닫을 때: **아무 동작 안 함** 으로 변경.
- 전원 단추: **시스템 종료** 그대로 유지.

> 발열 주의. 받침대로 들어올려 환기 확보 권장.

### Q. 윈도우 업데이트로 강제 재부팅되어 서비스가 끊긴다
`설정` → `Windows 업데이트` → `고급 옵션` → `사용 시간` 을 노트북 사용자가 가장 적은 시간(예: 새벽 3~7시) 으로 설정. 하지만 STEP 7.5 의 자동 시작이 잘 되어 있다면 재부팅 후 약 1분 안에 다시 켜집니다.

### Q. 노트북이 너무 뜨겁다 / 팬 소음 심하다
1. **받침대** 사용 (5천원~). 환기 핵심.
2. NVIDIA 제어판 → 전원 관리 모드 → `최대 성능 우선` 대신 `최적의 전원` 으로.
3. 윈도우 전원 옵션 → `균형 조정` 으로.
4. 외부 모니터·키보드 연결해서 노트북 덮개 살짝 닫고 옆에 두는 것도 좋음.

### Q. 백업 파일 복원은 어떻게 하나?
```powershell
# 기존 DB 비우기 (주의: 모든 데이터 사라짐)
docker exec -it postgres-db psql -U teamworks-manager -c "DROP DATABASE teamworks;"
docker exec -it postgres-db psql -U teamworks-manager -c "CREATE DATABASE teamworks;"
# 백업 파일에서 복원
docker exec -i postgres-db psql -U teamworks-manager -d teamworks < D:\TeamWorksBackup\teamworks_20260508.sql
```

### Q. 비밀번호 잊어버렸다
DB 에 직접 접속해서 임시 비밀번호 해시로 변경. 자세한 절차는 운영자에게 문의.

### Q. 사용자가 늘어서 느려진다
- `docker stats` 로 자원 병목 확인.
- CPU 가 병목 → 사용자 한도 안내. 또는 더 좋은 노트북·데스크탑·VPS 로 이전.
- AI 답변만 느림 → 더 작은 모델(`gemma3:1b`) 또는 별도 GPU 머신으로 분리.

---

## STEP 10. 운영 한계 + 다음 단계

### 10.1. 게이밍 노트북의 본질적 한계

| 한계 | 영향 |
|---|---|
| 24/7 발열·팬 수명 | 1~2년 후 팬 교체 필요 가능성 |
| 배터리 부풀음 | 365일 충전 상태 유지 시 위험 — 가능하면 배터리 분리하거나 80% 충전 제한 사용 |
| 무선 인터넷 | 끊김 위험 → **유선 이더넷 강력 권장** |
| 정전 | UPS (무정전 전원장치) 없으면 데이터 손상 가능 |
| 윈도우 업데이트 | 강제 재부팅 시 잠깐 다운 |

### 10.2. 단계별 업그레이드 추천

**[1단계] 지금 (게이밍 노트북, 사용자 ~10명)**
- 이 가이드대로 충분.
- 외장 SSD 백업 필수.

**[2단계] 사용자 20~50명 (작은 회사·동호회)**
- 데스크탑 PC 로 이전 — 발열·소음 자유.
- RAM 32GB, GPU RTX 4060 Ti 16GB 이상 권장.
- gemma4:e4b 같은 큰 모델도 GPU 안에 들어감.

**[3단계] 사용자 50명 이상 / 안정성 필요**
- 클라우드 VPS (예: AWS Lightsail, GCP, OCI) 로 이전.
- 월 5~20만원, 24/7 가용성·자동 백업 보장.
- 자세한 절차는 [`19-deploy-guide.md`](./19-deploy-guide.md) 참고.

### 10.3. 정기 관리 체크리스트

**매일 (자동)**
- [ ] DB 백업 (스케줄러)

**매주**
- [ ] 백업 파일 정상 생성 여부 외장 디스크에서 확인
- [ ] `docker system df` 디스크 사용량 점검

**매달**
- [ ] `docker system prune -a` 로 안 쓰는 이미지 정리
- [ ] NVIDIA 드라이버 / Docker Desktop / Ollama 업데이트 확인
- [ ] 외장 디스크 백업을 클라우드(구글 드라이브 등) 에 추가 복사

**6개월에 한 번**
- [ ] 노트북 내부 먼지 청소 (제조사 A/S 또는 전문가)
- [ ] 백업 복원 한 번 시뮬레이션 (데이터 안전 확인)

### 10.4. 도움 받을 곳

- TEAM WORKS 코드 이슈: 본인 GitHub 저장소 issues 탭.
- Docker / WSL2 문제: https://docs.docker.com
- Ollama 모델 문제: https://ollama.com/library
- Cloudflare Tunnel 문제: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

---

## 마무리

처음에는 복잡해 보이지만, **STEP 1~4 한 번** 하고 나면 그 다음부턴 노트북 켜져 있는 동안 자동으로 돌아갑니다. AI 찰떡이 답변 속도가 답답하면 더 작은 모델로 바꾸시고, 반대로 노트북이 더 좋다면 큰 모델 (`gemma4:e4b`, `gemma3:12b`) 도 돌려보세요.

**가장 중요한 것은 매일 자동 백업** 입니다. 노트북은 언제든 망가질 수 있어요. 외장 디스크와 클라우드 두 군데에 백업해두는 습관이 모든 운영자의 보험입니다.

이 가이드대로 했는데 막히는 단계가 있으면 그 단계를 정확히 적어 운영자나 팀에 문의하세요. **"안 되어요" 보다 "STEP 5.3 에서 'CREATE TABLE error: ...' 에러가 떴어요"** 가 훨씬 빨리 해결됩니다.
