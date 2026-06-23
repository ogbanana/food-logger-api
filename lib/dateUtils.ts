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

  // The date sent by the client is in the user's local time, but the server's
  // "today" may be a different timezone (UTC on most hosts). Allow a one-day
  // tolerance on each side so a client up to ~14h ahead of or behind the server
  // isn't wrongly rejected.
  const lowerBound = new Date(today);
  lowerBound.setDate(today.getDate() - 8);
  const upperBound = new Date(today);
  upperBound.setDate(today.getDate() + 1);

  return date >= lowerBound && date <= upperBound;
}
