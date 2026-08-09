import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import PickerField from './PickerField';

/**
 * Datum oder Uhrzeit als umrandetes Feld - das Standardaussehen fuer beides.
 * Vorher stand dieselbe Klassenkette in jedem Dialog noch einmal, und sie lief
 * auseinander: der eine faerbte beim Hover die Flaeche, der andere gar nichts.
 *
 * Hover faerbt die Flaeche, nicht den Rahmen: der zeigt schon Fokus und
 * geoeffnetes Panel, ein dritter Wert darauf wuerde sich mit beiden beissen.
 */
const PickerBox: React.FC<{
  mode: 'date' | 'month' | 'time';
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: 'left' | 'right';
  /** Nur Breite und Position - das Aussehen kommt von hier. */
  className?: string;
}> = ({ mode, className = '', ...picker }) => {
  const Icon = mode === 'time' ? Clock : Calendar;
  return (
    <div className={`h-11 rounded-[12px] border border-border-color bg-card hover:bg-elevated flex items-center gap-[9px] px-3 focus-within:border-primary has-[[aria-expanded=true]]:border-primary transition-colors ${className}`}>
      <Icon size={15} strokeWidth={1.8} className="text-dim flex-none" />
      <PickerField
        mode={mode}
        {...picker}
        className="flex-1 min-w-0 h-full text-left font-mono tnum text-[15px] text-light"
      />
    </div>
  );
};

export default PickerBox;
