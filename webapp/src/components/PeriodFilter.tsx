import React from 'react';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { addDays } from 'date-fns/addDays';
import { addWeeks } from 'date-fns/addWeeks';
import { addMonths } from 'date-fns/addMonths';
import { addYears } from 'date-fns/addYears';
import { isToday } from 'date-fns/isToday';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { periodBounds } from '../entryTimes';
import type { Period } from '../entryTimes';
import Segmented from './Segmented';
import PickerField from './PickerField';

/**
 * Zeitraum-Auswahl: die Pillen Alle/Tag/Woche/Monat/Jahr und darunter der
 * Kasten zum Blaettern.
 *
 * Verlauf und Export-Dialog teilen sie sich. Die Pillen allein reichen nicht -
 * ohne den Kasten steht da "Woche", ohne dass jemand sieht welche, und die
 * vorige waere gar nicht erreichbar.
 */
const PeriodFilter: React.FC<{
  period: Period;
  onPeriodChange: (period: Period) => void;
  anchor: Date;
  onAnchorChange: (anchor: Date) => void;
  /** Klassen der Pillen-Schiene - der Verlauf klappt sie mobil ein. */
  railClassName?: string;
}> = ({ period, onPeriodChange, anchor, onAnchorChange, railClassName = '' }) => {
  const { t, locale } = useAppContext();

  const step = (direction: 1 | -1) => {
    if (period === 'day') onAnchorChange(addDays(anchor, direction));
    else if (period === 'week') onAnchorChange(addWeeks(anchor, direction));
    else if (period === 'month') onAnchorChange(addMonths(anchor, direction));
    else if (period === 'year') onAnchorChange(addYears(anchor, direction));
  };

  const periodLabel = () => {
    if (period === 'day') {
      return isToday(anchor) ? t('today') : format(anchor, 'EEE, dd.MM.yyyy', { locale });
    }
    if (period === 'week') {
      const { from, to } = periodBounds('week', anchor)!;
      return `${format(from, 'dd.MM.')} – ${format(to, 'dd.MM.yyyy')}`;
    }
    if (period === 'year') return format(anchor, 'yyyy');
    return format(anchor, 'LLLL yyyy', { locale });
  };

  return (
    <>
      {/* Mobil einzelne Pillen wie in der Vorlage, ab lg der Segmented Control. */}
      <Segmented
        pills
        className={`lg:bg-card ${railClassName}`}
        ariaLabel={t('period')}
        value={period}
        onChange={onPeriodChange}
        options={[
          { value: 'all', label: t('tabAll') },
          { value: 'day', label: t('tabDay') },
          { value: 'week', label: t('tabWeek') },
          { value: 'month', label: t('tabMonth') },
          { value: 'year', label: t('tabYear') },
        ]}
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
              // Bei "Woche" ist der gespeicherte Tag nur der Bezugspunkt -
              // markiert gehoert die Woche, nach der auch gefiltert wird.
              highlight={period === 'week' ? periodBounds('week', anchor)! : undefined}
              value={format(anchor, period === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd')}
              onChange={(v) => onAnchorChange(parse(v, period === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd', new Date()))}
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
    </>
  );
};

export default PeriodFilter;
