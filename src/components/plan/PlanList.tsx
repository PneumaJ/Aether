import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { usePlans } from "../../hooks/usePlans";
import { PlanItem } from "./PlanItem";
import type { Plan } from "../../types/plan";

function SortableGroup({
  items,
  globalOffset,
  onToggle,
  onDelete,
  onEdit,
  onReorder,
  emptyText,
}: {
  items: Plan[];
  globalOffset: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, content: string) => void;
  onReorder: (id: number, toIndex: number) => void;
  emptyText: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const idx = items.findIndex((p) => p.id === over.id);
    if (idx === -1) return;
    onReorder(Number(active.id), globalOffset + idx);
  };

  if (items.length === 0) {
    return <p className="text-glass-text-muted/40 text-xs px-1 py-2">{emptyText}</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll={false}>
      <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {items.map((plan) => (
          <PlanItem
            key={plan.id}
            plan={plan}
            onToggle={() => onToggle(plan.id)}
            onDelete={() => onDelete(plan.id)}
            onEdit={(content) => onEdit(plan.id, content)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function PlanList() {
  const { dailyPlans, datePlans, togglePlan, removePlan, editPlanContent, reorderPlan } =
    usePlans();

  const dailyUndone = dailyPlans.filter((p) => !p.done);
  const dailyDone = dailyPlans.filter((p) => p.done);
  const todayUndone = datePlans.filter((p) => !p.done);
  const todayDone = datePlans.filter((p) => p.done);

  const onToggle = (id: number) => togglePlan(id);
  const onDelete = (id: number) => removePlan(id);
  const onEdit = (id: number, content: string) => editPlanContent(id, content);

  const dailyDoneOffset = dailyUndone.length;
  const todayUndoneOffset = dailyDoneOffset + dailyDone.length;
  const todayDoneOffset = todayUndoneOffset + todayUndone.length;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-1 space-y-3">
      {/* Daily section */}
      <div>
        <h3 className="text-accent text-[10px] font-semibold uppercase tracking-wider px-1 mb-1">
          Daily
        </h3>

        <SortableGroup
          items={dailyUndone}
          globalOffset={0}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onReorder={reorderPlan}
          emptyText="No daily plans yet"
        />

        {dailyDone.length > 0 && (
          <>
            <div className="border-t border-dashed border-glass-text-muted/25 my-2" />
            <SortableGroup
              items={dailyDone}
              globalOffset={dailyDoneOffset}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onReorder={reorderPlan}
              emptyText=""
            />
          </>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-glass-border" />

      {/* Today section */}
      <div>
        <h3 className="text-glass-text-muted text-[10px] font-semibold uppercase tracking-wider px-1 mb-1">
          Today
        </h3>

        <SortableGroup
          items={todayUndone}
          globalOffset={todayUndoneOffset}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onReorder={reorderPlan}
          emptyText="No plans for today. Add one below."
        />

        {todayDone.length > 0 && (
          <>
            <div className="border-t border-dashed border-glass-text-muted/25 my-2" />
            <SortableGroup
              items={todayDone}
              globalOffset={todayDoneOffset}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onReorder={reorderPlan}
              emptyText=""
            />
          </>
        )}
      </div>
    </div>
  );
}
