import { useEffect, useRef } from "react";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

async function showSettingsWindow() {
  let win = await WebviewWindow.getByLabel("settings");
  if (!win) {
    // Fallback: window wasn't created at startup, try to invoke quit_app to trigger
    // settings window creation, or create it programmatically
    console.warn("Settings window not found, creating...");
    win = new WebviewWindow("settings", {
      url: "index.html",
      title: "Aether - Settings",
      width: 420,
      height: 520,
      resizable: false,
      decorations: true,
      transparent: false,
      alwaysOnTop: true,
      center: true,
      visible: false,
    });
    // Wait briefly for the webview to initialize
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await win.show();
  await win.setFocus();
}

export function useContextMenu() {
  const menuRef = useRef<Menu | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function buildMenu() {
      const showItem = await MenuItem.new({
        text: "显示 Aether",
        action: async () => {
          const win = await WebviewWindow.getByLabel("main");
          if (win) {
            await win.show();
            await win.setFocus();
          }
        },
      });

      const settingsItem = await MenuItem.new({
        text: "设置...",
        action: () => showSettingsWindow(),
      });

      const separator = await PredefinedMenuItem.new({ item: "Separator" });

      const quitItem = await MenuItem.new({
        text: "退出",
        action: async () => {
          await invoke("quit_app");
        },
      });

      const menu = await Menu.new({
        items: [showItem, settingsItem, separator, quitItem],
      });

      if (!cancelled) {
        menuRef.current = menu;
      }
    }

    buildMenu();

    const handler = (e: MouseEvent) => {
      e.preventDefault();
      menuRef.current?.popup();
    };

    document.addEventListener("contextmenu", handler);

    return () => {
      cancelled = true;
      document.removeEventListener("contextmenu", handler);
      menuRef.current?.close();
    };
  }, []);
}
