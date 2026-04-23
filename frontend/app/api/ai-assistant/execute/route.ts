import { NextRequest, NextResponse } from 'next/server';

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://127.0.0.1:8788';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = request.headers.get('authorization') || '';
    if (!/^Bearer\s+/i.test(auth)) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const body = await request.json();
    const tool = typeof body?.tool === 'string' ? body.tool : '';
    if (!tool) {
      return NextResponse.json({ error: '`tool` 은 필수입니다.' }, { status: 400 });
    }

    const upstream = await fetch(`${AGENT_SERVER_URL}/execute`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: auth,
      },
      body: JSON.stringify({ tool, args: body?.args ?? {} }),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
