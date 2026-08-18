import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUIStore } from "./uiStore";

beforeEach(() => {
  localStorage.clear();
  useUIStore.setState({
    selectedDate: "2026-08-18",
    headerText: "",
    isInitialized: false,
    isLoading: false,
    isWindowFocused: true,
  });
});

describe("date navigation", () => {
  it("goes to previous day", () => {
    useUIStore.getState().goToPrevDay();
    expect(useUIStore.getState().selectedDate).toBe("2026-08-17");
  });

  it("goes to next day across month boundary", () => {
    useUIStore.setState({ selectedDate: "2026-08-31" });
    useUIStore.getState().goToNextDay();
    expect(useUIStore.getState().selectedDate).toBe("2026-09-01");
  });

  it("goes back to today", () => {
    useUIStore.setState({ selectedDate: "2026-01-01" });
    useUIStore.getState().goToToday();
    expect(useUIStore.getState().selectedDate).not.toBe("2026-01-01");
  });
});

describe("header text", () => {
  it("persists to localStorage", () => {
    useUIStore.getState().setHeaderText("hello");
    expect(localStorage.getItem("aether-header-text")).toBe("hello");
    expect(useUIStore.getState().headerText).toBe("hello");
  });

  it("reads existing localStorage on fresh store creation", async () => {
    localStorage.setItem("aether-header-text", "restored");
    vi.resetModules();
    const fresh = await import("./uiStore");
    expect(fresh.useUIStore.getState().headerText).toBe("restored");
  });
});
