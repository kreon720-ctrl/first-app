import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TeamList } from '@/components/team/TeamList';
import type { Team } from '@/types/team';

describe('TeamList', () => {
  const mockTeams: Team[] = [
    {
      id: 'team-1',
      name: '개발팀',
      description: null,
      isPublic: true,
      leaderId: 'leader-1',
      myRole: 'LEADER',
      createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
      id: 'team-2',
      name: '디자인팀',
      description: null,
      isPublic: false,
      leaderId: 'leader-2',
      myRole: 'MEMBER',
      createdAt: '2026-04-02T00:00:00.000Z',
    },
  ];

  it('renders list of teams', () => {
    render(<TeamList teams={mockTeams} />);

    expect(screen.getByText('개발팀')).toBeInTheDocument();
    expect(screen.getByText('디자인팀')).toBeInTheDocument();
  });

  it('calls onTeamClick when a team is clicked', () => {
    const handleTeamClick = vi.fn();
    render(<TeamList teams={mockTeams} onTeamClick={handleTeamClick} />);

    const teamCards = screen.getAllByRole('button');
    fireEvent.click(teamCards[0]);

    expect(handleTeamClick).toHaveBeenCalledWith('team-1');
  });

  it('renders empty state when no teams', () => {
    render(<TeamList teams={[]} />);

    expect(screen.getByText('아직 팀이 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('팀을 생성하거나 원하는 팀에 가입 신청해 보세요.')
    ).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(<TeamList teams={[]} emptyMessage="커스텀 메시지" />);

    expect(screen.getByText('커스텀 메시지')).toBeInTheDocument();
  });

  it('displays correct number of team cards', () => {
    render(<TeamList teams={mockTeams} />);

    const teamNames = screen.getAllByText(/팀$/);
    expect(teamNames).toHaveLength(2);
  });

  it('shows LEADER badge for leader role', () => {
    render(<TeamList teams={[mockTeams[0]]} />);

    expect(screen.getByText('LEADER')).toBeInTheDocument();
    expect(screen.getByText('LEADER')).toHaveClass('bg-amber-100');
  });

  it('shows MEMBER badge for member role', () => {
    render(<TeamList teams={[mockTeams[1]]} />);

    expect(screen.getByText('MEMBER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toHaveClass('bg-indigo-100');
  });
});
