import { callBackend } from '../backendClient.js';

export const listTeamSchedules = {
  name: 'list_team_schedules',
  description:
    '특정 팀의 일정을 조회한다. view 는 month|week|day 중 하나. date 는 YYYY-MM-DD (KST 기준 조회 기준일). 기본값은 오늘.',
  inputSchema: {
    type: 'object',
    required: ['teamId'],
    properties: {
      teamId: { type: 'string', description: '조회 대상 팀 UUID' },
      view: {
        type: 'string',
        enum: ['month', 'week', 'day'],
        default: 'month',
        description: '조회 범위 (월간/주간/일간)',
      },
      date: {
        type: 'string',
        description: 'YYYY-MM-DD 형식 기준일. 생략 시 오늘.',
      },
    },
    additionalProperties: false,
  },
  mutates: false,
  async handler({ teamId, view = 'month', date }) {
    const data = await callBackend(`/api/teams/${teamId}/schedules`, {
      query: { view, date },
    });
    return {
      view: data?.view,
      date: data?.date,
      count: (data?.schedules ?? []).length,
      schedules: (data?.schedules ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        startAt: s.startAt,
        endAt: s.endAt,
        color: s.color,
        creatorName: s.creatorName,
      })),
    };
  },
};
