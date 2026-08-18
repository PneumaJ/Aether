import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mClose = vi.fn();

vi.mock("../../hooks/useWindow", () => ({
  useWindow: () => ({ close: mClose, minimize: vi.fn() }),
}));

import { Titlebar } from "./Titlebar";
import { useUIStore } from "../../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ headerText: "", isWindowFocused: true });
});

describe("Titlebar", () => {
  it("calls close on hide button click", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);
    await user.click(screen.getByTitle("隐藏到托盘"));
    expect(mClose).toHaveBeenCalled();
  });

  it("updates header text through the store", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);
    await user.type(screen.getByPlaceholderText("Type something..."), "my header");
    expect(useUIStore.getState().headerText).toBe("my header");
  });
});
