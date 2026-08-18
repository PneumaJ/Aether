import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

import { PlanItem } from "./PlanItem";
import type { Plan } from "../../types/plan";

const plan: Plan = {
  id: 1,
  date: "2026-08-18",
  content: "write tests",
  done: false,
  sort_order: 0,
  is_daily: false,
};

describe("PlanItem", () => {
  it("renders content and calls onToggle on checkbox click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={onToggle} onDelete={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByText("write tests")).toBeTruthy();
    const checkbox = screen.getAllByRole("button")[0];
    await user.click(checkbox);
    expect(onToggle).toHaveBeenCalled();
  });

  it("edits content on double click and commits with Enter", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} />);

    await user.dblClick(screen.getByText("write tests"));
    const input = screen.getByDisplayValue("write tests");
    await user.clear(input);
    await user.type(input, "updated");
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledWith("updated");
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("deletes when edit becomes empty", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

    await user.dblClick(screen.getByText("write tests"));
    await user.clear(screen.getByDisplayValue("write tests"));
    await user.keyboard("{Enter}");

    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onDelete from delete button", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

    await user.click(screen.getByTitle("Delete plan"));
    expect(onDelete).toHaveBeenCalled();
  });
});
