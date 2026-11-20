import React from 'react';
import { useAppContext } from '../contexts/AppContext';

const ConfirmDialog: React.FC<{
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, confirmLabel, onConfirm, onCancel }) => {
  const { t } = useAppContext();

  return (
    <dialog
      ref={el => { el?.showModal(); }}
      onClose={onCancel}
      aria-label={confirmLabel}
      className="m-auto w-[min(420px,calc(100vw-2.5rem))] bg-card border border-border-color rounded-[20px] p-6 text-light backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <p className="text-base leading-normal">{message}</p>
      <div className="mt-6 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-[18px] rounded-[12px] border border-border-color text-light text-[15px] font-semibold hover:bg-elevated transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-11 px-[18px] rounded-[12px] bg-danger text-white text-[15px] font-semibold hover:brightness-110 transition"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
