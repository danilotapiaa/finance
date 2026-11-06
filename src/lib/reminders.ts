import { parseDateOnly, toDateOnly } from './recurrence';
import type { RecurringFrequency, RecurringTransaction, SavingsGoal } from '../types/database';

export type Reminder =
  | {
      id: string;
      type: 'recurring';
      title: string;
      amount: number;
      daysUntil: number;
      frequency: RecurringFrequency;
      transactionType: 'expense' | 'income';
    }
  | {
      id: string;
      type: 'goal_deadline';
      title: string;
      remaining: number;
      daysUntil: number;
    }
  | {
      id: string;
      type: 'goal_near';
      title: string;
      remaining: number;
      progress: number;
    }
  | {
      id: string;
      type: 'budget';
      title: string;
      spent: number;
      limit: number;
      progress: number;
    };

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: string): number =>
  Math.round((parseDateOnly(from).getTime() - parseDateOnly(to).getTime()) / DAY_MS);

/** Suma los aportes registrados de una meta. */
export const savedAmount = (goal: SavingsGoal): number =>
  (goal.contributions ?? []).reduce(
    (sum, contribution) => sum + Number(contribution.amount),
    0
  );

/**
 * Reúne los recordatorios de la aplicación: movimientos recurrentes próximos y
 * metas que están por vencer o cerca de completarse.
 */
export const buildReminders = (
  rules: RecurringTransaction[],
  goals: SavingsGoal[],
  today: Date = new Date(),
  horizonDays = 7
): Reminder[] => {
  const todayStr = toDateOnly(today);
  const reminders: Reminder[] = [];

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const daysUntil = daysBetween(rule.next_run_date, todayStr);
    if (daysUntil < 0 || daysUntil > horizonDays) continue;

    reminders.push({
      id: `recurring-${rule.id}`,
      type: 'recurring',
      title: rule.note || rule.category?.name || 'Movimiento recurrente',
      amount: Number(rule.amount),
      daysUntil,
      frequency: rule.frequency,
      transactionType: rule.type,
    });
  }

  for (const goal of goals) {
    const target = Number(goal.target_amount);
    const saved = savedAmount(goal);
    const remaining = Math.max(0, target - saved);

    if (target <= 0 || remaining <= 0) continue;

    if (goal.target_date) {
      const daysUntil = daysBetween(goal.target_date, todayStr);

      if (daysUntil >= 0 && daysUntil <= horizonDays) {
        reminders.push({
          id: `goal-date-${goal.id}`,
          type: 'goal_deadline',
          title: goal.name,
          remaining,
          daysUntil,
        });
        continue;
      }
    }

    const progress = Math.round((saved / target) * 100);

    if (progress >= 90) {
      reminders.push({
        id: `goal-near-${goal.id}`,
        type: 'goal_near',
        title: goal.name,
        remaining,
        progress,
      });
    }
  }

  return reminders.sort((a, b) => {
    const daysA = 'daysUntil' in a ? a.daysUntil : Number.MAX_SAFE_INTEGER;
    const daysB = 'daysUntil' in b ? b.daysUntil : Number.MAX_SAFE_INTEGER;
    return daysA - daysB;
  });
};
