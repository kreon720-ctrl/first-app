import { callBackend } from '../backendClient.js';

export const createSchedule = {
  name: 'create_schedule',
  description:
    '특정 팀에 새 일정을 등록한다. startAt/endAt 은 ISO 8601 문자열(KST 시각은 +09:00). color 는 indigo|blue|emerald|amber|rose 중 하나. 파괴적 동작이 아니지만 DB 변경이 있으므로 사용자 확인 후 호출한다.',
  inputSchema: {
    type: 'object',
    required: ['teamId', 'title', 'startAt', 'endAt'],
    properties: {
      teamId: { type: 'string' },
      title: { type: 'string', maxLength: 200 },
      startAt: { type: 'string', description: 'ISO 8601 (예: 2026-04-24T15:00:00+09:00)' },
      endAt: { type: 'string', description: 'ISO 8601. startAt 이후.' },
      color: {
        type: 'string',
        enum: ['indigo', 'blue', 'emerald', 'amber', 'rose'],
        default: 'indigo',
      },
      description: { type: 'string' },
    },
    additionalProperties: false,
  },
  mutates: true,
  async handler({ teamId, title, startAt, endAt, color, description }) {
    const created = await callBackend(`/api/teams/${teamId}/schedules`, {
      method: 'POST',
      body: { title, startAt, endAt, color, description },
    });
    return {
      id: created.id,
      title: created.title,
      startAt: created.startAt,
      endAt: created.endAt,
      color: created.color,
    };
  },
};
