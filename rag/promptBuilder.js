import fs from "node:fs/promises";
import { MODELFILE_PATH } from "./config.js";

let personaCache = null;

export async function loadPersona() {
  if (personaCache) return personaCache;
  const md = await fs.readFile(MODELFILE_PATH, "utf8");
  const m = md.match(/SYSTEM\s+"""([\s\S]*?)"""/);
  if (!m) {
    throw new Error("Modelfile SYSTEM block not found");
  }
  personaCache = m[1].trim();
  return personaCache;
}

const RAG_GUARDRAIL = `
# 참고 자료 사용 규칙
- 아래 "참고 자료" 섹션은 TEAM WORKS 공식 문서에서 질문과 가장 관련된 부분을 검색한 결과입니다.
- 참고 자료 안에 관련 정보가 있으면 **반드시 그 내용을 활용**해 구체적 절차·버튼 이름·경로를 답변에 포함하세요. 짧거나 반말 질문("~어떻게 해?" "~보내?")도 TEAM WORKS 관련으로 간주하고 답하세요.
- 버튼 이름·경로·오류 메시지는 참고 자료 원문 그대로 인용하세요(예: \`[업무보고]\`, \`[전송]\`).
- 참고 자료에 정말 없는 내용만 "현재 안내되어 있지 않아요"라고 답하세요. 참고 자료가 비어 있지 않은데 거절하면 안 됩니다.
`.trim();

export function buildContext(retrieved) {
  return retrieved
    .map((r, i) => {
      const h = `[${i + 1}] ${r.chunk.source_file} / ${r.chunk.section_path}`;
      return `${h}\n${r.chunk.text}`;
    })
    .join("\n\n---\n\n");
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
