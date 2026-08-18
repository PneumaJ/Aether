import { describe, it, expect, vi, afterEach } from "vitest";
import { fmtDate, today, shiftDate } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("fmtDate", () => {
  it("pads single-digit month/day", () => {
    expect(fmtDate(2026, 1, 3)).toBe("2026-01-03");
  });

  it("keeps two-digit values unchanged", () => {
    expect(fmtDate(2026, 12, 31)).toBe("2026-12-31");
  });
});

describe("shiftDate", () => {
  it("moves forward across month boundary", () => {
    expect(shiftDate("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("moves backward across year boundary", () => {
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles zero delta", () => {
    expect(shiftDate("2026-06-15", 0)).toBe("2026-06-15");
  });

  it("handles leap day", () => {
    expect(shiftDate("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("today", () => {
  it("returns local date in YYYY-MM-DD", () => {
    vi.setSystemTime(new Date(2026, 7, 18, 10, 0, 0));
    expect(today()).toBe("2026-08-18");
  });
});
