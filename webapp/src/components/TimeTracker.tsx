import React, { useState, useEffect } from 'react';
import type { TimeEntry } from '../types';
import { format } from 'date-fns/format';
import { useAppContext } from '../contexts/AppContext';
import { formatClock } from '../entryTimes';
import { Play, Square, Pencil, AlertTriangle } from 'lucide-react';
import ClientInput from './ClientInput';
import { PRIMARY_BUTTON } from '../ui';

// Ab hier ist ein laufender Timer vermutlich vergessenes Ausstempeln.
const LONG_RUN_MS = 8 * 60 * 60 * 1000;

interface TimeTrackerProps {
  isTracking: boolean;
  onStart: (client: string, activity: string) => void;
  onStop: () => void;
  currentEntry: Partial<TimeEntry> | null;
  onUpdateCurrentActivity: (activity: string) => void;
  onEditCurrent: () => void;
  todayTotal: string;
  weekTotal: string;
  clients: string[];
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ isTracking, onStart, onStop, currentEntry, onUpdateCurrentActivity, onEditCurrent, todayTotal, weekTotal, clients }) => {
  const { t, settings, locale } = useAppContext();
  const [client, setClient] = useState('');
  const [activity, setActivity] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isTracking) {
      setClient(currentEntry?.client || '');
      setActivity(currentEntry?.activity || '');
    }
  }, [isTracking, currentEntry]);

  useEffect(() => {
    let interval: number | undefined;
    if (isTracking && currentEntry?.start) {
      setElapsedTime(Date.now() - currentEntry.start);
      interval = window.setInterval(() => {
        setElapsedTime(Date.now() - currentEntry.start!);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, currentEntry]);

  const handleToggle = () => {
    if (isTracking) {
      onStop();
    } else {
      onStart(client, activity);
      setClient('');
      setActivity('');
    }
  };

  const handleActivityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newActivity = e.target.value;
    setActivity(newActivity);
    if (isTracking) {
        onUpdateCurrentActivity(newActivity);
    }
  };

  const formatElapsedTime = (milliseconds: number): string => {
    if (milliseconds < 0) milliseconds = 0;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };


  return (
    <div className="flex flex-col gap-4">
      {/* Ein Aussehen fuer beide Breiten - das der Desktopvariante. Mobil standen
          hier vorher andere Radien, Abstaende, Schriftgroessen und laufend sogar
          eine andere Kartenfarbe. */}
      <div className={`rounded-xl border p-6 flex flex-col gap-[18px] bg-card ${
        isTracking ? 'border-[#2e333a]' : 'border-border-color'
      }`}>
        {/* Zustand links, Datum rechts. Das Datum stand mobil ueber der
            Ueberschrift und wirkte dort deplatziert - hier gehoert es zum
            Zustand der Karte und kostet keine eigene Zeile. Kurzform, damit
            es neben "Laeuft seit 14:07" auch auf schmalen Geraeten passt. */}
        <div className="flex items-baseline justify-between gap-3">
          {isTracking && currentEntry?.start ? (
            <span className="flex items-center gap-2 min-w-0 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <span className="w-2 h-2 rounded-full bg-primary flex-none" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
              {t('runningSince')} {formatClock(currentEntry.start, settings)}
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t('ready')}</span>
          )}
          <span className="flex-none text-xs font-semibold uppercase tracking-[0.14em] text-dim">
            {format(new Date(), 'EEE, d. MMM', { locale })}
          </span>
        </div>

        <div className={`font-mono tnum font-bold leading-none tracking-[-0.03em] text-[56px] ${
          isTracking ? 'text-primary-dark' : 'text-light'
        }`}>
          {formatElapsedTime(elapsedTime)}
        </div>

        {isTracking ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[17px] font-semibold text-light">{currentEntry?.client}</span>
            <span
              className="text-sm leading-normal text-muted"
              style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
            >
              {currentEntry?.activity}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <ClientInput
              value={client}
              onChange={setClient}
              suggestions={clients}
              placeholder={t('clientPlaceholder')}
              ariaLabel={t('client')}
            />
            <textarea
              value={activity}
              onChange={handleActivityChange}
              placeholder={t('activityPlaceholder')}
              aria-label={t('activity')}
              rows={4}
              // Kein festes h-[52px] mehr: das ueberstimmte rows und liess mobil
              // genau eine Zeile stehen, obwohl vier angefordert waren.
              className="px-[15px] py-[13px] bg-card border border-border-color rounded-md text-[15px] leading-normal transition resize-none"
            />
          </div>
        )}

        {isTracking && settings.longRunReminder && elapsedTime > LONG_RUN_MS && (
          <span role="status" className="flex items-center gap-2 text-[13px] leading-snug text-primary">
            <AlertTriangle size={15} strokeWidth={2} className="flex-none" />
            {t('longRunWarning')}
          </span>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={handleToggle}
            className={`flex-1 h-[52px] rounded-lg text-base flex items-center justify-center gap-[9px] ${PRIMARY_BUTTON}`}
          >
            {isTracking ? <Square size={15} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isTracking ? t('clockOut') : t('clockIn')}
          </button>
          {isTracking && (
            <button
              onClick={onEditCurrent}
              aria-label={t('editModalTitle')}
              className="w-[52px] h-[52px] rounded-lg border border-[#2e333a] text-primary hover:bg-elevated transition-colors flex items-center justify-center"
            >
              <Pencil size={17} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Die Vorlage zeigt die Kacheln nur am Desktop - mobil stand die Tagessumme
          damit nirgends. Jetzt auf beiden Seiten dieselben zwei Kacheln. */}
      <div className="flex gap-3">
        <div className="flex-1 bg-card border border-border-color rounded-2xl p-[15px] flex flex-col items-center gap-[3px]">
          <span className="text-xs uppercase tracking-widest text-muted">{t('today')}</span>
          <span className="text-[21px] font-mono tnum font-bold text-light">{todayTotal}</span>
        </div>
        <div className="flex-1 bg-card border border-border-color rounded-2xl p-[15px] flex flex-col items-center gap-[3px]">
          <span className="text-xs uppercase tracking-widest text-muted">{t('tabWeek')}</span>
          <span className="text-[21px] font-mono tnum font-bold text-primary">{weekTotal}</span>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;
