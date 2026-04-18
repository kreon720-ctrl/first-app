'use client';

import { useState } from 'react';
import { useSubScheduleStore } from '@/store/subScheduleStore';
import type { ProjectSchedule, SubSchedule, SubScheduleCreateInput } from '@/types/project';

interface UseSubScheduleEditorOptions {
  schedule: ProjectSchedule;
  currentUserId: string;
}

export function useSubScheduleEditor({ schedule, currentUserId }: UseSubScheduleEditorOptions) {
  const { getSubSchedules, createSubSchedule, updateSubSchedule, deleteSubSchedule } =
    useSubScheduleStore();

  const subSchedules = getSubSchedules(schedule.id);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSub, setEditingSub] = useState<SubSchedule | null>(null);
  const [viewingSub, setViewingSub] = useState<SubSchedule | null>(null);

  const handleCreateSub = (input: SubScheduleCreateInput) => {
    createSubSchedule(schedule.id, schedule.projectId, schedule.teamId, input, currentUserId);
    setShowCreate(false);
  };

  const handleUpdateSub = (input: SubScheduleCreateInput) => {
    if (!editingSub) return;
    updateSubSchedule(editingSub.id, schedule.id, input);
    setEditingSub(null);
    setShowCreate(false);
  };

  const handleDeleteSub = (sub: SubSchedule) => {
    deleteSubSchedule(sub.id, schedule.id);
    setViewingSub(null);
  };

  const openCreate = () => {
    setEditingSub(null);
    setShowCreate(true);
  };

  const openEdit = (sub: SubSchedule) => {
    setEditingSub(sub);
    setViewingSub(null);
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setEditingSub(null);
  };

  return {
    subSchedules,
    showCreate,
    editingSub,
    viewingSub,
    setViewingSub,
    handleCreateSub,
    handleUpdateSub,
    handleDeleteSub,
    openCreate,
    openEdit,
    closeCreate,
  };
}
