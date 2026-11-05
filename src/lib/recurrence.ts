export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

/** Devuelve una fecha en formato YYYY-MM-DD usando la zona horaria local. */
export const toDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Convierte YYYY-MM-DD en una fecha local a medianoche, sin desfase UTC. */
export const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Marca de tiempo estable para una ocurrencia, usada como fecha del movimiento. */
export const occurrenceTimestamp = (dateOnly: string): string =>
  new Date(`${dateOnly}T12:00:00`).toISOString();

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/** Calcula la siguiente ocurrencia conservando el día cuando el mes es más corto. */
export const nextOccurrence = (date: Date, frequency: RecurringFrequency): Date => {
  if (frequency === 'weekly') {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    return next;
  }

  const day = date.getDate();

  if (frequency === 'monthly') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const normalizedYear = year + Math.floor(month / 12);
    const normalizedMonth = month % 12;
    return new Date(
      normalizedYear,
      normalizedMonth,
      Math.min(day, daysInMonth(normalizedYear, normalizedMonth))
    );
  }

  const year = date.getFullYear() + 1;
  const month = date.getMonth();
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
};

/** Describe una frecuencia para mostrarla en la interfaz. */
export const frequencyLabel = (frequency: RecurringFrequency): string => {
  if (frequency === 'weekly') return 'Semanal';
  if (frequency === 'yearly') return 'Anual';
  return 'Mensual';
};
