import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { X } from 'lucide-react';
import SettingsFields from './SettingsFields';
import { CARD_BUTTON, PRIMARY_BUTTON } from '../ui';
import { useEscape } from '../hooks/useEscape';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useAppContext();

  useEscape(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
      {/* Hoehe gedeckelt statt frei wachsend: mit aufgeklapptem Runden passt der
          Inhalt sonst nicht mehr auf kurze Fenster. */}
      <div className="bg-dark border border-active rounded-xl shadow-2xl w-[880px] max-w-[calc(100vw-3rem)] m-4 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="flex-none flex items-center gap-5 px-8 py-[22px] border-b border-divider">
          <h2 className="text-[22px] font-semibold text-light tracking-[-0.01em] mr-auto">{t('settingsTitle')}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className={`w-9 h-9 flex-none rounded-[11px] flex items-center justify-center ${CARD_BUTTON}`}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[26px]">
          <SettingsFields />
        </div>

        {/* Nur Schliessen: die Felder schreiben direkt in config.json, ein
            "Speichern" haette nichts zu tun und "Abbrechen" nichts zurueckzunehmen. */}
        <div className="flex-none flex justify-end px-8 py-[18px] border-t border-divider bg-darker">
          <button
            onClick={onClose}
            className={`h-11 px-[26px] rounded-lg text-[15px] ${PRIMARY_BUTTON}`}
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
