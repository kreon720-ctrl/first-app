import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyTasksPage from '../page';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { useUpdateJoinRequestFromTasks } from '@/hooks/query/useUpdateJoinRequestFromTasks';
import { useRouter } from 'next/navigation';

vi.mock('@/hooks/query/useMyTasks');
vi.mock('@/hooks/query/useUpdateJoinRequestFromTasks');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/components/team/JoinRequestActions', () => ({
  JoinRequestActions: ({ request, onApprove, onReject, isPending }: {
    request: { id: string; requesterName: string };
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isPending?: boolean;
  }) => (
    <div data-testid="join-request-action" data-request-id={request.id}>
      <span>{request.requesterName}</span>
      <button onClick={() => onApprove(request.id)} disabled={isPending}>승인</button>
      <button onClick={() => onReject(request.id)} disabled={isPending}>거절</button>
    </div>
  ),
}));

const mockTasks = [
  {
    id: 'request-1',
    teamId: 'team-1',
    teamName: '개발팀',
    requesterId: 'user-2',
    requesterName: '김철수',
    requesterEmail: 'kimcs@example.com',
    status: 'PENDING' as const,
    requestedAt: '2026-04-08T09:00:00.000Z',
    respondedAt: null,
  },
  {
    id: 'request-2',
    teamId: 'team-2',
    teamName: '디자인팀',
    requesterId: 'user-3',
    requesterName: '박지수',
    requesterEmail: 'parkjs@example.com',
    status: 'PENDING' as const,
    requestedAt: '2026-04-08T10:30:00.000Z',
    respondedAt: null,
  },
];

describe('MyTasksPage', () => {
  const mockRouter = {
    push: vi.fn(),
  };
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useUpdateJoinRequestFromTasks).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateJoinRequestFromTasks>);
  });

  describe('Loading State', () => {
    it('shows loading state when data is loading', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      expect(screen.getByText('로딩 중...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('shows error state when data fails to load', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      expect(screen.getByText('가입 신청 목록을 불러오는 중 오류가 발생했습니다.')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no tasks exist', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: [] },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      expect(screen.getByText('현재 처리 대기 중인')).toBeTruthy();
      expect(screen.getByText('가입 신청이 없습니다.')).toBeTruthy();
    });
  });

  describe('Tasks List', () => {
    it('renders task list with join request actions', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: mockTasks },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      expect(screen.getAllByTestId('join-request-action')).toHaveLength(2);
      expect(screen.getByText('김철수')).toBeTruthy();
      expect(screen.getByText('박지수')).toBeTruthy();
    });

    it('shows task count in header', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: mockTasks },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      expect(screen.getByText('(2건)')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('calls mutate with APPROVE action when approve button is clicked', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: mockTasks },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      const approveButtons = screen.getAllByText('승인');
      fireEvent.click(approveButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith({
        teamId: 'team-1',
        requestId: 'request-1',
        action: 'APPROVE',
      });
    });

    it('calls mutate with REJECT action when reject button is clicked', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: mockTasks },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      const rejectButtons = screen.getAllByText('거절');
      fireEvent.click(rejectButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith({
        teamId: 'team-1',
        requestId: 'request-1',
        action: 'REJECT',
      });
    });
  });

  describe('Navigation', () => {
    it('navigates home when back button is clicked', () => {
      vi.mocked(useMyTasks).mockReturnValue({
        data: { tasks: mockTasks },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useMyTasks>);

      render(<MyTasksPage />);

      const backButton = screen.getByLabelText('홈');
      fireEvent.click(backButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});
