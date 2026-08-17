import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntryTimes, clientOrFallback, entryDuration, periodBounds } from './entryTimes.ts';

const valid = { startDate: '2026-08-05', startTime: '09:00', endDate: '2026-08-05', endTime: '17:00' };

test('gueltiger Eintrag', () => {
  const r = parseEntryTimes(valid);
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.value.end! > r.value.start);
});

test('laufender Eintrag ohne Ende', () => {
  const r = parseEntryTimes({ ...valid, endDate: '', endTime: '' });
  assert.ok(r.ok && r.value.end === null);
});

test('leeres Startdatum ergibt kein NaN', () => {
  const r = parseEntryTimes({ ...valid, startDate: '' });
  assert.deepEqual(r, { ok: false, error: 'alertInvalidStart' });
});

test('halb ausgefuelltes Ende wird abgelehnt', () => {
  assert.equal(parseEntryTimes({ ...valid, endTime: '' }).ok, false);
  assert.equal(parseEntryTimes({ ...valid, endDate: '' }).ok, false);
});

test('Ende vor Start wird abgelehnt', () => {
  const r = parseEntryTimes({ ...valid, endTime: '08:00' });
  assert.deepEqual(r, { ok: false, error: 'alertEndTimeBeforeStart' });
});

test('leerer Kundenname bekommt das Fuellwort', () => {
  assert.equal(clientOrFallback('', 'Ohne Kunde'), 'Ohne Kunde');
  assert.equal(clientOrFallback('   ', 'Ohne Kunde'), 'Ohne Kunde');
});

test('vorhandener Kundenname bleibt, nur getrimmt', () => {
  assert.equal(clientOrFallback('Gutenberg AG', 'Ohne Kunde'), 'Gutenberg AG');
  assert.equal(clientOrFallback('  Gutenberg AG  ', 'Ohne Kunde'), 'Gutenberg AG');
});

const minutes = (n: number) => ({ start: 0, end: n * 60000 });

test('ohne Runden bleibt die rohe Dauer', () => {
  assert.equal(entryDuration(minutes(37), { rounding: false, roundMinutes: 15 }), 37 * 60000);
  assert.equal(entryDuration(minutes(37), {}), 37 * 60000);
});

test('laufender Eintrag zaehlt als null', () => {
  assert.equal(entryDuration({ start: 5000, end: null }, { rounding: true, roundMinutes: 15 }), 0);
});

test('kaufmaennisch auf das naechste Intervall', () => {
  assert.equal(entryDuration(minutes(37), { rounding: true, roundMinutes: 15 }), 30 * 60000);
  assert.equal(entryDuration(minutes(38), { rounding: true, roundMinutes: 15 }), 45 * 60000);
});

test('immer aufrunden geht nie nach unten', () => {
  const up = { rounding: true, roundMinutes: 15, roundUp: true };
  assert.equal(entryDuration(minutes(37), up), 45 * 60000);
  assert.equal(entryDuration(minutes(1), up), 15 * 60000);
  assert.equal(entryDuration(minutes(30), up), 30 * 60000);
});

test('fehlendes Intervall faellt auf 15 Minuten zurueck', () => {
  assert.equal(entryDuration(minutes(37), { rounding: true }), 30 * 60000);
});

// Mittwoch, 12.08.2026 - bewusst mitten in Woche, Monat und Jahr, damit ein
// falscher Wochenbeginn oder ein off-by-one am Monatsende auffaellt.
const anchor = new Date(2026, 7, 12, 15, 30);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('Alle hat keine Grenzen', () => {
  assert.equal(periodBounds('all', anchor), null);
});

test('Tag umfasst genau den Bezugstag', () => {
  const b = periodBounds('day', anchor)!;
  assert.equal(iso(b.from), '2026-08-12');
  assert.equal(iso(b.to), '2026-08-12');
  assert.equal(b.from.getHours(), 0);
});

test('Woche laeuft von Montag bis Sonntag', () => {
  const b = periodBounds('week', anchor)!;
  assert.equal(iso(b.from), '2026-08-10');
  assert.equal(iso(b.to), '2026-08-16');
});

test('Monat endet am letzten Tag, nicht am ersten des naechsten', () => {
  const b = periodBounds('month', anchor)!;
  assert.equal(iso(b.from), '2026-08-01');
  assert.equal(iso(b.to), '2026-08-31');
});

test('Jahr umfasst das ganze Kalenderjahr', () => {
  const b = periodBounds('year', anchor)!;
  assert.equal(iso(b.from), '2026-01-01');
  assert.equal(iso(b.to), '2026-12-31');
});
