export interface MoneyFormatOptions {
  locale?: string;
  currency?: string;
}

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

/** Traduce el formato de número guardado en el perfil a un locale de Intl. */
export const resolveLocale = (numberFormat?: string | null): string =>
  numberFormat === '14.850,00' ? 'es-EC' : DEFAULT_LOCALE;

const toSafeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const buildFormatter = (
  options: MoneyFormatOptions,
  withSymbol: boolean
): Intl.NumberFormat => {
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options;

  if (!withSymbol) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Formatea un monto sin símbolo de moneda, por ejemplo 1234.5 -> "1,234.50". */
export const formatAmount = (value: number, options: MoneyFormatOptions = {}): string =>
  buildFormatter(options, false).format(toSafeNumber(value));

/** Formatea un monto con símbolo de moneda, por ejemplo 1234.5 -> "$1,234.50". */
export const formatMoney = (value: number, options: MoneyFormatOptions = {}): string =>
  buildFormatter(options, true).format(toSafeNumber(value));

/** Formatea un monto con signo explícito, por ejemplo 50 -> "+$50.00" y -50 -> "-$50.00". */
export const formatSignedMoney = (value: number, options: MoneyFormatOptions = {}): string => {
  const safeValue = toSafeNumber(value);
  const formatted = formatMoney(Math.abs(safeValue), options);
  return `${safeValue < 0 ? '-' : '+'}${formatted}`;
};
