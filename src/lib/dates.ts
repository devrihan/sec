/**
 * Timetable dates are local calendar days stored as yyyy-mm-dd. Never use
 * toISOString for these: in India it would shift an early-morning date back a day.
 */
const pad = (n: number) => String(n).padStart(2, '0');

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const combine = (dateKey: string, time: string) => new Date(`${dateKey}T${time}:00`);

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export const addDaysKey = (key: string, days: number) => toDateKey(addDays(parseDateKey(key), days));

/** Whole calendar days from a to b, safe across daylight-saving changes. */
export function daysBetween(a: Date, b: Date): number {
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / 86400000);
}

/** Weeks start on Monday, as Indian school timetables do. */
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

export const weekDays = (start: Date) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

/** Six full weeks covering the month, so every month grid has the same height. */
export function monthGrid(year: number, month: number): Date[] {
  const first = startOfWeek(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export const formatDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const formatLongDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
export const formatMonth = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
