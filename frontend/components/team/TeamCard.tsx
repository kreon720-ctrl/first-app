'use client';

import React, { useState } from 'react';
import { Team } from '@/types/team';
import { utcToKST, formatDate } from '@/lib/utils/timezone';
import { Button } from '@/components/common/Button';

interface TeamCardProps {
  team: Team;
  onClick?: (teamId: string) => void;
  onUpdate?: (teamId: string, data: { name: string; description: string }) => void;
  onDelete?: (teamId: string) => void;
}

export function TeamCard({ team, onClick, onUpdate, onDelete }: TeamCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [editDescription, setEditDescription] = useState(team.description ?? '');
  const isLeader = team.myRole === 'LEADER';

  const kstDate = utcToKST(new Date(team.createdAt));
  const formattedDate = formatDate(kstDate);
  const roleLabel = team.myRole;
  const roleBadgeClass =
    team.myRole === 'LEADER'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-indigo-100 text-indigo-800';

  const handleUpdate = () => {
    if (!editName.trim()) return;
    onUpdate?.(team.id, { name: editName.trim(), description: editDescription.trim() });
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(team.id);
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="w-full bg-white rounded-xl border border-primary-300 p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">팀 수정</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              팀 이름 <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="팀 이름을 입력하세요"
              maxLength={50}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">설명</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="팀 설명을 입력하세요 (선택)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleUpdate}
          >
            수정
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              setEditName(team.name);
              setEditDescription(team.description ?? '');
            }}
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-150">
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => onClick?.(team.id)}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-800 truncate">{team.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeClass}`}
              >
                {roleLabel}
              </span>
              <span className="text-xs font-normal text-gray-500">{formattedDate}</span>
              {team.isPublic && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                  공개
                </span>
              )}
            </div>
            {team.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{team.description}</p>
            )}
          </button>

          {/* 팀장 전용 수정/삭제 버튼 */}
          {isLeader && (
            <div className="flex gap-1.5 ml-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="수정"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-error-50 transition-colors"
                aria-label="삭제"
              >
                <svg className="w-4 h-4 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 팝업 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">팀 삭제</h2>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-medium text-gray-900">{team.name}</span>
              {' '}팀을 정말 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleDelete}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
