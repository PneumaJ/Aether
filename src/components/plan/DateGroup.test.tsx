import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUIStore } from "../../stores/uiStore";
import { DateGroup } from "./DateGroup";
import { today, shiftDate } from "../../lib/date";

beforeEach(() => {
  useUIStore.setState({ selectedDate: today() });
});

describe("DateGroup", () => {
  it("shows Today label for current date", () => {
    render(<DateGroup />);
    expect(screen.getByRole("button", { name: /Today/ })).toBeTruthy();
  });

  it("navigates to previous day", async () => {
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(useUIStore.getState().selectedDate).toBe(shiftDate(today(), -1));
  });

  it("navigates to next day", async () => {
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(useUIStore.getState().selectedDate).toBe(shiftDate(today(), 1));
  });

  it("returns to today", async () => {
    useUIStore.setState({ selectedDate: "2020-01-01" });
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getAllByRole("button")[1]);
    expect(useUIStore.getState().selectedDate).toBe(today());
  });
});
