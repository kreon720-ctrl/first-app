import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TeamCard } from '@/components/team/TeamCard';
import type { Team } from '@/types/team';

describe('TeamCard', () => {
  const mockTeam: Team = {
    id: 'team-123',
    name: '개발팀',
    description: null,
    leaderId: 'leader-123',
    myRole: 'LEADER',
    createdAt: '2026-04-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders team name and role badge', () => {
    render(<TeamCard team={mockTeam} />);

    expect(screen.getByText('개발팀')).toBeInTheDocument();
    expect(screen.getByText('LEADER')).toBeInTheDocument();
  });

  it('renders MEMBER badge for member role', () => {
    const memberTeam: Team = {
      ...mockTeam,
      myRole: 'MEMBER',
    };

    render(<TeamCard team={memberTeam} />);

    expect(screen.getByText('MEMBER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toHaveClass('bg-indigo-100');
  });

  it('renders formatted date', () => {
    render(<TeamCard team={mockTeam} />);

    // Date should be displayed
    expect(screen.getByText('2026-04-01')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<TeamCard team={mockTeam} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledWith('team-123');
  });

  it('applies correct styling for card', () => {
    render(<TeamCard team={mockTeam} />);

    const card = screen.getByRole('button');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('border-gray-200');
  });

  it('truncates long team names', () => {
    const longNameTeam: Team = {
      ...mockTeam,
      name: '아주 긴 팀 이름이 들어가면 어떻게 될까요? 최대 길이를 넘어서면 잘려야 합니다.',
    };

    render(<TeamCard team={longNameTeam} />);

    const teamName = screen.getByText(longNameTeam.name);
    expect(teamName).toHaveClass('truncate');
  });
});
