import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const MCP_SERVER_ENTRY = path.join(ROOT, 'teamworks-mcp', 'index.js');

export const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const CHAT_MODEL = process.env.CHAT_MODEL || 'gemma4:26b';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
export const SERVER_PORT = Number(process.env.AGENT_PORT || 8788);

// Maximum ReAct iterations (each iteration = 1 model call + at most 1 tool call).
export const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS || 4);

// Tools whose execution is deferred until the user confirms in the UI.
// Everything else (list_*, get_*) runs automatically.
export const CONFIRM_TOOLS = new Set(
  (process.env.AGENT_CONFIRM_TOOLS || 'create_schedule,update_schedule,delete_schedule')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
