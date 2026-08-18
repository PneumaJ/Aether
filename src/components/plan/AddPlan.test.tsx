import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mAddPlan = vi.fn().mockResolvedValue(undefined);
const mAddDailyPlan = vi.fn().mockResolvedValue(undefined);

vi.mock("../../hooks/usePlans", () => ({
  usePlans: () => ({
    addPlan: mAddPlan,
    addDailyPlan: mAddDailyPlan,
  }),
}));

import { AddPlan } from "./AddPlan";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddPlan", () => {
  it("adds a trimmed today plan on Enter", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.type(screen.getByPlaceholderText("Add a plan..."), "  buy milk  ");
    await user.keyboard("{Enter}");

    expect(mAddPlan).toHaveBeenCalledWith("buy milk");
    expect(mAddDailyPlan).not.toHaveBeenCalled();
  });

  it("switches to daily and adds a daily plan", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.type(screen.getByPlaceholderText("Add a daily must-do..."), "meditate");
    await user.keyboard("{Enter}");

    expect(mAddDailyPlan).toHaveBeenCalledWith("meditate");
  });

  it("ignores empty input", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.type(screen.getByPlaceholderText("Add a plan..."), "   ");
    await user.keyboard("{Enter}");

    expect(mAddPlan).not.toHaveBeenCalled();
  });
});
