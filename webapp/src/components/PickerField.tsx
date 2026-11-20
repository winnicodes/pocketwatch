import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { addYears } from 'date-fns/addYears';
import { isSameMonth } from 'date-fns/isSameMonth';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { formatClock } from '../entryTimes';
import TimeClock from './TimeClock';

type Mode = 'date' | 'month' | 'time';

interface PickerFieldProps {
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  align?: 'left' | 'right';
  placeholder?: string;
  ariaLabel?: string;
  label?: string;
  highlight?: { from: Date; to: Date };
}

const PATTERN: Record<Mode, string> = { date: 'yyyy-MM-dd', month: 'yyyy-MM', time: 'HH:mm' };

const PANEL = 'bg-card border border-border-color rounded-[18px] shadow-2xl p-3';
const NAV = 'w-8 h-8 rounded-[10px] flex items-center justify-center text-muted hover:text-light hover:bg-elevated';

const PickerField: React.FC<PickerFieldProps> = ({
  mode, value, onChange, className = '', align = 'left', placeholder, ariaLabel, label: labelOverride, highlight,
}) => {
  const { t, locale, settings } = useAppContext();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = value ? parse(value, PATTERN[mode], new Date()) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime());
  const [view, setView] = useState<Date>(valid ? parsed : new Date());

  useEffect(() => {
    if (open && valid) setView(parsed);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const w = panelRef.current?.offsetWidth ?? 280;
      const h = panelRef.current?.offsetHeight ?? 300;
      const below = window.innerHeight - r.bottom;
      const top = below > h + 12 || r.top < h + 12 ? r.bottom + 6 : r.top - h - 6;
      let left = align === 'right' ? r.right - w : r.left;
      left = Math.min(Math.max(8, left), window.innerWidth - w - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    // Capture phase: dialogs stop propagation.
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const commit = (d: Date) => {
    onChange(format(d, PATTERN[mode]));
    setOpen(false);
  };

  const label = () => {
    if (labelOverride !== undefined) return labelOverride;
    if (!valid) return placeholder ?? '—';
    if (mode === 'date') return format(parsed, 'dd.MM.yyyy');
    if (mode === 'month') return format(parsed, 'LLLL yyyy', { locale });
    return formatClock(parsed.getTime(), settings);
  };

  const renderDate = () => (
    <DayPicker
      mode="single"
      required={false}
      selected={valid ? parsed : undefined}
      onSelect={(d) => d && commit(d)}
      month={view}
      onMonthChange={setView}
      locale={locale}
      weekStartsOn={1}
      showOutsideDays
      autoFocus
      className="pw-calendar"
      modifiers={highlight ? { pwRange: highlight } : undefined}
      modifiersClassNames={{ pwRange: 'pw-range' }}
      footer={
        <button
          type="button"
          onClick={() => commit(new Date())}
          className="mt-1 w-full h-9 rounded-[10px] text-sm font-semibold text-primary hover:bg-elevated"
        >
          {t('today')}
        </button>
      }
      components={{
        PreviousMonthButton: (props) => <button {...props} className={NAV} />,
        NextMonthButton: (props) => <button {...props} className={NAV} />,
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
      }}
    />
  );

  const renderMonth = () => (
    <div className="w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className={NAV} onClick={() => setView(addYears(view, -1))} aria-label="<">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-mono tnum font-bold text-light">{format(view, 'yyyy')}</span>
        <button type="button" className={NAV} onClick={() => setView(addYears(view, 1))} aria-label=">">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => {
          const m = new Date(view.getFullYear(), i, 1);
          const selected = valid && isSameMonth(m, parsed);
          return (
            <button
              key={i}
              type="button"
              onClick={() => commit(m)}
              className={`h-10 rounded-[10px] text-sm transition-colors ${
                selected ? 'bg-primary text-on-primary font-bold' : 'text-light hover:bg-elevated'
              }`}
            >
              {format(m, 'LLL', { locale })}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => commit(new Date())}
        className="mt-2 w-full h-9 rounded-[10px] text-sm font-semibold text-primary hover:bg-elevated"
      >
        {t('today')}
      </button>
    </div>
  );

  const renderTime = () => (
    <TimeClock value={valid ? format(parsed, PATTERN.time) : '00:00'} onChange={onChange} />
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={className}
      >
        {label()}
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          className={`fixed z-[60] ${PANEL}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {mode === 'date' ? renderDate() : mode === 'month' ? renderMonth() : renderTime()}
        </div>,
        document.body
      )}
    </>
  );
};

export default PickerField;
