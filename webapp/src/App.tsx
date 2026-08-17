import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { TimeEntry } from './types';
import { isToday } from 'date-fns/isToday';
import { isSameWeek } from 'date-fns/isSameWeek';
import { formatDuration, clientOrFallback, entryDuration } from './entryTimes';

// uuid importieren (Fix für Unraid/HTTP)
import { v4 as uuid } from 'uuid';

import { useServerArray } from './hooks/useServerArray';


import Header from './components/Header';
import TimeTracker from './components/TimeTracker';
import TimeTable from './components/TimeTable';
import EditModal from './components/EditModal';
import ConfirmDialog from './components/ConfirmDialog';
import SettingsModal from './components/SettingsModal';
import SettingsFields from './components/SettingsFields';
import NavDrawer, { MenuButton, AppFooter } from './components/NavDrawer';
import type { Tab } from './components/NavDrawer';
import { AppProvider, useAppContext } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const { t, settings } = useAppContext();
  // Unter lg zeigt die App einen Bereich zur Zeit, umgeschaltet ueber die
  // Schublade hinter dem Menueknopf; ab lg steht alles nebeneinander im Grid
  // und "tab" ist wirkungslos.
  const [tab, setTab] = useState<Tab>('track');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [timeEntries, setTimeEntries, isLoadingEntries] = useServerArray<TimeEntry>("times.json");

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<TimeEntry> | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // Export sitzt laut Design in der Kopfzeile, die Filterung dafür liegt in TimeTable.
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Lese- und Schreibfehler melden sich aus den Hooks und aus persist per
  // Ereignis. Einmal gesetzt bleibt der Hinweis stehen: sobald irgendetwas nicht
  // gespeichert wurde, ist der Stand im Browser nicht mehr der auf der Platte,
  // und das aendert sich erst durch ein Neuladen.
  const [hasStorageError, setHasStorageError] = useState(false);
  useEffect(() => {
    const onStorageError = () => setHasStorageError(true);
    window.addEventListener('pw-storage-error', onStorageError);
    return () => window.removeEventListener('pw-storage-error', onStorageError);
  }, []);

  useEffect(() => {
    const runningEntry = timeEntries.find(e => e.end === null);
    if (runningEntry) {
      setIsTracking(true);
      setCurrentEntry(runningEntry);
    } else {
      setIsTracking(false);
      setCurrentEntry(null);
    }
  }, [timeEntries]);

  const handleStartTracking = useCallback((client: string, activity: string) => {
    if (isTracking) return;

    const newEntry: TimeEntry = {
      id: uuid(),   // FIX: crypto.randomUUID() ersetzt
      start: Date.now(),
      end: null,
      client: clientOrFallback(client, t('clientFallback')),
      activity,
    };

    setIsTracking(true);
    setCurrentEntry(newEntry);

    setTimeEntries(prev =>
      [...prev, newEntry].sort((a, b) => b.start - a.start)
    );
  }, [isTracking, setTimeEntries, t]);

  const handleStopTracking = useCallback(() => {
    if (!isTracking || !currentEntry) return;

    const endTime = Date.now();

    setTimeEntries(prev =>
      prev.map(e =>
        e.id === currentEntry.id ? { ...e, end: endTime } : e
      )
    );

    setIsTracking(false);
    setCurrentEntry(null);
  }, [isTracking, currentEntry, setTimeEntries]);

  const handleUpdateCurrentActivity = useCallback((activity: string) => {
    if (!isTracking || !currentEntry) return;

    setTimeEntries(prev =>
      prev.map(e =>
        e.id === currentEntry.id ? { ...e, activity } : e
      )
    );

    setCurrentEntry(prev => prev ? { ...prev, activity } : null);
  }, [isTracking, currentEntry, setTimeEntries]);

  const handleUpdateEntry = (updatedEntry: TimeEntry) => {
    const normalized = {
      ...updatedEntry,
      client: clientOrFallback(updatedEntry.client, t('clientFallback')),
    };
    setTimeEntries(prev =>
      prev.map(e => e.id === normalized.id ? normalized : e)
    );
    setEditingEntry(null);
  };

  const confirmDelete = () => {
    setTimeEntries(prev => prev.filter(e => e.id !== deletingId));
    setDeletingId(null);
    setEditingEntry(null);
  };

  // Gemerkt, nicht bei jedem Rendern neu: sonst bekommt der Verlauf jedes Mal
  // ein frisches Array, und dessen useMemo filtert und sortiert alle Eintraege
  // erneut - bei jedem Dialog, der auf- oder zugeht, und bei jedem Tabwechsel.
  const finishedEntries = useMemo(() => timeEntries.filter(e => e.end !== null), [timeEntries]);

  // Zuletzt genutzte Kunden zuerst - Set behaelt die Reihenfolge.
  const clients = useMemo(() => [...new Set(
    [...timeEntries].sort((a, b) => b.start - a.start).map(e => e.client).filter(Boolean)
  )], [timeEntries]);

  // Summen der abgeschlossenen Einträge für Kopfzeile und Kacheln.
  const totals = useMemo(() => {
    const now = new Date();
    let today = 0;
    let week = 0;
    for (const e of timeEntries) {
      if (e.end === null) continue;
      const duration = entryDuration(e, settings);
      if (isToday(e.start)) today += duration;
      if (isSameWeek(e.start, now, { weekStartsOn: 1 })) week += duration;
    }
    return { today: formatDuration(today), week: formatDuration(week) };
  }, [timeEntries, settings]);


  // Panes werden immer gerendert; unter lg entscheidet der Tab, ab lg stehen
  // beide nebeneinander im Grid.
  const paneVisibility = (owner: Tab) => `${tab === owner ? 'flex' : 'hidden'} lg:flex`;

  return (
    // Eine App-Fläche über die volle Höhe: Kopfzeile (Desktop) bzw. Tab-Leiste
    // (Mobil) stehen fest, dazwischen scrollt der jeweilige Bereich für sich.
    // Das Safe-Area-Polster unten hing bisher an der Tab-Leiste. Ohne sie muss
    // es hierher, sonst laeuft die Summenzeile unter den Home-Indicator.
    <div className="h-dvh overflow-hidden flex flex-col bg-darker text-light font-sans pb-[env(safe-area-inset-bottom,0px)] lg:pb-0">
      {/* Danger auf Card statt weiss auf Rot: die dunkle Variante traegt den
          Kontrast fuer Fliesstext, die helle nicht. */}
      {hasStorageError && (
        <div role="alert" className="flex-none bg-card text-danger border-b border-divider px-5 py-2.5 text-sm text-center">
          {t('storageError')}
        </div>
      )}
      <Header
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[400px_1fr]">
        {/* Die Trennlinie zieht der Verlauf als border-l, nicht die Sidebar als
            border-r: sonst laeuft sie neben der Summenzeile weiter bis zum
            Fensterboden, statt an deren Oberkante zu enden. */}
        {/* flex-1: als Flex-Element waechst die Flaeche sonst nicht ueber ihren
            Inhalt hinaus, und unter ihr kam die dunklere Wurzelfarbe durch - im
            Bild zwei Hintergruende. Ab lg ist sie ein Grid-Element und fuellt
            ohnehin, dort ist flex-1 wirkungslos. */}
        <aside className={`${paneVisibility('track')} flex-1 flex-col gap-[18px] bg-dark pt-3 px-5 pb-5 lg:p-[26px] min-h-0 overflow-y-auto`}>
          {/* Gleicher Aufbau wie die Ueberschriften von Verlauf und Einstellungen:
              Menueknopf, Titel. Das Datum sitzt jetzt in der Karte, wo es zum
              Zustand gehoert, statt als Zeile ueber dem Titel zu schweben. */}
          <div className="lg:hidden flex items-center gap-2.5 min-w-0">
            <MenuButton onClick={() => setIsMenuOpen(true)} />
            <span className="min-w-0 truncate text-[28px] font-semibold text-light tracking-[-0.02em]">{t('navTrack')}</span>
          </div>
          <TimeTracker
            isTracking={isTracking}
            onStart={handleStartTracking}
            onStop={handleStopTracking}
            currentEntry={currentEntry}
            onUpdateCurrentActivity={handleUpdateCurrentActivity}
            onEditCurrent={() => currentEntry && setEditingEntry(currentEntry as TimeEntry)}
            todayTotal={totals.today}
            weekTotal={totals.week}
            clients={clients}
          />
          {/* Nur am Desktop: mobil steht derselbe Block unten in der Schublade.
              max-lg:hidden statt "hidden lg:flex", weil das Bauteil sein eigenes
              display mitbringt - eine Variante schlaegt es sicher, ein zweites
              unpraefigiertes display nicht zwingend. */}
          <AppFooter className="max-lg:hidden mt-auto flex-none pt-2" />
        </aside>

        <TimeTable
          className={paneVisibility('history')}
          entries={finishedEntries}
          isLoading={isLoadingEntries}
          onEdit={setEditingEntry}
          isExportOpen={isExportModalOpen}
          onCloseExport={() => setIsExportModalOpen(false)}
          onOpenExport={() => setIsExportModalOpen(true)}
          menuButton={<MenuButton onClick={() => setIsMenuOpen(true)} />}
        />

        {/* "Mehr" existiert nur mobil - am Desktop sitzen die Einstellungen im Zahnrad. */}
        <section className={`${tab === 'more' ? 'flex' : 'hidden'} lg:hidden flex-col gap-4 pt-3 px-5 pb-5 min-h-0 overflow-y-auto`}>
          {/* flex-none an jedem Kind: der Bereich scrollt, und was scrollt, darf
              nicht schrumpfen. Ohne das quetscht der Flexbox-Umbruch die letzte
              Karte auf ihre Raender zusammen (2px statt 56) und der Einstieg zum
              Export war mobil nicht mehr erreichbar. */}
          <div className="flex-none flex items-center gap-2.5">
            <MenuButton onClick={() => setIsMenuOpen(true)} />
            <span className="text-[28px] font-semibold text-light tracking-[-0.02em]">{t('settingsTitle')}</span>
          </div>
          {/* Der Export sitzt jetzt als Symbol im Verlauf - dort steht auch die
              Auswahl, die er exportiert. */}
          <div className="flex-none"><SettingsFields /></div>
        </section>
      </div>
      {isMenuOpen && (
        <NavDrawer active={tab} onChange={setTab} onClose={() => setIsMenuOpen(false)} />
      )}
      {editingEntry && (
        <EditModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleUpdateEntry}
          onDelete={setDeletingId}
          clients={clients}
        />
      )}
      {deletingId && (
        <ConfirmDialog
          message={t('confirmDeleteEntry')}
          confirmLabel={t('delete')}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
