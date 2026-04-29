import readline from "node:readline";
import { retrieve } from "./retriever.js";
import { buildMessages } from "./promptBuilder.js";
import { chat } from "./ollamaClient.js";
import { CHAT_MODEL } from "./config.js";

async function answer(question) {
  const retrieved = await retrieve(question);
  const messages = await buildMessages(question, retrieved);
  const result = await chat(CHAT_MODEL, messages, { temperature: 0.3 });
  return {
    text: result.message?.content ?? "",
    sources: retrieved.map((r) => ({
      file: r.chunk.source_file,
      section: r.chunk.section_path,
      parent: r.parent_id,
      score: r.score,
      cos: r.cos ?? 0,
      bm25: r.bm25 ?? 0,
    })),
  };
}

function printAnswer({ text, sources }) {
  console.log("\n" + text.trim() + "\n");
  console.log("― 참고한 청크 (RRF 점수, cos, bm25) ―");
  for (const s of sources) {
    console.log(
      `  [RRF ${s.score.toFixed(4)} | cos ${s.cos.toFixed(3)} | bm25 ${s.bm25.toFixed(2)}] ${s.file} :: ${s.section}`
    );
  }
  console.log("");
}

async function main() {
  const cliArg = process.argv.slice(2).join(" ").trim();
  if (cliArg) {
    const result = await answer(cliArg);
    printAnswer(result);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`TEAM WORKS RAG 챗봇 (${CHAT_MODEL}). 종료: /exit\n`);
  const ask = () =>
    rl.question("질문> ", async (q) => {
      const t = q.trim();
      if (!t) return ask();
      if (t === "/exit" || t === "/quit") {
        rl.close();
        return;
      }
      try {
        const result = await answer(t);
        printAnswer(result);
      } catch (err) {
        console.error("오류:", err.message || err);
      }
      ask();
    });
  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
