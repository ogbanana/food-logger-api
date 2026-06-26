/** Today's date as YYYY-MM-DD in the server's local time (consistent with the
 * local-time window used by `isWithinSevenDays`). */
export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWithinSevenDays(dateStr: string, todayStr?: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  let today: Date;
  if (todayStr) {
    const [ty, tm, td] = todayStr.split("-").map(Number);
    today = new Date(ty, tm - 1, td);
  } else {
    const now = new Date();
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const lowerBound = new Date(today);
  lowerBound.setDate(today.getDate() - 8);
  const upperBound = new Date(today);
  upperBound.setDate(today.getDate() + 1);

  return date >= lowerBound && date <= upperBound;
}
