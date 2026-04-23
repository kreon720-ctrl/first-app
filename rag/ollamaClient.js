import { OLLAMA_HOST } from "./config.js";

async function postJson(pathname, body) {
  const res = await fetch(`${OLLAMA_HOST}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${pathname} ${res.status}: ${text}`);
  }
  return res.json();
}

export async function embed(model, input) {
  const data = await postJson("/api/embed", { model, input });
  const vec = data.embeddings?.[0];
  if (!Array.isArray(vec)) {
    throw new Error(`embed: invalid response for model ${model}`);
  }
  return vec;
}

export async function chat(model, messages, options = {}) {
  return postJson("/api/chat", {
    model,
    messages,
    stream: false,
    options,
  });
}
