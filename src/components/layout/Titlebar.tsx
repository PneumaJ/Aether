import { useWindow } from "../../hooks/useWindow";
import { useUIStore } from "../../stores/uiStore";

export function Titlebar() {
  const { minimize, close } = useWindow();
  const headerText = useUIStore((s) => s.headerText);
  const setHeaderText = useUIStore((s) => s.setHeaderText);

  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between pl-3 pr-1">
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
          onClick={minimize}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-glass-bg-hover text-glass-text-muted hover:bg-glass-border-strong hover:text-glass-text transition-colors text-xs leading-none"
          title="Minimize to tray"
        >
          &#x2013;
        </button>
        <button
          onClick={close}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-glass-bg-hover text-glass-text-muted hover:bg-danger hover:text-white transition-colors text-xs leading-none"
          title="Close to tray"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}
