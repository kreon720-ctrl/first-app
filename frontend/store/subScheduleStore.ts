// Sub-Schedule Store - re-exports sub-schedule CRUD actions from the unified project store.
// The underlying state lives in projectStore.ts (shared persist instance).

import { useProjectStore } from './projectStore';

export function useSubScheduleStore() {
  const getSubSchedules = useProjectStore((s) => s.getSubSchedules);
  const createSubSchedule = useProjectStore((s) => s.createSubSchedule);
  const updateSubSchedule = useProjectStore((s) => s.updateSubSchedule);
  const deleteSubSchedule = useProjectStore((s) => s.deleteSubSchedule);

  return {
    getSubSchedules,
    createSubSchedule,
    updateSubSchedule,
    deleteSubSchedule,
  };
}
