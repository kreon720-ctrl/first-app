import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatMessageItem } from '@/components/chat/ChatMessageItem';
import type { ChatMessage } from '@/types/chat';

describe('ChatMessageItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockNormalMessage: ChatMessage = {
    id: 'msg-1',
    teamId: 'team-1',
    senderId: 'user-1',
    senderName: '홍길동',
    type: 'NORMAL',
    content: '안녕하세요! 오늘 회의 확인 부탁드립니다.',
    sentAt: '2026-04-15T01:30:00.000Z', // 10:30 KST
  };

  const mockScheduleRequestMessage: ChatMessage = {
    id: 'msg-2',
    teamId: 'team-1',
    senderId: 'user-2',
    senderName: '김철수',
    type: 'SCHEDULE_REQUEST',
    content: '회의 시간을 4시로 변경 가능할까요?',
    sentAt: '2026-04-15T02:00:00.000Z', // 11:00 KST
  };

  it('renders normal message with sender name and time', () => {
    render(<ChatMessageItem message={mockNormalMessage} />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('안녕하세요! 오늘 회의 확인 부탁드립니다.')).toBeInTheDocument();
  });

  it('renders SCHEDULE_REQUEST message with distinct styling', () => {
    render(<ChatMessageItem message={mockScheduleRequestMessage} />);

    // Should show schedule request badge
    expect(screen.getByText('일정변경요청')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('회의 시간을 4시로 변경 가능할까요?')).toBeInTheDocument();

    // Should have orange styling
    const container = screen.getByText('일정변경요청').closest('.bg-orange-50');
    expect(container).toBeInTheDocument();
  });

  it('shows LEADER badge when isLeader is true', () => {
    render(<ChatMessageItem message={mockNormalMessage} isLeader={true} />);

    expect(screen.getByText('LEADER')).toBeInTheDocument();
    expect(screen.getByText('LEADER')).toHaveClass('bg-amber-100');
  });

  it('does not show LEADER badge for SCHEDULE_REQUEST messages', () => {
    render(<ChatMessageItem message={mockScheduleRequestMessage} isLeader={true} />);

    expect(screen.queryByText('LEADER')).not.toBeInTheDocument();
  });

  it('displays message time', () => {
    render(<ChatMessageItem message={mockNormalMessage} />);

    // Time should be displayed (19:30 in KST = UTC 10:30)
    expect(screen.getByText('19:30')).toBeInTheDocument();
  });
});
