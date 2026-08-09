import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { TimeEntry } from '../types';
// Fix: Import date-fns functions from their specific submodules to resolve export errors.
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addDays } from 'date-fns/addDays';
import { addWeeks } from 'date-fns/addWeeks';
import { addMonths } from 'date-fns/addMonths';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { addYears } from 'date-fns/addYears';
import { isToday } from 'date-fns/isToday';
import { parseISO } from 'date-fns/parseISO';
import { parse } from 'date-fns/parse';
import { exportToPdf } from '../services/pdfService';
import { exportToCsv } from '../services/csvService';
import { useAppContext } from '../contexts/AppContext';
import { formatDuration, entryDuration, formatClock } from '../entryTimes';
import ExportModal from './ExportModal';
import type { ExportOptions } from './ExportModal';
import PickerField from './PickerField';
import Segmented from './Segmented';
import { SECTION_LABEL, CARD_BUTTON } from '../ui';
import { Search, ChevronLeft, ChevronRight, X, SlidersHorizontal, Download } from 'lucide-react';

interface TimeTableProps {
  entries: TimeEntry[];
  /** Solange der Abruf laeuft, ist "keine Eintraege" eine Behauptung ins Blaue. */
  isLoading?: boolean;
  onEdit: (entry: TimeEntry) => void;
  isExportOpen: boolean;
  onCloseExport: () => void;
  /** Export-Symbol der Mobilansicht - am Desktop sitzt der Einstieg in der Kopfzeile. */
  onOpenExport: () => void;
  className?: string;
  /** Menueknopf der Mobilansicht - steht links neben der Ueberschrift. */
  menuButton?: React.ReactNode;
}

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

// Ein Raster fuer Spaltenkopf und Zeilen, sonst laufen die Spalten auseinander.
// Mobil: Zeitstrahl | Text | Dauer, ab lg das 5-spaltige Raster der Vorlage.
//
// Die Zeitspalte haengt am Format: "07:45 – 10:10" passt in 132px,
// "7:45 AM – 10:10 AM" nicht - dort brach jede Zeile auf zwei Zeilen um.
// Beide Raster stehen ausgeschrieben da, weil Tailwind den Quelltext nach
// vollstaendigen Klassennamen durchsucht; ein zusammengesetzter Name wuerde
// nie erzeugt.
const ROW_GRID_BASE = 'grid-cols-[14px_minmax(0,1fr)_auto] gap-x-3.5 lg:gap-5';
const ROW_GRID_24H = 'lg:grid-cols-[18px_132px_240px_minmax(0,1fr)_96px]';
const ROW_GRID_12H = 'lg:grid-cols-[18px_162px_240px_minmax(0,1fr)_96px]';

// Wie viele Eintraege auf einmal in den Verlauf kommen. Reicht fuer mehrere
// Bildschirmhoehen, der Rest kommt auf Knopfdruck. Die Summen unten zaehlen
// weiterhin alle gefundenen Eintraege, nicht nur die sichtbaren.
// ponytail: fester Schnitt statt Virtualisierung - die kostet Tagesgruppen,
// klebende Ueberschriften und variable Zeilenhoehen. Wenn jemand regelmaessig
// tausende Zeilen am Stueck durchscrollt, ist sie der naechste Schritt.
const PAGE = 150;

// Eingeklappte Leiste, aber gesetzter Wert: der Knopf faerbt sich, sonst
// filtert man unsichtbar weiter und der Verlauf sieht grundlos leer aus.
const ACTIVE_ICON = 'border border-primary bg-primary/10 text-primary';

// "mehr" nur zeigen, wenn der Text wirklich abgeschnitten ist. Die Zeichenzahl
// taugt dafuer nicht - die Spalte ist mal breit, mal schmal, und dieselben
// 80 Zeichen passen am Desktop rein und mobil nicht.
const ActivityText: React.FC<{
  text: string;
  expanded: boolean;
  onToggle: () => void;
  moreLabel: string;
  lessLabel: string;
}> = ({ text, expanded, onToggle, moreLabel, lessLabel }) => {
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    // Ausgeklappt ist nichts mehr abgeschnitten - dann bliebe kein Weg zurueck.
    if (!el || expanded) return;
    const check = () => setClipped(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <span
        ref={ref}
        className={`min-w-0 text-sm text-muted leading-[1.45] lg:leading-normal ${
          expanded ? 'flex-1 whitespace-pre-wrap wrap-break-word' : 'line-clamp-2 lg:line-clamp-none lg:truncate'
        }`}
      >
        {text}
      </span>
      {(clipped || expanded) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="self-start flex-none text-[13px] lg:text-sm font-semibold text-primary hover:text-primary-dark"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
};

const TimeTable: React.FC<TimeTableProps> = ({ entries, isLoading = false, onEdit, isExportOpen, onCloseExport, onOpenExport, className = '', menuButton }) => {
  const { settings, t, locale } = useAppContext();

  const ROW_GRID = `${ROW_GRID_BASE} ${settings.timeFormat === '12h' ? ROW_GRID_12H : ROW_GRID_24H}`;

  const [searchTerm, setSearchTerm] = useState('');
  // Mobil steht statt der Leiste nur eine Lupe - die Leiste kostete dauerhaft
  // 46px plus Abstand, obwohl selten gesucht wird. Ab lg steht sie wie bisher.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Dasselbe fuer die Zeitraum-Pillen. Anders als die Suche wird der Zeitraum
  // beim Zuklappen NICHT zurueckgesetzt - den will man ja behalten. Damit er
  // nicht unsichtbar weiterfiltert, bleibt die Blaetter-Zeile stehen und der
  // Knopf faerbt sich, solange etwas anderes als "Alle" gewaehlt ist.
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  // Bezugspunkt des Zeitraums - damit laesst sich auch rueckwaerts blaettern,
  // vorher zeigte "Woche" immer nur die laufende.
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  // Wie viele Zeilen im DOM stehen. Jede Aenderung an Suche, Zeitraum oder
  // Ausklappen rendert alle sichtbaren Zeilen neu - bei ein paar tausend
  // Eintraegen dauert das pro Tastenanschlag hunderte Millisekunden.
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExpandedActivities({});
    setLimit(PAGE);
  }, [searchTerm, period, anchor]);

  // Aufgeklappt heisst tippbereit - sonst waere der Knopf zwei Handgriffe.
  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  // Klappt nur die Leiste ein, der Begriff bleibt stehen - so laesst sich der
  // Platz zurueckgewinnen, ohne die Suche aufzugeben. Dass sie weiterlaeuft,
  // zeigt der gefaerbte Knopf; leergeraeumt wird ueber das Kreuz im Feld.
  const toggleSearch = () => setIsSearchOpen(open => !open);

  const bounds = useMemo(() => {
    if (period === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
    if (period === 'week') return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
    if (period === 'month') return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    if (period === 'year') return { from: startOfYear(anchor), to: endOfYear(anchor) };
    return null;
  }, [period, anchor]);

  const filteredEntries = useMemo(() => {
    const needle = searchTerm.toLowerCase();

    return entries
      .filter(entry => {
        const textMatch = entry.client.toLowerCase().includes(needle)
          || entry.activity.toLowerCase().includes(needle);
        if (!textMatch) return false;
        if (bounds && (entry.start < bounds.from.getTime() || entry.start > bounds.to.getTime())) return false;
        return true;
      })
      .sort((a, b) => b.start - a.start);
  }, [entries, searchTerm, bounds]);

  const step = (direction: 1 | -1) => {
    if (period === 'day') setAnchor(addDays(anchor, direction));
    else if (period === 'week') setAnchor(addWeeks(anchor, direction));
    else if (period === 'month') setAnchor(addMonths(anchor, direction));
    else if (period === 'year') setAnchor(addYears(anchor, direction));
  };

  const periodLabel = () => {
    if (period === 'day') {
      return isToday(anchor) ? t('today') : format(anchor, 'EEE, dd.MM.yyyy', { locale });
    }
    if (period === 'week') {
      const { from, to } = bounds!;
      return `${format(from, 'dd.MM.')} – ${format(to, 'dd.MM.yyyy')}`;
    }
    if (period === 'year') return format(anchor, 'yyyy');
    return format(anchor, 'LLLL yyyy', { locale });
  };

  // Nur diese Zeilen stehen im DOM - Summen und Export nutzen weiter die
  // vollstaendige Liste.
  const visibleEntries = useMemo(() => filteredEntries.slice(0, limit), [filteredEntries, limit]);
  const hidden = filteredEntries.length - visibleEntries.length;

  // Der Verlauf ist nach Tagen gruppiert, jede Gruppe trägt ihre eigene Summe.
  const dayGroups = useMemo(() => {
    const groups: { key: string; label: string; total: number; items: TimeEntry[] }[] = [];
    for (const entry of visibleEntries) {
      const key = format(new Date(entry.start), 'yyyy-MM-dd');
      let group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        group = {
          key,
          label: format(new Date(entry.start), 'EEEE, dd.MM.yyyy', { locale }),
          total: 0,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(entry);
      group.total += entryDuration(entry, settings);
    }
    return groups;
  }, [visibleEntries, locale, settings]);

  const grandTotal = useMemo(
    () => filteredEntries.reduce((acc, e) => acc + entryDuration(e, settings), 0),
    [filteredEntries, settings]
  );

  const handleExport = (exportOptions: ExportOptions) => {
    const { format: fileFormat, type, startDate: start, endDate: end, timesOnly, showCreatedAt, sortDesc } = exportOptions;

    let entriesToExport: TimeEntry[];

    if (type === 'currentView') {
      entriesToExport = [...filteredEntries];
    } else {
      if (!start || !end) {
          onCloseExport();
          return;
      }
      const startDate = startOfDay(parseISO(start));
      const endDate = endOfDay(parseISO(end));

      entriesToExport = entries.filter(entry => {
          const entryDate = new Date(entry.start);
          return entryDate >= startDate && entryDate <= endDate;
      });
    }

    // Reihenfolge der Ausgabe. PDF und CSV uebernehmen sie unveraendert.
    entriesToExport.sort((a, b) => sortDesc ? b.start - a.start : a.start - b.start);

    if (fileFormat === 'csv') {
      exportToCsv(entriesToExport, settings, t, timesOnly);
    } else {
      exportToPdf(entriesToExport, { timesOnly, showCreatedAt }, settings, t);
    }

    onCloseExport();
  };

  const toggleActivityExpansion = (id: string) => {
    setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabs: { value: Period; label: string }[] = [
    { value: 'all', label: t('tabAll') },
    { value: 'day', label: t('tabDay') },
    { value: 'week', label: t('tabWeek') },
    { value: 'month', label: t('tabMonth') },
    { value: 'year', label: t('tabYear') },
  ];

  return (
    <>
    <section className={`${className} flex-1 min-h-0 flex-col overflow-hidden`}>
      <div className="flex-none lg:border-l border-divider px-5 lg:px-7 pt-3 lg:pt-6 pb-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-3.5">
        <div className="flex items-center justify-between gap-3 lg:mr-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            {menuButton}
            <h2 className="min-w-0 truncate text-[28px] lg:text-[22px] font-semibold text-light tracking-[-0.02em] lg:tracking-tight">{t('history')}</h2>
          </div>
          {/* Suche, Filter und Export als Symbole - jede dieser Leisten kostete
              mobil dauerhaft Hoehe, obwohl man sie selten braucht. Die
              Wochensumme steht hier nicht mehr daneben: mit drei Knoepfen
              blieb fuer die Ueberschrift nur noch "Verl..." uebrig, und auf dem
              Erfassen-Tab steht sie ohnehin doppelt. */}
          <div className="lg:hidden flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={toggleSearch}
              aria-label={isSearchOpen ? t('close') : t('search')}
              aria-expanded={isSearchOpen}
              // Immer die Lupe, nie ein Kreuz: das Kreuz im Feld raeumt den
              // Begriff weg, dieser Knopf klappt nur die Leiste ein. Zwei
              // Kreuze nebeneinander waeren nicht auseinanderzuhalten.
              className={`w-[38px] h-[38px] flex-none rounded-[12px] flex items-center justify-center transition-colors ${
                searchTerm ? ACTIVE_ICON : CARD_BUTTON
              }`}
            >
              <Search size={17} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(open => !open)}
              aria-label={t('period')}
              aria-expanded={isFilterOpen}
              className={`w-[38px] h-[38px] flex-none rounded-[12px] flex items-center justify-center transition-colors ${
                period === 'all' ? CARD_BUTTON : ACTIVE_ICON
              }`}
            >
              <SlidersHorizontal size={17} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onOpenExport}
              aria-label={t('exportModalTitle')}
              className={`w-[38px] h-[38px] flex-none rounded-[12px] flex items-center justify-center ${CARD_BUTTON}`}
            >
              <Download size={17} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Mobil nur sichtbar, wenn die Lupe sie aufgeklappt hat; ab lg immer. */}
        <div className={`${isSearchOpen ? 'block' : 'hidden'} lg:block relative lg:w-[280px]`}>
          <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-[46px] lg:h-10 pl-9 pr-10 bg-card border border-border-color rounded-md lg:rounded-[13px] text-[15px] lg:text-sm transition"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label={t('clearSearch')}
              onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-dim hover:text-light hover:bg-elevated transition-colors"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Mobil einzelne Pillen wie in der Vorlage, ab lg der Segmented Control.
            Unter lg nur sichtbar, wenn der Filterknopf sie aufgeklappt hat. */}
        <Segmented
          pills
          className={`${isFilterOpen ? '' : 'max-lg:hidden'} lg:bg-card`}
          ariaLabel={t('period')}
          value={period}
          onChange={setPeriod}
          options={tabs}
        />

        {/* Zeitraum blaettern oder direkt anspringen; "Alle" braucht das nicht. */}
        {period !== 'all' && (
          <div className="flex items-center gap-1 p-1 bg-card border border-border-color rounded-[13px]">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t('previous')}
              className="w-8 h-8 rounded-[9px] flex items-center justify-center text-muted hover:text-light hover:bg-elevated"
            >
              <ChevronLeft size={16} />
            </button>
            {/* Jahre nur ueber die Pfeile: ein Panel dafuer waere ein Raster aus
                Jahreszahlen, und die paar Jahre eines Zeitkontos sind mit ein,
                zwei Klicks erreicht. Lieber gar kein Knopf als ein toter. */}
            {period === 'year' ? (
              // flex-1 nur mobil: dort ist der Kasten so breit wie die Spalte und
              // die Beschriftung klebte sonst links am Pfeil. Ab lg ist er so
              // breit wie sein Inhalt, da gibt es nichts zu verteilen.
              <span className="flex-1 lg:flex-none h-8 px-3 flex items-center justify-center text-sm font-semibold text-light whitespace-nowrap">
                {periodLabel()}
              </span>
            ) : (
              <PickerField
                mode={period === 'month' ? 'month' : 'date'}
                align="right"
                // Nicht t('month'): der Monat-Tab heisst schon so, zwei Bedienelemente
                // duerfen nicht denselben Namen tragen.
                ariaLabel={t('period')}
                label={periodLabel()}
                value={format(anchor, period === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd')}
                onChange={(v) => setAnchor(parse(v, period === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd', new Date()))}
                className="flex-1 lg:flex-none h-8 px-3 rounded-[9px] text-sm font-semibold text-light text-center whitespace-nowrap hover:bg-elevated"
              />
            )}
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t('next')}
              className="w-8 h-8 rounded-[9px] flex items-center justify-center text-muted hover:text-light hover:bg-elevated"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto lg:border-l border-divider px-5 lg:px-7 pb-6">
        {/* Spaltenkopf gehoert in den Scrollbereich, sonst steht er um die Breite
            der Scrollleiste neben den Spalten. Nur Desktop - mobil stehen die
            Felder untereinander. */}
        <div className={`${ROW_GRID} hidden lg:grid sticky top-0 z-10 items-center bg-darker pt-4 pb-2`}>
          {/* Ueber die Zeitstrahl-Spalte hinweg, damit die Beschriftung buendig
              mit "Verlauf" steht statt um den Strahl eingerueckt. */}
          <span className={`${SECTION_LABEL} col-span-2`}>{t('period')}</span>
          <span className={SECTION_LABEL}>{t('thClient')}</span>
          <span className={SECTION_LABEL}>{t('thActivity')}</span>
          <span className={`${SECTION_LABEL} text-right`}>{t('thDuration')}</span>
        </div>

        {dayGroups.length === 0 && (
          <div className="text-center py-16 text-muted">
            {isLoading ? t('loading') : t('noEntriesFound')}
          </div>
        )}

        {dayGroups.map(group => (
          <div key={group.key}>
            {/* Klebt beim Scrollen unter dem Spaltenkopf (40px hoch, nur ab lg)
                und wird von der naechsten Gruppe weggeschoben - sticky bleibt
                immer innerhalb des eigenen Eltern-Blocks. z unter dem
                Spaltenkopf, damit der obenauf bleibt. */}
            <div className={`${settings.stickyDayHeaders ? 'sticky top-0 lg:top-10 z-5 bg-darker ' : ''}flex items-center gap-3.5 pt-0.5 pb-2.5 lg:pt-3.5 lg:pb-2.5`}>
              <span className="text-xs lg:text-[13px] font-bold uppercase tracking-[0.12em] text-muted">{group.label}</span>
              <span className="flex-1 h-px bg-divider" />
            </div>

            {group.items.map((entry, index) => {
              const duration = entryDuration(entry, settings);
              const isExpanded = !!expandedActivities[entry.id];
              const isFirst = index === 0;
              const isLast = index === group.items.length - 1;

              return (
                // Flaeche per negativem Rand verbreitert, damit der Hover nicht
                // am Text klebt - die Inhalte stehen weiterhin an derselben Stelle.
                // Die Zeile ist selbst der Knopf, sonst gaebe es keinen Weg per
                // Tastatur zum Bearbeiten.
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onEdit(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(entry); }
                  }}
                  className={`${ROW_GRID} grid items-start -mx-3 px-3 pb-[18px] lg:py-3.5 rounded-[10px] cursor-pointer hover:bg-elevated focus-visible:bg-elevated outline-none transition-colors`}
                >
                  {/* Zeitstrahl: Punkt plus Linie zum vorigen/naechsten Eintrag des Tages.
                      self-stretch ist noetig, sonst zieht das items-start der Zeile
                      den Strahl auf Inhaltshoehe zusammen und das flex-1 der Linie
                      hat nichts, worin es wachsen koennte - mobil fehlte sie deshalb.
                      Der negative Rand unten ueberbrueckt den Zeilenabstand bis zum
                      naechsten Punkt; ab lg uebernimmt das -my-3.5. */}
                  <div className="row-span-3 lg:row-span-1 lg:row-start-1 lg:col-start-1 self-stretch -mb-[18px] lg:-my-3.5 flex flex-col items-center">
                    {/* Stummel ueber dem Punkt: mobil genau die 6px, die vorher als
                        mt-1.5 am Punkt hingen - so bleibt er auf Höhe des Kundennamens. */}
                    <span className={`w-0.5 h-1.5 lg:h-5 ${isFirst ? 'bg-transparent' : 'bg-border-color'}`} />
                    <span className={`flex-none w-2.5 h-2.5 lg:w-[11px] lg:h-[11px] rounded-full ${
                      entry === visibleEntries[0]
                        ? 'bg-primary shadow-[0_0_0_4px_rgba(245,192,101,0.14)]'
                        : 'border-2 border-[#3c424a] bg-darker'
                    }`} />
                    <span className={`flex-1 w-0.5 mt-0.5 ${isLast ? 'bg-transparent' : 'bg-border-color'}`} />
                  </div>

                  <span className="col-start-2 lg:row-start-1 lg:col-start-3 min-w-0 text-base lg:text-[15px] font-semibold text-light wrap-break-word lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap">
                    {entry.client}
                  </span>

                  <span className="col-start-3 lg:row-start-1 lg:col-start-5 text-base lg:text-[17px] font-mono tnum font-bold text-light text-right">
                    {formatDuration(duration)}
                  </span>

                  {/* "mehr" steht mobil auf eigener Zeile, am Desktop hinter dem Text. */}
                  <div className="col-start-2 col-span-2 lg:row-start-1 lg:col-start-4 lg:col-span-1 flex flex-col lg:flex-row lg:items-baseline gap-[5px] lg:gap-2.5 min-w-0 mt-[5px] lg:mt-0">
                    <ActivityText
                      text={entry.activity}
                      expanded={isExpanded}
                      onToggle={() => toggleActivityExpansion(entry.id)}
                      moreLabel={t('more')}
                      lessLabel={t('less')}
                    />
                  </div>

                  <span className="col-start-2 col-span-2 lg:row-start-1 lg:col-start-2 lg:col-span-1 lg:whitespace-nowrap text-xs lg:text-[13px] font-mono tnum text-dim lg:text-muted mt-[5px] lg:mt-0 lg:pt-px">
                    {formatClock(entry.start, settings)} – {entry.end ? formatClock(entry.end, settings) : '...'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Der Rest kommt auf Knopfdruck. Die Gesamtsumme unten zaehlt ihn
            ohnehin schon mit, hier fehlen nur die Zeilen. */}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setLimit(l => l + PAGE)}
            className="w-full h-11 mt-2 rounded-[12px] border border-border-color bg-card text-[15px] font-semibold text-primary hover:bg-elevated transition-colors"
          >
            {t('showMore', { count: hidden })}
          </button>
        )}
      </div>

      {/* Die Summe gehoert zum Filter darueber - ohne sie muesste man mobil im Kopf
          addieren, was am Desktop die Fusszeile erledigt. */}
      <div className="flex flex-none h-14 lg:h-16 border-t border-divider bg-dark items-center justify-end gap-[18px] px-5 lg:px-7">
        <span className="text-sm font-semibold text-muted">{t('totalDuration')}</span>
        <span className="text-xl font-mono tnum font-bold text-light">{formatDuration(grandTotal)}</span>
      </div>

    </section>
    {/* Ausserhalb der Sektion: unter lg blendet der Tab-Wechsel sie aus, und
        ein Dialog in einem display:none-Baum waere unsichtbar. */}
    {isExportOpen && (
      <ExportModal
        onClose={onCloseExport}
        onExport={handleExport}
        summary={`${t('exportEntriesCount', { count: filteredEntries.length })} · ${formatDuration(grandTotal)}`}
      />
    )}
    </>
  );
};

export default TimeTable;
