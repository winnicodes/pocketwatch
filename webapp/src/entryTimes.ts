import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

export function periodBounds(period: Period, anchor: Date): { from: Date; to: Date } | null {
  if (period === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (period === 'week') return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  if (period === 'month') return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  if (period === 'year') return { from: startOfYear(anchor), to: endOfYear(anchor) };
  return null;
}

export function clientOrFallback(client: string, fallback: string): string {
  return client.trim() || fallback;
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) milliseconds = 0;
  const totalMinutes = Math.floor(milliseconds / 60000);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export interface ClockSettings {
  timeFormat: '12h' | '24h';
}

export function clockPattern(settings: ClockSettings): string {
  return settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a';
}

export function formatClock(timestamp: number, settings: ClockSettings): string {
  const formatted = format(new Date(timestamp), clockPattern(settings));
  return settings.timeFormat === '12h' ? formatted.replace(' ', ' ') : formatted;
}

export interface RoundingSettings {
  rounding?: boolean;
  roundMinutes?: number;
  roundUp?: boolean;
}

// Rounds each entry, not the sum, so line items add up to the total.
export function entryDuration(
  entry: { start: number; end: number | null },
  settings: RoundingSettings
): number {
  const raw = (entry.end ?? entry.start) - entry.start;
  if (!settings.rounding) return raw;

  const step = (settings.roundMinutes || 15) * 60000;
  const units = raw / step;
  return (settings.roundUp ? Math.ceil(units) : Math.round(units)) * step;
}

export interface ParsedTimes {
  start: number;
  end: number | null;
}

type Result =
  | { ok: true; value: ParsedTimes }
  | { ok: false; error: string };

export function parseEntryTimes(fields: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): Result {
  const start = new Date(`${fields.startDate}T${fields.startTime}`).getTime();
  if (Number.isNaN(start)) return { ok: false, error: 'alertInvalidStart' };

  const endTouched = Boolean(fields.endDate) || Boolean(fields.endTime);
  if (endTouched && !(fields.endDate && fields.endTime)) {
    return { ok: false, error: 'alertIncompleteEnd' };
  }

  const end = endTouched
    ? new Date(`${fields.endDate}T${fields.endTime}`).getTime()
    : null;

  if (end !== null && Number.isNaN(end)) return { ok: false, error: 'alertInvalidEnd' };
  if (end !== null && start > end) return { ok: false, error: 'alertEndTimeBeforeStart' };

  return { ok: true, value: { start, end } };
}
