import Database from "@tauri-apps/plugin-sql";
import type { Plan, CreatePlanInput, UpdatePlanInput } from "../types/plan";

const DB_URL = "sqlite:aether.db";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_URL);
  }
  return db;
}

function rowToPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as number,
    date: row.date as string,
    content: row.content as string,
    done: (row.done as number) === 1,
    sort_order: row.sort_order as number,
    is_daily: ((row.is_daily as number) ?? 0) === 1,
  };
}

export async function fetchPlansByDate(date: string): Promise<Plan[]> {
  const database = await getDb();
  const rows = await database.select<Record<string, unknown>[]>(
    "SELECT * FROM plans WHERE date = $1 OR is_daily = 1 ORDER BY sort_order ASC",
    [date]
  );
  return rows.map(rowToPlan);
}

export async function insertPlan(input: CreatePlanInput): Promise<Plan> {
  const database = await getDb();
  const isDaily = input.is_daily ? 1 : 0;
  const planDate = input.is_daily ? "daily" : (input.date ?? "");
  const result = await database.execute(
    "INSERT INTO plans (date, content, done, sort_order, is_daily) VALUES ($1, $2, 0, $3, $4)",
    [planDate, input.content, input.sort_order ?? 0, isDaily]
  );
  return {
    id: result.lastInsertId as number,
    date: planDate,
    content: input.content,
    done: false,
    sort_order: input.sort_order ?? 0,
    is_daily: input.is_daily ?? false,
  };
}

export async function updatePlan(input: UpdatePlanInput): Promise<void> {
  const database = await getDb();
  const sets: string[] = [];
  const params: (string | number | boolean)[] = [];

  if (input.content !== undefined) {
    sets.push(`content = $${sets.length + 1}`);
    params.push(input.content);
  }
  if (input.done !== undefined) {
    sets.push(`done = $${sets.length + 1}`);
    params.push(input.done ? 1 : 0);
  }
  if (input.sort_order !== undefined) {
    sets.push(`sort_order = $${sets.length + 1}`);
    params.push(input.sort_order);
  }

  if (sets.length === 0) return;

  params.push(input.id);
  await database.execute(
    `UPDATE plans SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );
}

export async function bulkUpdateSortOrders(items: { id: number; sort_order: number }[]): Promise<void> {
  if (items.length === 0) return;
  const database = await getDb();
  for (const item of items) {
    await database.execute(
      "UPDATE plans SET sort_order = $1 WHERE id = $2",
      [item.sort_order, item.id]
    );
  }
}

export async function deletePlan(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM plans WHERE id = $1", [id]);
}
