import { NextRequest, NextResponse } from 'next/server';

const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://127.0.0.1:8787';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json(
        { error: '질문을 입력해 주세요.' },
        { status: 400 }
      );
    }
    const topK = Number.isFinite(body?.topK) ? body.topK : undefined;

    const upstream = await fetch(`${RAG_SERVER_URL}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(topK ? { question, topK } : { question }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: text || `RAG 서버 오류 (${upstream.status})` },
        { status: upstream.status }
      );
    }
    return new NextResponse(text, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = message.includes('ECONNREFUSED') || message.includes('fetch failed')
      ? 'RAG 서버(127.0.0.1:8787)에 연결할 수 없습니다. rag 디렉토리에서 `npm run server`를 실행했는지 확인해 주세요.'
      : message;
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
