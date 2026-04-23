/**
 * MCP client wrapper. Spawns teamworks-mcp as a child process and exposes
 * listTools() / callTool() helpers. Uses stdio transport.
 *
 * We spawn a fresh MCP process per request so the user's JWT can be injected
 * via env var without worrying about leakage between sessions. The cost
 * (~50–150ms spawn) is acceptable for chat latency.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCP_SERVER_ENTRY, BACKEND_URL } from './config.js';

export async function withMcpClient(jwt, fn) {
  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: [MCP_SERVER_ENTRY],
    env: {
      ...process.env,
      TEAMWORKS_JWT: jwt,
      BACKEND_URL,
    },
  });
  const client = new Client(
    { name: 'teamworks-agent', version: '0.1.0' },
    { capabilities: {} }
  );
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export async function listTools(client) {
  const { tools } = await client.listTools();
  return tools;
}

export async function callTool(client, name, args) {
  const res = await client.callTool({ name, arguments: args ?? {} });
  if (res.isError) {
    const text = (res.content || []).map((c) => c.text).join('\n');
    const err = new Error(`tool "${name}" error: ${text}`);
    err.toolError = true;
    throw err;
  }
  // tools in this project return a single text block containing JSON
  const text = (res.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
