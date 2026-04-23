import express from 'express';
import { SERVER_PORT, CHAT_MODEL } from './config.js';
import { runAgent, executePendingAction } from './reactLoop.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, model: CHAT_MODEL });
});

function extractBearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

app.post('/chat', async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) {
    return res.status(401).json({ error: '인증이 필요합니다. (Authorization: Bearer <JWT>)' });
  }
  const { question, userHint } = req.body ?? {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: '`question` (string) is required' });
  }

  try {
    const result = await runAgent({ question, jwt, userHint });
    if (result.kind === 'answer') {
      return res.json({ kind: 'answer', answer: result.answer });
    }
    if (result.kind === 'confirm') {
      return res.json({
        kind: 'confirm',
        pendingAction: result.pendingAction,
        preview: result.preview,
        answer: `아래 내용으로 실행해도 될까요?\n${result.preview}`,
      });
    }
    return res.status(502).json({ kind: 'error', error: result.error });
  } catch (err) {
    console.error('[agent] /chat error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/execute', async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  const { tool, args } = req.body ?? {};
  if (!tool || typeof tool !== 'string') {
    return res.status(400).json({ error: '`tool` (string) is required' });
  }
  try {
    const result = await executePendingAction({ tool, args, jwt });
    return res.json(result);
  } catch (err) {
    console.error('[agent] /execute error:', err);
    return res.status(502).json({ error: String(err.message || err) });
  }
});

app.listen(SERVER_PORT, () => {
  console.log(`Agent Host listening on http://127.0.0.1:${SERVER_PORT}`);
  console.log(`  POST /chat     { "question": "..." }  (requires Bearer JWT)`);
  console.log(`  POST /execute  { "tool": "...", "args": {...} }`);
  console.log(`  GET  /health`);
});
