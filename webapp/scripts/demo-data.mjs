import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const WEEKS = Number(opt('--weeks', 8));
const OUT_DIR = resolve(opt('--out', join(HERE, '..', '..', 'data')));

let seed = 20260806;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rnd() * list.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

const WORK = [
  ['Gutenberg AG', [
    'Korrektur Umschlag, Freigabe Innenteil',
    'Satz Innenteil, Bildfreistellungen, Rückfragen Lektorat',
    'Abstimmung Papierwahl mit der Druckerei, Musterbogen geprüft und Termine für den Andruck festgelegt',
    'Reinzeichnung Schutzumschlag',
  ]],
  ['Nordlicht GmbH', [
    'Monatsabschluss',
    'Auswertung Kampagne, Reporting vorbereitet',
    'Jour fixe Marketing',
  ]],
  ['Studio Halm', [
    'Briefing Website',
    'Wireframes Startseite',
    'Feedback eingearbeitet, zweite Runde Entwürfe erstellt und zur Abstimmung geschickt',
  ]],
  ['Kellner & Partner', [
    'Vertragsprüfung',
    'Telefonat Mandant, Notizen erfasst',
    'Recherche Rechtsprechung',
  ]],
  ['Hofmann Bau', [
    'Aufmaß vor Ort',
    'Angebot kalkuliert',
  ]],
  ['Ohne Kunde', ['Verwaltung, Ablage', 'Buchhaltung vorbereitet']],
];

const WORK_EN = [
  ['Gutenberg Press', [
    'Cover proofing, sign-off on the inside pages',
    'Typesetting inside pages, cut-outs, queries from the copy editor',
    'Paper stock call with the printer, checked the proof sheet and locked the press dates',
    'Final artwork for the dust jacket',
  ]],
  ['Northlight Media', [
    'Month-end close',
    'Campaign analysis, reporting prepared',
    'Marketing jour fixe',
  ]],
  ['Halm Studio', [
    'Website briefing',
    'Wireframes for the landing page',
    'Feedback worked in, second round of drafts sent out for review',
  ]],
  ['Whitfield & Rowe', [
    'Contract review',
    'Client call, notes written up',
    'Case law research',
  ]],
  ['Hofmann Builders', [
    'Site survey',
    'Quote calculated',
  ]],
  ['No client', ['Admin, filing', 'Bookkeeping prepared']],
];

const JOBS = flag('--en') ? WORK_EN : WORK;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const entries = [];
const today = startOfDay(new Date());
let n = 0;

for (let back = WEEKS * 7; back >= 0; back--) {
  const day = new Date(today);
  day.setDate(day.getDate() - back);
  const weekday = day.getDay();

  const isWeekend = weekday === 0 || weekday === 6;
  if (isWeekend && rnd() > 0.15) continue;
  if (!isWeekend && rnd() > 0.85) continue;

  let cursor = new Date(day);
  cursor.setHours(between(7, 9), pick([0, 15, 30, 45]), 0, 0);

  const count = isWeekend ? 1 : between(1, 4);
  for (let i = 0; i < count; i++) {
    const [client, activities] = pick(JOBS);
    const roll = rnd();
    const minutes = roll < 0.1 ? between(5, 20) : roll > 0.92 ? between(240, 420) : between(30, 180);

    const start = new Date(cursor);
    const end = new Date(start.getTime() + minutes * 60000);
    if (end.getHours() >= 20) break;

    entries.push({
      id: `demo-${String(++n).padStart(4, '0')}`,
      start: start.getTime(),
      end: end.getTime(),
      client,
      activity: pick(activities),
    });

    cursor = new Date(end.getTime() + between(5, 90) * 60000);
    if (cursor.getHours() >= 19) break;
  }
}

if (flag('--running')) {
  const [client, activities] = JOBS[0];
  entries.push({
    id: `demo-${String(++n).padStart(4, '0')}`,
    start: Date.now() - between(10, 200) * 60000,
    end: null,
    client,
    activity: pick(activities),
  });
}

entries.sort((a, b) => b.start - a.start);

const json = JSON.stringify(entries, null, 2);

if (flag('--stdout')) {
  process.stdout.write(json + '\n');
  process.exit(0);
}

const target = join(OUT_DIR, 'times.json');

if (existsSync(target) && !flag('--force')) {
  const vorhanden = JSON.parse(readFileSync(target, 'utf8') || '[]');
  console.error(
    `Abbruch: ${target} existiert bereits (${Array.isArray(vorhanden) ? vorhanden.length : '?'} Eintraege).\n` +
    `Mit --force ueberschreiben, oder --out <pfad> fuer ein anderes Ziel.`
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(target, json);

const days = new Set(entries.map(e => startOfDay(new Date(e.start)).getTime())).size;
const hours = entries.reduce((a, e) => a + ((e.end ?? e.start) - e.start), 0) / 3600000;
console.log(
  `${entries.length} Eintraege an ${days} Tagen, ${hours.toFixed(1)} h gesamt\n` +
  `geschrieben nach ${target}`
);
