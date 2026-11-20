import React, { useId, useState } from 'react';

const FIELD = 'h-12 px-[15px] bg-card border border-border-color rounded-md text-[15px] transition';

const ClientInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}> = ({ value, onChange, suggestions, placeholder, ariaLabel, className = FIELD }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const needle = value.trim().toLowerCase();
  const matches = suggestions.filter(n => n.toLowerCase().includes(needle) && n !== value).slice(0, 6);
  const visible = open && matches.length > 0;

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); return; }
          if (!visible) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i <= 0 ? matches.length : i) - 1); }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); }
        }}
        className={`w-full ${className}`}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-card border border-border-color rounded-md shadow-2xl py-1.5"
        >
          {matches.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === active}
              // mousedown runs before the input blur closes the list.
              onMouseDown={(e) => { e.preventDefault(); pick(name); }}
              onMouseEnter={() => setActive(i)}
              className={`px-[15px] py-2.5 text-[15px] cursor-pointer ${
                i === active ? 'bg-elevated text-light' : 'text-muted'
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientInput;
