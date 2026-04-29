import fs from "node:fs/promises";
import { CHUNKS_PATH, EMBED_MODEL, TOP_K } from "./config.js";
import { embed } from "./ollamaClient.js";
import { tokenize } from "./tokenizer.js";
import { score as bm25Score } from "./bm25.js";

let cache = null;

export async function loadIndex() {
  if (cache) return cache;
  const raw = await fs.readFile(CHUNKS_PATH, "utf8");
  cache = JSON.parse(raw);
  return cache;
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

const RRF_K = 60;

// Hybrid Search: Semantic(cosine) + BM25 → Reciprocal Rank Fusion
// 검색은 청크 단위로 정밀하게, 결과에는 청크가 속한 parent(파일 전문)도 함께 반환
export async function retrieve(question, topK = TOP_K) {
  const idx = await loadIndex();
  if (!idx.chunks || idx.chunks.length === 0) return [];

  // 1) Semantic 랭킹
  const qVec = await embed(EMBED_MODEL, `search_query: ${question}`);
  const semantic = idx.chunks
    .map((c, i) => ({ id: i, score: cosine(qVec, c.embedding) }))
    .sort((a, b) => b.score - a.score);

  // 2) BM25 랭킹
  const qTokens = tokenize(question);
  const lexical = idx.chunks
    .map((c, i) => ({ id: i, score: bm25Score(qTokens, c, idx.bm25) }))
    .sort((a, b) => b.score - a.score);

  // 3) RRF 융합
  const fused = new Map();
  semantic.forEach((r, rank) => {
    fused.set(r.id, (fused.get(r.id) || 0) + 1 / (RRF_K + rank));
  });
  lexical.forEach((r, rank) => {
    fused.set(r.id, (fused.get(r.id) || 0) + 1 / (RRF_K + rank));
  });

  // 4) 상위 K + parent 첨부
  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, fusedScore]) => {
      const chunk = idx.chunks[id];
      return {
        score: fusedScore,
        chunk,
        parent_id: chunk.parent_id,
        parent: idx.parents?.[chunk.parent_id] ?? chunk.text,
        // 디버깅용 개별 점수
        cos: semantic.find((s) => s.id === id)?.score ?? 0,
        bm25: lexical.find((l) => l.id === id)?.score ?? 0,
      };
    });
}
