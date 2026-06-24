/** A date as YYYY-MM-DD in local time (defaults to today). Use this instead of
 * `toISOString()`, which yields the UTC date and can be a day off. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD (or ISO) date string as a local-time date, so formatting
 * with local getters doesn't shift the day. `new Date("YYYY-MM-DD")` parses as
 * UTC midnight, which reads as the previous day in negative-offset timezones. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isWithinSevenDays(dateStr: string): boolean {
  // Parse date parts directly to avoid timezone shifts. Strip any time portion
  // first — log dates can arrive as full ISO timestamps (…T00:00:00.000Z), and
  // splitting those on "-" would otherwise make the day NaN.
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  const date = new Date(year, month - 1, day); // local time, no UTC shift

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return date >= sevenDaysAgo && date <= today;
}
