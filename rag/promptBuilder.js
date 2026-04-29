// AI 비서 "찰떡" 인격 정의 (Modelfile 의존 제거 — gemma4:26b 베이스 그대로 사용)
const PERSONA = `
당신은 TEAM WORKS의 AI 비서 "찰떡"입니다.
- TEAM WORKS는 팀 단위 일정·채팅·업무보고·공지·포스트잇·프로젝트를 한 화면에서 관리하는 협업 도구입니다.
- 사용자가 사용법·기능·정책을 물으면 친절하고 간결한 한국어로 답합니다.
- 추측하지 말고 "참고 자료"에 있는 사실만 인용합니다. 없으면 솔직히 모른다고 말합니다.
- 답변에 절차가 있다면 단계 번호로 정리합니다.
`.trim();

export async function loadPersona() {
  return PERSONA;
}

const RAG_GUARDRAIL = `
# 참고 자료 사용 규칙
- 아래 "참고 자료" 섹션은 TEAM WORKS 공식 문서에서 질문과 가장 관련된 부분을 검색한 결과입니다.
- 참고 자료 안에 관련 정보가 있으면 **반드시 그 내용을 활용**해 구체적 절차·버튼 이름·경로를 답변에 포함하세요. 짧거나 반말 질문("~어떻게 해?" "~보내?")도 TEAM WORKS 관련으로 간주하고 답하세요.
- 버튼 이름·경로·오류 메시지는 참고 자료 원문 그대로 인용하세요(예: \`[업무보고]\`, \`[전송]\`).
- 참고 자료에 정말 없는 내용만 "현재 안내되어 있지 않아요"라고 답하세요. 참고 자료가 비어 있지 않은데 거절하면 안 됩니다.
`.trim();

// num_ctx 32K 안에서 시스템 프롬프트·질문·출력 budget을 빼고 본문 컨텍스트가
// 차지할 수 있는 안전 상한. chunker.js 의 roughTokenCount 와 동일 기준.
const MAX_CONTEXT_TOKENS = 22000;
const roughTokenCount = (text) => Math.ceil(text.length / 2.2);

// Parent-Document Retrieval: 청크 단위로 검색했지만 LLM에는 parent(파일 전문)를 전달.
// 같은 parent에서 여러 청크가 뽑혀도 parent는 한 번만 포함 (중복 제거).
// 누적 토큰이 상한을 넘으면 이후 항목은 청크 본문으로 폴백, 그래도 넘치면 스킵.
export function buildContext(retrieved) {
  const seen = new Set();
  const blocks = [];
  let used = 0;

  for (const r of retrieved) {
    const pid = r.parent_id ?? r.chunk?.parent_id ?? r.chunk?.source_file;
    if (seen.has(pid)) continue;
    seen.add(pid);

    const parentText = r.parent ?? r.chunk?.text ?? "";
    const chunkText = r.chunk?.text ?? "";
    const header = `[${blocks.length + 1}] ${pid}\n`;
    const headerTokens = roughTokenCount(header);

    const parentTokens = roughTokenCount(parentText);
    if (used + headerTokens + parentTokens <= MAX_CONTEXT_TOKENS) {
      blocks.push(`${header}${parentText}`);
      used += headerTokens + parentTokens;
      continue;
    }

    const chunkTokens = roughTokenCount(chunkText);
    if (chunkText && used + headerTokens + chunkTokens <= MAX_CONTEXT_TOKENS) {
      blocks.push(`${header}${chunkText}`);
      used += headerTokens + chunkTokens;
      continue;
    }
    // 더 넣으면 32K 컨텍스트 안전선을 깨므로 이후 항목 모두 스킵
    break;
  }
  return blocks.join("\n\n---\n\n");
}

export async function buildMessages(question, retrieved) {
  const persona = await loadPersona();
  const context = buildContext(retrieved);
  const system = `${persona}\n\n${RAG_GUARDRAIL}`;
  const userContent = `# 참고 자료 (TEAM WORKS 공식 문서 발췌)\n\n${context}\n\n---\n\n# 사용자 질문\n${question}\n\n위 참고 자료를 바탕으로 TEAM WORKS 도우미로서 답변하세요.`;
  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}
