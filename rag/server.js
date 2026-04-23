import express from "express";
import { retrieve } from "./retriever.js";
import { buildMessages } from "./promptBuilder.js";
import { chat } from "./ollamaClient.js";
import { CHAT_MODEL, SERVER_PORT, TOP_K } from "./config.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: CHAT_MODEL });
});

app.post("/chat", async (req, res) => {
  const { question, topK } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  try {
    const k = Number.isFinite(topK) ? Math.max(1, Math.min(10, topK)) : TOP_K;
    const retrieved = await retrieve(question, k);
    const messages = await buildMessages(question, retrieved);
    const result = await chat(CHAT_MODEL, messages, { temperature: 0.3 });
    res.json({
      answer: result.message?.content ?? "",
      sources: retrieved.map((r) => ({
        source_file: r.chunk.source_file,
        section_path: r.chunk.section_path,
        score: Number(r.score.toFixed(4)),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(SERVER_PORT, () => {
  console.log(`RAG server listening on http://127.0.0.1:${SERVER_PORT}`);
  console.log(`  POST /chat   { "question": "..." }`);
  console.log(`  GET  /health`);
});
