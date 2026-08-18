import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mToggle = vi.fn();
const mRemove = vi.fn();
const mEdit = vi.fn();
const mReorder = vi.fn();

const defaultReturn = {
  plans: [],
  dailyPlans: [
    { id: 1, date: "daily", content: "daily undone", done: false, sort_order: 0, is_daily: true },
    { id: 2, date: "daily", content: "daily done", done: true, sort_order: 0, is_daily: true },
  ],
  datePlans: [
    { id: 3, date: "2026-08-18", content: "today undone", done: false, sort_order: 0, is_daily: false },
  ],
  selectedDate: "2026-08-18",
  addPlan: vi.fn(),
  addDailyPlan: vi.fn(),
  togglePlan: mToggle,
  removePlan: mRemove,
  editPlanContent: mEdit,
  reorderPlan: mReorder,
};

vi.mock("../../hooks/usePlans", () => ({
  usePlans: vi.fn(() => defaultReturn),
}));

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...mod,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

import { usePlans } from "../../hooks/usePlans";
import { PlanList } from "./PlanList";

const usePlansMock = vi.mocked(usePlans);

beforeEach(() => {
  vi.clearAllMocks();
  usePlansMock.mockReturnValue(defaultReturn);
});

describe("PlanList", () => {
  it("renders grouped sections and items", () => {
    render(<PlanList />);
    expect(screen.getByText("Daily")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("daily undone")).toBeTruthy();
    expect(screen.getByText("daily done")).toBeTruthy();
    expect(screen.getByText("today undone")).toBeTruthy();
  });

  it("shows empty state when no plans", () => {
    usePlansMock.mockReturnValueOnce({
      ...defaultReturn,
      dailyPlans: [],
      datePlans: [],
    });
    render(<PlanList />);
    expect(screen.getByText("No daily plans yet")).toBeTruthy();
    expect(screen.getByText("No plans for today. Add one below.")).toBeTruthy();
  });

  it("calls togglePlan when clicking a checkbox", async () => {
    const user = userEvent.setup();
    render(<PlanList />);
    const item = screen.getByText("daily undone").closest("[data-plan-id]");
    const checkbox = item!.querySelector("button")!;
    await user.click(checkbox);
    expect(mToggle).toHaveBeenCalledWith(1);
  });
});
