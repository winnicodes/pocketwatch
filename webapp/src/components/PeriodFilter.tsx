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

const PeriodFilter: React.FC<{
  period: Period;
  onPeriodChange: (period: Period) => void;
  anchor: Date;
  onAnchorChange: (anchor: Date) => void;
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
          {period === 'year' ? (
            <span className="flex-1 lg:flex-none h-8 px-3 flex items-center justify-center text-sm font-semibold text-light whitespace-nowrap">
              {periodLabel()}
            </span>
          ) : (
            <PickerField
              mode={period === 'month' ? 'month' : 'date'}
              align="right"
              ariaLabel={t('period')}
              label={periodLabel()}
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
