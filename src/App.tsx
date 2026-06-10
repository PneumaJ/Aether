import { useState, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { MainApp } from "./MainApp";
import { SettingsApp } from "./SettingsApp";

export default function App() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const win = getCurrentWebviewWindow();
    setLabel(win.label);
  }, []);

  if (label === null) return null;
  if (label === "settings") return <SettingsApp />;
  return <MainApp />;
}
