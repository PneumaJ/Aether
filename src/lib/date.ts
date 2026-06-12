export function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function today(): string {
  const d = new Date();
  return fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function shiftDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const d2 = new Date(y, m - 1, d);
  d2.setDate(d2.getDate() + delta);
  return fmtDate(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
}
