import React from 'react';
import { Settings, Download } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { CARD_BUTTON } from '../ui';

interface HeaderProps {
    onOpenSettings: () => void;
    onOpenExport: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenExport }) => {
  const { t } = useAppContext();
  return (
    // Mobil trägt jeder Tab seine eigene Überschrift, die Leiste gibt es erst ab lg.
    <header className="hidden h-[66px] flex-none bg-dark border-b border-divider lg:flex items-center justify-between gap-3 px-7">
      <div className="flex items-center gap-3">
        <img src="/pocketwatch.svg" alt="" width={22} height={22} />
        <span className="text-lg font-semibold text-light tracking-tight">pocketwatch</span>
      </div>

      <div className="flex items-center gap-3.5">
        <button
          onClick={onOpenExport}
          className={`h-[38px] px-3.5 rounded-[12px] flex items-center gap-2 text-sm ${CARD_BUTTON}`}
        >
          <Download size={15} strokeWidth={2} />
          <span className="hidden sm:inline">{t('export')}</span>
        </button>
        <button
          onClick={onOpenSettings}
          className={`w-[38px] h-[38px] rounded-[12px] flex items-center justify-center ${CARD_BUTTON}`}
          aria-label={t('settingsTitle')}
        >
          <Settings size={17} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
};

export default Header;
