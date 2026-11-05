import type { Transaction } from '../types/database';

export interface MonthlyTotals {
  income: number;
  expense: number;
  net: number;
}

export interface CategoryExpense {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  share: number;
}

/** Suma ingresos y gastos del conjunto de movimientos recibido. */
export const summarizeMonth = (transactions: Transaction[]): MonthlyTotals => {
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount)) continue;

    if (transaction.type === 'income') {
      income += amount;
    } else {
      expense += amount;
    }
  }

  return { income, expense, net: income - expense };
};

/** Agrupa los gastos por categoría y calcula su participación en el total. */
export const expenseByCategory = (transactions: Transaction[]): CategoryExpense[] => {
  const totals = new Map<string | null, CategoryExpense>();
  let totalExpense = 0;

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    totalExpense += amount;

    const key = transaction.category_id ?? null;
    const existing = totals.get(key);

    if (existing) {
      existing.amount += amount;
    } else {
      totals.set(key, {
        categoryId: key,
        name: transaction.category?.name ?? 'Sin categoría',
        icon: transaction.category?.icon ?? null,
        color: transaction.category?.color ?? null,
        amount,
        share: 0,
      });
    }
  }

  const result = Array.from(totals.values()).sort((a, b) => b.amount - a.amount);

  return result.map((category) => ({
    ...category,
    share: totalExpense > 0 ? Math.round((category.amount / totalExpense) * 100) : 0,
  }));
};

/** Variación porcentual entre dos periodos; null cuando no hay base de comparación. */
export const percentChange = (current: number, previous: number): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 100);
};
