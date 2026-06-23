/** Today's date as YYYY-MM-DD in the server's local time (consistent with the
 * local-time window used by `isWithinSevenDays`). */
export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWithinSevenDays(dateStr: string): boolean {
  // Parse date parts directly to avoid timezone shifts
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // local time, no UTC shift

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return date >= sevenDaysAgo && date <= today;
}
