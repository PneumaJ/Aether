import { useEffect, useRef, useCallback } from "react";
import { usePlanStore } from "../stores/planStore";
import { useUIStore } from "../stores/uiStore";

let lastLoadedDate: string | null = null;

export function usePlans() {
  const { selectedDate, setLoading } = useUIStore();
  const { plans, loadPlans, addPlan, togglePlan, removePlan, editPlanContent, reorderPlan } =
    usePlanStore();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (lastLoadedDate === selectedDate && loadedRef.current) return;
    loadedRef.current = true;
    lastLoadedDate = selectedDate;
    setLoading(true);
    loadPlans(selectedDate).finally(() => setLoading(false));
  }, [selectedDate, loadPlans, setLoading]);

  const dailyPlans = plans.filter((p) => p.is_daily);
  const datePlans = plans.filter((p) => !p.is_daily);

  const handleAddPlan = useCallback(
    async (content: string) => {
      return addPlan({ date: selectedDate, content });
    },
    [selectedDate, addPlan]
  );

  const handleAddDailyPlan = useCallback(
    async (content: string) => {
      return addPlan({ date: "daily", content, is_daily: true });
    },
    [addPlan]
  );

  return {
    plans,
    dailyPlans,
    datePlans,
    selectedDate,
    addPlan: handleAddPlan,
    addDailyPlan: handleAddDailyPlan,
    togglePlan,
    removePlan,
    editPlanContent,
    reorderPlan,
  };
}
