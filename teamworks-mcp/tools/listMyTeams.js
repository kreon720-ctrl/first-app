import { callBackend } from '../backendClient.js';

export const listMyTeams = {
  name: 'list_my_teams',
  description: '현재 로그인한 사용자가 속한 팀 목록을 반환한다. 팀 ID·이름·공개 여부·본인 역할(LEADER/MEMBER)을 포함한다.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  mutates: false,
  async handler() {
    const data = await callBackend('/api/teams');
    return {
      teams: (data?.teams ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        isPublic: t.isPublic,
        myRole: t.myRole,
      })),
    };
  },
};
