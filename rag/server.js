import express from "express";
import { retrieve } from "./retriever.js";
import { buildMessages } from "./promptBuilder.js";
import { chat, chatStreamRaw } from "./ollamaClient.js";
import { CHAT_MODEL, SERVER_PORT, TOP_K } from "./config.js";

// TEAM WORKS 도메인 키워드 — 매치되면 강한 사용법 시그널로 보고 즉시 RAG 라우팅.
// 단, SCHEDULE_KEYWORDS 와 동시 매치되면 일정 의도가 우선.
const HARD_KEYWORDS = [
  "team works", "팀웍스", "팀 워크스", "찰떡",
  "포스트잇", "공지사항", "업무보고", "가입 신청",
  "프로젝트 일정", "세부 일정", "간트차트",
  "팀장", "팀원", "팀 채팅",
];
// 명백한 일반 질문 시그널 — 매치 시 RAG 답변 시도(약 50초) 를 스킵하고
// 곧장 web 라우팅 신호 반환. route.ts 가 이 신호를 보고 Open WebUI 직접 호출.
const GENERAL_KEYWORDS = [
  "뉴스", "날씨", "주가", "주식", "환율", "시세",
  "오늘의", "최신", "헤드라인", "스포츠 결과", "경기 결과",
  "검색해줘", "에 대해 알려줘", "에 대해 검색",
];
// 일정 관련 명사 — 동작 키워드와 결합되면 schedule_query 또는 schedule_create.
// "팀 일정" 도 사용법(HARD)·일정 조회 둘 다 가능 — 일정 키워드가 우선.
const SCHEDULE_NOUNS = [
  "일정", "회의", "미팅", "약속", "스케줄", "팀 일정",
];
// 조회 동작
const SCHEDULE_QUERY_VERBS = [
  "알려", "보여", "확인", "조회", "찾아", "있어", "있나", "있는", "어때", "어떤",
];
// 등록 동작
const SCHEDULE_CREATE_VERBS = [
  "등록", "추가", "만들", "잡아", "예약", "넣어", "생성",
];
// 거절 대상 동작 — schedule 관련일 때 "찰떡이는 조회·등록만" 거절 안내.
const BLOCKED_VERBS = [
  "수정", "삭제", "변경", "취소", "제거", "지워", "지운", "옮겨", "옮기", "바꿔",
];
// 거절 대상 도메인 — 프로젝트·채팅 관련은 도메인 자체로 거절.
const BLOCKED_DOMAINS = [
  "프로젝트", "채팅", "메시지", "공지", "공지사항", "업무보고", "포스트잇",
];
// 사용법 질문 시그널 — 매치되면 다른 분기보다 우선해 usage(RAG) 로 라우팅.
// 예: "프로젝트 등록하는 법", "회의 어떻게 만들어?" — blocked/schedule_create 가 아니라 사용법 답변이 정답.
const USAGE_KEYWORDS = [
  "사용법", "방법", "어떻게", "어떡", "하는 법", "쓰는 법", "쓰는 방법", "이용법", "사용 방법",
];

// 키워드 매치 헬퍼 — 매치된 첫 키워드 반환, 없으면 null.
function findMatch(q, list) {
  return list.find((k) => q.includes(k)) ?? null;
}

// 의도 분류 — 4-way + blocked.
// 우선순위:
//  0) USAGE_KEYWORDS(사용법 시그널) → 즉시 usage (다른 분기보다 우선)
//  1) 일정명사 + 거절동작 → blocked (schedule_modify)
//  2) 거절도메인 + 동작(create/modify) → blocked (other_domain)
//  3) 일정명사 + 등록동작 → schedule_create
//  4) 일정명사 + 조회동작 (또는 일정명사 단독) → schedule_query
//  5) HARD_KEYWORDS → usage
//  6) GENERAL_KEYWORDS → general
//  7) 매치 없음 → unknown (route.ts 가 RAG 시도 후 거절형이면 general fallback)
function classifyIntent(question) {
  const q = question.trim().toLowerCase();

  // 0) 사용법 질문 시그널 우선 — "프로젝트 등록하는 법" 같은 사용법 질의가 blocked 로 빠지는 걸 방지.
  const usage = findMatch(q, USAGE_KEYWORDS);
  if (usage) return { intent: "usage", reason: "usage-keyword", matched: usage };

  const noun = findMatch(q, SCHEDULE_NOUNS);
  const blockedVerb = findMatch(q, BLOCKED_VERBS);
  const createVerb = findMatch(q, SCHEDULE_CREATE_VERBS);
  const queryVerb = findMatch(q, SCHEDULE_QUERY_VERBS);
  const blockedDomain = findMatch(q, BLOCKED_DOMAINS);

  // 1) 일정 + 거절동작 → blocked
  if (noun && blockedVerb) {
    return { intent: "blocked", subreason: "schedule_modify", matched: `${noun}+${blockedVerb}` };
  }
  // 2) 거절도메인 + 어떤 동작 → blocked
  if (blockedDomain && (blockedVerb || createVerb)) {
    return { intent: "blocked", subreason: "other_domain", matched: blockedDomain };
  }
  // 3) 일정 + 등록동작 → schedule_create
  if (noun && createVerb) {
    return { intent: "schedule_create", reason: "keyword", matched: `${noun}+${createVerb}` };
  }
  // 4) 일정명사 + 조회동작 (또는 단독) → schedule_query
  if (noun && (queryVerb || !createVerb)) {
    return { intent: "schedule_query", reason: "keyword", matched: noun };
  }
  // 5) HARD_KEYWORDS → usage
  const hard = findMatch(q, HARD_KEYWORDS);
  if (hard) return { intent: "usage", reason: "keyword", matched: hard };
  // 6) GENERAL_KEYWORDS → general
  const gen = findMatch(q, GENERAL_KEYWORDS);
  if (gen) return { intent: "general", reason: "general-keyword", matched: gen };
  // 7) 매치 없음
  return { intent: "unknown", reason: "no-keyword" };
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: CHAT_MODEL });
});

// 키워드 기반 4-way 분류기.
// 응답: { intent, reason?, subreason?, matched?, isTeamWorks }
//   intent: 'usage' | 'general' | 'schedule_query' | 'schedule_create' | 'blocked' | 'unknown'
// `isTeamWorks` 는 backward-compat — `intent === 'usage'` 와 동치.
// 'unknown' 은 route.ts 의 RAG 시도 + 거절형 fallback 으로 처리됨.
app.post("/classify", async (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  const result = classifyIntent(question);
  return res.json({ ...result, isTeamWorks: result.intent === "usage" });
});

// 일정 등록 자연어 → 인자 파싱.
// 입력: { question, nowIso? } — nowIso 는 사용자 시점 (KST 보정 등). 미지정 시 서버 시간.
// 출력: { ok:true, args: { title, startAt, endAt, description?, color? } } 또는 { ok:false, error }
//   - startAt/endAt 은 ISO 8601 (UTC). LLM 이 사용자의 KST 표현을 KST→UTC 로 변환해 반환.
// gemma4:26b think:false 로 짧은 JSON 응답 유도. JSON 파싱 실패 시 { ok:false }.
app.post("/parse-schedule-args", async (req, res) => {
  const { question, nowIso } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  const now = nowIso || new Date().toISOString();
  // KST 캘린더 좌표 추출 — LLM 의 요일·"이번 주" 추론 정확도 향상.
  const kstNow = new Date(new Date(now).getTime() + 9 * 60 * 60 * 1000);
  const kstDateStr = kstNow.toISOString().slice(0, 10);
  const kstWeekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const kstDow = kstNow.getUTCDay(); // 0=일 ~ 6=토
  const kstWeekday = kstWeekdays[kstDow];

  // 이번 주 일~토 7일을 LLM 에게 직접 매핑 표로 제공 — 추론 부담 제거.
  const sundayUtc = new Date(Date.UTC(
    kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - kstDow
  ));
  const weekMapping = kstWeekdays.map((wd, i) => {
    const d = new Date(sundayUtc.getTime() + i * 24 * 60 * 60 * 1000);
    return `  - 이번 주 ${wd}: ${d.toISOString().slice(0, 10)}`;
  }).join("\n");
  const nextWeekMapping = kstWeekdays.map((wd, i) => {
    const d = new Date(sundayUtc.getTime() + (i + 7) * 24 * 60 * 60 * 1000);
    return `  - 다음 주 ${wd}: ${d.toISOString().slice(0, 10)}`;
  }).join("\n");
  const lastWeekMapping = kstWeekdays.map((wd, i) => {
    const d = new Date(sundayUtc.getTime() + (i - 7) * 24 * 60 * 60 * 1000);
    return `  - 지난주 ${wd}: ${d.toISOString().slice(0, 10)}`;
  }).join("\n");

  const sysPrompt = `당신은 한국어 일정 등록 요청을 JSON 으로 변환합니다.\n현재 KST 날짜: ${kstDateStr} (${kstWeekday})\n현재 UTC 시각: ${now}\n사용자는 한국 시간대(KST=UTC+9)로 말한다고 가정.\n\n반드시 다음 둘 중 하나의 JSON 만 출력 (마크다운 금지):\n\n[A. 정보 충분 — 인자 반환]\n{"ok":true,"title":"...","startAt":"YYYY-MM-DDTHH:MM:SS.000Z","endAt":"YYYY-MM-DDTHH:MM:SS.000Z","description":""}\n\n[B. 정보 부족 — 후속 질문]\n{"ok":false,"needs":"time"|"date"|"title","hint":"한국어 한 문장 후속 질문"}\n\n날짜 추론 규칙 (오늘=${kstDateStr}(${kstWeekday}) 기준):\n- "오늘" → ${kstDateStr}\n- "내일" → 오늘 + 1일\n- "어제" → 오늘 - 1일\n- "X월 Y일" 연도 미명시 → 가장 가까운 미래\n\n요일 매핑 — 사용자가 "이번 주/다음 주/지난주 X요일" 이라고 말하면 **아래 표를 그대로 사용**. 추론·계산 금지.\n\n[이번 주 (일~토)]\n${weekMapping}\n\n[다음 주]\n${nextWeekMapping}\n\n[지난주]\n${lastWeekMapping}\n\n시간 변환 규칙 (매우 중요):\n- 사용자는 KST 로 말함. ISO 8601 UTC ('Z' 끝) 로 반환할 때 **KST 시각에서 9시간을 뺀** 값을 출력.\n- 예: 사용자 "내일 오후 3시" + 오늘=2026-04-30 → 내일=2026-05-01 KST 15:00 → "2026-05-01T06:00:00.000Z".\n- 예: 사용자 "오전 9시" → KST 09:00 → "T00:00:00.000Z".\n- 예: 사용자 "자정" → KST 00:00 → 전날 "T15:00:00.000Z".\n- KST 0~8시 시각은 UTC 로 전날이 됨. 주의해서 날짜도 보정.\n\nA(완성) vs B(부족) 결정 규칙:\n- 시작 시각이 명시되지 않거나 모호("오전?", "오후?", "회의 잡아줘")하면 → B, needs="time", hint="몇 시에 잡을까요?"\n- 날짜가 모호("회의 잡아줘", "다음에"...)하면 → B, needs="date", hint="언제로 잡을까요?"\n- 제목이 전혀 없으면 → B, needs="title", hint="회의 제목은 무엇으로 할까요?"\n- 위 모두 갖춰지면 → A. 종료 시각 미명시면 시작+1시간 가정 OK.\n- 제목은 사용자 표현 짧게(10자 내외). description 는 명시 안 하면 빈 문자열.\n\n절대 JSON 외 다른 문자 출력 금지.`;

  try {
    const result = await chat(CHAT_MODEL, [
      { role: "system", content: sysPrompt },
      { role: "user", content: question },
    ], { temperature: 0.1, num_predict: 256 });
    const raw = result.message?.content || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.json({ ok: false, error: "JSON 추출 실패", raw });
    let parsed;
    try {
      parsed = JSON.parse(m[0]);
    } catch (e) {
      return res.json({ ok: false, error: `JSON 파싱 실패: ${e.message}`, raw });
    }
    // B — 정보 부족
    if (parsed.ok === false && typeof parsed.needs === "string") {
      return res.json({
        ok: false,
        needs: parsed.needs,
        hint: typeof parsed.hint === "string" ? parsed.hint : "더 자세히 알려주세요.",
      });
    }
    // A — 인자 반환 (ok:true 명시 또는 필드만 있는 구버전 응답)
    const args = parsed.ok === true
      ? { title: parsed.title, startAt: parsed.startAt, endAt: parsed.endAt, description: parsed.description ?? "" }
      : parsed;
    if (!args.title || !args.startAt || !args.endAt) {
      return res.json({ ok: false, needs: "time", hint: "시간을 좀 더 구체적으로 알려주세요. 예: '오후 3시'" });
    }
    return res.json({ ok: true, args });
  } catch (err) {
    return res.json({ ok: false, error: String(err.message || err) });
  }
});

// 일정 조회 자연어 → 조회 범위 파싱.
// 입력: { question, nowIso? }
// 출력: { ok:true, view: 'day'|'week'|'month', date: 'YYYY-MM-DD' } 또는 { ok:false, error, view:'month', date: 오늘 }
//   - 한국어 표현("4월 22일", "이번 주", "오늘", "다음 달") 을 LLM 으로 view+date 로 변환.
//   - LLM 이 KST 기준으로 해석. date 는 KST 날짜.
//   - 파싱 실패 시 default(view=month, date=오늘 KST) fallback.
app.post("/parse-schedule-query", async (req, res) => {
  const { question, nowIso } = req.body ?? {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "`question` (string) is required" });
  }
  const now = nowIso || new Date().toISOString();
  const kstNow = new Date(new Date(now).getTime() + 9 * 60 * 60 * 1000);
  const todayKst = kstNow.toISOString().slice(0, 10);
  const kstWeekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const kstWeekday = kstWeekdays[kstNow.getUTCDay()];

  const sysPrompt = `당신은 한국어 일정 조회 요청을 JSON 으로 변환합니다.\n현재 KST 날짜: ${todayKst} (${kstWeekday})\n사용자가 한국 시간대로 말한다고 가정.\n\n반드시 다음 JSON 만 출력 (마크다운 금지):\n{"view":"day","date":"YYYY-MM-DD","keyword":""}\n\nview 결정 규칙:\n- 특정 하루 (예: "오늘", "내일", "어제", "4월 22일", "지난 화요일") → "day"\n- 특정 주간 (예: "이번 주", "다음 주", "지난주") → "week"\n- 특정 월 또는 모호 (예: "이번 달", "5월", "최근 일정", 시점 명시 없는 키워드 검색) → "month"\n\ndate 결정:\n- view=day 면 그 날짜 (YYYY-MM-DD).\n- view=week/month 면 해당 주/월 안의 임의 날짜 (예: 그 주 월요일, 그 달 1일).\n- 연도 미명시 시 가장 가까운 과거 또는 미래 중 자연스러운 쪽 (지나간 표현은 과거, 다가오는 표현은 미래).\n- 키워드 검색만 있고 시점 명시 없으면 date=오늘.\n\nkeyword 결정 규칙:\n- **금지 키워드 (절대 keyword 로 추출 금지)**: "일정", "회의", "미팅", "스케줄", "약속", "이벤트", "행사", "정리", "알려", "보여", "확인", "조회", "찾아", "있어", "있나", "어떤", "뭐", "무엇".\n- keyword 는 **사용자가 명시한 구체적 일정의 고유 제목·주제** 일 때만 추출 (예: "디자인 리뷰", "주간 정기 회의", "킥오프 미팅", "직원 점심").\n- 일반 동작어/명사만 있고 구체적 제목 단서가 없으면 **반드시 빈 문자열** 반환.\n- 의심스러우면 빈 문자열.\n\n예시:\n- "지난주 일정 정리해줘" → keyword=""\n- "오늘 회의 있어?" → keyword=""\n- "디자인 리뷰 일정 언제야?" → keyword="디자인 리뷰"\n- "킥오프 미팅 보여줘" → keyword="킥오프"\n\n절대 JSON 외 다른 문자 출력 금지.`;

  try {
    const result = await chat(CHAT_MODEL, [
      { role: "system", content: sysPrompt },
      { role: "user", content: question },
    ], { temperature: 0.1, num_predict: 128 });
    const raw = result.message?.content || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.json({ ok: false, error: "JSON 추출 실패", view: "month", date: todayKst });
    let parsed;
    try {
      parsed = JSON.parse(m[0]);
    } catch (e) {
      return res.json({ ok: false, error: `JSON 파싱 실패: ${e.message}`, view: "month", date: todayKst });
    }
    const view = ["day", "week", "month"].includes(parsed.view) ? parsed.view : "month";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : todayKst;
    const keyword = typeof parsed.keyword === "string" ? parsed.keyword.trim() : "";
    return res.json({ ok: true, view, date, keyword });
  } catch (err) {
    return res.json({ ok: false, error: String(err.message || err), view: "month", date: todayKst });
  }
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
  console.log(`  POST /classify   { "question": "..." }    4-way 의도 분류기`);
  console.log(`  POST /parse-schedule-args { "question": "..." }    일정 등록 자연어 → 인자 파싱`);
  console.log(`  POST /parse-schedule-query { "question": "..." }    일정 조회 자연어 → view+date 파싱`);
  console.log(`  GET  /health`);
});
