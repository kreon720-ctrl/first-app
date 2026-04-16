import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole } from '@/lib/middleware/withTeamRole'
import {
  getMessagesByDate,
  getMessagesByTeam,
  createChatMessage,
  ChatMessage,
  MessageType,
} from '@/lib/db/queries/chatQueries'
import { kstDateToUtcRange } from '@/lib/utils/timezone'

interface CreateMessageBody {
  type?: MessageType
  content?: string
}

/**
 * GET /api/teams/:teamId/messages
 *
 * 채팅 메시지 조회 (폴링용)
 * - date 파라미터 (YYYY-MM-DD): KST 기준 날짜별 조회
 * - date 미제공 시: 최신 메시지 조회 (limit/cursor 기반)
 * - sentAt 오름차순 정렬, senderName 포함
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 1. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 2. 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const before = searchParams.get('before')
      ? new Date(searchParams.get('before')!)
      : undefined

    let messages: ChatMessage[]

    if (date) {
      // 날짜별 조회 (KST 기준)
      messages = await getMessagesByDate(teamId, date)
    } else {
      // 최신 메시지 조회 (limit/cursor 기반)
      messages = await getMessagesByTeam(teamId, limit, before)
    }

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        teamId: msg.team_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        type: msg.type,
        content: msg.content,
        sentAt: msg.sent_at,
        createdAt: msg.created_at,
      })),
    })
  } catch (err) {
    console.error('Get messages error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/:teamId/messages
 *
 * 채팅 메시지 전송
 * - NORMAL/SCHEDULE_REQUEST 타입 모두 저장
 * - content 최대 2000자
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 1. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 2. 요청 본문 파싱 및 검증
    const body: CreateMessageBody = await request.json()
    const { type = 'NORMAL', content } = body

    // 필수 필드 검증
    if (!content) {
      return NextResponse.json(
        { error: '메시지 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    // content 길이 검증
    if (content.length > 2000) {
      return NextResponse.json(
        { error: '메시지는 최대 2000자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    // type 검증
    if (type !== 'NORMAL' && type !== 'WORK_PERFORMANCE') {
      return NextResponse.json(
        { error: '잘못된 메시지 타입입니다.' },
        { status: 400 }
      )
    }

    // 3. 메시지 저장
    const message = await createChatMessage({
      teamId,
      senderId: authResult.user.userId,
      type,
      content,
      sentAt: new Date(),
    })

    return NextResponse.json(
      {
        id: message.id,
        teamId: message.team_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        type: message.type,
        content: message.content,
        sentAt: message.sent_at,
        createdAt: message.created_at,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Create message error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
