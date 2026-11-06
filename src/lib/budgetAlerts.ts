import type { Budget, Transaction } from '../types/database';
import type { Reminder } from './reminders';

export type BudgetAlertLevel = 'warning' | 'exceeded';

export interface BudgetAlert extends Extract<Reminder, { type: 'budget' }> {
  level: BudgetAlertLevel;
}

/**
 * Genera avisos para los presupuestos que alcanzaron el umbral de advertencia
 * o que ya fueron superados con los gastos del mes.
 */
export const buildBudgetAlerts = (
  budgets: Budget[],
  transactions: Transaction[],
  warningThreshold = 80
): BudgetAlert[] => {
  const spentByCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !transaction.category_id) continue;

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;

    spentByCategory.set(
      transaction.category_id,
      (spentByCategory.get(transaction.category_id) ?? 0) + amount
    );
  }

  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    const limit = Number(budget.amount);
    if (!Number.isFinite(limit) || limit <= 0) continue;

    const spent = spentByCategory.get(budget.category_id) ?? 0;
    const progress = Math.round((spent / limit) * 100);

    if (progress < warningThreshold) continue;

    alerts.push({
      id: `budget-${budget.id}`,
      type: 'budget',
      title: budget.category?.name ?? 'Categoría',
      spent,
      limit,
      progress,
      level: progress >= 100 ? 'exceeded' : 'warning',
    });
  }

  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'exceeded' ? -1 : 1;
    return b.progress - a.progress;
  });
};
