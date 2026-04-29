// 한국어/영문 공통 토크나이저
// - 한글·영문·숫자만 추출 (구두점·특수문자 분리)
// - 한국어 조사 stem (이/가/을/를/은/는/의 등)
// - 1글자·불용어 제거
// - 인덱스 빌드 시 청크 토큰화와 검색 시 질의 토큰화에 동일하게 사용

const STOP = new Set([
  // 의문사·조사
  "어떻게", "어디서", "어디에", "어디", "어떤", "무엇", "뭐", "뭔가", "뭔지",
  "해요", "하나요", "되나요", "있나요", "인가요", "나요", "할까요",
  "있어", "없어", "있나", "없나", "있어요", "없어요",
  // 대명사
  "이거", "저거", "그거", "이게", "저게", "그게", "이것", "저것", "그것",
  // 접속사·기타
  "그리고", "그러면", "하지만", "또는", "관련", "대해", "대한", "대하여",
  "위해", "위한", "대해서",
  // 매우 흔한 영어 stopword (검색 노이즈만 발생)
  "the", "and", "for", "with", "this", "that", "are", "was", "you", "your",
]);

const PARTICLE_RE =
  /(?:이|가|을|를|은|는|의|로|으로|에|에서|에게|한테|께|도|만|까지|부터|처럼|보다|와|과|이나|나|든지|며|면|서)$/;

export function tokenize(text) {
  if (!text) return [];
  const raw = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const out = [];
  for (const w of raw) {
    if (w.length <= 1) continue;
    if (STOP.has(w)) continue;
    let stem = w.replace(PARTICLE_RE, "");
    if (stem.length <= 1) stem = w;
    out.push(stem);
  }
  return out;
}
