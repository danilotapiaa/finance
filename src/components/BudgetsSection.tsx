import React from 'react';
import { useFormat } from '../hooks/useFormat';
import { toMaterialIcon } from '../lib/icons';
import type { Budget, Transaction } from '../types/database';

interface BudgetsSectionProps {
  budgets: Budget[];
  monthTransactions: Transaction[];
  isBalanceVisible: boolean;
  onConfigure: () => void;
}

export const BudgetsSection: React.FC<BudgetsSectionProps> = ({
  budgets,
  monthTransactions,
  isBalanceVisible,
  onConfigure,
}) => {
  const { formatMoney } = useFormat();

  const spentByCategory = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Record<string, number>>((accumulator, transaction) => {
      if (!transaction.category_id) return accumulator;
      accumulator[transaction.category_id] =
        (accumulator[transaction.category_id] ?? 0) + Number(transaction.amount);
      return accumulator;
    }, {});

  return (
    <section className="flex flex-col space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Presupuestos</h2>
        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex items-center space-x-1 text-xs font-medium text-muted transition hover:text-ink active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Configurar</span>
        </button>
      </div>

      <div className="bg-surface rounded-2xl p-4 shadow-sm border border-ink/[0.04] space-y-4">
        {budgets.length === 0 ? (
          <div className="text-center py-4 space-y-2.5">
            <p className="text-xs leading-relaxed text-subtle">
              Aún no defines presupuestos. Fija un límite por categoría para controlar
              tus gastos del mes.
            </p>
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-ink text-canvas text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Definir presupuestos</span>
            </button>
          </div>
        ) : (
          budgets.map((budget) => {
            const limit = Number(budget.amount);
            const spent = spentByCategory[budget.category_id] ?? 0;
            const ratio = limit > 0 ? spent / limit : 0;
            const percent = Math.min(100, Math.round(ratio * 100));
            const exceeded = spent > limit;
            const reached = spent >= limit;
            const remaining = Math.max(0, limit - spent);
            const barColor = reached
              ? 'bg-expense'
              : percent >= 80
                ? 'bg-amber-500'
                : 'bg-accent';

            return (
              <div key={budget.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-ink flex-shrink-0">
                      <span className="material-symbols-outlined text-[17px]">
                        {toMaterialIcon(budget.category?.icon)}
                      </span>
                    </div>
                    <span className="text-[13px] font-medium text-ink truncate">
                      {budget.category?.name || 'Categoría'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-muted tabular-nums flex-shrink-0">
                    {isBalanceVisible
                      ? `${formatMoney(spent)} / ${formatMoney(limit)}`
                      : '••••••'}
                  </span>
                </div>

                <div
                  className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Presupuesto de ${budget.category?.name || 'categoría'}`}
                >
                  <div
                    className={`h-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{percent}% usado</span>
                  <span className={reached ? 'text-expense font-medium' : 'tabular-nums'}>
                    {isBalanceVisible
                      ? exceeded
                        ? `Excedido por ${formatMoney(spent - limit)}`
                        : reached
                          ? 'Límite alcanzado'
                          : `Quedan ${formatMoney(remaining)}`
                      : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
