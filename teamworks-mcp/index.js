#!/usr/bin/env node
/**
 * TEAM WORKS MCP Server
 *
 * stdio transport — spawned as a child process by the Agent Host.
 * Exposes a small set of tools that wrap the TEAM WORKS backend REST API.
 *
 * Auth: the parent process sets TEAMWORKS_JWT and BACKEND_URL env vars
 * before spawning this server. Each tool call reuses those credentials.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listMyTeams } from './tools/listMyTeams.js';
import { listTeamSchedules } from './tools/listTeamSchedules.js';
import { createSchedule } from './tools/createSchedule.js';

const TOOLS = [listMyTeams, listTeamSchedules, createSchedule];
const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

const server = new Server(
  { name: 'teamworks-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = TOOL_MAP[name];
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
  }
  try {
    const result = await tool.handler(args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    const status = err.status ?? 'unknown';
    const body = err.body ? ` body=${JSON.stringify(err.body)}` : '';
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Tool ${name} failed (status=${status}): ${err.message}${body}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Keep process alive. stderr is used for operational logs (stdout is reserved
// for the JSON-RPC framing).
process.stderr.write('[teamworks-mcp] ready\n');
