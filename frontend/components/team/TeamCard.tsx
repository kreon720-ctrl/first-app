'use client';

import React, { useState } from 'react';
import { Team } from '@/types/team';
import { utcToKST, formatDate } from '@/lib/utils/timezone';
import { Button } from '@/components/common/Button';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useUpdateProfile } from '@/hooks/query/useUpdateProfile';
import { useRemoveTeamMember } from '@/hooks/query/useRemoveTeamMember';
import { useAuthStore } from '@/store/authStore';

interface TeamCardProps {
  team: Team;
  pendingCount?: number;
  onClick?: (teamId: string) => void;
  onApprove?: (teamId: string) => void;
  onUpdate?: (teamId: string, data: { name: string; description: string }) => void;
  onDelete?: (teamId: string) => void;
}

export function TeamCard({ team, pendingCount = 0, onClick, onApprove, onUpdate, onDelete }: TeamCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [editDescription, setEditDescription] = useState(team.description ?? '');
  const isLeader = team.myRole === 'LEADER';

  const { data: teamDetail, isLoading: membersLoading } = useTeamDetail(showMembers ? team.id : '');
  const members = teamDetail?.members ?? [];

  const currentUserId = useAuthStore(s => s.currentUser?.id);
  const updateProfile = useUpdateProfile();
  const removeTeamMember = useRemoveTeamMember(team.id);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirmKickUserId, setConfirmKickUserId] = useState<string | null>(null);
  const [confirmKickName, setConfirmKickName] = useState('');

  const kstDate = utcToKST(new Date(team.createdAt));
  const formattedDate = formatDate(kstDate);
  const roleLabel = team.myRole;
  const roleBadgeClass =
    team.myRole === 'LEADER'
      ? 'bg-amber-100 text-amber-800 dark:bg-white dark:text-amber-800'
      : 'bg-indigo-100 text-indigo-800 dark:bg-white dark:text-indigo-800';

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
      <div className="w-full bg-white dark:bg-dark-surface rounded-xl border border-primary-300 p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-3">팀 수정</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted mb-1 block">
              팀 이름 <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="팀 이름을 입력하세요"
              maxLength={50}
              className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-dark-text-muted mb-1 block">설명</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="팀 설명을 입력하세요 (선택)"
              rows={2}
              className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-dark-base text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button type="button" variant="primary" size="sm" onClick={handleUpdate}>
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
      <div className="w-full bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 shadow-sm hover:shadow-md transition-all duration-150">
        <div className="flex items-start justify-between">
          {/* 팀 정보 (클릭 → 팀 상세 이동) */}
          <button
            type="button"
            onClick={() => onClick?.(team.id)}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text truncate">{team.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeClass}`}>
                {roleLabel}
              </span>
              <span className="text-xs font-normal text-gray-500 dark:text-dark-text-muted">{formattedDate}</span>
              {team.isPublic && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-white dark:text-green-800">
                  공개
                </span>
              )}
            </div>
            {team.description && (
              <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1 line-clamp-1">{team.description}</p>
            )}
          </button>

          {/* 버튼 영역 */}
          <div className="flex gap-1.5 ml-3 flex-shrink-0">
            {/* 팀원 조회 버튼 (공통) */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMembers(true); }}
              className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              aria-label="팀원 조회"
              title="팀원 조회"
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* 팀장 전용 승인/수정/삭제 버튼 */}
            {isLeader && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onApprove?.(team.id); }}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    aria-label="가입 승인"
                    title="가입 승인"
                  >
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 pointer-events-none">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors"
                  aria-label="수정"
                  title="팀 수정"
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
                  title="팀 삭제"
                >
                  <svg className="w-4 h-4 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 팀원 조회 모달 */}
      {showMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 px-4"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-text">{team.name} 팀원 목록</h2>
                {!membersLoading && (
                  <p className="text-xs text-gray-400 dark:text-dark-text-disabled mt-0.5">총 {members.length}명</p>
                )}
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-400 dark:text-dark-text-muted hover:text-gray-600 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 멤버 목록 */}
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {membersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-sm text-gray-400 animate-pulse">불러오는 중...</p>
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">팀원이 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {members.map((member) => {
                    const isMe = member.userId === currentUserId;
                    const isEditingMe = isMe && editingName;
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface"
                      >
                        {/* 아바타 */}
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-indigo-600">
                            {member.name.charAt(0)}
                          </span>
                        </div>

                        {/* 이름 + 이메일 */}
                        <div className="flex-1 min-w-0">
                          {isEditingMe ? (
                            <input
                              autoFocus
                              value={nameInput}
                              onChange={e => setNameInput(e.target.value)}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  if (!nameInput.trim()) return;
                                  await updateProfile.mutateAsync(nameInput.trim());
                                  setEditingName(false);
                                } else if (e.key === 'Escape') {
                                  setEditingName(false);
                                }
                              }}
                              maxLength={50}
                              className="w-full text-sm border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 dark:text-dark-text">
                              {member.name}
                              {isMe && <span className="ml-1 text-xs text-indigo-400">(나)</span>}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-dark-text-disabled truncate">{member.email}</p>
                        </div>

                        {/* 역할 배지 + 본인 수정 버튼 + 팀장의 팀원 탈퇴 버튼 */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* 본인 이름 수정 아이콘 — [팀원] 배지 왼쪽 */}
                          {isMe && !isEditingMe && (
                            <button
                              onClick={() => {
                                setNameInput(member.name);
                                setEditingName(true);
                              }}
                              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                              title="이름 수정"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {/* 팀장이고 본인이 아닌 팀원에게 탈퇴 버튼 표시 — [팀원] 배지 왼쪽 */}
                          {isLeader && !isMe && member.role !== 'LEADER' && !isEditingMe && (
                            <button
                              onClick={() => {
                                setConfirmKickUserId(member.userId);
                                setConfirmKickName(member.name);
                              }}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                              title="팀에서 탈퇴"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                            </button>
                          )}
                          {member.role === 'LEADER' ? (
                            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                              팀장
                            </span>
                          ) : (
                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                              팀원
                            </span>
                          )}
                          {isEditingMe && (
                            <>
                              <button
                                onClick={async () => {
                                  if (!nameInput.trim()) return;
                                  await updateProfile.mutateAsync(nameInput.trim());
                                  setEditingName(false);
                                }}
                                disabled={updateProfile.isPending}
                                className="p-1 rounded hover:bg-indigo-100 text-indigo-500"
                                title="저장"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingName(false)}
                                className="p-1 rounded hover:bg-gray-200 text-gray-400"
                                title="취소"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-border">
              <button
                onClick={() => setShowMembers(false)}
                className="w-full py-2 text-sm font-medium bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-muted rounded-lg hover:bg-gray-200 dark:hover:bg-dark-elevated"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 팀원 탈퇴 확인 다이얼로그 */}
      {confirmKickUserId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/70 px-4"
          onClick={() => setConfirmKickUserId(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-1">팀원 탈퇴</h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-6">
              <span className="font-medium text-gray-900 dark:text-dark-text">{confirmKickName}</span>
              님을 팀에서 탈퇴시키겠습니까?
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={async () => {
                  await removeTeamMember.mutateAsync(confirmKickUserId);
                  setConfirmKickUserId(null);
                }}
              >
                {removeTeamMember.isPending ? '처리 중...' : '탈퇴'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setConfirmKickUserId(null)}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 팝업 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-dark-elevated dark:border dark:border-dark-border rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-1">팀 삭제</h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-6">
              <span className="font-medium text-gray-900 dark:text-dark-text">{team.name}</span>
              {' '}팀을 정말 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="md" onClick={() => setShowDeleteConfirm(false)}>
                취소
              </Button>
              <Button type="button" variant="danger" size="md" onClick={handleDelete}>
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
