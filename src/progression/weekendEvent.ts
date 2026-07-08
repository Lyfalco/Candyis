/** All score gained (placement + clears) is doubled while the weekend event is active. */
export const WEEKEND_SCORE_MULTIPLIER = 2;

/** Saturday/Sunday, local device time — deliberately simple (no server/timezone coordination) since the whole game is offline-first. */
export function isWeekendEvent(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
