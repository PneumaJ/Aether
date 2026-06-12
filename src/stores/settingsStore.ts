import { create } from "zustand";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import type { AppSettings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  setSettings: (settings: AppSettings) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
  resetDefaults: () => void;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  let h = hex;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return "transparent";
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function applyCssSettings(settings: AppSettings) {
  const win = getCurrentWebviewWindow();
  if (win.label !== "main") return;

  const root = document.documentElement;
  root.style.setProperty("--settings-font-color", settings.font_color);
  root.style.setProperty("--settings-font-size", `${settings.font_size}px`);
  root.style.setProperty("--settings-bg-color-focused", hexToRgba(settings.bg_color_focused, settings.bg_opacity_focused));
  root.style.setProperty("--settings-bg-color-blurred", hexToRgba(settings.bg_color_blurred, settings.bg_opacity_blurred));
  root.style.setProperty("--settings-bg-image-opacity", String(settings.bg_image_opacity));
  root.style.setProperty("--settings-bg-image-pos-x", `${settings.bg_image_position_x}%`);
  root.style.setProperty("--settings-bg-image-pos-y", `${settings.bg_image_position_y}%`);
  if (settings.bg_image_path) {
    const assetUrl = convertFileSrc(settings.bg_image_path);
    root.style.setProperty("--settings-bg-image", `url('${assetUrl}')`);
  } else {
    root.style.setProperty("--settings-bg-image", "none");
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  setSettings: (settings) => {
    set({ settings, loaded: true });
    applyCssSettings(settings);
  },

  updateSetting: (key, value) => {
    const newSettings = { ...get().settings, [key]: value };
    set({ settings: newSettings });
    applyCssSettings(newSettings);
  },

  updateSettings: (partial: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    applyCssSettings(newSettings);
  },

  load: async () => {
    try {
      const settings = await invoke<AppSettings>("get_settings");
      set({ settings: { ...DEFAULT_SETTINGS, ...settings }, loaded: true });
      applyCssSettings(get().settings);
    } catch {
      set({ loaded: true });
    }

    // Listen for settings changes from other windows
    const win = getCurrentWebviewWindow();
    win.listen<AppSettings>("app://settings-changed", ({ payload }) => {
      set({ settings: { ...DEFAULT_SETTINGS, ...payload } });
      applyCssSettings(payload);
    });
  },

  save: async () => {
    const { settings } = get();
    try {
      // Persist to disk
      await invoke("save_settings", { settings, persist: true });

      // Apply autostart (frontend API)
      try {
        if (settings.auto_start) {
          await enable();
        } else {
          await disable();
        }
      } catch {
        // Autostart may not be available on all platforms
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  },

  resetDefaults: () => {
    set({ settings: { ...DEFAULT_SETTINGS } });
    applyCssSettings(DEFAULT_SETTINGS);
  },
}));
