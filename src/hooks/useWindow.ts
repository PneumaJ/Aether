import { useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../stores/uiStore";
import { useSettingsStore } from "../stores/settingsStore";

export function useWindow() {
  const appWindow = getCurrentWindow();
  const setWindowFocused = useUIStore((s) => s.setWindowFocused);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let unlistenFocus: (() => void) | undefined;
    let unlistenMoved: (() => void) | undefined;
    let unlistenResized: (() => void) | undefined;

    appWindow.onFocusChanged(({ payload: focused }) => {
      setWindowFocused(focused);
    }).then((fn) => {
      unlistenFocus = fn;
    });

    const persistPosition = async () => {
      try {
        const pos = await appWindow.outerPosition();
        const size = await appWindow.innerSize();
        const store = useSettingsStore.getState();
        store.updateSetting("window_x", pos.x);
        store.updateSetting("window_y", pos.y);
        store.updateSetting("window_width", size.width);
        store.updateSetting("window_height", size.height);
        // Persist position to disk (skip store.save() to avoid autostart side-effects)
        await invoke("save_settings", { settings: useSettingsStore.getState().settings });
      } catch {
        // Window might be closed/minimized
      }
    };

    // Track position changes for "remember position" setting
    appWindow.onMoved(() => {
      const { settings, loaded } = useSettingsStore.getState();
      if (!loaded || !settings.remember_position) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persistPosition, 1000);
    }).then((fn) => {
      unlistenMoved = fn;
    });

    // Track resize changes
    appWindow.onResized(() => {
      const { settings, loaded } = useSettingsStore.getState();
      if (!loaded || !settings.remember_position) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persistPosition, 1000);
    }).then((fn) => {
      unlistenResized = fn;
    });

    return () => {
      unlistenFocus?.();
      unlistenMoved?.();
      unlistenResized?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const minimize = useCallback(() => {
    appWindow.minimize();
  }, [appWindow]);

  const close = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  return { minimize, close };
}
