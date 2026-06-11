import { useState, useEffect, useRef } from "react";
import { useWindow } from "../../hooks/useWindow";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

export function Titlebar() {
  const { close } = useWindow();
  const headerText = useUIStore((s) => s.headerText);
  const setHeaderText = useUIStore((s) => s.setHeaderText);
  const isWindowFocused = useUIStore((s) => s.isWindowFocused);

  const [hoverHide, setHoverHide] = useState(false);
  const [activeHide, setActiveHide] = useState(false);

  // Reset interaction state when window loses focus (clears stuck hover/active)
  const prevFocused = useRef(isWindowFocused);
  useEffect(() => {
    if (prevFocused.current && !isWindowFocused) {
      setHoverHide(false);
      setActiveHide(false);
    }
    prevFocused.current = isWindowFocused;
  }, [isWindowFocused]);

  const handleHide = () => {
    setActiveHide(false);
    setHoverHide(false);
    close();
  };

  return (
    <div className="drag-region flex h-8 shrink-0 items-center justify-between pl-3 pr-1.5">
      <input
        type="text"
        value={headerText}
        onChange={(e) => setHeaderText(e.target.value)}
        placeholder="Type something..."
        className="no-drag bg-transparent text-glass-text-muted text-xs font-medium tracking-wide outline-none placeholder:text-glass-text-muted/40 w-48"
        maxLength={80}
      />

      <div className="no-drag flex items-center gap-1.5 z-[60]">
        <button
          onClick={handleHide}
          onMouseEnter={() => setHoverHide(true)}
          onMouseLeave={() => { setHoverHide(false); setActiveHide(false); }}
          onMouseDown={() => setActiveHide(true)}
          onMouseUp={() => setActiveHide(false)}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full transition-colors text-xs leading-none",
            activeHide
              ? "bg-glass-border-strong text-glass-text"
              : hoverHide
                ? "bg-glass-border-strong text-glass-text"
                : "bg-glass-bg-hover text-glass-text-muted"
          )}
          title="隐藏到托盘"
        >
          &#x2013;
        </button>
      </div>
    </div>
  );
}
