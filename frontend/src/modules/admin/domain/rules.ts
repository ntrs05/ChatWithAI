/** Phần trăm đã dùng (0–100). Hạn mức 0 coi như đầy. */
export function quotaPercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Đổi số MB người dùng nhập thành số nguyên ≥ 0; sai định dạng thì null. */
export function parseQuotaMb(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.floor(n) : null;
}
