import { useState, useRef, type KeyboardEvent } from "react";
import type { Plan } from "../../types/plan";
import { cn } from "../../lib/cn";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PlanItemProps {
  plan: Plan;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (content: string) => void;
}

export function PlanItem({ plan, onToggle, onDelete, onEdit }: PlanItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(plan.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(plan.content);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== plan.content) {
      onEdit(trimmed);
    } else if (!trimmed) {
      onDelete();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") {
      setEditValue(plan.content);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      data-plan-id={plan.id}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "animate-fade-in group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        isDragging && "relative z-10 scale-[1.03] shadow-lg shadow-black/40 bg-glass-bg-hover opacity-90",
        !isDragging && "hover:bg-glass-bg-hover"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          plan.done
            ? "border-accent bg-accent text-white"
            : "border-glass-border-strong hover:border-glass-text-muted"
        )}
      >
        {plan.done && (
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm text-glass-text outline-none"
          autoFocus
        />
      ) : (
        <span
          onDoubleClick={handleDoubleClick}
          className={cn(
            "flex-1 cursor-default select-none text-sm",
            plan.done
              ? "text-glass-text-done line-through"
              : "text-glass-text"
          )}
        >
          {plan.content}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-glass-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all text-xs px-1"
        title="Delete plan"
      >
        &#x2715;
      </button>
    </div>
  );
}
