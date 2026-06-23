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
