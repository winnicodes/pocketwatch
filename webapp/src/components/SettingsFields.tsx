import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { entryDuration, formatDuration } from '../entryTimes';
import { User, Minus, Plus } from 'lucide-react';
import Segmented from './Segmented';
import ToggleRow, { RowLabel } from './SettingRow';
import { SECTION_LABEL } from '../ui';

/**
 * Die Einstellungsfelder gibt es zweimal in der Vorlage: als Desktop-Dialog und
 * als "Mehr"-Screen der Mobilansicht. Beide rendern dieses Bauteil, damit die
 * Felder nicht auseinanderlaufen.
 */
const ROW = 'flex items-center gap-4 px-[18px] py-[15px]';
const GROUP = 'bg-card border border-border-color rounded-[16px] overflow-hidden divide-y divide-divider';

type ToggleKey = 'stickyDayHeaders' | 'rounding' | 'roundUp' | 'longRunReminder';

const SettingsFields: React.FC = () => {
  const { settings, setSettings, t } = useAppContext();

  const update = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const roundMinutes = settings.roundMinutes || 15;

  const toggleRow = (key: ToggleKey, title: string, desc: string, on: boolean, extra = '') => (
    <ToggleRow
      title={title}
      desc={desc}
      on={on}
      onToggle={() => setSettings(prev => ({ ...prev, [key]: !on }))}
      className={extra}
    />
  );

  // Intervall in Fuenferschritten, 1-60 Minuten. Groesser als eine Stunde
  // rundet ganze Arbeitstage weg, kleiner als eine Minute rundet nichts.
  const stepMinutes = (direction: 1 | -1) => {
    setSettings(prev => ({
      ...prev,
      roundMinutes: Math.min(60, Math.max(1, (prev.roundMinutes || 15) + direction * 5)),
    }));
  };

  // Minus und Plus unterscheiden sich nur in Richtung, Symbol und Beschriftung.
  const stepButton = (direction: 1 | -1, Icon: typeof Minus, label: string) => (
    <button
      type="button"
      onClick={() => stepMinutes(direction)}
      aria-label={label}
      className="w-9 h-[38px] rounded-[11px] border border-[#2e333a] bg-darker flex items-center justify-center text-light hover:border-[#3a4048] transition-colors"
    >
      <Icon size={14} strokeWidth={2.2} />
    </button>
  );

  // Beispiel statt Beschreibung: 00:37 durch dieselbe Funktion, die spaeter den
  // Verlauf rechnet - so zeigt die Vorschau nie etwas anderes als das Ergebnis.
  const example = formatDuration(entryDuration({ start: 0, end: 37 * 60000 }, { ...settings, roundMinutes }));

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-[7px]">
        <label className={SECTION_LABEL} htmlFor="name">{t('settingsNameLabel')}</label>
        <div className="h-[52px] lg:h-12 px-3.5 flex items-center gap-2.5 bg-card border border-border-color rounded-[13px] focus-within:border-primary transition-colors">
          <User size={15} strokeWidth={1.8} className="text-dim flex-none" />
          <input
            type="text"
            name="name"
            id="name"
            value={settings.name}
            onChange={update}
            placeholder={t('settingsNamePlaceholder')}
            className="flex-1 min-w-0 h-full bg-transparent border-0 text-base lg:text-[15px] outline-none"
          />
        </div>
      </div>

      {/* Gruppierte Liste wie in der Vorlage: Beschriftung links, Wert rechts. */}
      <div className="flex flex-col gap-[11px]">
        <span className={SECTION_LABEL}>{t('settingsSectionAppearance')}</span>
        <div className={GROUP}>
          <div className={ROW}>
            <RowLabel title={t('settingsLanguageLabel')} desc={t('settingsLanguageHint')} />
            <Segmented
              ariaLabel={t('settingsLanguageLabel')}
              value={settings.language}
              onChange={(language) => setSettings(prev => ({ ...prev, language }))}
              options={[
                { value: 'de', label: t('languageDe') },
                { value: 'en', label: t('languageEn') },
              ]}
            />
          </div>

          <div className={ROW}>
            <RowLabel
              title={t('settingsTimeFormatLabel')}
              desc={t(settings.timeFormat === '24h' ? 'settingsTimeFormatHint24' : 'settingsTimeFormatHint12')}
            />
            <Segmented
              mono
              ariaLabel={t('settingsTimeFormatLabel')}
              value={settings.timeFormat}
              onChange={(timeFormat) => setSettings(prev => ({ ...prev, timeFormat }))}
              options={[
                { value: '24h', label: '24 h' },
                { value: '12h', label: '12 h' },
              ]}
            />
          </div>

          {toggleRow('stickyDayHeaders', t('settingsStickyDayHeaders'), t('settingsStickyDayHeadersHint'), settings.stickyDayHeaders)}
        </div>
      </div>

      <div className="flex flex-col gap-[11px]">
        <span className={SECTION_LABEL}>{t('settingsSectionTracking')}</span>
        <div className={GROUP}>
          {toggleRow('rounding', t('settingsRounding'), t('settingsRoundingHint'), !!settings.rounding)}

          {/* Intervall und Aufrunden gehoeren zum Runden - ohne das ist beides
              wirkungslos, also stehen sie nur dann da. */}
          {settings.rounding && (
            <>
              {toggleRow(
                'roundUp',
                t('settingsRoundUp'),
                t(settings.roundUp ? 'settingsRoundUpHintOn' : 'settingsRoundUpHintOff'),
                !!settings.roundUp,
                'bg-dark'
              )}
              <div className={`${ROW} bg-dark`}>
                <RowLabel title={t('settingsRoundInterval')} desc={t('settingsRoundExample', { example })} />
                <div className="flex items-center gap-2 flex-none">
                  {stepButton(-1, Minus, t('settingsRoundLess'))}
                  <div className="h-[38px] px-3 flex items-center gap-1.5 rounded-[11px] border border-[#2e333a] bg-darker focus-within:border-primary transition-colors">
                    <input
                      inputMode="numeric"
                      aria-label={t('settingsRoundInterval')}
                      value={roundMinutes}
                      // Beim Tippen darf das Feld kurz leer sein, gespeichert wird
                      // erst ein Wert im erlaubten Bereich - sonst springt die 0
                      // aus "0" zurueck auf 1 und man kann keine 30 eintippen.
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        const value = Number(digits);
                        if (value >= 1 && value <= 60) setSettings(prev => ({ ...prev, roundMinutes: value }));
                      }}
                      className="w-8 h-full bg-transparent border-0 font-mono tnum text-[15px] font-bold text-right outline-none"
                    />
                    <span className="text-[13px] text-dim">{t('minutesShort')}</span>
                  </div>
                  {stepButton(1, Plus, t('settingsRoundMore'))}
                </div>
              </div>
            </>
          )}

          {toggleRow('longRunReminder', t('settingsLongRunReminder'), t('settingsLongRunReminderHint'), settings.longRunReminder)}
        </div>
      </div>
    </div>
  );
};

export default SettingsFields;
