import { useUIStore } from "../../stores/uiStore";
import { fmtDate } from "../../lib/date";

function formatDate(dateStr: string): string {
  const [y, m, dNum] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, dNum);

  const now = new Date();
  const todayStr = fmtDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const yesterdayStr = fmtDate(now.getFullYear(), now.getMonth() + 1, now.getDate() - 1);
  const tomorrowStr = fmtDate(now.getFullYear(), now.getMonth() + 1, now.getDate() + 1);

  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();

  if (dateStr === todayStr) return `Today - ${weekday}, ${month} ${day}`;
  if (dateStr === yesterdayStr) return `Yesterday - ${weekday}, ${month} ${day}`;
  if (dateStr === tomorrowStr) return `Tomorrow - ${weekday}, ${month} ${day}`;
  return `${weekday}, ${month} ${day}`;
}

export function DateGroup() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const goToPrevDay = useUIStore((s) => s.goToPrevDay);
  const goToNextDay = useUIStore((s) => s.goToNextDay);
  const goToToday = useUIStore((s) => s.goToToday);

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <button
        onClick={goToPrevDay}
        className="no-drag text-glass-text-muted hover:text-glass-text text-lg leading-none px-1 transition-colors"
        aria-label="Previous day"
      >
        &#x2039;
      </button>

      <button
        onClick={goToToday}
        className="text-glass-text text-sm font-medium hover:text-accent-hover transition-colors"
      >
        {formatDate(selectedDate)}
      </button>

      <button
        onClick={goToNextDay}
        className="no-drag text-glass-text-muted hover:text-glass-text text-lg leading-none px-1 transition-colors"
        aria-label="Next day"
      >
        &#x203A;
      </button>
    </div>
  );
}
