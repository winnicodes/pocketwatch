import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import PickerField from './PickerField';

const PickerBox: React.FC<{
  mode: 'date' | 'month' | 'time';
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: 'left' | 'right';
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
