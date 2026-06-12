import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useUIStore } from "../../stores/uiStore";
import { applyCssSettings, useSettingsStore } from "../../stores/settingsStore";
import type { AppSettings } from "../../types/settings";
import { cn } from "../../lib/cn";

type EdgeDir = "North" | "South" | "East" | "West";
type CornerDir = "NorthWest" | "NorthEast" | "SouthWest" | "SouthEast";

interface AppShellProps {
  children: ReactNode;
}

const RESIZE_EDGES: { edge: string; direction: EdgeDir; style: React.CSSProperties }[] = [
  { edge: "top", direction: "North", style: { top: 0, left: 0, right: 0, height: 6, cursor: "n-resize" } },
  { edge: "bottom", direction: "South", style: { bottom: 0, left: 0, right: 0, height: 6, cursor: "s-resize" } },
  { edge: "left", direction: "West", style: { top: 0, left: 0, bottom: 0, width: 6, cursor: "w-resize" } },
  { edge: "right", direction: "East", style: { top: 0, right: 0, bottom: 0, width: 6, cursor: "e-resize" } },
];

const RESIZE_CORNERS: { corner: string; direction: CornerDir; style: React.CSSProperties }[] = [
  { corner: "nw", direction: "NorthWest", style: { top: 0, left: 0, width: 12, height: 12, cursor: "nwse-resize" } },
  { corner: "ne", direction: "NorthEast", style: { top: 0, right: 0, width: 12, height: 12, cursor: "nesw-resize" } },
  { corner: "sw", direction: "SouthWest", style: { bottom: 0, left: 0, width: 12, height: 12, cursor: "nesw-resize" } },
  { corner: "se", direction: "SouthEast", style: { bottom: 0, right: 0, width: 12, height: 12, cursor: "nwse-resize" } },
];

export function AppShell({ children }: AppShellProps) {
  const isFocused = useUIStore((s) => s.isWindowFocused);
  const [previewFocused, setPreviewFocused] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unlistenPreview = listen<AppSettings>("app://preview-settings", (event) => {
      applyCssSettings(event.payload);
    });
    const unlistenFocus = listen("app://preview-focused", () => {
      setPreviewFocused(true);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => setPreviewFocused(false), 600);
    });
    const unlistenRevert = listen("app://preview-revert", () => {
      applyCssSettings(useSettingsStore.getState().settings);
    });
    return () => {
      unlistenPreview.then((fn) => fn());
      unlistenFocus.then((fn) => fn());
      unlistenRevert.then((fn) => fn());
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, []);

  const handleResizeStart = useCallback(async (direction: EdgeDir | CornerDir) => {
    await getCurrentWebviewWindow().startResizeDragging(direction);
  }, []);

  return (
    <div
      className={cn(
        "glass-shell relative",
        isFocused || previewFocused ? "glass-focused" : "glass-blurred"
      )}
      style={{ color: "var(--settings-font-color)" }}
    >
      {/* Edge resize handles — thin strips along borders */}
      {RESIZE_EDGES.map(({ edge, direction, style }) => (
        <div
          key={edge}
          className="no-drag absolute z-40"
          style={style}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(direction);
          }}
        />
      ))}
      {/* Corner resize handles — small squares at corners overlapping edge strips */}
      {RESIZE_CORNERS.map(({ corner, direction, style }) => (
        <div
          key={corner}
          className="no-drag absolute z-45"
          style={style}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(direction);
          }}
        />
      ))}
      {children}
    </div>
  );
}
