import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TeamExploreList } from '@/components/team/TeamExploreList';
import type { PublicTeam } from '@/types/team';

// Mock apiClient - preserve real ApiError so instanceof checks work
const mockPost = vi.fn();
vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return {
    apiClient: {
      post: vi.fn((url: string, data: unknown) => mockPost(url, data)),
    },
    ApiError: actual.ApiError,
  };
});

// Import ApiError after mock setup (will get the real class via vi.importActual)
import { ApiError } from '@/lib/apiClient';

describe('TeamExploreList', () => {
  const mockTeams: PublicTeam[] = [
    {
      id: 'team-1',
      name: '개발팀',
      description: null,
      leaderId: 'leader-1',
      leaderName: '홍길동',
      memberCount: 5,
      createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
      id: 'team-2',
      name: '디자인팀',
      description: null,
      leaderId: 'leader-2',
      leaderName: '이영희',
      memberCount: 3,
      createdAt: '2026-04-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of public teams with details', () => {
    render(<TeamExploreList teams={mockTeams} />);

    expect(screen.getByText('개발팀')).toBeInTheDocument();
    expect(screen.getByText('팀장: 홍길동')).toBeInTheDocument();
    expect(screen.getByText('5명')).toBeInTheDocument();
    expect(screen.getByText('디자인팀')).toBeInTheDocument();
    expect(screen.getByText('팀장: 이영희')).toBeInTheDocument();
    expect(screen.getByText('3명')).toBeInTheDocument();
  });

  it('renders join request button for each team', () => {
    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    expect(joinButtons).toHaveLength(2);
  });

  it('submits join request when button is clicked', async () => {
    mockPost.mockResolvedValue({ id: 'request-1', status: 'PENDING' });

    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/teams/team-1/join-requests', {});
    });
  });

  it('shows success message after successful join request', async () => {
    mockPost.mockResolvedValue({ id: 'request-1', status: 'PENDING' });

    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText('개발팀에 가입 신청를 완료했습니다. 팀장의 승인을 기다려주세요.')
      ).toBeInTheDocument();
    });
  });

  it('shows error message on 409 conflict', async () => {
    mockPost.mockRejectedValue(new ApiError(409, '이미 가입 신청이 진행 중입니다.'));

    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('이미 가입 신청이 진행 중입니다.')).toBeInTheDocument();
    });
  });

  it('shows generic error message on other errors', async () => {
    mockPost.mockRejectedValue(new Error('네트워크 오류'));

    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
    });
  });

  it('disables button after successful join request', async () => {
    mockPost.mockResolvedValue({ id: 'request-1', status: 'PENDING' });

    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: '신청 완료' });
      expect(updatedButton).toBeDisabled();
    });
  });

  it('renders empty state when no teams', () => {
    render(<TeamExploreList teams={[]} />);

    expect(screen.getByText('공개된 팀이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('새로운 팀을 만들어보세요.')).toBeInTheDocument();
  });

  it('calls onSuccess callback after successful request', async () => {
    mockPost.mockResolvedValue({ id: 'request-1', status: 'PENDING' });
    const onSuccess = vi.fn();

    render(<TeamExploreList teams={mockTeams} onSuccess={onSuccess} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('team-1');
    });
  });

  it('disables buttons when request is pending', async () => {
    mockPost.mockResolvedValue({ id: 'request-1', status: 'PENDING' });
    render(<TeamExploreList teams={mockTeams} />);

    const joinButtons = screen.getAllByRole('button', { name: /가입 신청/i });
    fireEvent.click(joinButtons[0]);

    // After click, button should show "신청 완료" and be disabled
    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: '신청 완료' });
      expect(updatedButton).toBeDisabled();
    });
  });
});
