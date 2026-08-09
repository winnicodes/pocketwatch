import React, { useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Segmented from './Segmented';

interface TimeClockProps {
  /** HH:mm */
  value: string;
  onChange: (value: string) => void;
}

const FACE = 224;
const C = FACE / 2;
// Die Ringe standen 30px auseinander, der Knopf ist 2x15 gross: auf dem Telefon
// lagen 11 und 23 dadurch fast aufeinander und der Knopf deckte die Zahl des
// Innenrings zu. 40px Abstand trennt die Paare, ohne dass der Aussenring
// (94 + Knopf) ueber den Rand der Scheibe (112) laeuft.
const RING_OUTER = 94;  // Stunden 0-11 und Minuten
const RING_INNER = 54;  // Stunden 12-23
const KNOB = 15;

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (v: string): [number, number] => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return [0, 0];
  return [Math.min(23, +m[1]), Math.min(59, +m[2])];
};

/** Winkel eines Werts, 0 oben, im Uhrzeigersinn. */
const angleOf = (value: number, steps: number) => (value / steps) * 2 * Math.PI - Math.PI / 2;
const posOf = (value: number, steps: number, radius: number) => {
  const a = angleOf(value, steps);
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
};

/**
 * Analoge Uhr wie in Material: aussen 0-11, innen 12-23, danach die Minuten.
 * Selbst gebaut, weil es fuer React 19 keine gepflegte eigenstaendige Uhr gibt
 * und die einzige Alternative die komplette MUI-Laufzeit mitbraechte.
 */
const TimeClock: React.FC<TimeClockProps> = ({ value, onChange }) => {
  const { t, settings } = useAppContext();
  const [hours, minutes] = parse(value);
  // Nach aussen bleibt der Wert immer HH:mm - 12h ist reine Darstellung, sonst
  // muesste jeder Aufrufer und das Speicherformat mitziehen.
  const is12h = settings.timeFormat === '12h';
  const isPm = hours >= 12;
  /** 0..23 -> 1..12 fuer die Anzeige. */
  const to12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  /** 1..12 plus Tageshaelfte -> 0..23 zum Speichern. */
  const from12 = (h: number, pm = isPm) => (h % 12) + (pm ? 12 : 0);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const svgRef = useRef<SVGSVGElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  // Waehrend des Tippens zeigt das Feld die rohen Ziffern, sonst den Wert -
  // sonst wuerde aus einer getippten "2" sofort "02".
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);

  const valueAt = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    // Das SVG wird per viewBox skaliert, deshalb auf FACE zurueckrechnen.
    const x = ((clientX - rect.left) / rect.width) * FACE - C;
    const y = ((clientY - rect.top) / rect.height) * FACE - C;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += 2 * Math.PI;

    if (mode === 'minutes') return Math.round((a / (2 * Math.PI)) * 60) % 60;

    const idx = Math.round((a / (2 * Math.PI)) * 12) % 12;
    // 12h hat nur einen Ring: oben steht die 12, der Rest 1-11. Welche
    // Tageshaelfte gemeint ist, sagt der Schalter, nicht der Radius.
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
    // Wie in Material: nach der Stunde direkt zu den Minuten.
    if (mode === 'hours') setMode('minutes');
  };

  const selected = mode === 'hours' ? hours : minutes;
  const steps = mode === 'hours' ? 12 : 60;
  // Innenring gibt es nur bei 24h - dort sitzen die Stunden ab 12.
  const radius = mode === 'hours' && !is12h && hours >= 12 ? RING_INNER : RING_OUTER;
  const knob = posOf(mode === 'hours' ? selected % 12 : selected, steps, radius);

  // Fokus und "aktiv" fallen hier zusammen: das fokussierte Feld ist das amber
  // gefuellte. Deshalb kein zusaetzlicher Ring, der sah wie ein doppelter
  // Rahmen aus.
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
        // Wert bleibt sichtbar und markiert - die erste Ziffer ersetzt ihn.
        e.target.select();
      },
      onBlur: () => setDraft(null),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDraft(digits);
        if (!digits) return;
        // Bei 12h gibt es keine 0 auf dem Blatt - eine getippte 0 wird zur 12,
        // die Tageshaelfte bleibt dabei die eingestellte.
        const n = Math.min(Math.max(Number(digits), hours12 ? 1 : 0), max);
        if (which === 'hours') commit(hours12 ? from12(n) : n, minutes);
        else commit(hours, n);
        // Nach zwei Ziffern weiter zu den Minuten, wie beim Tippen erwartet.
        if (digits.length === 2 && which === 'hours') {
          setDraft(null);
          minuteRef.current?.focus();
        }
      },
    };
  };

  // Ein Zifferblatt in drei Ausfuehrungen. "at" ist die Position auf dem Kreis,
  // "label" der Text - bei 12h faellt beides auseinander (Position 0 zeigt 12).
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
          // Innenring 12-23 tritt zurueck, wie in der Vorlage.
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

      {/* Welche Tageshaelfte gemeint ist, steht bei 12h nicht mehr im Radius -
          also braucht es den Schalter. Segmented statt Nachbau: dieselbe
          Schiene wie in den Einstellungen. */}
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
