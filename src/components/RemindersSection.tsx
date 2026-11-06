import React from 'react';
import { useFormat } from '../hooks/useFormat';
import { frequencyLabel } from '../lib/recurrence';
import type { Reminder } from '../lib/reminders';

interface RemindersSectionProps {
  reminders: Reminder[];
  isBalanceVisible?: boolean;
}

const dayLabel = (days: number): string => {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} días`;
};

export const RemindersSection: React.FC<RemindersSectionProps> = ({
  reminders,
  isBalanceVisible = true,
}) => {
  const { formatMoney } = useFormat();

  if (reminders.length === 0) return null;

  const money = (value: number) =>
    isBalanceVisible ? formatMoney(value) : '••••••';

  return (
    <section className="bg-surface rounded-2xl p-4 border border-ink/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-ink">notifications</span>
          <h2 className="text-sm font-semibold text-ink">Recordatorios</h2>
        </div>
        <span className="text-[11px] font-medium text-muted bg-surface-muted rounded-full px-2 py-0.5">
          {reminders.length}
        </span>
      </div>

      <ul className="space-y-2">
        {reminders.map((reminder) => {
          if (reminder.type === 'budget') {
            const reached = reminder.progress >= 100;
            const exceeded = reminder.spent > reminder.limit;

            return (
              <li
                key={reminder.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                  reached
                    ? 'bg-expense-soft border-expense/20'
                    : 'bg-amber-50 border-amber-200/60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    reached ? 'bg-expense/10' : 'bg-amber-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      reached ? 'text-expense' : 'text-amber-600'
                    }`}
                  >
                    {reached ? 'error' : 'warning'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-ink truncate">
                    {reminder.title}
                  </p>
                  <p
                    className={`text-[10px] ${
                      reached ? 'text-expense' : 'text-amber-700'
                    }`}
                  >
                    {exceeded
                      ? `${reminder.progress}% · excedido por ${money(
                          reminder.spent - reminder.limit
                        )}`
                      : reached
                        ? `${reminder.progress}% · límite alcanzado`
                        : `${reminder.progress}% del presupuesto · quedan ${money(
                            reminder.limit - reminder.spent
                          )}`}
                  </p>
                </div>
              </li>
            );
          }

          if (reminder.type === 'recurring') {
            return (
              <li
                key={reminder.id}
                className="flex items-center gap-3 bg-canvas rounded-xl px-3 py-2.5 border border-ink/[0.04]"
              >
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-ink">
                    event_repeat
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-ink truncate">
                    {reminder.title}
                  </p>
                  <p className="text-[10px] text-muted">
                    Se registrará {dayLabel(reminder.daysUntil)} ·{' '}
                    {frequencyLabel(reminder.frequency)}
                  </p>
                </div>
                <span
                  className={`text-[12px] font-semibold tabular-nums shrink-0 ${
                    reminder.transactionType === 'income' ? 'text-accent' : 'text-expense'
                  }`}
                >
                  {reminder.transactionType === 'income' ? '+' : '-'}
                  {money(reminder.amount)}
                </span>
              </li>
            );
          }

          if (reminder.type === 'goal_deadline') {
            return (
              <li
                key={reminder.id}
                className="flex items-center gap-3 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-200/60"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">
                    flag
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-ink truncate">
                    {reminder.title}
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Faltan {money(reminder.remaining)} · vence {dayLabel(reminder.daysUntil)}
                  </p>
                </div>
              </li>
            );
          }

          return (
            <li
              key={reminder.id}
              className="flex items-center gap-3 bg-accent-soft/60 rounded-xl px-3 py-2.5 border border-accent/20"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-accent">
                  emoji_events
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-ink truncate">
                  {reminder.title}
                </p>
                <p className="text-[10px] text-accent">
                  Te faltan {money(reminder.remaining)} · {reminder.progress}% completado
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
