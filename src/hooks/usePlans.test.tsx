import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../db/database", () => ({
  fetchPlansByDate: vi.fn().mockResolvedValue([]),
  insertPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  bulkUpdateSortOrders: vi.fn(),
}));

import { usePlans } from "./usePlans";
import { useUIStore } from "../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ selectedDate: "2026-08-18", isLoading: false });
});

describe("usePlans", () => {
  it("loads plans for the selected date", async () => {
    const { result } = renderHook(() => usePlans());
    expect(result.current.selectedDate).toBe("2026-08-18");
    await waitFor(() => expect(useUIStore.getState().isLoading).toBe(false));
  });
});
