import React from 'react';
import { useFormat } from '../hooks/useFormat';
import { expenseByCategory, percentChange, summarizeMonth } from '../lib/monthlySummary';
import { toMaterialIcon } from '../lib/icons';
import type { Transaction } from '../types/database';

interface MonthlyComparisonProps {
  currentTransactions: Transaction[];
  previousTransactions: Transaction[];
}

export const MonthlyComparison: React.FC<MonthlyComparisonProps> = ({
  currentTransactions,
  previousTransactions,
}) => {
  const { formatMoney } = useFormat();

  const current = summarizeMonth(currentTransactions);
  const previous = summarizeMonth(previousTransactions);
  const categories = expenseByCategory(currentTransactions);
  const previousCategories = new Map(
    expenseByCategory(previousTransactions).map((category) => [
      category.categoryId,
      category.amount,
    ])
  );

  if (categories.length === 0) return null;

  const expenseChange = percentChange(current.expense, previous.expense);
  const incomeChange = percentChange(current.income, previous.income);
  const visibleCategories = categories.slice(0, 5);
  const hiddenCount = categories.length - visibleCategories.length;

  const renderChange = (value: number | null, invert = false) => {
    if (value === null) {
      return <span className="text-[10px] text-subtle">Sin base de comparación</span>;
    }

    if (value === 0) {
      return <span className="text-[10px] text-subtle">Sin cambios</span>;
    }

    const increased = value > 0;
    const isPositive = invert ? !increased : increased;

    return (
      <span
        className={`text-[10px] font-medium ${isPositive ? 'text-accent' : 'text-expense'}`}
      >
        {increased ? '+' : ''}
        {value}% vs mes anterior
      </span>
    );
  };

  return (
    <section className="bg-surface rounded-2xl p-4 border border-ink/[0.05] shadow-sm space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Comparación mensual</h2>
        <p className="text-[11px] text-muted mt-0.5">
          Tus gastos frente al mes anterior, por categoría.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-canvas rounded-xl p-3 border border-ink/[0.04]">
          <span className="text-[11px] text-muted block">Gastos</span>
          <span className="text-sm font-semibold text-ink tabular-nums block mt-0.5">
            {formatMoney(current.expense)}
          </span>
          {renderChange(expenseChange, true)}
        </div>

        <div className="bg-canvas rounded-xl p-3 border border-ink/[0.04]">
          <span className="text-[11px] text-muted block">Ingresos</span>
          <span className="text-sm font-semibold text-ink tabular-nums block mt-0.5">
            {formatMoney(current.income)}
          </span>
          {renderChange(incomeChange)}
        </div>
      </div>

      <ul className="space-y-2.5 pt-1">
        {visibleCategories.map((category) => {
          const previousAmount = previousCategories.get(category.categoryId) ?? 0;
          const change = percentChange(category.amount, previousAmount);

          return (
            <li key={category.categoryId ?? 'sin-categoria'} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px] text-ink">
                      {toMaterialIcon(category.icon, 'receipt_long')}
                    </span>
                  </div>
                  <span className="text-[12px] text-ink truncate">{category.name}</span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[12px] font-medium text-ink tabular-nums block">
                    {formatMoney(category.amount)}
                  </span>
                  <span
                    className={`text-[10px] ${
                      change === null
                        ? 'text-accent'
                        : change > 0
                          ? 'text-expense'
                          : change < 0
                            ? 'text-accent'
                            : 'text-subtle'
                    }`}
                  >
                    {change === null
                      ? 'Nuevo este mes'
                      : change === 0
                        ? 'Sin cambios'
                        : `${change > 0 ? '+' : ''}${change}%`}
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                <div
                  role="progressbar"
                  aria-valuenow={category.share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Participación de ${category.name}`}
                  className="h-full rounded-full bg-ink"
                  style={{
                    width: `${category.share}%`,
                    backgroundColor: category.color || undefined,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <p className="text-[10px] text-subtle">
          {hiddenCount} categoría{hiddenCount === 1 ? '' : 's'} más con gastos este mes.
        </p>
      )}
    </section>
  );
};
