import { AppShell } from "./components/layout/AppShell";
import { Titlebar } from "./components/layout/Titlebar";
import { DateGroup } from "./components/plan/DateGroup";
import { PlanList } from "./components/plan/PlanList";
import { AddPlan } from "./components/plan/AddPlan";
import { useSettings } from "./hooks/useSettings";
import { useContextMenu } from "./hooks/useContextMenu";

export function MainApp() {
  useSettings();
  useContextMenu();

  return (
    <AppShell>
      <Titlebar />
      <DateGroup />
      <PlanList />
      <AddPlan />
    </AppShell>
  );
}
