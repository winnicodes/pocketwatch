import React, { useState, useMemo } from 'react';
import type { TimeEntry } from '../types';
import { format } from 'date-fns/format';
import { useAppContext } from '../contexts/AppContext';
import { parseEntryTimes, formatDuration, entryDuration } from '../entryTimes';
import { X, ChevronLeft, Trash2 } from 'lucide-react';
import PickerBox from './PickerBox';
import { CARD_BUTTON, SECTION_LABEL, PRIMARY_BUTTON, MODAL_BACKDROP } from '../ui';
import { useEscape } from '../hooks/useEscape';
import ClientInput from './ClientInput';
import ConfirmDialog from './ConfirmDialog';

interface EditModalProps {
  entry: TimeEntry;
  onClose: () => void;
  onSave: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  clients: string[];
}

const EditModal: React.FC<EditModalProps> = ({ entry, onClose, onSave, onDelete, clients }) => {
  const { t, settings, locale } = useAppContext();

  const initial = useMemo(() => ({
    client: entry.client,
    activity: entry.activity,
    startDate: format(new Date(entry.start), "yyyy-MM-dd"),
    startTime: format(new Date(entry.start), "HH:mm"),
    endDate: entry.end ? format(new Date(entry.end), "yyyy-MM-dd") : '',
    endTime: entry.end ? format(new Date(entry.end), "HH:mm") : '',
  }), [entry]);

  const [formData, setFormData] = useState(initial);
  const [askDiscard, setAskDiscard] = useState(false);

  const dirty = JSON.stringify(formData) !== JSON.stringify(initial);

  const requestClose = () => (dirty ? setAskDiscard(true) : onClose());

  // Next frame: Chromium CloseWatcher closes a dialog opened by the same Escape.
  useEscape(() => requestAnimationFrame(requestClose));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const times = parseEntryTimes(formData);
    if (!times.ok) {
      alert(t(times.error));
      return;
    }

    onSave({
      ...entry,
      client: formData.client,
      activity: formData.activity,
      start: times.value.start,
      end: times.value.end,
    });
  };

  const setField = (name: string) => (v: string) => setFormData(prev => ({ ...prev, [name]: v }));

  const hasDuration = entry.end !== null;

  const timeRow = (label: string, dateField: string, timeField: string) => (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL}>{label}</span>
      <div className="flex gap-2">
        <PickerBox
          mode="date"
          className="flex-1 min-w-0"
          value={formData[dateField as keyof typeof formData]}
          onChange={setField(dateField)}
          placeholder="—"
          ariaLabel={t(dateField)}
        />
        <PickerBox
          mode="time"
          className={`flex-none ${settings.timeFormat === '12h' ? 'w-[132px]' : 'w-[104px]'}`}
          value={formData[timeField as keyof typeof formData]}
          onChange={setField(timeField)}
          placeholder="—"
          ariaLabel={t(timeField)}
        />
      </div>
    </div>
  );

  return (
    <div className={MODAL_BACKDROP}>
      <div
        className="flex-1 min-h-0 flex flex-col lg:flex-none lg:w-[960px] lg:max-w-[calc(100vw-3rem)] lg:bg-dark lg:border lg:border-active lg:rounded-[20px] lg:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] lg:overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-none flex justify-between items-center lg:items-start gap-3 lg:gap-5 px-5 pt-1.5 pb-3.5 lg:px-[30px] lg:pt-[26px] lg:pb-[22px] lg:border-b lg:border-divider">
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('close')}
            className="lg:hidden w-[38px] h-[38px] flex-none rounded-[12px] border border-border-color bg-card flex items-center justify-center text-light"
          >
            <ChevronLeft size={17} strokeWidth={2} />
          </button>
          <div className="flex flex-col gap-1 mr-auto min-w-0">
            <h2 className="text-[17px] lg:text-[22px] font-semibold text-light tracking-tight">{t('editModalTitle')}</h2>
            <span className="font-mono text-[13px] text-dim truncate">
              {format(new Date(entry.start), 'EEEE, dd.MM.yyyy', { locale })}
            </span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('close')}
            className={`hidden lg:flex w-9 h-9 flex-none rounded-[11px] items-center justify-center ${CARD_BUTTON}`}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <form id="edit-entry" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto flex flex-col lg:overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          {hasDuration && (
            <div className="flex-none flex flex-col gap-5 border-divider lg:col-start-2 lg:row-start-1 lg:border-l lg:bg-darker px-5 pt-1 pb-5 lg:px-[26px] lg:pt-[26px]">
              <div className="flex flex-col gap-1.5">
                <span className={SECTION_LABEL}>{t('thDuration')}</span>
                <span className="font-mono tnum text-[44px] font-bold text-primary tracking-[-0.03em] leading-none">
                  {formatDuration(entryDuration(entry, settings))}
                </span>
              </div>
              <span className="h-px bg-divider block" />
            </div>
          )}

          <div className="flex-none flex flex-col gap-[22px] lg:col-start-1 lg:row-start-1 lg:row-span-2 px-5 pt-1 pb-5 lg:px-[30px] lg:pt-[26px] lg:pb-[30px]">
            <div className="flex flex-col gap-2">
              <span className={SECTION_LABEL}>{t('client')}</span>
              <ClientInput
                value={formData.client}
                onChange={setField('client')}
                suggestions={clients}
                placeholder={t('clientPlaceholder')}
                ariaLabel={t('client')}
                className="h-12 px-[14px] rounded-[13px] border border-border-color bg-card text-base text-light w-full outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <span className={SECTION_LABEL}>{t('activity')}</span>
              <textarea
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                rows={3}
                aria-label={t('activity')}
                placeholder={t('activityPlaceholder')}
                className="flex-1 px-4 py-[14px] rounded-[13px] border border-border-color bg-card text-base text-light leading-[1.55] resize-none outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className={`flex-none flex flex-col gap-5 border-divider lg:col-start-2 lg:border-l lg:bg-darker px-5 pt-1 pb-5 lg:px-[26px] lg:pb-[30px] ${
            hasDuration ? 'lg:row-start-2 lg:pt-0' : 'lg:row-start-1 lg:row-span-2 lg:pt-[26px]'
          }`}>
            {timeRow(t('start'), 'startDate', 'startTime')}
            {timeRow(t('end'), 'endDate', 'endTime')}
          </div>
        </form>

        <div className="flex-none flex items-center gap-3 px-5 py-3.5 lg:px-[30px] lg:py-[18px] border-t border-divider bg-darker">
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="mr-auto h-11 px-[18px] rounded-[12px] border border-[#2e333a] bg-transparent text-muted text-[15px] font-semibold flex items-center gap-[9px] hover:border-[#5a2f33] hover:text-danger hover:bg-[#1a1315] transition-colors"
          >
            <Trash2 size={15} strokeWidth={1.8} />
            {t('delete')}
          </button>
          <button
            type="submit"
            form="edit-entry"
            className={`h-11 px-[26px] rounded-[12px] text-[15px] ${PRIMARY_BUTTON}`}
          >
            {t('save')}
          </button>
        </div>
      </div>

      {askDiscard && (
        <ConfirmDialog
          message={t('confirmDiscardChanges')}
          confirmLabel={t('discard')}
          onConfirm={onClose}
          onCancel={() => setAskDiscard(false)}
        />
      )}
    </div>
  );
};

export default EditModal;
