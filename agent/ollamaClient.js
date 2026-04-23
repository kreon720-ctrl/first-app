import { OLLAMA_HOST } from './config.js';

export async function chat(model, messages, options = {}, format = undefined) {
  const body = { model, messages, stream: false, options };
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
