import React from 'react';
import { Clock, List, Settings, Menu, Github, Coffee } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { CARD_BUTTON, PRIMARY_BUTTON } from '../ui';
// Aus der package.json, nicht abgetippt - sonst steht hier irgendwann eine
// Zahl, die es nirgends sonst gibt. Rollup nimmt nur das eine Feld mit.
import { version } from '../../package.json';

export type Tab = 'track' | 'history' | 'more';

/**
 * Der Knopf, der die Schublade oeffnet - steht oben links in der Ueberschrift
 * des jeweiligen Bereichs. Bewusst kein eigener Balken dafuer: die Leiste unten
 * kostete 82px plus Safe-Area, hier kommt kein einziger Pixel Hoehe dazu.
 */
export const MenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useAppContext();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('menu')}
      aria-haspopup="dialog"
      className={`lg:hidden w-[38px] h-[38px] flex-none rounded-[12px] flex items-center justify-center ${CARD_BUTTON}`}
    >
      <Menu size={19} strokeWidth={2} />
    </button>
  );
};

/**
 * Version und Quelltext-Link. Steht mobil unten in der Schublade und am Desktop
 * unten in der Seitenleiste - deshalb ein Bauteil statt zweimal derselbe Block.
 */
export const AppFooter: React.FC<{ className?: string }> = ({ className = '' }) => (
  // Spendenlink in eigener Zeile darueber, Quelltext und Version darunter -
  // items-start, sonst zieht die Pille sich auf die volle Breite der Spalte.
  <div className={`flex flex-col items-start gap-2 ${className}`}>
    {/* Nachbau des Ko-fi-Widgets statt dessen Script von storage.ko-fi.com:
        die App laeuft self-hosted und teils ohne Internet, ein externes Script
        waere der einzige Request nach draussen - und in der Standalone-Demo
        (file://) laedt es ohnehin nicht. Gleiche Form, Amber statt Ko-fi-Blau. */}
    <a
      href="https://ko-fi.com/winnicodes"
      target="_blank"
      rel="noopener noreferrer"
      className={`h-9 px-3.5 flex-none rounded-[11px] flex items-center gap-2 text-[13px] ${PRIMARY_BUTTON}`}
    >
      <Coffee size={16} strokeWidth={2} />
      Support me on Ko-fi
    </a>
    {/* Beieinander statt auseinandergezogen: in der 400px breiten Seitenleiste
        standen die beiden Pillen mit justify-between an den Raendern und
        wirkten wie zwei unbeteiligte Elemente. */}
    <div className="flex items-center gap-2">
      <a
        href="https://github.com/winnicodes/pocketwatch"
        target="_blank"
        // noopener: ohne das kann die geoeffnete Seite ueber window.opener auf
        // diesen Tab zugreifen. noreferrer haelt zusaetzlich den Referrer zurueck.
        rel="noopener noreferrer"
        // Kein aria-label: der sichtbare Text ist schon der Name des Links, ein
        // Label wuerde ihn nur ueberschreiben.
        className={`h-9 px-3 flex-none rounded-[11px] flex items-center gap-2 text-[13px] font-medium ${CARD_BUTTON}`}
      >
        <Github size={16} strokeWidth={1.8} />
        GitHub
      </a>
      {/* Gleicher Rahmen wie der Link daneben, aber ohne dessen Hover - die
          Version ist Text, kein Bedienelement. */}
      <span className="h-9 px-3 flex-none rounded-[11px] flex items-center border border-border-color bg-card font-mono text-xs text-dim">
        v{version}
      </span>
    </div>
  </div>
);

/**
 * Navigation als Schublade von links. Natives dialog wie bei der Rueckfrage:
 * showModal() bringt Escape, Fokusfalle und inerten Hintergrund mit, statt das
 * alles von Hand nachzubauen.
 */
const NavDrawer: React.FC<{
  active: Tab;
  onChange: (tab: Tab) => void;
  onClose: () => void;
}> = ({ active, onChange, onClose }) => {
  const { t } = useAppContext();

  const items: { tab: Tab; label: string; Icon: typeof Clock }[] = [
    { tab: 'track', label: t('navTrack'), Icon: Clock },
    { tab: 'history', label: t('history'), Icon: List },
    // Heisst wie die Ueberschrift des Bereichs, zu dem er fuehrt.
    { tab: 'more', label: t('settingsTitle'), Icon: Settings },
  ];

  return (
    <dialog
      // Nicht erneut oeffnen, wenn schon offen - showModal wirft sonst.
      ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose}
      // Klick auf den Hintergrund trifft das dialog selbst, nicht seinen Inhalt.
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-label={t('menu')}
      className="m-0 mr-auto h-dvh max-h-none w-[272px] max-w-[80vw] bg-dark border-r border-divider p-0 text-light backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="h-full flex flex-col gap-1.5 px-3 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        {/* Der Name stand mobil bisher nirgends - am Desktop traegt ihn die Kopfzeile. */}
        <div className="flex-none flex items-center gap-2.5 px-2 h-[66px]">
          <img src="/pocketwatch.svg" alt="" width={22} height={22} />
          <span className="text-lg font-semibold text-light tracking-tight">pocketwatch</span>
        </div>

        {items.map(({ tab, label, Icon }) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => { onChange(tab); onClose(); }}
              className={`flex-none h-[52px] px-3 rounded-[13px] flex items-center gap-3.5 text-[15px] transition-colors ${
                isActive ? 'bg-elevated text-light font-semibold' : 'text-muted hover:bg-elevated hover:text-light'
              }`}
            >
              <Icon size={19} strokeWidth={1.8} className={isActive ? 'text-primary' : ''} />
              {label}
            </button>
          );
        })}

        <AppFooter className="mt-auto flex-none px-2 pb-3" />
      </div>
    </dialog>
  );
};

export default NavDrawer;
