import { OLLAMA_HOST } from './config.js';

// 모델 Modelfile 기본값(128K)을 그대로 두고 호출 시점에 32K로 명시 고정.
// num_predict 는 답변 잘림 방지용 출력 토큰 budget.
const DEFAULT_CHAT_OPTIONS = { num_ctx: 32768, num_predict: 1024 };

export async function chat(model, messages, options = {}, format = undefined) {
  const mergedOptions = { ...DEFAULT_CHAT_OPTIONS, ...options };
  const body = { model, messages, stream: false, options: mergedOptions };
  if (format !== undefined) body.format = format;
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama /api/chat ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data?.message?.content ?? '';
}
