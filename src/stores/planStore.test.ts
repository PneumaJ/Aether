import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/database", () => ({
  fetchPlansByDate: vi.fn(),
  insertPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  bulkUpdateSortOrders: vi.fn(),
}));

import { usePlanStore } from "./planStore";
import {
  fetchPlansByDate,
  insertPlan,
  updatePlan,
  deletePlan,
  bulkUpdateSortOrders,
} from "../db/database";
import type { Plan } from "../types/plan";

const mFetch = vi.mocked(fetchPlansByDate);
const mInsert = vi.mocked(insertPlan);
const mUpdate = vi.mocked(updatePlan);
const mDelete = vi.mocked(deletePlan);
const mBulk = vi.mocked(bulkUpdateSortOrders);

const plan = (id: number, overrides: Partial<Plan> = {}): Plan => ({
  id,
  date: "daily",
  content: `plan-${id}`,
  done: false,
  sort_order: id,
  is_daily: true,
  ...overrides,
});

beforeEach(() => {
  usePlanStore.setState({ plans: [] });
  vi.clearAllMocks();
});

describe("loadPlans", () => {
  it("orders groups daily-undone → daily-done → today-undone → today-done, sorted by sort_order", async () => {
    mFetch.mockResolvedValue([
      plan(3, { date: "2026-08-18", is_daily: false, done: true, sort_order: 0 }),
      plan(1, { date: "daily", done: false, sort_order: 5 }),
      plan(4, { date: "2026-08-18", is_daily: false, done: false, sort_order: 2 }),
      plan(2, { date: "daily", done: true, sort_order: 1 }),
      plan(5, { date: "daily", done: false, sort_order: 0 }),
    ]);

    await usePlanStore.getState().loadPlans("2026-08-18");

    // daily-undone [5,1] → daily-done [2] → today-undone [4] → today-done [3]
    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([5, 1, 2, 4, 3]);
    expect(mFetch).toHaveBeenCalledWith("2026-08-18");
  });
});

describe("addPlan", () => {
  it("appends to today-undone with next sort_order", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { date: "2026-08-18", is_daily: false, done: false, sort_order: 0 }),
        plan(2, { date: "2026-08-18", is_daily: false, done: true, sort_order: 1 }),
      ],
    });
    mInsert.mockResolvedValue(plan(3, { date: "2026-08-18", is_daily: false, sort_order: 1 }));

    const created = await usePlanStore.getState().addPlan({
      date: "2026-08-18",
      content: "new",
    });

    expect(created.sort_order).toBe(1);
    expect(mInsert).toHaveBeenCalledWith({
      date: "2026-08-18",
      content: "new",
      sort_order: 1,
    });
    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it("uses provided sort_order when given", async () => {
    mInsert.mockResolvedValue(plan(9, { sort_order: 42 }));
    await usePlanStore.getState().addPlan({ content: "x", sort_order: 42 });
    expect(mInsert.mock.calls[0][0].sort_order).toBe(42);
  });
});

describe("togglePlan", () => {
  it("moves a plan to bottom of done group and persists new sort_order", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { done: false, sort_order: 0 }),
        plan(2, { done: false, sort_order: 1 }),
      ],
    });

    await usePlanStore.getState().togglePlan(1);

    const state = usePlanStore.getState().plans;
    expect(state.find((p) => p.id === 1)?.done).toBe(true);
    // done group is empty → new item takes sort_order 0
    expect(state.find((p) => p.id === 1)?.sort_order).toBe(0);
    expect(state.map((p) => p.id)).toEqual([2, 1]);
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, done: true, sort_order: 0 });
  });

  it("moves a done plan to bottom of undone group when unchecked", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { done: true, sort_order: 0 }),
        plan(2, { done: true, sort_order: 1 }),
      ],
    });

    await usePlanStore.getState().togglePlan(1);

    const state = usePlanStore.getState().plans;
    expect(state.find((p) => p.id === 1)?.done).toBe(false);
    // undone group is empty → unchecked item takes sort_order 0
    expect(state.find((p) => p.id === 1)?.sort_order).toBe(0);
    // undone group renders above done group → [1(undone), 2(done)]
    expect(state.map((p) => p.id)).toEqual([1, 2]);
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, done: false, sort_order: 0 });
  });
});

describe("removePlan / editPlanContent", () => {
  it("removes from state and calls deletePlan", async () => {
    usePlanStore.setState({ plans: [plan(1), plan(2)] });
    await usePlanStore.getState().removePlan(1);
    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([2]);
    expect(mDelete).toHaveBeenCalledWith(1);
  });

  it("updates content optimistically and calls updatePlan", async () => {
    usePlanStore.setState({ plans: [plan(1)] });
    await usePlanStore.getState().editPlanContent(1, "edited");
    expect(usePlanStore.getState().plans[0].content).toBe("edited");
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, content: "edited" });
  });
});

describe("reorderPlan", () => {
  it("reorders and persists all sort orders", async () => {
    usePlanStore.setState({
      plans: [plan(1, { sort_order: 0 }), plan(2, { sort_order: 1 }), plan(3, { sort_order: 2 })],
    });

    await usePlanStore.getState().reorderPlan(1, 2);

    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([2, 3, 1]);
    expect(usePlanStore.getState().plans.map((p) => p.sort_order)).toEqual([0, 1, 2]);
    expect(mBulk).toHaveBeenCalledWith([
      { id: 2, sort_order: 0 },
      { id: 3, sort_order: 1 },
      { id: 1, sort_order: 2 },
    ]);
  });

  it("no-ops when id not found or index unchanged", async () => {
    await usePlanStore.getState().reorderPlan(999, 0);
    expect(mBulk).not.toHaveBeenCalled();
  });
});
