import { useCallback, type ReactNode } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

type EdgeDir = "North" | "South" | "East" | "West";
type CornerDir = "NorthWest" | "NorthEast" | "SouthWest" | "SouthEast";

interface AppShellProps {
  children: ReactNode;
}

const RESIZE_EDGES: { edge: string; direction: EdgeDir; style: React.CSSProperties; cursor: string }[] = [
  { edge: "top", direction: "North", style: { top: 0, left: 0, right: 0, height: 6 }, cursor: "cursor-n-resize" },
  { edge: "bottom", direction: "South", style: { bottom: 0, left: 0, right: 0, height: 6 }, cursor: "cursor-s-resize" },
  { edge: "left", direction: "West", style: { top: 0, left: 0, bottom: 0, width: 6 }, cursor: "cursor-w-resize" },
  { edge: "right", direction: "East", style: { top: 0, right: 0, bottom: 0, width: 6 }, cursor: "cursor-e-resize" },
];

const RESIZE_CORNERS: { corner: string; direction: CornerDir; style: React.CSSProperties; cursor: string }[] = [
  { corner: "nw", direction: "NorthWest", style: { top: 0, left: 0, width: 12, height: 12 }, cursor: "cursor-nwse-resize" },
  { corner: "ne", direction: "NorthEast", style: { top: 0, right: 0, width: 12, height: 12 }, cursor: "cursor-nesw-resize" },
  { corner: "sw", direction: "SouthWest", style: { bottom: 0, left: 0, width: 12, height: 12 }, cursor: "cursor-nesw-resize" },
  { corner: "se", direction: "SouthEast", style: { bottom: 0, right: 0, width: 12, height: 12 }, cursor: "cursor-nwse-resize" },
];

export function AppShell({ children }: AppShellProps) {
  const isFocused = useUIStore((s) => s.isWindowFocused);

  const handleResizeStart = useCallback(async (direction: EdgeDir | CornerDir) => {
    await getCurrentWebviewWindow().startResizeDragging(direction);
  }, []);

  return (
    <div
      className={cn(
        "glass-shell relative transition-all duration-300",
        isFocused ? "glass-focused" : "glass-blurred"
      )}
      style={{ color: "var(--settings-font-color)" }}
    >
      {/* Edge resize handles — thin strips along borders */}
      {RESIZE_EDGES.map(({ edge, direction, style, cursor }) => (
        <div
          key={edge}
          className={`no-drag absolute ${cursor} z-40`}
          style={style}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(direction);
          }}
        />
      ))}
      {/* Corner resize handles — small squares at corners overlapping edge strips */}
      {RESIZE_CORNERS.map(({ corner, direction, style, cursor }) => (
        <div
          key={corner}
          className={`no-drag absolute ${cursor} z-45`}
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
