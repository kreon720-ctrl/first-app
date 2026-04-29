/**
 * JSON-mode prompting for gemma2:9b with tool-specific args schemas.
 *
 * Two key hardenings over the first JSON draft:
 *   1) `buildResponseSchema(tools)` emits a discriminated oneOf where each
 *      tool branch embeds that tool's own inputSchema. Ollama's format
 *      enforces enums (e.g. color) and required args end-to-end instead of
 *      only checking the top-level shape.
 *   2) `buildSystemPrompt` now includes a pre-computed Korean relative-date
 *      table and renders each tool's args with enums inline, so the model
 *      doesn't have to guess "내일" or which color values are valid.
 */

export function buildResponseSchema(tools) {
  const actionBranches = tools.map((t) => ({
    type: 'object',
    required: ['kind', 'tool', 'args'],
    properties: {
      thought: { type: 'string' },
      kind: { type: 'string', const: 'action' },
      tool: { type: 'string', const: t.name },
      args: t.inputSchema ?? { type: 'object' },
    },
  }));

  const answerBranch = {
    type: 'object',
    required: ['kind', 'answer'],
    properties: {
      thought: { type: 'string' },
      kind: { type: 'string', const: 'answer' },
      answer: { type: 'string' },
    },
  };

  return { oneOf: [...actionBranches, answerBranch] };
}

/** Render a tool's input schema as a compact human-readable signature. */
function renderToolSignature(tool) {
  const schema = tool.inputSchema || {};
  const props = schema.properties || {};
  const required = new Set(schema.required || []);
  const parts = Object.entries(props).map(([name, sub]) => {
    const isReq = required.has(name) ? '' : '?';
    let type = sub.type || 'any';
    if (sub.enum) type = sub.enum.join('|');
    return `${name}${isReq}: ${type}`;
  });
  return `${tool.name}(${parts.join(', ')})`;
}

function renderToolBlock(tool) {
  const sig = renderToolSignature(tool);
  const lines = [`- ${sig}`, `  ${tool.description}`];
  const props = tool.inputSchema?.properties || {};
  for (const [name, sub] of Object.entries(props)) {
    if (sub.enum) {
      const def = sub.default ? `, 기본값: ${sub.default}` : '';
      lines.push(`    • ${name} 는 반드시 ${sub.enum.join('|')} 중 하나${def}.`);
    }
  }
  return lines.join('\n');
}

export function buildSystemPrompt({ tools, dateContext, userHint }) {
  const toolCatalog = tools.map(renderToolBlock).join('\n');

  return `당신은 TEAM WORKS 앱의 AI 버틀러 "찰떡이"입니다.
반드시 JSON 단일 객체 하나만 출력하세요. Markdown, 인사말, 해설, 코드펜스, 불필요한 공백 금지.

# 현재 시각 및 상대 날짜 (KST)
${dateContext}

# 컨텍스트
${userHint ? `- ${userHint}` : '- (기본 팀 없음 — 사용자에게 필요 시 되물을 것)'}

# 사용 가능한 도구
${toolCatalog}

# 응답 형식 (두 가지 중 하나만 선택)
도구 호출: {"kind":"action","tool":"<도구이름>","args":{...}}
직접 답변: {"kind":"answer","answer":"<한국어 존댓말>"}

# 규칙
1. 의문형(뭐/있어/알려/보여/확인/조회) → 조회 도구(list_*) 만 후보. 절대 create_* 를 고르지 말 것.
2. 명령형(등록/추가/만들어/잡아/넣어) → 수정 도구(create_*) 후보.
3. 상대 날짜(오늘/내일/모레/이번 주 X요일/다음 주 X요일)는 위 "상대 날짜" 표의 값을 그대로 YYYY-MM-DD 로 사용한다. 추측 금지.
4. color 는 표기된 enum 중에서만 선택. 한국어·영어 유사어(red/yellow/green/orange 등)도 절대 사용 금지.
5. title 에는 핵심 주제만 넣는다. 시간/기간/날짜 표현(오전·오후·저녁·점심·새벽·1시간·2시간·하루종일·오늘·내일 등)은 절대 포함 금지.
6. startAt/endAt 은 ISO 8601 (예: 2026-04-25T15:00:00+09:00). endAt 은 반드시 startAt 이후.
7. 시간 미지정 시 startAt=09:00, endAt=10:00 을 기본값. "하루종일"은 00:00~23:59.
8. 기본 팀이 컨텍스트에 주어져 있으면 되묻지 말고 그 teamId 를 그대로 사용.
9. 같은 도구를 같은 인자로 연속 호출 금지.
10. TEAM WORKS 앱과 무관한 질문(코딩/날씨/상식)은 answer 로 정중히 거절.
11. list_team_schedules 의 view 결정 규칙 (엄수):
    - view 는 **오직 날짜 범위 표현만으로** 결정한다. "알려줘/정리해줘/보여줘/뭐있어/확인해줘/조회해줘" 등 동사·요청 표현은 view 선택에 **전혀 영향을 주지 않는다**.
    - 특정 하루(오늘/내일/모레/어제/M월 D일/YYYY-MM-DD) → view="day"
    - 주 단위(이번 주/다음 주/저번 주/N주) → view="week"
    - 월 단위(이번 달/다음 달/M월/한 달) 또는 날짜 표현이 전혀 없음 → view="month"
    - 애매하면 day 를 기본으로 한다 (월 전체로 오해 금지).

# 예시 — 조회 (사용자 질의의 M월 D일 은 프리프로세서가 YYYY-MM-DD 로 미리 치환함. date 에는 반드시 질의에 박혀 있는 값을 그대로 복사.)
입력: "오늘 일정 정리해줘"
출력: {"kind":"action","tool":"list_team_schedules","args":{"teamId":"<컨텍스트 teamId>","view":"day","date":"<표의 오늘 값>"}}

입력: "2026-04-22 일정 정리해줘"
출력: {"kind":"action","tool":"list_team_schedules","args":{"teamId":"<컨텍스트 teamId>","view":"day","date":"2026-04-22"}}

입력: "이번 주 일정 정리해줘"
출력: {"kind":"action","tool":"list_team_schedules","args":{"teamId":"<컨텍스트 teamId>","view":"week","date":"<표의 이번 주 월요일>"}}

입력: "4월 일정 정리해줘"
출력: {"kind":"action","tool":"list_team_schedules","args":{"teamId":"<컨텍스트 teamId>","view":"month","date":"2026-04-01"}}

# 예시 — 등록
입력: "내일 15시 회의 잡아줘"
출력: {"kind":"action","tool":"create_schedule","args":{"teamId":"<컨텍스트 teamId>","title":"회의","startAt":"<표의 내일>T15:00:00+09:00","endAt":"<표의 내일>T16:00:00+09:00","color":"indigo"}}

teamId·date 의 "<...>" 부분은 컨텍스트·표의 실제 값으로 반드시 치환. 리터럴 "<...>" 를 남기면 안 됨.`;
}

// ReAct 루프가 매 스텝마다 observation 을 messages 에 누적하므로
// 큰 결과(예: 다건 일정·메시지)가 num_ctx 32K 를 잠식하지 않도록 길이 캡.
// 토큰≈문자/2.2 기준으로 약 6K 토큰(=13.2K 문자) 상한.
const OBSERVATION_CHAR_LIMIT = 13200;

export function buildObservationMessage(toolName, result) {
  let text = typeof result === 'string' ? result : JSON.stringify(result);
  if (text.length > OBSERVATION_CHAR_LIMIT) {
    text = `${text.slice(0, OBSERVATION_CHAR_LIMIT)}\n…(이하 ${
      text.length - OBSERVATION_CHAR_LIMIT
    }자 생략)`;
  }
  return `이전 도구 "${toolName}" 의 결과입니다:\n${text}\n\n이 결과를 참고해 사용자에게 전달할 응답을 JSON {"kind":"answer","answer":"..."} 형태로 주세요.`;
}
