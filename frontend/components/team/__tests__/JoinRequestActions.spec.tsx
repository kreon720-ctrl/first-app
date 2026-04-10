import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JoinRequestActions } from '../JoinRequestActions';

const mockJoinRequest = {
  id: 'request-1',
  teamId: 'team-1',
  teamName: '개발팀',
  requesterId: 'user-2',
  requesterName: '김철수',
  requesterEmail: 'kimcs@example.com',
  status: 'PENDING' as const,
  requestedAt: '2026-04-08T09:00:00.000Z',
  respondedAt: null,
};

describe('JoinRequestActions', () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders applicant information correctly', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('김철수')).toBeTruthy();
      expect(screen.getByText('kimcs@example.com')).toBeTruthy();
      expect(screen.getByText(/신청 팀:/)).toBeTruthy();
      expect(screen.getByText('개발팀')).toBeTruthy();
    });

    it('renders approve and reject buttons', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('승인')).toBeTruthy();
      expect(screen.getByText('거절')).toBeTruthy();
    });

    it('formats requestedAt date correctly', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Should contain some date/time text
      const dateText = screen.getByText(/2026/);
      expect(dateText).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('calls onApprove with correct requestId when approve button is clicked', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('승인'));
      expect(mockOnApprove).toHaveBeenCalledWith('request-1');
    });

    it('calls onReject with correct requestId when reject button is clicked', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('거절'));
      expect(mockOnReject).toHaveBeenCalledWith('request-1');
    });
  });

  describe('Loading State', () => {
    it('shows 처리 중... when isPending is true', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          isPending={true}
        />
      );

      expect(screen.getByText('처리 중...')).toBeTruthy();
    });

    it('disables buttons when isPending is true', () => {
      render(
        <JoinRequestActions
          request={mockJoinRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          isPending={true}
        />
      );

      expect(screen.getByText('처리 중...')).toBeDisabled();
      expect(screen.getByText('거절')).toBeDisabled();
    });
  });
});
