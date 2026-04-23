export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// JWT is passed per-request via the `TEAMWORKS_JWT` environment variable, which
// the parent process (agent Host) sets when spawning this MCP server.
export function getJwt() {
  const token = process.env.TEAMWORKS_JWT;
  if (!token) {
    throw new Error('TEAMWORKS_JWT env var is required (set by the Agent Host)');
  }
  return token;
}
