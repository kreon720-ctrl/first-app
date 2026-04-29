import { NextRequest, NextResponse } from 'next/server';
import { createSchedule } from '@/lib/mcp/scheduleQueries';
import { BackendError } from '@/lib/mcp/pgClient';

// AI 어시스턴트의 confirm 카드 승인 시 호출.
// 안전한 도구 화이트리스트만 허용 — 자유 도구 호출 불가.
const TOOL_WHITELIST = ['createSchedule'] as const;
type WhitelistedTool = (typeof TOOL_WHITELIST)[number];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = request.headers.get('authorization') || '';
    const jwt = /^Bearer\s+(.+)$/i.exec(auth)?.[1] || '';
    if (!jwt) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const body = await request.json();
    const tool = typeof body?.tool === 'string' ? body.tool : '';
    const args = (body?.args ?? {}) as Record<string, unknown>;

    if (!TOOL_WHITELIST.includes(tool as WhitelistedTool)) {
      return NextResponse.json(
        { error: `지원하지 않는 도구: ${tool || '(없음)'}` },
        { status: 400 }
      );
    }

    if (tool === 'createSchedule') {
      const teamId = typeof args.teamId === 'string' ? args.teamId : '';
      const title = typeof args.title === 'string' ? args.title : '';
      const startAt = typeof args.startAt === 'string' ? args.startAt : '';
      const endAt = typeof args.endAt === 'string' ? args.endAt : '';
      if (!teamId || !title || !startAt || !endAt) {
        return NextResponse.json(
          { error: 'teamId, title, startAt, endAt 은 필수입니다.' },
          { status: 400 }
        );
      }
      const description = typeof args.description === 'string' ? args.description : undefined;
      const color =
        typeof args.color === 'string'
          ? (args.color as 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose')
          : undefined;
      const schedule = await createSchedule({
        teamId,
        jwt,
        title,
        startAt,
        endAt,
        description,
        color,
      });
      return NextResponse.json({ ok: true, schedule });
    }

    return NextResponse.json({ error: '알 수 없는 도구' }, { status: 400 });
  } catch (err) {
    if (err instanceof BackendError) {
      const friendly =
        err.status === 401
          ? '로그인이 만료됐어요. 메인 화면에서 다시 로그인해 주세요.'
          : err.status === 403
          ? '이 팀에 대한 권한이 없어요.'
          : `요청 처리 실패 (${err.status}): ${err.message}`;
      return NextResponse.json({ error: friendly }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
