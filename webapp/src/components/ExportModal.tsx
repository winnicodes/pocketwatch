import React, { useState } from 'react';
import { format } from 'date-fns/format';
import { useAppContext } from '../contexts/AppContext';
import { X, ChevronLeft, FileText, Sheet, Check, Download } from 'lucide-react';
import PickerBox from './PickerBox';
import Segmented from './Segmented';
import { CARD_BUTTON, SECTION_LABEL, PRIMARY_BUTTON, MODAL_BACKDROP } from '../ui';
import ToggleRow from './SettingRow';
import { useEscape } from '../hooks/useEscape';

export interface ExportOptions {
    format: 'pdf' | 'csv';
    type: 'dateRange' | 'currentView';
    startDate?: string;
    endDate?: string;
    timesOnly: boolean;
    showCreatedAt: boolean;
    /** Neueste zuerst statt aelteste zuerst. */
    sortDesc: boolean;
}

interface ExportModalProps {
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    /** Zeile unter dem Titel: wie viel im aktuellen Verlauf steht. */
    summary?: string;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport, summary }) => {
    const { t } = useAppContext();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [fileFormat, setFileFormat] = useState<'pdf' | 'csv'>('pdf');
    const [exportType, setExportType] = useState<'dateRange' | 'currentView'>('currentView');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [timesOnly, setTimesOnly] = useState(false);
    const [showCreatedAt, setShowCreatedAt] = useState(false);
    const [sortDesc, setSortDesc] = useState(false);

    useEscape(onClose);

    const handleExport = () => {
        if (exportType === 'dateRange') {
            if (!startDate || !endDate) {
                alert(t('alertSelectDates'));
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                alert(t('alertStartDateAfterEndDate'));
                return;
            }
            onExport({ format: fileFormat, type: 'dateRange', startDate, endDate, timesOnly, showCreatedAt, sortDesc });
        } else {
            onExport({ format: fileFormat, type: 'currentView', timesOnly, showCreatedAt, sortDesc });
        }
    };

    const isRange = exportType === 'dateRange';
    const isPdf = fileFormat === 'pdf';

    // Die Beschreibung steht nur noch im title: sichtbar bleibt das Format, wer
    // den Unterschied nicht kennt, bekommt ihn per Hover und Screenreader.
    const formatCard = (value: 'pdf' | 'csv', Icon: typeof FileText, title: string, hint: string) => {
        const on = fileFormat === value;
        return (
            <button
                type="button"
                role="radio"
                aria-checked={on}
                title={hint}
                onClick={() => setFileFormat(value)}
                // Mobil teilen sich die beiden Karten die Breite, ab lg sind sie so
                // breit wie ihr Inhalt - der Dialog ist dort viel breiter als sie.
                className={`relative flex-1 lg:flex-none lg:w-[124px] min-h-28 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-colors ${
                    on ? 'border-primary bg-primary/6' : 'border-border-color bg-card hover:border-[#3a4048]'
                }`}
            >
                <Icon size={26} strokeWidth={1.6} className={on ? 'text-primary' : 'text-muted'} />
                <span className={`text-[15px] font-semibold ${on ? 'text-light' : 'text-muted'}`}>{title}</span>
                {on && (
                    <span className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                        <Check size={11} strokeWidth={3.4} className="text-on-primary" />
                    </span>
                )}
            </button>
        );
    };

    const dateBox = (labelKey: string, value: string, onChange: (v: string) => void) => (
        // So breit wie ein Datum plus Symbol - der Dialog ist 880 breit, das Feld
        // haelt zehn Zeichen. Mobil teilen sich Von und Bis die Zeile, statt
        // untereinander umzubrechen und rechts die halbe Breite leer zu lassen.
        <div className="flex flex-col gap-[7px] flex-1 lg:flex-none w-[170px]">
            <span className="text-[13px] font-medium text-muted">{t(labelKey)}</span>
            <PickerBox mode="date" value={value} onChange={onChange} ariaLabel={t(labelKey)} />
        </div>
    );

    const toggleRow = (labelKey: string, hintKey: string, on: boolean, toggle: () => void) => (
        <ToggleRow title={t(labelKey)} desc={t(hintKey)} on={on} onToggle={toggle} />
    );

    const cta = isPdf ? t('exportPdfCta') : t('exportCsvCta');

    return (
        // Mobil ein eigener Vollbild-Screen, ab lg der Dialog - wie im Bearbeiten-Dialog.
        <div className={MODAL_BACKDROP}>
            <div className="flex-1 min-h-0 flex flex-col lg:flex-none lg:w-[880px] lg:max-w-[calc(100vw-3rem)] lg:max-h-[calc(100vh-4rem)] lg:bg-dark lg:border lg:border-active lg:rounded-xl lg:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] lg:overflow-hidden">
                <div className="flex-none flex items-center lg:items-start gap-3 lg:gap-5 px-5 pt-1.5 pb-3.5 lg:px-8 lg:pt-[26px] lg:pb-[22px] lg:border-b lg:border-divider">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('close')}
                        className="lg:hidden w-[38px] h-[38px] flex-none rounded-[12px] border border-border-color bg-card flex items-center justify-center text-light"
                    >
                        <ChevronLeft size={17} strokeWidth={2} />
                    </button>
                    <div className="flex flex-col gap-1 lg:mr-auto">
                        <h2 className="text-[17px] lg:text-[22px] font-semibold text-light tracking-tight">{t('exportModalTitle')}</h2>
                        {/* Wie viel exportiert wird, gehoert auch mobil hierher - sonst
                            druckt man den Knopf, ohne den Umfang zu kennen. */}
                        {summary && <span className="font-mono text-[13px] text-dim">{summary}</span>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('close')}
                        className={`hidden lg:flex w-9 h-9 flex-none rounded-[11px] items-center justify-center ${CARD_BUTTON}`}
                    >
                        <X size={15} strokeWidth={2} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[26px] px-5 pt-1 pb-5 lg:px-8 lg:pt-[26px] lg:pb-7">
                    {/* Format braucht nur die Breite seiner beiden Karten - der Zeitraum
                        steht daneben statt darunter, sonst bleibt rechts alles leer. */}
                    <div className="grid gap-[26px] lg:grid-cols-[auto_1fr] lg:gap-8">
                        <div className="flex flex-col gap-[11px]">
                            <span className={SECTION_LABEL}>{t('exportFormat')}</span>
                            {/* flex-1: die Karten wachsen auf die Hoehe der Zeile, die der
                                Zeitraum daneben vorgibt - so enden sie unten auf einer Linie
                                mit den Datumsfeldern, ohne dass irgendwo eine Hoehe steht,
                                die man bei jeder Textaenderung nachziehen muesste. */}
                            <div role="radiogroup" aria-label={t('exportFormat')} className="flex gap-3 flex-1">
                                {formatCard('pdf', FileText, 'PDF', t('exportPdfDesc'))}
                                {formatCard('csv', Sheet, 'CSV', t('exportCsvDesc'))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-[11px]">
                            <span className={SECTION_LABEL}>{t('period')}</span>
                            {/* self-start: die Schiene ist so breit wie ihre Knoepfe, nicht wie der Dialog. */}
                            <Segmented
                                className="bg-card self-start"
                                ariaLabel={t('period')}
                                value={exportType}
                                onChange={setExportType}
                                options={[
                                    { value: 'currentView', label: t('exportCurrentView') },
                                    { value: 'dateRange', label: t('exportDateRange') },
                                ]}
                            />
                            {/* Ohne eigenen Zeitraum gibt es nichts einzustellen. Am Desktop
                                bleibt der Platz dafuer trotzdem stehen (invisible statt
                                ausgebaut): der Dialog steht mittig, jede Hoehenaenderung
                                ruckt sonst den ganzen Inhalt. visibility:hidden nimmt die
                                Felder aus Tastatur und Screenreader, das Feld ist also
                                wirklich weg, nur der Platz bleibt. Mobil stapeln die
                                Spalten - dort waeren die reservierten 70px verschenkt. */}
                            <div className={`flex flex-wrap gap-3 mt-[3px] ${isRange ? '' : 'invisible max-lg:hidden'}`}>
                                {dateBox('exportFrom', startDate, setStartDate)}
                                {dateBox('exportTo', endDate, setEndDate)}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-[11px]">
                        <span className={SECTION_LABEL}>{t('exportContent')}</span>
                        {/* divide-y zieht die Trennlinie zwischen die Zeilen, egal wie
                            viele es sind - wie in den Einstellungen. */}
                        <div className="rounded-2xl border border-border-color bg-card overflow-hidden divide-y divide-divider">
                            {toggleRow('exportSortDesc', 'exportSortDescHint', sortDesc, () => setSortDesc(v => !v))}
                            {toggleRow('exportTimesOnly', 'exportTimesOnlyHint', timesOnly, () => setTimesOnly(v => !v))}
                            {/* Die Fusszeile gibt es nur im PDF - CSV hat keine. */}
                            {isPdf && toggleRow('exportShowCreatedAt', 'exportShowCreatedAtHint', showCreatedAt, () => setShowCreatedAt(v => !v))}
                        </div>
                    </div>
                </div>

                <div className="flex-none flex items-center gap-3.5 px-5 py-3.5 lg:px-8 lg:py-[18px] border-t border-divider bg-darker">
                    <div className="hidden lg:flex flex-col gap-0.5 mr-auto min-w-0">
                        <span className={SECTION_LABEL}>{t('exportFile')}</span>
                        <span className="font-mono text-sm text-muted truncate">pocketwatch-export-{today}.{fileFormat}</span>
                    </div>
                    {/* Kein Abbrechen: Kreuz oben und Escape schliessen den Dialog schon,
                        und der Export loescht nichts, was man zuruecknehmen muesste. */}
                    <button
                        type="button"
                        onClick={handleExport}
                        className={`flex-1 lg:flex-none h-11 px-6 rounded-[12px] text-[15px] flex items-center justify-center gap-2.5 ${PRIMARY_BUTTON}`}
                    >
                        <Download size={16} strokeWidth={2} />
                        {cta}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
