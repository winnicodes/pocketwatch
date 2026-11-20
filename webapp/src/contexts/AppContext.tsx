import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useServerObject } from '../hooks/useServerObject';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import type { Locale } from 'date-fns';

interface Settings {
  name: string;
  language: 'de' | 'en';
  timeFormat: '12h' | '24h';
  stickyDayHeaders: boolean;
  rounding: boolean;
  roundMinutes: number;
  roundUp: boolean;
  longRunReminder: boolean;
}

interface AppContextType {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  locale: Locale;
  isLocaleLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [settings, setSettings] = useServerObject<Settings>(
    "config.json",
    {
      name: "",
      language: "de",
      timeFormat: "24h",
      stickyDayHeaders: true,
      rounding: false,
      roundMinutes: 15,
      roundUp: false,
      longRunReminder: true
    }
  );

  const [localeStrings, setLocaleStrings] = useState<Record<string, string>>({});
  const [isLocaleLoading, setIsLocaleLoading] = useState(true);

  useEffect(() => {
    setIsLocaleLoading(true);

    // Locale files are not hashed; always revalidate.
    fetch(`/locales/${settings.language}.json`, { cache: 'no-cache' })
      .then(res => res.json())
      .then(data => {
        setLocaleStrings(data);
        setIsLocaleLoading(false);
      })
      .catch(error => {
        console.error(`Failed to load locale file for language: ${settings.language}`, error);
        setIsLocaleLoading(false);
      });
  }, [settings.language]);

  const t = useMemo(() => (
    (key: string, replacements?: Record<string, string | number>) => {
      let translation = localeStrings[key] || key;

      if (replacements) {
        for (const [placeholder, value] of Object.entries(replacements)) {
          translation = translation.replace(`{{${placeholder}}}`, String(value));
        }
      }

      return translation;
    }
  ), [localeStrings]);

  const value: AppContextType = {
    settings,
    setSettings,
    t,
    locale: settings.language === 'de' ? de : enUS,
    isLocaleLoading
  };

  return (
    <AppContext.Provider value={value}>
      {!isLocaleLoading && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
};
