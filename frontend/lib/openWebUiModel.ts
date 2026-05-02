// Open WebUI 호출 시 사용할 chat 모델 이름을 런타임에 자동 해석.
// Open WebUI `/api/models` 를 조회해 Open WebUI 가 인식하는 모델 중 chat
// 가능한 첫 번째를 선택. (Ollama `/api/ps` 가 아닌 이유: Ollama 에 떠있어도
// Open WebUI 가 동기화 안 한 모델은 호출 시 "Model not found" 404 로 실패.)
//
// 운영자가 Open WebUI 에 chat 모델 1개만 노출시킨다는 전제로, `.env` 의
// `OPEN_WEBUI_MODEL` 명시는 불필요. env 가 명시되면 그 값을 우선 사용.
//
// 제외 대상: 임베딩 모델(`nomic-embed-*`), Open WebUI 시스템 모델
// (`arena-model` — 모델 비교용 가상 모델).
//
// 캐시: 프로세스 라이프타임. frontend 컨테이너 재기동 시 재해석.

const OPEN_WEBUI_BASE_URL =
  process.env.OPEN_WEBUI_BASE_URL || 'http://127.0.0.1:8081';
const OPEN_WEBUI_API_KEY = process.env.OPEN_WEBUI_API_KEY || '';
const NOT_AVAILABLE_MSG = 'AI 모델에 연결할 수 없습니다.';

let cached: string | null = null;

interface OpenWebUiModel {
  id?: string;
  name?: string;
}

const EXCLUDE_RE = /^(arena-model|nomic-embed)/i;

export async function resolveOpenWebUiModel(): Promise<string> {
  // env 명시는 자동 해석보다 우선 — 운영자가 특정 프리셋·모델을 강제할 때.
  const explicit = process.env.OPEN_WEBUI_MODEL?.trim();
  if (explicit) return explicit;
  if (cached) return cached;
  if (!OPEN_WEBUI_API_KEY) throw new Error(NOT_AVAILABLE_MSG);
  try {
    const res = await fetch(`${OPEN_WEBUI_BASE_URL}/api/models`, {
      headers: { authorization: `Bearer ${OPEN_WEBUI_API_KEY}` },
    });
    if (!res.ok) throw new Error(NOT_AVAILABLE_MSG);
    const payload = (await res.json().catch(() => ({}))) as
      | { data?: OpenWebUiModel[] }
      | OpenWebUiModel[];
    const models: OpenWebUiModel[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    const chat = models.find((m) => {
      const id = (m?.id ?? m?.name ?? '').toString();
      return id !== '' && !EXCLUDE_RE.test(id);
    });
    const id = (chat?.id ?? chat?.name ?? '').toString();
    if (!id) throw new Error(NOT_AVAILABLE_MSG);
    cached = id;
    return cached;
  } catch {
    throw new Error(NOT_AVAILABLE_MSG);
  }
}

// 테스트·명시적 재해석용. 운영 중 모델 변경 시 컨테이너 재기동을 권장.
export function resetOpenWebUiModelCache(): void {
  cached = null;
}
