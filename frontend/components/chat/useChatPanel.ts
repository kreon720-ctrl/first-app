'use client';

import { useState } from 'react';
import { useSendMessage } from '@/hooks/query/useMessages';
import { useSetWorkPermissions } from '@/hooks/query/useWorkPermissions';
import { useAuthStore } from '@/store/authStore';
import { useNoticeStore } from '@/store/noticeStore';
import type { TeamMember } from '@/types/team';
import type { ChatMessageMode } from './ChatInput';

interface UseChatPanelOptions {
  teamId: string;
  date: string | undefined;
  members: TeamMember[];
  serverPermittedIds: string[];
}

export function useChatPanel({
  teamId,
  date,
  members,
  serverPermittedIds,
}: UseChatPanelOptions) {
  const sendMessage = useSendMessage(teamId, date);
  const setPermissions = useSetWorkPermissions(teamId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const noticeStore = useNoticeStore();

  const [showModal, setShowModal] = useState(false);
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());

  const handleOpenModal = () => {
    if (serverPermittedIds.length > 0) {
      setDraftIds(new Set(serverPermittedIds));
    } else {
      setDraftIds(new Set(members.filter(m => m.role === 'LEADER').map(m => m.userId)));
    }
    setShowModal(true);
  };

  const toggleDraft = (userId: string) => {
    setDraftIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCloseModal = async () => {
    await setPermissions.mutateAsync(Array.from(draftIds));
    setShowModal(false);
  };

  const handleSend = (content: string, mode: ChatMessageMode) => {
    if (mode === 'NOTICE') {
      if (!currentUser) return;
      noticeStore.addNotice(teamId, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        content,
      });
      return;
    }
    sendMessage.mutate({
      content,
      type: mode === 'WORK_PERFORMANCE' ? 'WORK_PERFORMANCE' : 'NORMAL',
    });
  };

  const handleDeleteNotice = (noticeId: string) => {
    noticeStore.deleteNotice(teamId, noticeId);
  };

  return {
    sendMessage,
    setPermissions,
    currentUser,
    showModal,
    draftIds,
    handleOpenModal,
    toggleDraft,
    handleCloseModal,
    handleSend,
    handleDeleteNotice,
  };
}
