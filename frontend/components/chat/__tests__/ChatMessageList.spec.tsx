import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { ChatMessage } from '@/types/chat';

describe('ChatMessageList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      teamId: 'team-1',
      senderId: 'user-1',
      senderName: '홍길동',
      type: 'NORMAL',
      content: '안녕하세요!',
      sentAt: '2026-04-14T01:00:00.000Z', // April 14 KST
    },
    {
      id: 'msg-2',
      teamId: 'team-1',
      senderId: 'user-2',
      senderName: '김철수',
      type: 'SCHEDULE_REQUEST',
      content: '회의 시간 변경 요청합니다.',
      sentAt: '2026-04-15T01:30:00.000Z', // April 15 KST
    },
    {
      id: 'msg-3',
      teamId: 'team-1',
      senderId: 'user-1',
      senderName: '홍길동',
      type: 'NORMAL',
      content: '네, 확인했습니다.',
      sentAt: '2026-04-15T02:00:00.000Z', // April 15 KST
    },
  ];

  it('renders empty state when no messages', () => {
    render(<ChatMessageList messages={[]} />);

    expect(screen.getByText('아직 메시지가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('첫 번째 메시지를 보내보세요.')).toBeInTheDocument();
  });

  it('renders messages grouped by date', () => {
    render(<ChatMessageList messages={mockMessages} />);

    // Should show date dividers (KST dates: April 15 and April 16)
    expect(screen.getByText(/2026년 4월 15일/)).toBeInTheDocument();
    expect(screen.getByText(/2026년 4월 16일/)).toBeInTheDocument();

    // Should show message content
    expect(screen.getByText('안녕하세요!')).toBeInTheDocument();
    expect(screen.getByText('회의 시간 변경 요청합니다.')).toBeInTheDocument();
    expect(screen.getByText('네, 확인했습니다.')).toBeInTheDocument();
  });

  it('displays SCHEDULE_REQUEST messages with distinct styling', () => {
    render(<ChatMessageList messages={mockMessages} />);

    // Should show schedule request badge
    expect(screen.getByText('일정변경요청')).toBeInTheDocument();
  });

  it('passes isLeader prop to ChatMessageItem', () => {
    render(<ChatMessageList messages={mockMessages} isLeader={true} />);

    // Should show LEADER badges
    const leaderBadges = screen.getAllByText('LEADER');
    expect(leaderBadges.length).toBeGreaterThan(0);
  });
});
