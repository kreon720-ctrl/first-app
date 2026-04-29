/**
 * pgClient — AI 어시스턴트가 일정 조회/등록을 수행하기 위한 데이터 접근 래퍼.
 *
 * 채택 결정 (docs/16-mcp-server-plan.md §3.4):
 *   - 자유 SQL 생성을 LLM 에 직접 맡기지 않음 (B안).
 *   - 표준 PostgreSQL MCP child process 직접 통합 대신, **백엔드의 기존 schedule API**
 *     (/api/teams/:teamId/schedules) 를 호출하는 wrapper 로 구현.
 *   - 백엔드 미들웨어(`withAuth`, `withTeamRole`) 가 이미 `team_id` + 사용자 권한을
 *     검증하므로 권한 격리·SQL 인젝션 방지가 자동.
 *   - 인터페이스(`getSchedules`/`createSchedule`)는 plan 그대로 유지 — 향후 진짜
 *     PG-MCP child process 로 교체할 때 호출처 변경 없음.
 */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export class BackendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'BackendError';
  }
}

export interface BackendCallOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  jwt: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

// 백엔드 호출 공용 fetch — JWT 헤더 강제, 타임아웃, JSON 파싱 일원화.
export async function callBackend<T = unknown>(opts: BackendCallOptions): Promise<T> {
  const { method, path, jwt, query, body, timeoutMs = 15000 } = opts;
  const url = new URL(path, BACKEND_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method,
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // 비-JSON 응답은 그대로 보존
        parsed = text;
      }
    }
    if (!res.ok) {
      const errMsg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as Record<string, unknown>).error)
          : null) || `백엔드 호출 실패 (${res.status})`;
      throw new BackendError(res.status, errMsg);
    }
    return parsed as T;
  } finally {
    clearTimeout(t);
  }
}
