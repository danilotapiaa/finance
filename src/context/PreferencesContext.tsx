import { createContext, useContext } from 'react';
import { resolveLocale } from '../lib/format';

export type FirstDayOfWeek = 'monday' | 'sunday';

export interface Preferences {
  currency: string;
  numberFormat: string;
  firstDayOfWeek: FirstDayOfWeek;
  locale: string;
}

export interface PreferencesContextValue extends Preferences {
  setPreferences: (updates: Partial<Preferences>) => void;
}

export const DEFAULT_PREFERENCES: Preferences = {
  currency: 'USD',
  numberFormat: '14,850.00',
  firstDayOfWeek: 'monday',
  locale: resolveLocale('14,850.00'),
};

export const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFERENCES,
  setPreferences: () => {},
});

export const usePreferences = (): PreferencesContextValue => useContext(PreferencesContext);

/** Construye las preferencias completas recalculando el locale del formato numérico. */
export const buildPreferences = (source: {
  currency?: string | null;
  numberFormat?: string | null;
  firstDayOfWeek?: string | null;
}): Preferences => {
  const numberFormat = source.numberFormat || DEFAULT_PREFERENCES.numberFormat;

  return {
    currency: source.currency || DEFAULT_PREFERENCES.currency,
    numberFormat,
    firstDayOfWeek: source.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday',
    locale: resolveLocale(numberFormat),
  };
};
