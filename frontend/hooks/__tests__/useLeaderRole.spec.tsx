import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaderRole } from '../useLeaderRole';
import { useTeamDetail } from '@/hooks/query/useTeams';

vi.mock('@/hooks/query/useTeams');

describe('useLeaderRole', () => {
  it('returns isLeader=true when user is LEADER', () => {
    vi.mocked(useTeamDetail).mockReturnValue({
      data: { myRole: 'LEADER' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTeamDetail>);

    const { result } = renderHook(() => useLeaderRole('team-1'));

    expect(result.current.isLeader).toBe(true);
    expect(result.current.role).toBe('LEADER');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('returns isLeader=false when user is MEMBER', () => {
    vi.mocked(useTeamDetail).mockReturnValue({
      data: { myRole: 'MEMBER' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTeamDetail>);

    const { result } = renderHook(() => useLeaderRole('team-1'));

    expect(result.current.isLeader).toBe(false);
    expect(result.current.role).toBe('MEMBER');
  });

  it('returns isLeader=false when team data is not loaded', () => {
    vi.mocked(useTeamDetail).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useTeamDetail>);

    const { result } = renderHook(() => useLeaderRole('team-1'));

    expect(result.current.isLeader).toBe(false);
    expect(result.current.role).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLeader=false when there is an error', () => {
    vi.mocked(useTeamDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useTeamDetail>);

    const { result } = renderHook(() => useLeaderRole('team-1'));

    expect(result.current.isLeader).toBe(false);
    expect(result.current.role).toBeNull();
    expect(result.current.isError).toBe(true);
  });

  it('returns team data from useTeamDetail', () => {
    const mockTeam = {
      id: 'team-1',
      name: '개발팀',
      myRole: 'LEADER' as const,
    };
    vi.mocked(useTeamDetail).mockReturnValue({
      data: mockTeam,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTeamDetail>);

    const { result } = renderHook(() => useLeaderRole('team-1'));

    expect(result.current.team).toEqual(mockTeam);
  });
});
