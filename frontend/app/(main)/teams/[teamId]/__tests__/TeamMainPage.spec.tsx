import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TeamMainPage from '../page';

// Helper: render with act to resolve React.use(Promise)
async function renderPage(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result;
}
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import type { AuthState } from '@/store/authStore';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/hooks/useBreakpoint');
vi.mock('@/hooks/query/useTeams');
vi.mock('@/store/teamStore');
vi.mock('@/store/authStore');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock CalendarView and ChatPanel components
vi.mock('@/components/schedule/CalendarView', () => ({
  CalendarView: ({
    currentDate,
    view,
    onViewChange,
    onDateClick,
  }: {
    currentDate: Date;
    view: string;
    onViewChange: (v: string) => void;
    onDateClick: (d: Date) => void;
  }) => (
    <div data-testid="calendar-view">
      <span>Calendar View</span>
      <span data-testid="current-date">{currentDate.toISOString()}</span>
      <span data-testid="calendar-view-type">{view}</span>
      <button onClick={() => onViewChange('week')}>Change to Week</button>
      <button onClick={() => onDateClick(new Date('2026-04-15'))}>Click Date</button>
    </div>
  ),
}));

vi.mock('@/components/chat/ChatPanel', () => ({
  ChatPanel: ({ teamId, date, isLeader }: { teamId: string; date?: string; isLeader?: boolean }) => (
    <div data-testid="chat-panel">
      <span>Chat Panel</span>
      <span data-testid="chat-team-id">{teamId}</span>
      <span data-testid="chat-date">{date}</span>
      <span data-testid="chat-is-leader">{String(isLeader)}</span>
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement> }) => (
    <button onClick={onClick}>
      {children}
    </button>
  ),
}));

const mockTeam = {
  id: 'team-123',
  name: '개발팀',
  leaderId: 'user-1',
  myRole: 'LEADER' as const,
  createdAt: '2026-04-01T00:00:00.000Z',
  members: [
    {
      userId: 'user-1',
      name: '홍길동',
      email: 'hong@example.com',
      role: 'LEADER' as const,
      joinedAt: '2026-04-01T00:00:00.000Z',
    },
  ],
};

const mockMemberTeam = {
  ...mockTeam,
  myRole: 'MEMBER' as const,
};

describe('TeamMainPage', () => {
  const mockRouter = {
    push: vi.fn(),
  };

  const mockSetSelectedTeamId = vi.fn();
  const mockSetSelectedDate = vi.fn();
  const mockSetCalendarView = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useRouter
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);

    // Mock useBreakpoint - default to desktop
    vi.mocked(useBreakpoint).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'desktop',
    });

    // Mock useTeamStore
    vi.mocked(useTeamStore).mockReturnValue({
      selectedTeamId: 'team-123',
      selectedDate: '2026-04-10',
      calendarView: 'month',
      setSelectedTeamId: mockSetSelectedTeamId,
      setSelectedDate: mockSetSelectedDate,
      setCalendarView: mockSetCalendarView,
      resetSelectedDate: vi.fn(),
    } as unknown as ReturnType<typeof useTeamStore>);

    // Mock useAuthStore
    vi.mocked(useAuthStore).mockImplementation(
      ((selector: (state: AuthState) => unknown) => {
        const state: AuthState = {
          currentUser: { id: 'user-1', email: 'hong@example.com', name: '홍길동' },
          accessToken: 'token-123',
          isAuthenticated: true,
          setUser: vi.fn(),
          logout: mockLogout,
          clearUser: vi.fn(),
        };
        return selector(state);
      }) as typeof useAuthStore
    );
  });

  describe('Loading and Error States', () => {
    it('shows loading state when team data is loading', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('로딩 중...')).toBeTruthy();
    });

    it('shows error state when team data fails to load', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('팀 정보를 불러오는 중 오류가 발생했습니다.')).toBeTruthy();
      expect(screen.getByText('홈으로 돌아가기')).toBeTruthy();
    });

    it('navigates home when "홈으로 돌아가기" button is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      fireEvent.click(screen.getByText('홈으로 돌아가기'));
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Desktop Layout (1024px+)', () => {
    beforeEach(() => {
      vi.mocked(useBreakpoint).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'desktop',
      });
    });

    it('renders side-by-side layout with calendar and chat', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByTestId('calendar-view')).toBeTruthy();
      expect(screen.getByTestId('chat-panel')).toBeTruthy();
    });

    it('displays team name in header', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('개발팀')).toBeTruthy();
    });

    it('shows "나의 할 일" button for LEADER', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('나의 할 일')).toBeTruthy();
    });

    it('hides "나의 할 일" button for MEMBER', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockMemberTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.queryByText('나의 할 일')).toBeNull();
    });

    it('navigates to tasks page when "나의 할 일" button is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      fireEvent.click(screen.getByText('나의 할 일'));
      expect(mockRouter.push).toHaveBeenCalledWith('/me/tasks');
    });

    it('navigates home when home button is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const homeButton = screen.getByLabelText('홈');
      fireEvent.click(homeButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('logs out when logout button is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      fireEvent.click(screen.getByText('로그아웃'));
      expect(mockLogout).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('passes correct props to ChatPanel', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByTestId('chat-team-id').textContent).toBe('team-123');
      expect(screen.getByTestId('chat-date').textContent).toBe('2026-04-10');
      expect(screen.getByTestId('chat-is-leader').textContent).toBe('true');
    });

    it('passes isLeader=false to ChatPanel for MEMBER', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockMemberTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByTestId('chat-is-leader').textContent).toBe('false');
    });
  });

  describe('Mobile Layout (<640px)', () => {
    beforeEach(() => {
      vi.mocked(useBreakpoint).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'mobile',
      });
    });

    it('renders tab-based layout', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('캘린더')).toBeTruthy();
      expect(screen.getByText('채팅')).toBeTruthy();
    });

    it('shows calendar tab active by default', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const calendarTab = screen.getByText('캘린더');
      expect(calendarTab).toBeTruthy();
      expect(screen.getByTestId('calendar-view')).toBeTruthy();
    });

    it('switches to chat tab when clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      fireEvent.click(screen.getByText('채팅'));
      expect(screen.getByTestId('chat-panel')).toBeTruthy();
    });

    it('applies active styling to selected tab', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const calendarTab = screen.getByText('캘린더');
      expect(calendarTab.className).toContain('text-primary-600');
      expect(calendarTab.className).toContain('border-primary-500');
    });

    it('navigates home when back button is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const backButton = screen.getByLabelText('홈');
      fireEvent.click(backButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Store Integration', () => {
    it('sets selected team ID on mount', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(mockSetSelectedTeamId).toHaveBeenCalledWith('team-123');
    });

    it('updates selected date when date is clicked', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const clickDateButton = screen.getByText('Click Date');
      fireEvent.click(clickDateButton);

      expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-04-15');
    });

    it('updates calendar view when view is changed', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      const changeViewButton = screen.getByText('Change to Week');
      fireEvent.click(changeViewButton);

      expect(mockSetCalendarView).toHaveBeenCalledWith('week');
    });
  });

  describe('Role-Based UI Control', () => {
    it('renders LEADER-specific UI for LEADER role', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.getByText('나의 할 일')).toBeTruthy();
      expect(screen.getByTestId('chat-is-leader').textContent).toBe('true');
    });

    it('hides LEADER-specific UI for MEMBER role', async () => {
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockMemberTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      expect(screen.queryByText('나의 할 일')).toBeNull();
      expect(screen.getByTestId('chat-is-leader').textContent).toBe('false');
    });
  });

  describe('Date Display', () => {
    it('displays current selected date in chat header for desktop', async () => {
      vi.mocked(useBreakpoint).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'desktop',
      });
      vi.mocked(useTeamDetail).mockReturnValue({
        data: mockTeam,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useTeamDetail>);

      await renderPage(<TeamMainPage params={Promise.resolve({ teamId: "team-123" })} />);

      // The date should be displayed in the chat header
      expect(screen.getByText(/2026년 4월 10일/)).toBeTruthy();
    });
  });
});
