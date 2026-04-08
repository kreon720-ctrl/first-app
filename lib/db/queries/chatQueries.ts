import { pool } from '@/lib/db/pool'

export type MessageType = 'NORMAL' | 'SCHEDULE_REQUEST'

export interface ChatMessage {
  id: string
  team_id: string
  sender_id: string
  type: MessageType
  content: string
  sent_at: Date
  created_at: Date
}

export interface CreateChatMessageParams {
  teamId: string
  senderId: string
  type?: MessageType
  content: string
  sentAt?: Date
}

// KST(UTC+9) 날짜 문자열(YYYY-MM-DD)을 UTC 범위로 변환
// 예: '2026-04-08' (KST) → { start: '2026-04-07T15:00:00Z', end: '2026-04-08T15:00:00Z' }
function kstDateToUtcRange(kstDate: string): { start: Date; end: Date } {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000
  const start = new Date(`${kstDate}T00:00:00+09:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  // start/end는 이미 UTC 기준 Date 객체 (JavaScript Date는 내부적으로 UTC)
  void KST_OFFSET_MS // 명시적 변환 대신 +09:00 파싱 활용
  return { start, end }
}

export async function createChatMessage(
  params: CreateChatMessageParams
): Promise<ChatMessage> {
  const { teamId, senderId, type = 'NORMAL', content, sentAt } = params
  try {
    const result = await pool.query<ChatMessage>(
      `INSERT INTO chat_messages (team_id, sender_id, type, content, sent_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, team_id, sender_id, type, content, sent_at, created_at`,
      [teamId, senderId, type, content, sentAt ?? new Date()]
    )
    return result.rows[0]
  } catch (err) {
    throw new Error(`createChatMessage 실패: ${(err as Error).message}`)
  }
}

// KST 날짜(YYYY-MM-DD) 기준으로 해당 날의 메시지 조회
export async function getMessagesByDate(
  teamId: string,
  kstDate: string
): Promise<ChatMessage[]> {
  const { start, end } = kstDateToUtcRange(kstDate)
  try {
    const result = await pool.query<ChatMessage>(
      `SELECT id, team_id, sender_id, type, content, sent_at, created_at
       FROM chat_messages
       WHERE team_id = $1
         AND sent_at >= $2
         AND sent_at < $3
       ORDER BY sent_at ASC`,
      [teamId, start, end]
    )
    return result.rows
  } catch (err) {
    throw new Error(`getMessagesByDate 실패: ${(err as Error).message}`)
  }
}

// 팀 메시지 최신순 조회 (폴링용, limit/cursor 기반)
export async function getMessagesByTeam(
  teamId: string,
  limit = 50,
  before?: Date
): Promise<ChatMessage[]> {
  try {
    const result = before
      ? await pool.query<ChatMessage>(
          `SELECT id, team_id, sender_id, type, content, sent_at, created_at
           FROM chat_messages
           WHERE team_id = $1 AND sent_at < $2
           ORDER BY sent_at DESC
           LIMIT $3`,
          [teamId, before, limit]
        )
      : await pool.query<ChatMessage>(
          `SELECT id, team_id, sender_id, type, content, sent_at, created_at
           FROM chat_messages
           WHERE team_id = $1
           ORDER BY sent_at DESC
           LIMIT $2`,
          [teamId, limit]
        )
    return result.rows.reverse() // 오래된 순으로 반환
  } catch (err) {
    throw new Error(`getMessagesByTeam 실패: ${(err as Error).message}`)
  }
}
