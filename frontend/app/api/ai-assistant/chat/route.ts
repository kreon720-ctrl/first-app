import { NextRequest, NextResponse } from 'next/server';

// Next.js 16 의 API route default maxDuration 이 300초(5분) 라서
// gemma4:26b + 검색 결과 컨텍스트의 답변 생성이 그 이상 걸리면 강제 종료된다.
// 10분(600s)으로 명시 확장.
export const maxDuration = 600;

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://127.0.0.1:8787';
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://127.0.0.1:8788';
const OPEN_WEBUI_BASE_URL =
  process.env.OPEN_WEBUI_BASE_URL || 'http://127.0.0.1:8081';
const OPEN_WEBUI_API_KEY = process.env.OPEN_WEBUI_API_KEY || '';
const OPEN_WEBUI_MODEL = process.env.OPEN_WEBUI_MODEL || 'gemma4-web';
// Open WebUI 의 OpenAI-compatible 응답은 URL 메타데이터를 노출하지 않음.
// sources 보강용으로 SearxNG 를 같은 쿼리로 한 번 더 호출해 URL/title 을 직접 채운다.
const SEARXNG_BASE_URL = process.env.SEARXNG_BASE_URL || '';

type Mode = 'guide' | 'agent';

interface WebSource {
  title?: string;
  url?: string;
  source_file?: string;
  section_path?: string;
  score?: number;
}

// Open WebUI v0.9 의 OpenAI-compatible 응답은 sources/citations 별도 필드를 노출하지 않는다.
// 모델이 답변 본문에 출처 URL 을 직접 인용하는 패턴이 표준이므로, 본문에서 URL 을 정규식 추출해
// sources 배열을 구성한다. (구버전·변형 응답을 위해 표준 필드도 함께 점검.)
const URL_RE = /https?:\/\/[^\s<>'"`)\]]+/g;

function extractWebSources(payload: unknown, answerText: string): WebSource[] {
  // 1) 표준 필드 우선 — 향후 Open WebUI 가 citations 를 표준화하면 자동 대응
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    const choice = Array.isArray(p.choices) ? (p.choices[0] as Record<string, unknown>) : undefined;
    const msg = choice?.message as Record<string, unknown> | undefined;
    const candidates = [
      p.sources, p.citations, p.web_search_results,
      msg?.sources, msg?.citations, msg?.annotations,
    ];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) {
        return c
          .map((s) => {
            const item = (s ?? {}) as Record<string, unknown>;
            const url =
              (typeof item.url === 'string' && item.url) ||
              (typeof item.link === 'string' && item.link) ||
              (typeof item.source === 'string' && item.source) ||
              undefined;
            const title =
              (typeof item.title === 'string' && item.title) ||
              (typeof item.name === 'string' && item.name) ||
              undefined;
            return { url, title };
          })
          .filter((s) => s.url || s.title);
      }
    }
  }

  // 2) Fallback — 답변 본문의 URL 추출. 중복 제거.
  if (!answerText) return [];
  const found = new Set<string>();
  for (const m of answerText.matchAll(URL_RE)) {
    let url = m[0];
    // 끝의 마침표·쉼표·따옴표 등을 trim
    url = url.replace(/[.,;:!?'")\]]+$/, '');
    found.add(url);
  }
  return [...found].map((url) => ({ url, title: hostnameOf(url) }));
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

async function callRagChat(question: string, topK?: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 540000);
  const res = await fetch(`${RAG_SERVER_URL}/chat`, {
    method: 'POST',
    signal: ctrl.signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(topK ? { question, topK } : { question }),
  }).finally(() => clearTimeout(t));
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `RAG 서버 오류 (${res.status})`);
  }
  return JSON.parse(text);
}

// 모델 프리셋의 system prompt 와 무관하게 매 호출마다 강제 적용하는 추가 시스템 프롬프트.
// 검색 결과 본문 인용·출처 URL 명시를 강하게 요구해 sources 추출(URL 정규식)이 일관되게 동작하도록 함.
const OPEN_WEBUI_SYSTEM_PROMPT = `당신은 TEAM WORKS 의 AI 비서 "찰떡"입니다. 사용자가 일반 질문(TEAM WORKS 사용법과 무관한 시사·날씨·코딩·지식 등)을 했고, 시스템이 웹 검색 결과를 컨텍스트로 제공했습니다.

답변 규칙 (반드시 준수):
1. 한국어로 친절하고 간결하게 답합니다.
2. 검색 결과의 본문을 사실 기반으로 인용해 구체적으로 답합니다. 추측·일반론 금지.
3. 검색 결과에 정보가 없거나 불충분하면 솔직히 "검색 결과에서 확인되지 않았다" 고 말하고, 사용자가 직접 확인할 키워드 두세 개를 제안합니다.
4. **답변 마지막에 반드시 다음 형식으로 출처를 명시** (출처가 없으면 답변 자체를 거절):
   출처:
   - https://example.com/...
   - https://example.com/...
5. 출처 URL 은 인라인 마크다운 링크가 아닌 위 목록 형태로 1~3개 명시. 본문에서 인용한 출처만 표기.`;

async function callOpenWebUi(question: string) {
  if (!OPEN_WEBUI_API_KEY) {
    throw new Error(
      'OPEN_WEBUI_API_KEY 가 설정되어 있지 않습니다. 루트 .env 에 키를 추가한 후 frontend 컨테이너를 재기동해 주세요.'
    );
  }
  // 1) SearxNG 직접 검색 (~2초). web_search 를 Open WebUI 에 맡기면 5분+ 직렬 대기.
  const hits = await searxngFetch(question, 5);
  const systemContent = OPEN_WEBUI_SYSTEM_PROMPT + hitsToContextBlock(hits);

  // Node.js undici(fetch 구현) 의 기본 receive timeout 이 5분(300초)이라
  // Open WebUI + gemma4:26b 답변이 그 이상 걸리면 끊긴다. 9분으로 명시 확장.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 540000);
  const res = await fetch(`${OPEN_WEBUI_BASE_URL}/api/chat/completions`, {
    method: 'POST',
    signal: ctrl.signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPEN_WEBUI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPEN_WEBUI_MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: question },
      ],
      // 검색은 frontend 가 이미 했음 — Open WebUI 측 web_search 비활성
      features: { web_search: false },
      // 답변 토큰 수 캡 — decode 시간 단축. 출처 인용 포함해 충분.
      options: { num_predict: 800 },
      stream: false,
    }),
  }).finally(() => clearTimeout(t));
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Open WebUI 오류 (${res.status})`);
  }
  const data = JSON.parse(text);
  const content =
    data?.choices?.[0]?.message?.content ??
    (typeof data?.message === 'string' ? data.message : '') ??
    '';
  const answer = String(content).trim();
  let sources = extractWebSources(data, answer);
  // Open WebUI 가 URL 메타를 안 줘서 정규식 추출도 실패하는 경우 SearxNG 직접 호출로 보강.
  if (sources.length === 0) {
    sources = await searxngQuery(question);
  }
  return { answer, sources };
}

// SearxNG 직접 호출로 URL/title/snippet 을 가져와 (1) sources 보강 (2) inline 컨텍스트 주입.
// Open WebUI 의 web_search 는 검색·web_loader 단계가 직렬로 5분+ 소요해 stream 효과를 가림.
// frontend 가 SearxNG 를 직접 호출해 결과를 모델 메시지에 inline 으로 넣고 Open WebUI 의 web_search 는 비활성하면
// 모델 답변 토큰이 즉시 stream 시작 가능.
interface WebHit {
  title: string;
  url: string;
  content: string; // SearxNG snippet (~120~200자, 페이지 핵심 발췌)
}

async function searxngFetch(question: string, limit = 5): Promise<WebHit[]> {
  if (!SEARXNG_BASE_URL) return [];
  try {
    const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(question)}&format=json`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results
      .slice(0, limit)
      .map((r: Record<string, unknown>) => ({
        title: typeof r.title === 'string' ? r.title : '',
        url: typeof r.url === 'string' ? r.url : '',
        content: typeof r.content === 'string' ? r.content : '',
      }))
      .filter((h: WebHit) => h.url);
  } catch {
    return [];
  }
}

function hitsToSources(hits: WebHit[]): WebSource[] {
  return hits.map((h) => ({ title: h.title, url: h.url }));
}

// SearxNG 결과를 system prompt 에 동봉할 컨텍스트 블록으로 변환.
function hitsToContextBlock(hits: WebHit[]): string {
  if (!hits.length) return '';
  const blocks = hits.map((h, i) => {
    const head = `[${i + 1}] ${h.title || '(제목 없음)'}\nURL: ${h.url}`;
    const body = h.content ? `\n${h.content}` : '';
    return head + body;
  });
  return `\n\n# 웹 검색 결과 (참고 자료)\n\n${blocks.join('\n\n')}`;
}

// 하위 호환 alias — 기존 sources 보강 경로(non-stream RAG fallback) 가 사용
async function searxngQuery(question: string, limit = 5): Promise<WebSource[]> {
  const hits = await searxngFetch(question, limit);
  return hitsToSources(hits);
}

// ── Streaming helpers ─────────────────────────────────────────────
// SSE 이벤트 타입:
//   meta:    { type:'meta', source:'rag'|'web', classification }
//   token:   { type:'token', text }
//   sources: { type:'sources', sources: WebSource[] }
//   error:   { type:'error', message }
//   [DONE]:  종료

type SendFn = (obj: Record<string, unknown>) => void;

// Ollama ndjson 또는 OpenAI SSE 응답 본문을 line 단위로 파싱.
// rag/server.js 는 SSE("data: {...}\n\n"), Open WebUI 는 OpenAI SSE("data: {...}\n\n").
async function forwardSseTokens(
  upstreamBody: ReadableStream<Uint8Array>,
  send: SendFn,
  parseChunk: (raw: string) => string | null
) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || !t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const tok = parseChunk(data);
        if (tok) send({ type: 'token', text: tok });
      } catch {
        // 파싱 실패는 무시
      }
    }
  }
}

// rag/server.js 의 SSE 청크: { type:'sources'|'token', ... }
async function streamRag(question: string, topK: number | undefined, send: SendFn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 540000);
  const res = await fetch(`${RAG_SERVER_URL}/chat`, {
    method: 'POST',
    signal: ctrl.signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question, ...(topK ? { topK } : {}), stream: true }),
  }).finally(() => clearTimeout(t));
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `RAG 서버 오류 (${res.status})`);
  }
  await forwardSseTokens(res.body, send, (data) => {
    const obj = JSON.parse(data);
    if (obj.type === 'sources' && Array.isArray(obj.sources)) {
      send({ type: 'sources', sources: obj.sources });
      return null;
    }
    if (obj.type === 'token' && typeof obj.text === 'string') return obj.text;
    if (obj.type === 'error') throw new Error(obj.message);
    return null;
  });
}

// Open WebUI 의 web_search 는 검색·web_loader 가 직렬로 5분+ 걸려 stream 효과를 가림.
// 우리가 SearxNG 를 직접 호출해 결과를 inline 컨텍스트로 system prompt 에 주입하고
// Open WebUI 의 web_search 는 비활성. 검색 ~2초 후 곧장 모델 stream 시작.
//
// thinking-mode 모델(gemma4:26b)은 답변(content) 전에 reasoning_content 단계가 흐른다.
// 사용자에게 첫 시그널을 빠르게 주기 위해 reasoning 시작 시 progress 한 번 송출.
async function streamOpenWebUi(question: string, send: SendFn) {
  if (!OPEN_WEBUI_API_KEY) {
    throw new Error(
      'OPEN_WEBUI_API_KEY 가 설정되어 있지 않습니다. 루트 .env 에 키를 추가한 후 frontend 컨테이너를 재기동해 주세요.'
    );
  }
  // 1) SearxNG 직접 검색 → snippet 포함 hits 획득
  const hits = await searxngFetch(question, 5);
  // 2) 출처를 stream 시작 직후 미리 송출 (UI 가 토큰 도착 전에 출처 카드 렌더 가능)
  if (hits.length) send({ type: 'sources', sources: hitsToSources(hits) });
  // 3) 검색 결과를 system prompt 에 inline 주입
  const systemContent = OPEN_WEBUI_SYSTEM_PROMPT + hitsToContextBlock(hits);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 540000);
  const res = await fetch(`${OPEN_WEBUI_BASE_URL}/api/chat/completions`, {
    method: 'POST',
    signal: ctrl.signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPEN_WEBUI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPEN_WEBUI_MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: question },
      ],
      // web_search 비활성 — 검색은 frontend 가 이미 했고 inline 으로 주입됨
      features: { web_search: false },
      options: { num_predict: 800 },
      stream: true,
    }),
  }).finally(() => clearTimeout(t));
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Open WebUI 오류 (${res.status})`);
  }
  let reasoningStarted = false;
  await forwardSseTokens(res.body, send, (data) => {
    const obj = JSON.parse(data);
    const delta = obj?.choices?.[0]?.delta ?? {};
    if (typeof delta.content === 'string' && delta.content) return delta.content;
    if (
      !reasoningStarted &&
      typeof delta.reasoning_content === 'string' &&
      delta.reasoning_content
    ) {
      reasoningStarted = true;
      // progress 시그널 — page.tsx 가 별도 처리해 한 번만 표시
      send({ type: 'progress', text: '🔎 검색 결과를 분석 중…' });
    }
    return null;
  });
}

async function classify(question: string) {
  const res = await fetch(`${RAG_SERVER_URL}/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    // classify 실패 시 안전하게 RAG 로 라우팅
    return { isTeamWorks: true, reason: 'classify-error' as const };
  }
  return res.json();
}

// RAG 가드레일이 "참고 자료에 없어요" 류로 거절했는지 판정.
// 거절형이면 Open WebUI(웹검색) 으로 fallback 한다.
//
// 거절 시그널은 보통 다음 중 하나로 나타난다:
//  (a) "참고 자료" 라는 메타 표현 — 정상 사용법 답변에는 등장하지 않음 (강한 시그널)
//  (b) "찰떡" 자기소개로 마감 — 가드레일이 거절 시 자기소개로 끝내도록 유도
//  (c) "현재 안내되어 있지 않아요" / "이용과 관련하여 궁금한 점" 류 표준 거절 문구
const REFUSAL_PATTERNS = [
  /참고\s*자료/,                          // (a) 강한 시그널
  /AI\s*비서\s*["“”']?찰떡/,              // (b) 자기소개 마감
  /현재\s*안내되어\s*있지\s*않/,          // (c)
  /TEAM\s*WORKS\s*이용과\s*관련/i,        // (c) 표준 거절 후미
  /TEAM\s*WORKS\s*사용법\s*외/i,
  /제공된\s*(참고\s*)?자료에는?[^]{0,30}않/,
  /포함되어\s*있지\s*않아/,
  /관련\s*(정보|내용)을?\s*(찾을\s*수\s*없|포함하고\s*있지\s*않)/,
  /잘\s*모르겠어요/,
  // 운영 중 발견된 거절 케이스 보강
  /안내되어\s*있지\s*않/,                  // "현재" 없이도 매칭 ("X 기능은 안내되어 있지 않습니다")
  /안내해\s*드릴\s*수\s*없/,
  /저는\s*TEAM\s*WORKS\s*의?\s*AI\s*비서/, // 찰떡 단어 없는 자기소개 마감
  /안내\s*모드[\s\S]{0,200}실행\s*모드/,    // 두 모드 설명으로 마감 = 거절형
];
function isRefusal(answer: string): boolean {
  if (!answer || answer.length < 5) return true; // 빈 응답도 거절로 간주
  return REFUSAL_PATTERNS.some((re) => re.test(answer));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }

    const mode: Mode = body?.mode === 'agent' ? 'agent' : 'guide';

    // 실행 모드 — 기존 Agent 경로 그대로
    if (mode === 'agent') {
      const auth = request.headers.get('authorization') || '';
      if (!/^Bearer\s+/i.test(auth)) {
        return NextResponse.json(
          { error: '실행 모드는 로그인 후 이용해 주세요.' },
          { status: 401 }
        );
      }
      const upstream = await fetch(`${AGENT_SERVER_URL}/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: auth,
        },
        body: JSON.stringify({ question, userHint: body?.userHint }),
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        return NextResponse.json(
          { error: text || `Agent 서버 오류 (${upstream.status})` },
          { status: upstream.status }
        );
      }
      return new NextResponse(text, {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    // 안내 모드 — 키워드 분류 + 답변 거절 폴백
    //
    // 라우팅 전략(2-stage):
    //  1) classify 키워드 매치 → 즉시 RAG 답변 (확실한 사용법 질문)
    //  2) 매치 없음 → 일단 RAG 시도 후, 거절형이면 Open WebUI 로 fallback
    //
    // 이유: RRF 점수가 모든 쿼리에 비슷한 분포로 나와 단일 임계값으로 분류 불가능.
    // 답변 내용 자체가 가장 정확한 라우팅 신호다 (RAG 가드레일이 거절형을 표준화함).
    const cls = await classify(question);
    const topK = Number.isFinite(body?.topK) ? body.topK : undefined;
    const isStream = body?.stream === true;

    // === Streaming response (SSE) — 사용자 체감 대기 시간 단축 ===
    if (isStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const send: SendFn = (obj) => {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
          };
          try {
            if (cls.isTeamWorks) {
              // 분기 1: HARD_KEYWORDS 매치 → RAG 즉시 stream
              send({ type: 'meta', source: 'rag', classification: cls });
              await streamRag(question, topK, send);
            } else if (cls.reason === 'general-keyword') {
              // 분기 2: GENERAL_KEYWORDS 매치 → Open WebUI 즉시 stream
              send({
                type: 'meta',
                source: 'web',
                classification: { ...cls, fallback: 'general-keyword-direct' },
              });
              await streamOpenWebUi(question, send);
              // sources 보강 — Open WebUI 응답엔 URL 없으니 SearxNG 직접 호출
              const sources = await searxngQuery(question);
              if (sources.length) send({ type: 'sources', sources });
            } else {
              // 분기 3: no-keyword — RAG 시도(non-stream) 후 거절형이면 Open WebUI stream
              let ragData: Record<string, unknown> | null = null;
              try {
                ragData = await callRagChat(question, topK);
              } catch {
                ragData = null;
              }
              const ragAnswer = typeof ragData?.answer === 'string' ? ragData.answer : '';
              if (ragData && !isRefusal(ragAnswer)) {
                // RAG 양호 답변 — 한 번에 보내기 (이미 완성)
                send({
                  type: 'meta',
                  source: 'rag',
                  classification: { ...cls, fallback: 'rag-answered' },
                });
                if (Array.isArray(ragData.sources)) {
                  send({ type: 'sources', sources: ragData.sources as WebSource[] });
                }
                send({ type: 'token', text: ragAnswer });
              } else {
                // 거절 → Open WebUI stream
                send({
                  type: 'meta',
                  source: 'web',
                  classification: { ...cls, fallback: 'rag-refused' },
                });
                await streamOpenWebUi(question, send);
                const sources = await searxngQuery(question);
                if (sources.length) send({ type: 'sources', sources });
              }
            }
            send({ type: 'done' });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            send({ type: 'error', message });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no', // nginx 가 버퍼링 없이 흘려보내도록
        },
      });
    }
    // === Non-stream (기존 동작 유지) ===

    if (cls.isTeamWorks) {
      const data = await callRagChat(question, topK);
      return NextResponse.json({
        ...data,
        source: 'rag',
        classification: cls,
      });
    }

    // 일반 질문 키워드 매치 — RAG 답변 시도(약 50초) 스킵하고 곧장 Open WebUI
    if (cls.reason === 'general-keyword') {
      const ow = await callOpenWebUi(question);
      return NextResponse.json({
        answer: ow.answer,
        sources: ow.sources,
        source: 'web',
        classification: { ...cls, fallback: 'general-keyword-direct' },
      });
    }

    // 키워드 매치 실패 — 일단 RAG 시도
    let ragData: Record<string, unknown> | null = null;
    try {
      ragData = await callRagChat(question, topK);
    } catch {
      ragData = null;
    }
    const ragAnswer = typeof ragData?.answer === 'string' ? ragData.answer : '';
    if (ragData && !isRefusal(ragAnswer)) {
      // RAG 가 의미 있는 답변을 줬다 → 그대로 사용
      return NextResponse.json({
        ...ragData,
        source: 'rag',
        classification: { ...cls, fallback: 'rag-answered' },
      });
    }

    // RAG 가 거절했거나 실패 → Open WebUI 로 fallback
    const ow = await callOpenWebUi(question);
    return NextResponse.json({
      answer: ow.answer,
      sources: ow.sources,
      source: 'web',
      classification: { ...cls, fallback: 'rag-refused' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint =
      message.includes('ECONNREFUSED') || message.includes('fetch failed')
        ? 'AI 서버에 연결할 수 없습니다. rag(8787) / agent(8788) / open-webui(8081) 중 어느 하나가 미응답입니다.'
        : message;
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
