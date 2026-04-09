/**
 * DB-08 완료 조건 테스트 스크립트
 * 실행: cd backend && DATABASE_URL=... npx tsx scripts/test-db08.ts
 */
import {
  createChatMessage,
  getMessagesByDate,
  getMessagesByTeam,
} from '@/lib/db/queries/chatQueries'
import { createUser } from '@/lib/db/queries/userQueries'
import { createTeam, addTeamMember } from '@/lib/db/queries/teamQueries'
import { pool } from '@/lib/db/pool'

async function run() {
  console.log('=== DB-08 chatQueries 테스트 시작 ===\n')

  let userId: string | undefined
  let otherUserId: string | undefined
  let teamId: string | undefined
  let otherTeamId: string | undefined
  const messageIds: string[] = []

  try {
    // 사전 준비: 유저 2명 + 팀 2개 (팀 격리 검증용)
    const user = await createUser({ email: 'db08_user@caltalk.test', name: '채터', password_hash: 'hash' })
    const otherUser = await createUser({ email: 'db08_other@caltalk.test', name: '타팀유저', password_hash: 'hash' })
    userId = user.id
    otherUserId = otherUser.id

    const team = await createTeam('DB08팀A', userId)
    const otherTeam = await createTeam('DB08팀B', otherUserId)
    teamId = team.id
    otherTeamId = otherTeam.id
    await addTeamMember(teamId, userId, 'LEADER')
    await addTeamMember(otherTeamId, otherUserId, 'LEADER')

    // 기준 시각 (KST 2026-04-10 기준 UTC)
    // KST 2026-04-10 00:30 = UTC 2026-04-09 15:30
    // KST 2026-04-10 12:00 = UTC 2026-04-10 03:00
    // KST 2026-04-10 23:30 = UTC 2026-04-10 14:30
    // KST 2026-04-11 00:30 = UTC 2026-04-10 15:30 (다음날)
    const kstDate = '2026-04-10'
    const inKst1  = new Date('2026-04-09T15:30:00Z') // KST 04-10 00:30
    const inKst2  = new Date('2026-04-10T03:00:00Z') // KST 04-10 12:00
    const inKst3  = new Date('2026-04-10T14:30:00Z') // KST 04-10 23:30
    const outKst  = new Date('2026-04-10T15:30:00Z') // KST 04-11 00:30 (범위 외)

    // 1. createChatMessage — NORMAL 타입 (기본값)
    console.log('[1] createChatMessage (NORMAL)')
    const m1 = await createChatMessage({ teamId, senderId: userId, content: '안녕하세요', sentAt: inKst1 })
    messageIds.push(m1.id)
    if (!m1.id || m1.team_id !== teamId) throw new Error('createChatMessage: team_id 불일치')
    if (m1.type !== 'NORMAL') throw new Error(`type이 NORMAL이 아님: ${m1.type}`)
    console.log(`  ✅ id=${m1.id}, type=${m1.type}, content=${m1.content}`)

    // 2. createChatMessage — SCHEDULE_REQUEST 타입
    console.log('[2] createChatMessage (SCHEDULE_REQUEST)')
    const m2 = await createChatMessage({ teamId, senderId: userId, type: 'SCHEDULE_REQUEST', content: '일정 요청입니다', sentAt: inKst2 })
    const m3 = await createChatMessage({ teamId, senderId: userId, content: '마지막 메시지', sentAt: inKst3 })
    messageIds.push(m2.id, m3.id)
    if (m2.type !== 'SCHEDULE_REQUEST') throw new Error(`type이 SCHEDULE_REQUEST가 아님: ${m2.type}`)
    console.log(`  ✅ id=${m2.id}, type=${m2.type}`)

    // 타 팀 메시지 (격리 확인용)
    const mOther = await createChatMessage({ teamId: otherTeamId, senderId: otherUserId, content: '타팀 메시지', sentAt: inKst2 })
    messageIds.push(mOther.id)

    // 3. getMessagesByDate — KST 날짜 기준 조회
    console.log('[3] getMessagesByDate (KST 날짜 범위)')
    const byDate = await getMessagesByDate(teamId, kstDate)
    if (byDate.length !== 3) throw new Error(`예상 3개, 실제 ${byDate.length}개`)
    if (byDate.some(m => m.team_id !== teamId)) throw new Error('타 팀 메시지 포함 — 팀 격리 실패')
    if (!byDate[0].sender_name) throw new Error('sender_name 누락')
    // 오름차순 정렬 확인
    if (byDate[0].sent_at > byDate[1].sent_at) throw new Error('sent_at 오름차순 정렬 실패')
    console.log(`  ✅ ${byDate.length}개 조회, sender_name="${byDate[0].sender_name}"`)
    console.log(`  ✅ 팀 격리 확인, sent_at 오름차순 정렬 확인`)

    // 범위 외 메시지 조회 → 0건 (KST 04-11 날짜)
    const byDateOut = await getMessagesByDate(teamId, '2026-04-11')
    // KST 04-11 00:30(UTC 15:30)은 04-11 KST 범위이므로 0건이어야 함
    if (byDateOut.length !== 0) throw new Error(`범위 외 결과 있음: ${byDateOut.length}개`)
    console.log('  ✅ 범위 외 날짜 → 0건 확인')

    // 4. getMessagesByDate — KST 경계 확인 (outKst 시각은 KST 04-11이므로 04-10 조회 시 미포함)
    console.log('[4] KST 경계 테스트')
    const mBoundary = await createChatMessage({ teamId, senderId: userId, content: '경계 메시지', sentAt: outKst })
    messageIds.push(mBoundary.id)
    const byDateBoundary = await getMessagesByDate(teamId, kstDate)
    if (byDateBoundary.length !== 3) throw new Error(`KST 경계 외 메시지가 포함됨: ${byDateBoundary.length}개`)
    console.log('  ✅ KST 04-11 00:30 메시지는 04-10 조회에 미포함 확인')

    // 5. getMessagesByTeam — 최신순 조회 (limit)
    console.log('[5] getMessagesByTeam (limit, 팀 격리)')
    const byTeam = await getMessagesByTeam(teamId, 10)
    if (byTeam.length !== 4) throw new Error(`예상 4개, 실제 ${byTeam.length}개`)
    if (byTeam.some(m => m.team_id !== teamId)) throw new Error('타 팀 메시지 포함 — 팀 격리 실패')
    if (!byTeam[0].sender_name) throw new Error('sender_name 누락')
    // 오래된 순 반환 (reverse() 적용됨)
    if (byTeam[0].sent_at > byTeam[byTeam.length - 1].sent_at) throw new Error('오래된 순 정렬 실패')
    console.log(`  ✅ ${byTeam.length}개 조회, sender_name="${byTeam[0].sender_name}", 팀 격리 확인`)

    // 6. getMessagesByTeam — before 커서 조회
    console.log('[6] getMessagesByTeam (before 커서)')
    const cursor = byTeam[byTeam.length - 1].sent_at // 마지막(가장 최신) 메시지 시각
    const byCursor = await getMessagesByTeam(teamId, 10, cursor)
    if (byCursor.length !== 3) throw new Error(`cursor 이전 예상 3개, 실제 ${byCursor.length}개`)
    if (byCursor.some(m => m.sent_at >= cursor)) throw new Error('cursor 이후 메시지 포함')
    console.log(`  ✅ cursor 이전 ${byCursor.length}개 조회 확인`)

    console.log('\n✅ 모든 테스트 통과')
  } catch (err) {
    console.error('\n❌ 테스트 실패:', (err as Error).message)
    process.exitCode = 1
  } finally {
    // 정리 (FK 순서: chat_messages → team_members → teams → users)
    if (messageIds.length) await pool.query('DELETE FROM chat_messages WHERE id = ANY($1)', [messageIds])
    if (teamId)      await pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId])
    if (otherTeamId) await pool.query('DELETE FROM team_members WHERE team_id = $1', [otherTeamId])
    if (teamId)      await pool.query('DELETE FROM teams WHERE id = $1', [teamId])
    if (otherTeamId) await pool.query('DELETE FROM teams WHERE id = $1', [otherTeamId])
    if (userId)      await pool.query('DELETE FROM users WHERE id = $1', [userId])
    if (otherUserId) await pool.query('DELETE FROM users WHERE id = $1', [otherUserId])
    console.log('\n[cleanup] 테스트 데이터 삭제 완료')
    await pool.end()
  }
}

run()
