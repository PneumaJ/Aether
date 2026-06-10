import { useState, useRef, type KeyboardEvent } from "react";
import { usePlans } from "../../hooks/usePlans";

type PlanType = "today" | "daily";

export function AddPlan() {
  const [content, setContent] = useState("");
  const [planType, setPlanType] = useState<PlanType>("today");
  const inputRef = useRef<HTMLInputElement>(null);
  const { addPlan, addDailyPlan } = usePlans();

  const handleSubmit = () => {
    const value = inputRef.current?.value ?? "";
    const trimmed = value.trim();
    if (!trimmed) return;
    const promise = planType === "daily" ? addDailyPlan(trimmed) : addPlan(trimmed);
    promise
      .then(() => {
        setContent("");
        inputRef.current?.focus();
      })
      .catch((err) => {
        console.error("Failed to add plan:", err);
        alert("Failed to add plan: " + String(err));
      });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="no-drag border-t border-glass-border px-3 py-2.5 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPlanType(planType === "daily" ? "today" : "daily")}
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors cursor-pointer"
      >
        {planType === "daily" ? "Daily" : "Today"}
      </button>
      <div className="w-px h-4 bg-glass-border-strong shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={planType === "daily" ? "Add a daily must-do..." : "Add a plan..."}
        className="flex-1 bg-transparent text-sm text-glass-text outline-none"
      />
    </div>
  );
}
