import { describe, expect, it } from 'vitest';
import {
  frequencyLabel,
  nextOccurrence,
  occurrenceTimestamp,
  parseDateOnly,
  toDateOnly,
} from './recurrence';

describe('recurrence', () => {
  it('convierte fechas locales a YYYY-MM-DD sin desfase', () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateOnly(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('interpreta YYYY-MM-DD como fecha local', () => {
    const date = parseDateOnly('2026-02-28');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(28);
  });

  it('avanza una semana', () => {
    expect(toDateOnly(nextOccurrence(new Date(2026, 0, 15), 'weekly'))).toBe('2026-01-22');
  });

  it('ajusta el día al final del mes cuando es más corto', () => {
    expect(toDateOnly(nextOccurrence(new Date(2026, 0, 31), 'monthly'))).toBe('2026-02-28');
    expect(toDateOnly(nextOccurrence(new Date(2026, 2, 31), 'monthly'))).toBe('2026-04-30');
  });

  it('cruza el cambio de año en la frecuencia mensual', () => {
    expect(toDateOnly(nextOccurrence(new Date(2026, 11, 31), 'monthly'))).toBe('2027-01-31');
  });

  it('ajusta el 29 de febrero en la frecuencia anual', () => {
    expect(toDateOnly(nextOccurrence(new Date(2024, 1, 29), 'yearly'))).toBe('2025-02-28');
  });

  it('genera una marca de tiempo estable para la ocurrencia', () => {
    const timestamp = occurrenceTimestamp('2026-01-15');
    const parsed = new Date(timestamp);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(15);
  });

  it('describe las frecuencias en español', () => {
    expect(frequencyLabel('weekly')).toBe('Semanal');
    expect(frequencyLabel('monthly')).toBe('Mensual');
    expect(frequencyLabel('yearly')).toBe('Anual');
  });
});
