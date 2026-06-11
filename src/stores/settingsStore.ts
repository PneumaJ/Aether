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
  load: () => Promise<void>;
  save: () => Promise<void>;
  resetDefaults: () => void;
}

function applyCssSettings(settings: AppSettings) {
  // CSS variables are only relevant for the main window; the settings webview
  // has its own locked font-size and doesn't render the frosted glass shell.
  const win = getCurrentWebviewWindow();
  if (win.label !== "main") return;

  const root = document.documentElement;
  root.style.setProperty("--settings-font-color", settings.font_color);
  root.style.setProperty("--settings-font-size", `${settings.font_size}px`);
  root.style.setProperty("--settings-bg-opacity-focused", String(settings.bg_opacity_focused));
  root.style.setProperty("--settings-bg-opacity-blurred", String(settings.bg_opacity_blurred));
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
    // Apply CSS immediately on the current window
    applyCssSettings(newSettings);
    // Broadcast to all windows without persisting to disk
    invoke("save_settings", { settings: newSettings, persist: false }).catch(() => {});
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
