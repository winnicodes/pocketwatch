import { format } from 'date-fns/format';

/**
 * Kundenname beim Speichern normalisieren: aussen Leerzeichen weg, und wenn
 * dann nichts uebrig bleibt, das Fuellwort. Sonst stehen im Verlauf und im
 * PDF-Export namenlose Zeilen, und " Kunde" und "Kunde" waeren zwei Kunden.
 */
export function clientOrFallback(client: string, fallback: string): string {
  return client.trim() || fallback;
}

/** Millisekunden als HH:MM. Geteilt von Tabelle, Summen-Kacheln und Kopfzeile. */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) milliseconds = 0;
  const totalMinutes = Math.floor(milliseconds / 60000);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export interface ClockSettings {
  timeFormat: '12h' | '24h';
}

/**
 * Muster fuer date-fns. Verlauf, Tracker, CSV und PDF fragen hier - vorher stand
 * dieselbe Fallunterscheidung viermal da, und eine abweichende Kopie haette im
 * Export andere Zeiten gezeigt als in der Anzeige.
 */
export function clockPattern(settings: ClockSettings): string {
  return settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a';
}

/**
 * Uhrzeit fuer die Oberflaeche. Vor AM/PM steht ein geschuetztes Leerzeichen,
 * sonst bricht "2:30 PM" in schmalen Spalten zwischen Zahl und Zusatz um.
 * Der PDF-Export laesst das Leerzeichen ganz weg und formatiert deshalb selbst.
 */
export function formatClock(timestamp: number, settings: ClockSettings): string {
  const formatted = format(new Date(timestamp), clockPattern(settings));
  return settings.timeFormat === '12h' ? formatted.replace(' ', ' ') : formatted;
}

export interface RoundingSettings {
  rounding?: boolean;
  roundMinutes?: number;
  roundUp?: boolean;
}

/**
 * Dauer eines Eintrags - die einzige Stelle, an der sie berechnet wird.
 * Verlauf, Kopfzeile, Kacheln, PDF und CSV rufen alle hier durch, sonst zeigt
 * die eine Ansicht gerundete und die naechste rohe Minuten.
 *
 * Gerundet wird je Eintrag, nicht die Summe: abgerechnet wird der einzelne
 * Posten, und die Summe der Positionen muss zur ausgewiesenen Summe passen.
 */
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

/**
 * Wandelt die Formularfelder des EditModals in Timestamps um.
 *
 * Ohne diese Pruefungen wird aus einem leeren Datumsfeld NaN: date-fns wirft dann
 * beim Rendern "Invalid time value" (weisse Seite) und JSON.stringify(NaN) macht
 * daraus serverseitig null - der Eintrag steht nach dem Reload auf 01.01.1970.
 */
export function parseEntryTimes(fields: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): Result {
  const start = new Date(`${fields.startDate}T${fields.startTime}`).getTime();
  if (Number.isNaN(start)) return { ok: false, error: 'alertInvalidStart' };

  // end === null bedeutet "laeuft noch" - halb ausgefuellt wuerde einen fertigen
  // Eintrag stillschweigend wieder als laufend in den Tracker zurueckholen.
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
