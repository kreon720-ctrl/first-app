import fs from "node:fs/promises";
import { CHUNKS_PATH, EMBED_MODEL, TOP_K } from "./config.js";
import { embed } from "./ollamaClient.js";

let cache = null;

export async function loadIndex() {
  if (cache) return cache;
  const raw = await fs.readFile(CHUNKS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  cache = parsed;
  return parsed;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const STOP = new Set([
  "어떻게","어디서","어디에","어디","어떤","무엇","뭐","뭔가","뭔지",
  "해요","하나요","되나요","있나요","인가요","나요","할까요","나오","나와","나오는",
  "있어","없어","있나","없나","있어요","없어요",
  "이거","저거","그거","이게","저게","그게",
  "그리고","그러면","하지만","또는","관련","대해","대한",
]);

function queryTerms(q) {
  const raw = q
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const terms = [];
  for (const w of raw) {
    if (STOP.has(w)) continue;
    if (w.length <= 1) continue;
    let stem = w;
    stem = stem.replace(/(?:이|가|을|를|은|는|의|로|으로|에|에서|에게|한테|께|도|만|까지|부터|처럼|보다|와|과|이나|나|든지|며|면|서)$/, "");
    if (stem.length <= 1) stem = w;
    terms.push(stem);
  }
  return terms;
}

function keywordScore(terms, text) {
  if (terms.length === 0) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const t of terms) {
    if (lower.includes(t)) hits++;
  }
  return hits / terms.length;
}

export async function retrieve(question, topK = TOP_K) {
  const idx = await loadIndex();
  const qVec = await embed(EMBED_MODEL, `search_query: ${question}`);
  const terms = queryTerms(question);
  const scored = idx.chunks.map((c) => {
    const cos = cosine(qVec, c.embedding);
    const kw = keywordScore(terms, `${c.section_path}\n${c.text}`);
    return { score: cos * 0.6 + kw * 0.4, cos, kw, chunk: c };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
