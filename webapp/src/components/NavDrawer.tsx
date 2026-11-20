import React from 'react';
import { Clock, List, Settings, Menu, Coffee } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { CARD_BUTTON, PRIMARY_BUTTON } from '../ui';
import { version } from '../../package.json';

export type Tab = 'track' | 'history' | 'more';

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

export const AppFooter: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col items-start gap-2 ${className}`}>
    <a
      href="https://ko-fi.com/winnicodes"
      target="_blank"
      rel="noopener noreferrer"
      className={`h-9 px-3.5 flex-none rounded-[11px] flex items-center gap-2 text-[13px] ${PRIMARY_BUTTON}`}
    >
      <Coffee size={16} strokeWidth={2} />
      Buy me a coffee
    </a>
    <div className="flex items-center gap-2">
      <a
        href="https://github.com/winnicodes/pocketwatch"
        target="_blank"
        rel="noopener noreferrer"
        className={`h-9 px-3 flex-none rounded-[11px] flex items-center gap-2 text-[13px] font-medium ${CARD_BUTTON}`}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
        GitHub
      </a>
      <span className="h-9 px-3 flex-none rounded-[11px] flex items-center border border-border-color bg-card font-mono text-xs text-dim">
        v{version}
      </span>
    </div>
  </div>
);

const NavDrawer: React.FC<{
  active: Tab;
  onChange: (tab: Tab) => void;
  onClose: () => void;
}> = ({ active, onChange, onClose }) => {
  const { t } = useAppContext();

  const items: { tab: Tab; label: string; Icon: typeof Clock }[] = [
    { tab: 'track', label: t('navTrack'), Icon: Clock },
    { tab: 'history', label: t('history'), Icon: List },
    { tab: 'more', label: t('settingsTitle'), Icon: Settings },
  ];

  return (
    <dialog
      ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-label={t('menu')}
      className="m-0 mr-auto h-dvh max-h-none w-[272px] max-w-[80vw] bg-dark border-r border-divider p-0 text-light backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="h-full flex flex-col gap-1.5 px-3 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
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
