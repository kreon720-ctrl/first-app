'use client';

import React from 'react';
import { JoinRequest } from '@/types/team';
import { Button } from '@/components/common/Button';

interface JoinRequestActionsProps {
  request: JoinRequest;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isPending?: boolean;
}

export function JoinRequestActions({
  request,
  onApprove,
  onReject,
  isPending = false,
}: JoinRequestActionsProps) {
  const formatRequestedAt = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      {/* Applicant Info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{request.requesterName}</h3>
        <p className="text-sm font-normal text-gray-500">{request.requesterEmail}</p>
        <p className="text-sm font-normal text-gray-600 mt-1">
          신청 팀: <span className="font-medium">{request.teamName}</span>
        </p>
        <p className="text-xs font-normal text-gray-400 mt-1">
          {formatRequestedAt(request.requestedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onApprove(request.id)}
          disabled={isPending}
        >
          {isPending ? '처리 중...' : '승인'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onReject(request.id)}
          disabled={isPending}
        >
          거절
        </Button>
      </div>
    </div>
  );
}
