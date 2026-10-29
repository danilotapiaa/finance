import { useMemo } from 'react';
import { formatAmount, formatMoney, formatSignedMoney } from '../lib/format';
import { usePreferences } from '../context/PreferencesContext';

export interface FormatHelpers {
  formatAmount: (value: number) => string;
  formatMoney: (value: number) => string;
  formatSignedMoney: (value: number) => string;
  formatDate: (value: Date | string | number, options: Intl.DateTimeFormatOptions) => string;
}

/** Devuelve formateadores de moneda y fecha ya vinculados a las preferencias del perfil. */
export const useFormat = (): FormatHelpers => {
  const { currency, locale } = usePreferences();

  return useMemo(() => {
    const moneyOptions = { currency, locale };

    return {
      formatAmount: (value: number) => formatAmount(value, moneyOptions),
      formatMoney: (value: number) => formatMoney(value, moneyOptions),
      formatSignedMoney: (value: number) => formatSignedMoney(value, moneyOptions),
      formatDate: (value: Date | string | number, options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(locale, options).format(new Date(value)),
    };
  }, [currency, locale]);
};
