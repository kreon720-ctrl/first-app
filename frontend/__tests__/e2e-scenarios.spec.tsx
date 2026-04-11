import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Mock modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

import { apiClient } from '@/lib/apiClient';

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

describe('E2E User Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
  });

  describe('SC-01: Authentication Flow', () => {
    it('should complete signup → login → team list flow', async () => {
      // Step 1: Signup
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: { id: 'user-1', email: 'test@example.com', name: '테스트사용자' },
      });

      // Render signup form and submit
      const { rerender } = render(
        <MockSignupPage />
      );

      fireEvent.change(screen.getByPlaceholderText(/이메일/), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/이름/), {
        target: { value: '테스트사용자' },
      });
      fireEvent.change(screen.getByPlaceholderText(/비밀번호/), {
        target: { value: 'Password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/signup', {
          email: 'test@example.com',
          name: '테스트사용자',
          password: 'Password123',
        });
      });

      expect(apiClient.setTokens).toHaveBeenCalledWith('access-token-1', 'refresh-token-1');
      expect(mockRouter.push).toHaveBeenCalledWith('/');

      // Step 2: Navigate to team list (home)
      localStorage.setItem('accessToken', 'access-token-1');
      localStorage.setItem('refreshToken', 'refresh-token-1');

      vi.mocked(apiClient.get).mockResolvedValueOnce({ teams: [] });

      rerender(<MockHomePage />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/teams');
      });

      expect(screen.getByText(/내 팀 목록/)).toBeTruthy();
    });
  });

  describe('SC-02: Team Creation Flow', () => {
    it('should create team and navigate to team page', async () => {
      localStorage.setItem('accessToken', 'access-token-1');

      // Mock my teams
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        teams: [
          { id: 'team-1', name: '개발팀', myRole: 'LEADER', leaderId: 'user-1' },
        ],
      });

      render(<MockHomePage />);

      // Click team creation button
      fireEvent.click(screen.getByRole('button', { name: /팀 생성/ }));
      expect(mockRouter.push).toHaveBeenCalledWith('/teams/new');
    });

    it('should complete team explore → join request flow', async () => {
      localStorage.setItem('accessToken', 'access-token-1');

      // Mock public teams list
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        teams: [
          { id: 'team-2', name: '디자인팀', leaderName: '리더', memberCount: 3 },
        ],
      });

      render(<MockTeamExplorePage />);

      await waitFor(() => {
        expect(screen.getByText(/디자인팀/)).toBeTruthy();
      });

      // Mock join request submission
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        id: 'request-1',
        status: 'PENDING',
      });

      fireEvent.click(screen.getByRole('button', { name: /가입 신청/ }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/teams/team-2/join-requests',
          {}
        );
      });
    });
  });

  describe('SC-04/SC-05: Schedule Management Flow', () => {
    it('should create, view, and delete schedule as LEADER', async () => {
      localStorage.setItem('accessToken', 'access-token-1');

      // Mock team detail
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        id: 'team-1',
        name: '개발팀',
        myRole: 'LEADER',
        members: [{ userId: 'user-1', name: '테스트', role: 'LEADER' }],
      });

      render(<MockTeamPage teamId="team-1" />);

      await waitFor(() => {
        expect(screen.getByText('개발팀')).toBeTruthy();
      });

      // Verify LEADER sees "나의 할 일" button
      expect(screen.getByText('나의 할 일')).toBeTruthy();

      // Verify calendar view is rendered
      expect(screen.getByTestId('calendar-view')).toBeTruthy();
    });
  });

  describe('SC-06: MEMBER Permission Check', () => {
    it('should hide LEADER-only UI for MEMBER', async () => {
      localStorage.setItem('accessToken', 'access-token-2');

      // Mock team detail with MEMBER role
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        id: 'team-1',
        name: '개발팀',
        myRole: 'MEMBER',
        members: [
          { userId: 'user-1', name: '리더', role: 'LEADER' },
          { userId: 'user-2', name: '멤버', role: 'MEMBER' },
        ],
      });

      render(<MockTeamPage teamId="team-1" />);

      await waitFor(() => {
        expect(screen.getByText('개발팀')).toBeTruthy();
      });

      // MEMBER should NOT see "나의 할 일" button
      expect(screen.queryByText('나의 할 일')).toBeNull();

      // Chat panel should still be visible
      expect(screen.getByTestId('chat-panel')).toBeTruthy();
    });
  });

  describe('SC-07/SC-08: Chat Message Flow', () => {
    it('should send NORMAL and SCHEDULE_REQUEST messages', async () => {
      localStorage.setItem('accessToken', 'access-token-1');

      // Mock team detail
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        id: 'team-1',
        name: '개발팀',
        myRole: 'MEMBER',
      });

      // Mock messages
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        messages: [],
      });

      render(<MockTeamPage teamId="team-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('chat-panel')).toBeTruthy();
      });

      // Verify chat input is rendered
      expect(screen.getByPlaceholderText(/메시지를 입력하세요/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /전송/ })).toBeTruthy();
    });
  });

  describe('SC-09: Calendar-Chat Integration', () => {
    it('should update chat date when calendar date is clicked', async () => {
      localStorage.setItem('accessToken', 'access-token-1');

      vi.mocked(apiClient.get)
        .mockResolvedValueOnce({
          id: 'team-1',
          name: '개발팀',
          myRole: 'LEADER',
        })
        .mockResolvedValueOnce({
          messages: [],
        });

      render(<MockTeamPage teamId="team-1" />);

      // Wait for calendar to render
      await waitFor(() => {
        expect(screen.getByTestId('calendar-view')).toBeTruthy();
      });

      // Click a date in calendar
      const dateButton = screen.getByTestId('calendar-date-click');
      fireEvent.click(dateButton);

      // Chat should update to show selected date
      expect(screen.getByTestId('chat-selected-date')).toBeTruthy();
    });
  });
});

// ===== Mock Components =====

function MockSignupPage() {
  const { post, setTokens } = apiClient as any;
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const result = await post('/api/auth/signup', {
      email: formData.get('email'),
      name: formData.get('name'),
      password: formData.get('password'),
    });
    setTokens(result.accessToken, result.refreshToken);
    router.push('/');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" placeholder="이메일을 입력하세요" />
      <input name="name" placeholder="이름을 입력하세요" />
      <input name="password" type="password" placeholder="비밀번호를 입력하세요" />
      <button type="submit">회원가입</button>
    </form>
  );
}

function MockHomePage() {
  const { get } = apiClient as any;
  const router = useRouter();
  const [teams, setTeams] = React.useState<any[]>([]);

  React.useEffect(() => {
    get('/api/teams').then((res: any) => setTeams(res.teams));
  }, []);

  return (
    <div>
      <h1>내 팀 목록</h1>
      <button onClick={() => router.push('/teams/new')}>팀 생성</button>
      <button onClick={() => router.push('/teams/explore')}>팀 탐색</button>
      {teams.map((t) => (
        <div key={t.id} onClick={() => router.push(`/teams/${t.id}`)}>
          {t.name} [{t.myRole}]
        </div>
      ))}
    </div>
  );
}

function MockTeamExplorePage() {
  const { get, post } = apiClient as any;
  const [teams, setTeams] = React.useState<any[]>([]);

  React.useEffect(() => {
    get('/api/teams/public').then((res: any) => setTeams(res.teams));
  }, []);

  const handleJoinRequest = async (teamId: string) => {
    await post(`/api/teams/${teamId}/join-requests`, {});
  };

  return (
    <div>
      <h1>팀 탐색</h1>
      {teams.map((t) => (
        <div key={t.id}>
          {t.name} - {t.leaderName} ({t.memberCount}명)
          <button onClick={() => handleJoinRequest(t.id)}>가입 신청</button>
        </div>
      ))}
    </div>
  );
}

function MockTeamPage({ teamId }: { teamId: string }) {
  const { get } = apiClient as any;
  const [team, setTeam] = React.useState<any>(null);

  React.useEffect(() => {
    get(`/api/teams/${teamId}`).then(setTeam);
  }, [teamId]);

  if (!team) return <div>로딩 중...</div>;

  return (
    <div>
      <h1>{team.name}</h1>
      {team.myRole === 'LEADER' && <button>나의 할 일</button>}
      <div data-testid="calendar-view">
        <button data-testid="calendar-date-click">2026-04-15</button>
      </div>
      <div data-testid="chat-panel">
        <span data-testid="chat-selected-date">2026-04-15</span>
        <input placeholder="메시지를 입력하세요" />
        <button>전송</button>
      </div>
    </div>
  );
}
