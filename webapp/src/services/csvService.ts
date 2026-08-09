import { format } from 'date-fns/format';
import type { TimeEntry } from '../types';
import { formatDuration, entryDuration, clockPattern, type RoundingSettings } from '../entryTimes';

// Semikolon, weil Excel in deutscher Locale Kommas nicht als Trenner liest.
const SEPARATOR = ';';

const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function exportToCsv(
  entries: TimeEntry[],
  settings: RoundingSettings & { timeFormat: '12h' | '24h' },
  t: (key: string) => string,
  timesOnly = false
): void {
  const clock = clockPattern(settings);

  // Reihenfolge kommt vom Aufrufer - der kennt die gewaehlte Sortierung.
  const rows = entries
    .map(entry => [
      format(new Date(entry.start), 'dd.MM.yyyy'),
      format(new Date(entry.start), clock),
      entry.end ? format(new Date(entry.end), clock) : '',
      ...(timesOnly ? [] : [entry.client, entry.activity]),
      formatDuration(entryDuration(entry, settings)),
    ]);

  const header = [
    t('thDate'), t('startTime'), t('endTime'),
    ...(timesOnly ? [] : [t('thClient'), t('thActivity')]),
    t('thDuration'),
  ];

  // BOM, sonst zerlegt Excel Umlaute.
  const csv = '﻿' + [header, ...rows]
    .map(row => row.map(cell).join(SEPARATOR))
    .join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pocketwatch-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
