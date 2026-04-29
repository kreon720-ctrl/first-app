import express from "express";
import { retrieve } from "./retriever.js";
import { buildMessages } from "./promptBuilder.js";
import { chat, chatStreamRaw } from "./ollamaClient.js";
import { CHAT_MODEL, SERVER_PORT, TOP_K } from "./config.js";

// TEAM WORKS 도메인 키워드 — 매치되면 강한 사용법 시그널로 보고 즉시 RAG 라우팅.
// RRF 점수는 모든 쿼리에 비슷한 분포로 나와 분류 시그널이 약하므로,
// 점수 기반 판정은 보조용(매우 낮은 floor)으로만 쓴다.
// 분류 실패 케이스는 route.ts 의 답변 거절 패턴 fallback 이 보정한다.
const HARD_KEYWORDS = [
  "team works", "팀웍스", "팀 워크스", "찰떡",
  "포스트잇", "공지사항", "업무보고", "가입 신청",
  "프로젝트 일정", "세부 일정", "간트차트",
  "팀장", "팀원", "팀 일정", "팀 채팅",
];
// 명백한 일반 질문 시그널 — 매치 시 RAG 답변 시도(약 50초) 를 스킵하고
// 곧장 web 라우팅 신호 반환. route.ts 가 이 신호를 보고 Open WebUI 직접 호출.
const GENERAL_KEYWORDS = [
  "뉴스", "날씨", "주가", "주식", "환율", "시세",
  "오늘의", "최신", "헤드라인", "스포츠 결과", "경기 결과",
  "검색해줘", "에 대해 알려줘", "에 대해 검색",
];

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: CHAT_MODEL });
});

// 키워드 기반 빠른 분류기 — 매치되면 강한 사용법 시그널.
// 응답: { isTeamWorks, reason, matched? }
// 매치 없을 땐 isTeamWorks=false 라도 route.ts 가 일단 RAG 시도 후 거절형이면 fallback 한다
// (RRF 점수는 모든 쿼리에 비슷해 단일 임계값으로 분류 불가능했음).
app.post("/classify", async (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  const q = question.trim().toLowerCase();
  // 1) TEAM WORKS 키워드 — 즉시 RAG
  const tw = HARD_KEYWORDS.find((k) => q.includes(k));
  if (tw) return res.json({ isTeamWorks: true, reason: "keyword", matched: tw });
  // 2) 일반 질문 키워드 — 즉시 web (RAG 답변 스킵 시그널)
  const gen = GENERAL_KEYWORDS.find((k) => q.includes(k));
  if (gen) return res.json({ isTeamWorks: false, reason: "general-keyword", matched: gen });
  // 3) 둘 다 없음 — route.ts 가 RAG 시도 후 거절 fallback 으로 결정
  return res.json({ isTeamWorks: false, reason: "no-keyword" });
});

app.post("/chat", async (req, res) => {
  const { question, topK, stream } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  try {
    const k = Number.isFinite(topK) ? Math.max(1, Math.min(10, topK)) : TOP_K;
    const retrieved = await retrieve(question, k);
    const messages = await buildMessages(question, retrieved);
    const sources = retrieved.map((r) => ({
      source_file: r.chunk.source_file,
      section_path: r.chunk.section_path,
      parent_id: r.parent_id,
      score: Number(r.score.toFixed(4)),
      cos: Number((r.cos ?? 0).toFixed(4)),
      bm25: Number((r.bm25 ?? 0).toFixed(4)),
    }));

    // === Streaming 모드 — SSE 로 토큰 단위 forward ===
    if (stream === true) {
      res.setHeader("content-type", "text/event-stream; charset=utf-8");
      res.setHeader("cache-control", "no-cache, no-transform");
      res.setHeader("connection", "keep-alive");
      // 출처는 시작 시점에 한 번에 전송 (사용자 UI 가 placeholder 로 미리 표시)
      res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

      const upstream = await chatStreamRaw(CHAT_MODEL, messages, { temperature: 0.3 });
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const obj = JSON.parse(t);
            const tok = obj.message?.content;
            if (tok) {
              res.write(`data: ${JSON.stringify({ type: "token", text: tok })}\n\n`);
            }
            if (obj.done) {
              res.write(`data: [DONE]\n\n`);
            }
          } catch {
            // ndjson 파싱 실패한 라인은 스킵
          }
        }
      }
      res.end();
      return;
    }

    // === 기존 non-stream 모드 ===
    const result = await chat(CHAT_MODEL, messages, { temperature: 0.3 });
    res.json({ answer: result.message?.content ?? "", sources });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: String(err.message || err) });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: String(err.message || err) })}\n\n`);
      res.end();
    }
  }
});

app.listen(SERVER_PORT, () => {
  console.log(`RAG server listening on http://127.0.0.1:${SERVER_PORT}`);
  console.log(`  POST /chat       { "question": "..." }`);
  console.log(`  POST /classify   { "question": "..." }    키워드 기반 빠른 분류기`);
  console.log(`  GET  /health`);
});
