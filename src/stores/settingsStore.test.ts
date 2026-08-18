import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => `asset://${p}`),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: vi.fn(),
  disable: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { hexToRgba, applyCssSettings, useSettingsStore } from "./settingsStore";
import { DEFAULT_SETTINGS } from "../types/settings";

const mInvoke = vi.mocked(invoke);
const mGetWin = vi.mocked(getCurrentWebviewWindow);
const mEnable = vi.mocked(enable);
const mDisable = vi.mocked(disable);

function fakeWin(label: string) {
  return {
    label,
    listen: vi.fn().mockResolvedValue(() => {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, loaded: false });
  document.documentElement.style.cssText = "";
});

describe("hexToRgba", () => {
  it("expands 3-digit hex", () => {
    expect(hexToRgba("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("parses 6-digit hex", () => {
    expect(hexToRgba("#123456", 1)).toBe("rgba(18, 52, 86, 1)");
  });

  it("clamps alpha to [0,1]", () => {
    expect(hexToRgba("#000000", 1.5)).toBe("rgba(0, 0, 0, 1)");
    expect(hexToRgba("#000000", -0.2)).toBe("rgba(0, 0, 0, 0)");
  });

  it("returns transparent for invalid hex", () => {
    expect(hexToRgba("red", 0.5)).toBe("transparent");
  });
});

describe("applyCssSettings", () => {
  it("does nothing when window label is not main", () => {
    mGetWin.mockReturnValue(fakeWin("settings") as never);
    applyCssSettings(DEFAULT_SETTINGS);
    expect(document.documentElement.style.getPropertyValue("--settings-font-color")).toBe("");
  });

  it("applies CSS variables on main window", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    applyCssSettings({ ...DEFAULT_SETTINGS, font_color: "#ff0000", font_size: 16 });
    expect(document.documentElement.style.getPropertyValue("--settings-font-color")).toBe("#ff0000");
    expect(document.documentElement.style.getPropertyValue("--settings-font-size")).toBe("16px");
    expect(document.documentElement.style.getPropertyValue("--settings-bg-image")).toBe("none");
  });

  it("converts bg image path via convertFileSrc", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    applyCssSettings({ ...DEFAULT_SETTINGS, bg_image_path: "C:\\bg.png" });
    expect(document.documentElement.style.getPropertyValue("--settings-bg-image")).toContain("asset://");
  });
});

describe("updateSetting", () => {
  it("updates store state", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    useSettingsStore.getState().updateSetting("font_size", 20);
    expect(useSettingsStore.getState().settings.font_size).toBe(20);
  });
});

describe("load", () => {
  it("merges fetched settings with defaults and marks loaded", async () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    mInvoke.mockResolvedValue({ font_size: 18 });

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(useSettingsStore.getState().settings.font_size).toBe(18);
    expect(useSettingsStore.getState().settings.font_color).toBe(DEFAULT_SETTINGS.font_color);
  });

  it("marks loaded on failure without throwing", async () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    mInvoke.mockRejectedValue(new Error("boom"));

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().loaded).toBe(true);
  });
});

describe("save", () => {
  it("persists and applies autostart", async () => {
    mInvoke.mockResolvedValue(undefined);
    mEnable.mockResolvedValue(undefined);
    mDisable.mockResolvedValue(undefined);
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, auto_start: true } });

    await useSettingsStore.getState().save();

    expect(mInvoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ auto_start: true }),
      persist: true,
    });
    expect(mEnable).toHaveBeenCalled();
  });

  it("disables autostart when turned off", async () => {
    mInvoke.mockResolvedValue(undefined);
    mDisable.mockResolvedValue(undefined);
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, auto_start: false } });

    await useSettingsStore.getState().save();

    expect(mDisable).toHaveBeenCalled();
  });
});
