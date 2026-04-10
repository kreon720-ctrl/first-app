import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPanel } from '@/components/chat/ChatPanel';
import * as useMessagesModule from '@/hooks/query/useMessages';

// Mock hooks
const mockUseMessages = vi.fn();
const mockUseSendMessage = vi.fn();

vi.mock('@/hooks/query/useMessages', () => ({
  useMessages: () => mockUseMessages(),
  useSendMessage: () => mockUseSendMessage(),
}));

describe('ChatPanel', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMessages.mockReturnValue({
      data: { messages: [] },
      isLoading: false,
      isError: false,
    });
    mockUseSendMessage.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('renders chat panel with message list and input', () => {
    render(<ChatPanel teamId="team-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('* 3초마다 자동 갱신')).toBeInTheDocument();
  });

  it('shows loading state when messages are loading', () => {
    mockUseMessages.mockReturnValue({
      data: { messages: [] },
      isLoading: true,
      isError: false,
    });

    render(<ChatPanel teamId="team-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('메시지 로딩 중...')).toBeInTheDocument();
  });

  it('shows error state when message loading fails', () => {
    mockUseMessages.mockReturnValue({
      data: { messages: [] },
      isLoading: false,
      isError: true,
    });

    render(<ChatPanel teamId="team-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('메시지를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
  });

  it('sends message when ChatInput calls onSend', async () => {
    const mutateMock = vi.fn();
    mockUseSendMessage.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });

    render(<ChatPanel teamId="team-1" />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    fireEvent.change(textarea, { target: { value: '테스트 메시지' } });

    const sendButton = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith({
        content: '테스트 메시지',
        type: 'NORMAL',
      });
    });
  });

  it('passes isLeader prop to ChatMessageList', () => {
    mockUseMessages.mockReturnValue({
      data: {
        messages: [
          {
            id: 'msg-1',
            teamId: 'team-1',
            senderId: 'user-1',
            senderName: '홍길동',
            type: 'NORMAL',
            content: '안녕하세요!',
            sentAt: '2026-04-15T01:00:00.000Z',
            createdAt: '2026-04-15T01:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<ChatPanel teamId="team-1" isLeader={true} />, { wrapper: createWrapper() });

    expect(screen.getByText('LEADER')).toBeInTheDocument();
  });
});
