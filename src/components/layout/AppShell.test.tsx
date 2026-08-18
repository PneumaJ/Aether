import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mInvoke(...args),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    label: "main",
    startResizeDragging: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { AppShell } from "./AppShell";
import { useUIStore } from "../../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ isWindowFocused: true });
});

describe("AppShell", () => {
  it("invokes activate_main_window on pointer down", () => {
    render(<AppShell><div>child</div></AppShell>);
    fireEvent.pointerDown(screen.getByText("child"));
    expect(mInvoke).toHaveBeenCalledWith("activate_main_window");
  });

  it("toggles glass-focused class with focus state", () => {
    useUIStore.setState({ isWindowFocused: false });
    render(<AppShell><div /></AppShell>);
    const shell = document.querySelector(".glass-shell");
    expect(shell!.className).toContain("glass-blurred");
  });
});
