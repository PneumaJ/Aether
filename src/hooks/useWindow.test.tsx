import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mInvoke = vi.fn().mockResolvedValue(undefined);

const fakeWindow = {
  outerPosition: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
  innerSize: vi.fn().mockResolvedValue({ width: 380, height: 560 }),
  onFocusChanged: vi.fn().mockResolvedValue(() => {}),
  onMoved: vi.fn().mockResolvedValue(() => {}),
  onResized: vi.fn().mockResolvedValue(() => {}),
  minimize: vi.fn(),
  close: vi.fn(),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => fakeWindow,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mInvoke(...args),
}));

// updateSetting → applyCssSettings reads the current webview label; without
// this mock the real Tauri module throws outside a Tauri runtime.
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ label: "main" }),
}));

import { useWindow } from "./useWindow";
import { useSettingsStore } from "../stores/settingsStore";
import { DEFAULT_SETTINGS } from "../types/settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS, remember_position: true },
    loaded: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWindow", () => {
  it("persists position after move debounce", async () => {
    renderHook(() => useWindow());

    const movedCb = fakeWindow.onMoved.mock.calls[0][0];
    act(() => movedCb());
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
      settings: expect.objectContaining({ window_x: 100, window_y: 200 }),
    }));
  });

  it("does not persist when remember_position is off", async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, remember_position: false },
      loaded: true,
    });
    renderHook(() => useWindow());

    const movedCb = fakeWindow.onMoved.mock.calls[0][0];
    act(() => movedCb());
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mInvoke).not.toHaveBeenCalled();
  });
});
