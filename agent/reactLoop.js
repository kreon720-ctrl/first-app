import { chat } from './ollamaClient.js';
import {
  buildSystemPrompt,
  buildObservationMessage,
  buildResponseSchema,
} from './prompt.js';
import { withMcpClient, listTools, callTool } from './toolRouter.js';
import { CHAT_MODEL, MAX_STEPS, CONFIRM_TOOLS } from './config.js';

/* ------------------------- question normalizer -------------------------- */

/**
 * gemma2:9b reliably reads "4월 15일" but stumbles on "4.15", "4/15",
 * "2026-04-15" and the like. We rewrite them to the canonical Korean form
 * before the model ever sees the question. Conservative: month 1..12,
 * day 1..31, and word boundaries so "2.9 버전" etc. stay intact.
 */
export function normalizeKoreanDateInQuestion(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;

  // YYYY[./-]M[./-]D  (trailing dot/period optional)
  out = out.replace(
    /(?<![\d])(\d{4})[./-](\d{1,2})[./-](\d{1,2})\.?(?![\d])/g,
    (match, y, m, d) => {
      const yi = +y, mi = +m, di = +d;
      if (yi < 1900 || yi > 2100) return match;
      if (mi < 1 || mi > 12 || di < 1 || di > 31) return match;
      return `${yi}년 ${mi}월 ${di}일`;
    }
  );

  // M.D or M.D.  (no year)
  out = out.replace(
    /(?<![\d.])(\d{1,2})\.(\d{1,2})\.?(?![\d.])/g,
    (match, m, d) => {
      const mi = +m, di = +d;
      if (mi < 1 || mi > 12 || di < 1 || di > 31) return match;
      return `${mi}월 ${di}일`;
    }
  );

  // M/D  (no year)
  out = out.replace(
    /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g,
    (match, m, d) => {
      const mi = +m, di = +d;
      if (mi < 1 || mi > 12 || di < 1 || di > 31) return match;
      return `${mi}월 ${di}일`;
    }
  );

  // M월D일  (no space)
  out = out.replace(/(\d{1,2})월(\d{1,2})일/g, '$1월 $2일');

  // YYYY년M월D일  (no spaces)
  out = out.replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g, '$1년 $2월 $3일');

  // Day only ("22일") → prepend current KST month → "4월 22일"
  // Skip when a month marker (`N월` or `달`) already appears immediately before.
  const currentMonth = currentKstMonth();
  out = out.replace(/(\d{1,2})일/g, (match, d, offset, str) => {
    const di = +d;
    if (di < 1 || di > 31) return match;
    const prefix = str.substring(Math.max(0, offset - 8), offset);
    if (/(?:\d+월|달)\s*$/.test(prefix)) return match; // already has month context
    return `${currentMonth}월 ${di}일`;
  });

  return out;
}

function currentKstMonth() {
  const nowUtc = new Date();
  const kst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
}

/* --------------------------- date preprocessor --------------------------- */

/**
 * Build a Korean relative-date table keyed on KST "today".
 *
 * gemma2:9b cannot reliably compute "다음 주 월요일" from the week-of-year,
 * so we precompute the whole week +/- 1 and inject the table into the
 * system prompt. The model then just copies the YYYY-MM-DD value.
 *
 * Convention: 이번 주 starts on Monday. If today is Sunday, 이번 주 월요일
 * is 6 days ago.
 */
function buildDateContext() {
  const nowUtc = new Date();
  const kstMs = nowUtc.getTime() + 9 * 60 * 60 * 1000;
  const today = new Date(kstMs);

  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const add = (base, n) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = today.getUTCDay();
  // offset from today to this-week Monday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMon = add(today, mondayOffset);
  const nextMon = add(thisMon, 7);
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  const hh = String(today.getUTCHours()).padStart(2, '0');
  const mm = String(today.getUTCMinutes()).padStart(2, '0');
  const todayStr = fmt(today);
  const tomorrow = add(today, 1);
  const dayAfter = add(today, 2);

  const lines = [
    `- 지금: ${todayStr} (${weekdays[dow]}) ${hh}:${mm}`,
    `- 오늘: ${todayStr} (${weekdays[dow]})`,
    `- 내일: ${fmt(tomorrow)} (${weekdays[(dow + 1) % 7]})`,
    `- 모레: ${fmt(dayAfter)} (${weekdays[(dow + 2) % 7]})`,
    `- 이번 주 월요일: ${fmt(thisMon)}`,
    `- 이번 주 화요일: ${fmt(add(thisMon, 1))}`,
    `- 이번 주 수요일: ${fmt(add(thisMon, 2))}`,
    `- 이번 주 목요일: ${fmt(add(thisMon, 3))}`,
    `- 이번 주 금요일: ${fmt(add(thisMon, 4))}`,
    `- 이번 주 토요일: ${fmt(add(thisMon, 5))}`,
    `- 이번 주 일요일: ${fmt(add(thisMon, 6))}`,
    `- 다음 주 월요일: ${fmt(nextMon)}`,
    `- 다음 주 화요일: ${fmt(add(nextMon, 1))}`,
    `- 다음 주 수요일: ${fmt(add(nextMon, 2))}`,
    `- 다음 주 목요일: ${fmt(add(nextMon, 3))}`,
    `- 다음 주 금요일: ${fmt(add(nextMon, 4))}`,
    `- 다음 주 토요일: ${fmt(add(nextMon, 5))}`,
    `- 다음 주 일요일: ${fmt(add(nextMon, 6))}`,
  ];
  return lines.join('\n');
}

/* --------------------------- args sanitizer ------------------------------ */

const COLOR_ALIAS = {
  red: 'rose',
  pink: 'rose',
  yellow: 'amber',
  orange: 'amber',
  gold: 'amber',
  green: 'emerald',
  mint: 'emerald',
  purple: 'indigo',
  violet: 'indigo',
  navy: 'indigo',
};

/**
 * Ollama's schema enforcement is best-effort. Defensively coerce enum-valued
 * fields (e.g. color) to an allowed value and strip temporal leakage from
 * `title` before we hand args off to MCP / the backend.
 */
function sanitizeArgs(toolName, args, tools, trace) {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool?.inputSchema?.properties) return args;
  const sanitized = { ...args };

  for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
    if (!schema.enum || !Array.isArray(schema.enum)) continue;
    const val = sanitized[key];
    if (val === undefined || val === null) continue;
    if (schema.enum.includes(val)) continue;

    let mapped;
    if (key === 'color' && typeof val === 'string' && COLOR_ALIAS[val.toLowerCase()]) {
      const alias = COLOR_ALIAS[val.toLowerCase()];
      if (schema.enum.includes(alias)) mapped = alias;
    }
    if (!mapped) mapped = schema.default ?? schema.enum[0];

    trace.push({
      role: 'sanitize',
      field: key,
      from: val,
      to: mapped,
      tool: toolName,
    });
    sanitized[key] = mapped;
  }

  if (typeof sanitized.title === 'string') {
    const before = sanitized.title;
    const scrubbed = scrubTemporalWords(before);
    if (scrubbed !== before) {
      trace.push({ role: 'sanitize', field: 'title', from: before, to: scrubbed, tool: toolName });
      sanitized.title = scrubbed;
    }
  }

  return sanitized;
}

const TEMPORAL_PATTERNS = [
  /\s*\d+\s*시간\s*/g,
  /\s*\d+\s*분\s*/g,
  /\b(?:오전|오후|새벽|점심|저녁|밤|아침|하루종일|오늘|내일|모레|어제|그제)\b/g,
  /\s*\d{1,2}\s*시\s*(?:\d{1,2}\s*분)?\s*(?:부터|까지|에|에서)?\s*/g,
];

function scrubTemporalWords(s) {
  let out = s;
  for (const re of TEMPORAL_PATTERNS) out = out.replace(re, ' ');
  return out.replace(/\s{2,}/g, ' ').trim() || s; // fallback to original if scrubbed to empty
}

/* --------------------------- main agent loop ----------------------------- */

export async function runAgent({ question, jwt, userHint }) {
  const trace = [];

  return await withMcpClient(jwt, async (client) => {
    const tools = await listTools(client);
    const toolNames = new Set(tools.map((t) => t.name));
    const schema = buildResponseSchema(tools);

    const system = buildSystemPrompt({
      tools,
      dateContext: buildDateContext(),
      userHint,
    });

    const normalized = normalizeKoreanDateInQuestion(question);
    if (normalized !== question) {
      trace.push({ role: 'normalize', from: question, to: normalized });
    }
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: normalized },
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      let raw;
      try {
        raw = await chat(CHAT_MODEL, messages, { temperature: 0.1 }, schema);
      } catch (err) {
        if (step === 0) {
          try {
            raw = await chat(CHAT_MODEL, messages, { temperature: 0.1 }, 'json');
          } catch (err2) {
            return { kind: 'error', error: String(err2.message || err2), trace };
          }
        } else {
          return { kind: 'error', error: String(err.message || err), trace };
        }
      }
      trace.push({ step, role: 'assistant', content: raw });

      const parsed = safeParseJson(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {
          kind: 'error',
          error:
            '죄송해요, 응답을 해석하지 못했어요. 조금 더 구체적으로 다시 말씀해 주시겠어요?',
          trace,
        };
      }

      if (parsed.kind === 'answer' && typeof parsed.answer === 'string') {
        return { kind: 'answer', answer: parsed.answer.trim(), trace };
      }

      if (parsed.kind !== 'action' || typeof parsed.tool !== 'string') {
        return {
          kind: 'error',
          error: '응답 형식이 잘못됐어요. 다시 말씀해 주시겠어요?',
          trace,
        };
      }

      const toolName = parsed.tool;
      const rawArgs = parsed.args ?? {};
      if (!toolNames.has(toolName)) {
        return {
          kind: 'error',
          error: `알 수 없는 도구 "${toolName}" 로 답하려 했어요. 다시 말씀해 주시겠어요?`,
          trace,
        };
      }
      const toolArgs = sanitizeArgs(toolName, rawArgs, tools, trace);

      if (CONFIRM_TOOLS.has(toolName)) {
        return {
          kind: 'confirm',
          pendingAction: { tool: toolName, args: toolArgs },
          preview: buildPreview(toolName, toolArgs),
          trace,
        };
      }

      let observation;
      try {
        observation = await callTool(client, toolName, toolArgs);
      } catch (err) {
        trace.push({ step, role: 'tool-error', content: String(err) });
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `이전 도구 "${toolName}" 호출이 실패했습니다: ${err.message}\n사용자에게 이 사실을 설명하는 JSON {"kind":"answer","answer":"..."} 으로 응답하세요.`,
        });
        continue;
      }
      trace.push({
        step,
        role: 'tool',
        tool: toolName,
        args: toolArgs,
        result: observation,
      });
      messages.push({ role: 'assistant', content: raw });
      messages.push({
        role: 'user',
        content: buildObservationMessage(toolName, observation),
      });
    }

    return {
      kind: 'error',
      error: `최대 단계(${MAX_STEPS}) 에 도달했어요. 다시 시도해 주시겠어요?`,
      trace,
    };
  });
}

export async function executePendingAction({ tool, args, jwt }) {
  return await withMcpClient(jwt, async (client) => {
    const tools = await listTools(client);
    const trace = [];
    const safeArgs = sanitizeArgs(tool, args, tools, trace);
    const result = await callTool(client, tool, safeArgs);
    return { ok: true, tool, args: safeArgs, result, trace };
  });
}

function buildPreview(toolName, args) {
  if (toolName === 'create_schedule') {
    const parts = [`제목: ${args.title ?? '(미정)'}`];
    const start = formatDateTime(args.startAt);
    const end = formatDateTime(args.endAt);
    if (start && end && start.date === end.date) {
      parts.push(`일시: ${start.date} ${start.time} ~ ${end.time}`);
    } else {
      if (start) parts.push(`시작: ${start.date} ${start.time}`);
      if (end) parts.push(`종료: ${end.date} ${end.time}`);
    }
    if (args.description) parts.push(`설명: ${args.description}`);
    return parts.join(' · ');
  }
  return JSON.stringify(args);
}

/**
 * Format an ISO 8601 string as { date: "YYYY-MM-DD", time: "HH:MM" } in its
 * original offset (we intentionally avoid UTC conversion because the model
 * emits +09:00 and the user reads it in local KST terms).
 */
function formatDateTime(iso) {
  if (typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (!m) return null;
  return { date: m[1], time: m[2] };
}

function safeParseJson(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
  return null;
}
