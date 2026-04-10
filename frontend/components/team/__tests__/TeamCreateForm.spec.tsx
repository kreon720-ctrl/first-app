import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TeamCreateForm } from '@/components/team/TeamCreateForm';
import * as useTeamsModule from '@/hooks/query/useTeams';

// Mock useCreateTeam hook
const mockMutateAsync = vi.fn();
const mockUseCreateTeam = vi.fn(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
}));

vi.mock('@/hooks/query/useTeams', () => ({
  useCreateTeam: () => mockUseCreateTeam(),
}));

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
  }),
}));

describe('TeamCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateTeam.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders team name input and submit button', () => {
    render(<TeamCreateForm />);

    expect(screen.getByLabelText(/팀 이름/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /팀 생성/i })).toBeInTheDocument();
  });

  it('disables submit button when input is empty', () => {
    render(<TeamCreateForm />);

    const submitButton = screen.getByRole('button', { name: /팀 생성/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when input is valid', () => {
    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    fireEvent.change(input, { target: { value: '새로운 팀' } });

    const submitButton = screen.getByRole('button', { name: /팀 생성/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows character count', () => {
    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    fireEvent.change(input, { target: { value: '팀' } });

    expect(screen.getByText('1 / 100자')).toBeInTheDocument();
  });

  it('submits form with valid team name and redirects', async () => {
    const newTeam = {
      id: 'new-team-id',
      name: '새로운 팀',
      leaderId: 'user-123',
      myRole: 'LEADER' as const,
      createdAt: '2026-04-10T00:00:00.000Z',
    };

    mockMutateAsync.mockResolvedValue(newTeam);

    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    const submitButton = screen.getByRole('button', { name: /팀 생성/i });

    fireEvent.change(input, { target: { value: '새로운 팀' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ name: '새로운 팀' });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/teams/new-team-id');
    });
  });

  it('shows error when team name is too long', () => {
    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    fireEvent.change(input, { target: { value: 'a'.repeat(101) } });

    const submitButton = screen.getByRole('button', { name: /팀 생성/i });
    fireEvent.click(submitButton);

    // Error is set via useState but Input component displays it
    // We check that the error state was set by verifying the input shows error styling
    expect(screen.getByText('101 / 100자')).toBeInTheDocument();
    // The error message is shown in the Input component
    expect(screen.queryByText('팀 이름은 최대 100자까지 입력 가능합니다.')).toBeInTheDocument();
  });

  it('disables input when creating team', () => {
    mockUseCreateTeam.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    expect(input).toBeDisabled();
  });

  it('shows loading text when creating team', () => {
    mockUseCreateTeam.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(<TeamCreateForm />);

    expect(screen.getByText(/생성 중/i)).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('팀 생성 실패'));

    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    const submitButton = screen.getByRole('button', { name: /팀 생성/i });

    fireEvent.change(input, { target: { value: '새로운 팀' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('팀 생성 실패')).toBeInTheDocument();
    });
  });

  it('clears error when user starts typing', async () => {
    mockMutateAsync.mockRejectedValue(new Error('팀 생성 실패'));

    render(<TeamCreateForm />);

    const input = screen.getByLabelText(/팀 이름/i);
    const submitButton = screen.getByRole('button', { name: /팀 생성/i });

    fireEvent.change(input, { target: { value: '새로운 팀' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('팀 생성 실패')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: '다른 팀' } });

    await waitFor(() => {
      expect(screen.queryByText('팀 생성 실패')).not.toBeInTheDocument();
    });
  });
});
