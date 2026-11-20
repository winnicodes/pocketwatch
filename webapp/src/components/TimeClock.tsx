import React, { useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Segmented from './Segmented';

interface TimeClockProps {
  value: string;
  onChange: (value: string) => void;
}

const FACE = 224;
const C = FACE / 2;
const RING_OUTER = 94;
const RING_INNER = 54;
const KNOB = 15;

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (v: string): [number, number] => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return [0, 0];
  return [Math.min(23, +m[1]), Math.min(59, +m[2])];
};

const angleOf = (value: number, steps: number) => (value / steps) * 2 * Math.PI - Math.PI / 2;
const posOf = (value: number, steps: number, radius: number) => {
  const a = angleOf(value, steps);
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
};

const TimeClock: React.FC<TimeClockProps> = ({ value, onChange }) => {
  const { t, settings } = useAppContext();
  const [hours, minutes] = parse(value);
  const is12h = settings.timeFormat === '12h';
  const isPm = hours >= 12;
  const to12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  const from12 = (h: number, pm = isPm) => (h % 12) + (pm ? 12 : 0);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const svgRef = useRef<SVGSVGElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);

  const valueAt = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * FACE - C;
    const y = ((clientY - rect.top) / rect.height) * FACE - C;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += 2 * Math.PI;

    if (mode === 'minutes') return Math.round((a / (2 * Math.PI)) * 60) % 60;

    const idx = Math.round((a / (2 * Math.PI)) * 12) % 12;
    if (is12h) return from12(idx === 0 ? 12 : idx);
    const inner = Math.hypot(x, y) < (RING_OUTER + RING_INNER) / 2;
    return inner ? idx + 12 : idx;
  };

  const apply = (clientX: number, clientY: number) => {
    const v = valueAt(clientX, clientY);
    if (mode === 'hours') commit(v, minutes);
    else commit(hours, v);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) apply(e.clientX, e.clientY);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (mode === 'hours') setMode('minutes');
  };

  const selected = mode === 'hours' ? hours : minutes;
  const steps = mode === 'hours' ? 12 : 60;
  const radius = mode === 'hours' && !is12h && hours >= 12 ? RING_INNER : RING_OUTER;
  const knob = posOf(mode === 'hours' ? selected % 12 : selected, steps, radius);

  const segment = (active: boolean) =>
    `w-[68px] px-2 py-1.5 rounded-[10px] text-center font-mono tnum text-[30px] leading-none font-bold outline-none transition-colors ${
      active ? 'bg-primary text-on-primary caret-on-primary' : 'bg-elevated text-light caret-light hover:bg-border-color'
    }`;

  const segmentProps = (which: 'hours' | 'minutes') => {
    const hours12 = which === 'hours' && is12h;
    const max = which === 'hours' ? (is12h ? 12 : 23) : 59;
    const current = which === 'hours' ? (is12h ? to12(hours) : hours) : minutes;
    return {
      value: mode === which && draft !== null ? draft : pad(current),
      inputMode: 'numeric' as const,
      maxLength: 2,
      'aria-label': t(which),
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        setMode(which);
        setDraft(null);
        e.target.select();
      },
      onBlur: () => setDraft(null),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDraft(digits);
        if (!digits) return;
        const n = Math.min(Math.max(Number(digits), hours12 ? 1 : 0), max);
        if (which === 'hours') commit(hours12 ? from12(n) : n, minutes);
        else commit(hours, n);
        if (digits.length === 2 && which === 'hours') {
          setDraft(null);
          minuteRef.current?.focus();
        }
      },
    };
  };

  type Tick = { key: number; at: number; label: string; r: number; size: number; on: boolean; dim: boolean };

  const ticks: Tick[] = mode === 'minutes'
    ? Array.from({ length: 12 }, (_, i) => {
        const n = i * 5;
        return { key: n, at: n, label: pad(n), r: RING_OUTER, size: 14, on: n === minutes, dim: false };
      })
    : is12h
      ? Array.from({ length: 12 }, (_, i) => ({
          key: i,
          at: i,
          label: i === 0 ? '12' : String(i),
          r: RING_OUTER,
          size: 14,
          on: hours % 12 === i,
          dim: false,
        }))
      : [
          ...Array.from({ length: 12 }, (_, i) => ({
            key: i, at: i, label: String(i), r: RING_OUTER, size: 14, on: hours === i, dim: false,
          })),
          ...Array.from({ length: 12 }, (_, i) => ({
            key: i + 12, at: i, label: String(i + 12), r: RING_INNER, size: 12, on: hours === i + 12, dim: true,
          })),
        ];

  return (
    <div className="w-[248px] flex flex-col items-center gap-3">
      <div className="flex items-center gap-1.5">
        <input {...segmentProps('hours')} className={segment(mode === 'hours')} />
        <span className="font-mono text-[26px] font-bold text-dim">:</span>
        <input ref={minuteRef} {...segmentProps('minutes')} className={segment(mode === 'minutes')} />
      </div>

      {is12h && (
        <Segmented
          mono
          ariaLabel={t('dayPeriod')}
          value={isPm ? 'pm' : 'am'}
          onChange={(p) => commit(from12(to12(hours), p === 'pm'), minutes)}
          options={[{ value: 'am', label: 'AM' }, { value: 'pm', label: 'PM' }]}
        />
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${FACE} ${FACE}`}
        width={FACE}
        height={FACE}
        className="touch-none select-none cursor-pointer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <circle cx={C} cy={C} r={C - 2} className="fill-elevated" />
        <line x1={C} y1={C} x2={knob.x} y2={knob.y} className="stroke-primary" strokeWidth={2} />
        <circle cx={C} cy={C} r={3.5} className="fill-primary" />
        <circle cx={knob.x} cy={knob.y} r={KNOB} className="fill-primary" />
        {ticks.map(({ key, at, label, r, size, on, dim }) => {
          const p = posOf(at, steps, r);
          return (
            <text
              key={key}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size}
              className={`font-mono pointer-events-none ${
                on ? 'fill-on-primary font-bold' : dim ? 'fill-muted' : 'fill-light'
              }`}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default TimeClock;
