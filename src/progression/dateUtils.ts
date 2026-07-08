/** Local calendar date as 'YYYY-MM-DD' — deliberately local time, not UTC, so "today" matches what the player's clock says. */
export function todayString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whether `dateStr` is exactly the calendar day before `today` (both 'YYYY-MM-DD') — used to tell a kept streak from a broken one. */
export function isDayBefore(dateStr: string, today: string): boolean {
  const prev = new Date(`${dateStr}T00:00:00`);
  prev.setDate(prev.getDate() + 1);
  return todayString(prev) === today;
}

/** The Monday ('YYYY-MM-DD') of the calendar week `date` falls in — the weekly quest's rollover boundary. */
export function mondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return todayString(d);
}
