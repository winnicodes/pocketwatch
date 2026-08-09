import React from 'react';

/**
 * Beschriftung und Schalter einer Einstellungszeile - fuer Einstellungen und
 * Export-Dialog dieselben. Vorher stand beides in jeder Datei noch einmal, und
 * die Schalter waren auseinandergelaufen: 44x26 mit Rahmen hier, 50x30 ohne
 * dort. Wer eine Zeile braucht, nimmt die hier und erbt das Aussehen.
 */

/** Titel und erklaerende Zeile darunter. */
export const RowLabel: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <span className="flex flex-col gap-0.5 mr-auto min-w-0 text-left">
    <span className="text-[15px] font-medium text-light">{title}</span>
    <span className="text-[13px] text-dim">{desc}</span>
  </span>
);

/**
 * Nur die Optik - Zustand und Klick sitzen bei der Zeile, damit die ganze
 * Flaeche schaltbar bleibt und nicht nur der Knebel.
 */
export const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`relative w-11 h-[26px] rounded-full flex-none border transition-colors ${on ? 'bg-primary border-primary' : 'bg-elevated border-active'}`}>
    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${on ? 'left-[21px] bg-on-primary' : 'left-0.5 bg-light'}`} />
  </span>
);

/** Ganze Zeile als Schalter: groessere Trefferflaeche, Text ersetzt aria-label. */
const ToggleRow: React.FC<{
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  /** Nur Untergrund - verschachtelte Zeilen setzen sich damit ab. */
  className?: string;
}> = ({ title, desc, on, onToggle, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onToggle}
    className={`w-full flex items-center gap-4 px-[18px] py-[15px] hover:bg-elevated transition-colors ${className}`}
  >
    <RowLabel title={title} desc={desc} />
    <Toggle on={on} />
  </button>
);

export default ToggleRow;
