/**
 * Zwei bis fuenf Werte nebeneinander, einer davon an - der Filterstil aus dem
 * Verlauf. Einstellungen und Export-Dialog teilen ihn sich, sonst driften drei
 * Nachbauten desselben Knopfes auseinander.
 *
 * Bewusst kein Auswahlmenue: das native select oeffnet ein Panel des
 * Betriebssystems, das sich nicht gestalten laesst (weisser Grund, blaue
 * Markierung), und ein Nachbau waere ein Popup samt Positionierung und
 * Tastaturrollen fuer eine Handvoll Eintraege. Hier ist alles sichtbar, ein
 * Klick, nichts klappt auf.
 */
const Segmented = <T extends string>({ value, options, onChange, ariaLabel, mono, pills, className = 'bg-elevated' }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  mono?: boolean;
  /**
   * Mobil einzelne Pillen statt einer Schiene - so zeigt es die Vorlage fuer
   * den Zeitraumfilter des Verlaufs. Ab lg sieht beides gleich aus.
   */
  pills?: boolean;
  /** Untergrund der Schiene - je nachdem, worauf sie liegt - und ihre Ausrichtung. */
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
          // min-h statt h: schmale Schienen lassen lange Beschriftungen umbrechen,
          // und bei fester Hoehe stand die zweite Zeile unten aus dem Knopf heraus.
          // Der Knopf waechst jetzt mit, py haelt den Text dabei mittig.
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
