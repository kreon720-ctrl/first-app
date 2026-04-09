/**
 * DB-05 완료 조건 테스트 스크립트
 * 실행: cd backend && DATABASE_URL=... npx tsx scripts/test-db05.ts
 */
import { createTeam, getTeamById, getUserTeams, addTeamMember, getUserTeamRole } from '@/lib/db/queries/teamQueries'
import { createUser } from '@/lib/db/queries/userQueries'
import { pool } from '@/lib/db/pool'

async function run() {
  console.log('=== DB-05 teamQueries 테스트 시작 ===\n')

  let leaderId: string | undefined
  let memberId: string | undefined
  let teamId: string | undefined

  try {
    // 사전 준비: 테스트 유저 2명 생성
    const leader = await createUser({ email: 'db05_leader@caltalk.test', name: '팀장', password_hash: 'hash' })
    const member = await createUser({ email: 'db05_member@caltalk.test', name: '팀원', password_hash: 'hash' })
    leaderId = leader.id
    memberId = member.id

    // 1. createTeam
    console.log('[1] createTeam')
    const team = await createTeam('테스트팀_DB05', leaderId)
    teamId = team.id
    if (!team.id || team.name !== '테스트팀_DB05' || team.leader_id !== leaderId)
      throw new Error('createTeam: 반환값 불일치')
    console.log(`  ✅ id=${team.id}, name=${team.name}`)

    // 2. addTeamMember — LEADER 등록
    console.log('[2] addTeamMember (LEADER)')
    const leaderMember = await addTeamMember(teamId, leaderId, 'LEADER')
    if (leaderMember.role !== 'LEADER') throw new Error('addTeamMember: role 불일치')
    console.log(`  ✅ team_id=${leaderMember.team_id}, role=${leaderMember.role}`)

    // 3. addTeamMember — MEMBER 등록
    console.log('[3] addTeamMember (MEMBER)')
    const regularMember = await addTeamMember(teamId, memberId, 'MEMBER')
    if (regularMember.role !== 'MEMBER') throw new Error('addTeamMember: MEMBER role 불일치')
    console.log(`  ✅ user_id=${regularMember.user_id}, role=${regularMember.role}`)

    // 4. getTeamById
    console.log('[4] getTeamById')
    const found = await getTeamById(teamId)
    if (!found || found.id !== teamId) throw new Error('getTeamById: 결과 불일치')
    console.log(`  ✅ id=${found.id}, name=${found.name}`)

    // 5. getTeamById — 없는 ID → null
    console.log('[5] getTeamById (없는 ID → null)')
    const notFound = await getTeamById('00000000-0000-0000-0000-000000000000')
    if (notFound !== null) throw new Error('없는 ID가 null을 반환하지 않음')
    console.log('  ✅ null 반환 확인')

    // 6. getUserTeams — 팀 격리: leaderId는 1개 팀, memberId도 1개 팀
    console.log('[6] getUserTeams (팀 격리)')
    const leaderTeams = await getUserTeams(leaderId)
    const memberTeams = await getUserTeams(memberId)
    if (leaderTeams.length !== 1 || leaderTeams[0].id !== teamId)
      throw new Error(`getUserTeams(leader): 예상 1개, 실제 ${leaderTeams.length}개`)
    if (memberTeams.length !== 1 || memberTeams[0].id !== teamId)
      throw new Error(`getUserTeams(member): 예상 1개, 실제 ${memberTeams.length}개`)
    if (leaderTeams[0].role !== 'LEADER') throw new Error('leader role 불일치')
    if (memberTeams[0].role !== 'MEMBER') throw new Error('member role 불일치')
    console.log(`  ✅ leader 팀목록: ${leaderTeams.length}개 (role=${leaderTeams[0].role})`)
    console.log(`  ✅ member 팀목록: ${memberTeams.length}개 (role=${memberTeams[0].role})`)

    // 7. getUserTeamRole
    console.log('[7] getUserTeamRole')
    const leaderRole = await getUserTeamRole(teamId, leaderId)
    const memberRole = await getUserTeamRole(teamId, memberId)
    const outsiderRole = await getUserTeamRole(teamId, '00000000-0000-0000-0000-000000000000')
    if (leaderRole !== 'LEADER') throw new Error(`leaderRole 불일치: ${leaderRole}`)
    if (memberRole !== 'MEMBER') throw new Error(`memberRole 불일치: ${memberRole}`)
    if (outsiderRole !== null) throw new Error('비소속 user가 null을 반환하지 않음')
    console.log(`  ✅ LEADER 역할 확인`)
    console.log(`  ✅ MEMBER 역할 확인`)
    console.log(`  ✅ 비소속 유저 → null 확인`)

    console.log('\n✅ 모든 테스트 통과')
  } catch (err) {
    console.error('\n❌ 테스트 실패:', (err as Error).message)
    process.exitCode = 1
  } finally {
    // 테스트 데이터 정리 (FK 순서: members → teams → users)
    if (teamId) await pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId])
    if (teamId) await pool.query('DELETE FROM teams WHERE id = $1', [teamId])
    if (leaderId) await pool.query('DELETE FROM users WHERE id = $1', [leaderId])
    if (memberId) await pool.query('DELETE FROM users WHERE id = $1', [memberId])
    console.log('\n[cleanup] 테스트 데이터 삭제 완료')
    await pool.end()
  }
}

run()
