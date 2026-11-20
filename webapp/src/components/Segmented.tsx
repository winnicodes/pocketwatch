const Segmented = <T extends string>({ value, options, onChange, ariaLabel, mono, pills, className = 'bg-elevated' }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  mono?: boolean;
  pills?: boolean;
  className?: string;
}) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={pills
      ? `flex gap-2 lg:gap-1 lg:p-1 lg:border lg:border-border-color lg:rounded-[13px] ${className}`
      : `flex gap-1 p-1 border border-border-color rounded-[13px] ${className}`}
  >
    {options.map(option => {
      const on = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(option.value)}
          className={`min-h-8 px-3.5 py-1.5 flex items-center justify-center text-center leading-tight rounded-[9px] text-sm transition-colors ${mono ? 'font-mono' : ''} ${
            pills ? 'min-h-9 lg:min-h-8 rounded-full lg:rounded-[9px] ' : ''
          }${
            on
              ? `text-light font-semibold ${pills ? 'bg-primary text-on-primary lg:bg-active lg:text-light' : 'bg-active'}`
              : `text-muted hover:text-light ${pills ? 'bg-card border border-border-color lg:border-0 lg:bg-transparent' : ''}`
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default Segmented;
