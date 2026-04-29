// 표준 BM25 (Robertson/Spärck Jones)
// - 인덱스 빌드 시 buildStats(chunks) 한 번 호출 → N, avgdl, df
// - 검색 시 score(qTokens, chunk, stats)로 청크 점수 계산
// - 청크 객체는 tokens(string[])과 doc_len(number)을 사전 계산해 가지고 있어야 함

const K1_DEFAULT = 1.2;
const B_DEFAULT = 0.75;

export function buildStats(chunks, { k1 = K1_DEFAULT, b = B_DEFAULT } = {}) {
  const N = chunks.length;
  const df = Object.create(null);
  let totalLen = 0;

  for (const c of chunks) {
    const tokens = c.tokens || [];
    totalLen += tokens.length;
    const seen = new Set();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df[t] = (df[t] || 0) + 1;
    }
  }

  return {
    k1,
    b,
    N,
    avgdl: N > 0 ? totalLen / N : 0,
    df,
  };
}

function idf(term, stats) {
  const dft = stats.df[term] || 0;
  // BM25+ 안전한 IDF (음수 방지): log((N - df + 0.5) / (df + 0.5) + 1)
  return Math.log((stats.N - dft + 0.5) / (dft + 0.5) + 1);
}

export function score(qTokens, chunk, stats) {
  if (!qTokens || qTokens.length === 0) return 0;
  const tokens = chunk.tokens || [];
  if (tokens.length === 0) return 0;

  const docLen = chunk.doc_len || tokens.length;
  const norm = 1 - stats.b + stats.b * (docLen / (stats.avgdl || 1));

  // term frequency in this doc
  const tf = Object.create(null);
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;

  let s = 0;
  for (const qt of qTokens) {
    const f = tf[qt];
    if (!f) continue;
    const numer = f * (stats.k1 + 1);
    const denom = f + stats.k1 * norm;
    s += idf(qt, stats) * (numer / denom);
  }
  return s;
}
