import { useCallback, type ReactNode } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

type ResizeDirection = "NorthWest" | "NorthEast" | "SouthWest" | "SouthEast";

interface AppShellProps {
  children: ReactNode;
}

const RESIZE_CORNERS: { corner: string; direction: ResizeDirection; position: string; cursor: string }[] = [
  { corner: "top-left", direction: "NorthWest", position: "top-0 left-0", cursor: "cursor-nwse-resize" },
  { corner: "top-right", direction: "NorthEast", position: "top-0 right-0", cursor: "cursor-nesw-resize" },
  { corner: "bottom-left", direction: "SouthWest", position: "bottom-0 left-0", cursor: "cursor-nesw-resize" },
  { corner: "bottom-right", direction: "SouthEast", position: "bottom-0 right-0", cursor: "cursor-nwse-resize" },
];

export function AppShell({ children }: AppShellProps) {
  const isFocused = useUIStore((s) => s.isWindowFocused);

  const handleResizeStart = useCallback(async (direction: ResizeDirection) => {
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
      {/* Resize handles at 4 corners */}
      {RESIZE_CORNERS.map(({ corner, direction, position, cursor }) => (
        <div
          key={corner}
          className={`no-drag absolute ${position} ${cursor} z-50`}
          style={{ width: "28px", height: "28px" }}
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
