import { create } from "zustand";
import type { Plan, CreatePlanInput } from "../types/plan";
import {
  fetchPlansByDate,
  insertPlan as dbInsertPlan,
  updatePlan as dbUpdatePlan,
  deletePlan as dbDeletePlan,
  bulkUpdateSortOrders,
} from "../db/database";

interface PlanState {
  plans: Plan[];
  setPlans: (plans: Plan[]) => void;
  loadPlans: (date: string) => Promise<void>;
  addPlan: (input: CreatePlanInput) => Promise<Plan>;
  togglePlan: (id: number) => Promise<void>;
  removePlan: (id: number) => Promise<void>;
  editPlanContent: (id: number, content: string) => Promise<void>;
  reorderPlan: (id: number, toIndex: number) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],

  setPlans: (plans) => set({ plans }),

  loadPlans: async (date) => {
    const plans = await fetchPlansByDate(date);
    // Order: daily undone → daily done → today undone → today done
    const dailyUndone = plans
      .filter((p) => p.is_daily && !p.done)
      .sort((a, b) => a.sort_order - b.sort_order);
    const dailyDone = plans
      .filter((p) => p.is_daily && p.done)
      .sort((a, b) => a.sort_order - b.sort_order);
    const todayUndone = plans
      .filter((p) => !p.is_daily && !p.done)
      .sort((a, b) => a.sort_order - b.sort_order);
    const todayDone = plans
      .filter((p) => !p.is_daily && p.done)
      .sort((a, b) => a.sort_order - b.sort_order);
    set({ plans: [...dailyUndone, ...dailyDone, ...todayUndone, ...todayDone] });
  },

  addPlan: async (input) => {
    const all = get().plans;
    const isDaily = input.is_daily ?? false;

    const dailyUndone = all.filter((p) => p.is_daily && !p.done);
    const dailyDone = all.filter((p) => p.is_daily && p.done);
    const todayUndone = all.filter((p) => !p.is_daily && !p.done);
    const todayDone = all.filter((p) => !p.is_daily && p.done);

    const targetGroup = isDaily ? dailyUndone : todayUndone;
    const nextOrder =
      targetGroup.length > 0
        ? Math.max(...targetGroup.map((p) => p.sort_order)) + 1
        : 0;

    const plan = await dbInsertPlan({
      ...input,
      sort_order: input.sort_order ?? nextOrder,
    });

    targetGroup.push(plan);
    targetGroup.sort((a, b) => a.sort_order - b.sort_order);

    set({
      plans: [...dailyUndone, ...dailyDone, ...todayUndone, ...todayDone],
    });
    return plan;
  },

  reorderPlan: async (id, toIndex) => {
    const all = get().plans;
    const oldIdx = all.findIndex((p) => p.id === id);
    if (oldIdx === -1 || oldIdx === toIndex) return;

    const updated = [...all];
    const [item] = updated.splice(oldIdx, 1);
    updated.splice(toIndex, 0, item);

    const newPlans = updated.map((p, i) => ({ ...p, sort_order: i }));
    set({ plans: newPlans });

    await bulkUpdateSortOrders(newPlans.map((p) => ({ id: p.id, sort_order: p.sort_order })));
  },

  togglePlan: async (id) => {
    const all = get().plans;
    const plan = all.find((p) => p.id === id);
    if (!plan) return;
    const newDone = !plan.done;
    const isDaily = plan.is_daily;

    // Split into groups, excluding the toggled item
    const dailyUndone = all.filter((p) => p.is_daily && !p.done && p.id !== id);
    const dailyDone = all.filter((p) => p.is_daily && p.done && p.id !== id);
    const todayUndone = all.filter((p) => !p.is_daily && !p.done && p.id !== id);
    const todayDone = all.filter((p) => !p.is_daily && p.done && p.id !== id);

    let newSortOrder: number;

    if (!newDone) {
      // Unchecking: place at bottom of undone in the same category
      const targetGroup = isDaily ? dailyUndone : todayUndone;
      newSortOrder =
        targetGroup.length > 0
          ? Math.max(...targetGroup.map((p) => p.sort_order)) + 1
          : 0;
      targetGroup.push({ ...plan, done: false, sort_order: newSortOrder });
      targetGroup.sort((a, b) => a.sort_order - b.sort_order);
    } else {
      // Checking: place at bottom of done in the same category
      const targetGroup = isDaily ? dailyDone : todayDone;
      newSortOrder =
        targetGroup.length > 0
          ? Math.max(...targetGroup.map((p) => p.sort_order)) + 1
          : 0;
      targetGroup.push({ ...plan, done: true, sort_order: newSortOrder });
      targetGroup.sort((a, b) => a.sort_order - b.sort_order);
    }

    set({
      plans: [...dailyUndone, ...dailyDone, ...todayUndone, ...todayDone],
    });
    await dbUpdatePlan({ id, done: newDone, sort_order: newSortOrder });
  },

  removePlan: async (id) => {
    set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
    await dbDeletePlan(id);
  },

  editPlanContent: async (id, content) => {
    set((state) => ({
      plans: state.plans.map((p) =>
        p.id === id ? { ...p, content } : p
      ),
    }));
    await dbUpdatePlan({ id, content });
  },
}));
