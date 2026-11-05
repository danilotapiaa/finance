import React, { useState } from 'react';
import { financeService } from '../services/financeService';
import type { Budget, Category } from '../types/database';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  budgets: Budget[];
  onSaved: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  budgets,
  onSaved,
}) => {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  const expenseCategories = categories.filter((category) => category.type === 'expense');

  // Al abrirse se precargan los límites actuales durante el render.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setAmounts(
        Object.fromEntries(
          budgets.map((budget) => [budget.category_id, String(budget.amount)])
        )
      );
      setErrorMessage(null);
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const upserts: { category_id: string; amount: number }[] = [];
    const removals: string[] = [];

    for (const category of expenseCategories) {
      const raw = (amounts[category.id] ?? '').trim().replace(',', '.');
      const existing = budgets.find((budget) => budget.category_id === category.id);

      if (!raw) {
        if (existing) removals.push(existing.id);
        continue;
      }

      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setErrorMessage(`Ingresa un monto válido para ${category.name}`);
        return;
      }

      if (value === 0) {
        if (existing) removals.push(existing.id);
        continue;
      }

      if (!existing || Number(existing.amount) !== value) {
        upserts.push({ category_id: category.id, amount: value });
      }
    }

    if (upserts.length === 0 && removals.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);

    try {
      await Promise.all([
        ...upserts.map((budget) => financeService.upsertBudget(budget)),
        ...removals.map((id) => financeService.deleteBudget(id)),
      ]);
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error al guardar los presupuestos.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-surface rounded-t-[32px] shadow-2xl border-t border-ink/5 overflow-hidden px-5 pt-3 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        <div className="w-9 h-1 bg-ink/20 rounded-full mx-auto mb-1"></div>

        <div className="flex items-center justify-between border-b border-ink/[0.04] pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:bg-ink/10 transition active:scale-95 cursor-pointer"
            type="button"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[15px] font-semibold text-ink">Presupuestos mensuales</h2>
          <div className="w-8"></div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          Define un límite por categoría. Deja el campo vacío o en cero para quitar el
          presupuesto.
        </p>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
          {expenseCategories.length === 0 ? (
            <p className="text-center py-6 text-xs text-subtle">
              No hay categorías de gasto disponibles.
            </p>
          ) : (
            expenseCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 bg-canvas rounded-xl px-3.5 py-2.5 border border-ink/[0.04]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-ink">
                    {category.icon}
                  </span>
                  <span className="text-[13px] font-medium text-ink truncate">
                    {category.name}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={amounts[category.id] ?? ''}
                  onChange={(event) =>
                    setAmounts((previous) => ({
                      ...previous,
                      [category.id]: event.target.value,
                    }))
                  }
                  placeholder="Sin límite"
                  aria-label={`Presupuesto de ${category.name}`}
                  className="w-28 h-9 px-3 bg-surface border border-ink/[0.06] rounded-lg text-right text-sm text-ink focus:outline-none focus:border-ink tabular-nums"
                />
              </div>
            ))
          )}

          <button
            type="submit"
            disabled={isSaving || expenseCategories.length === 0}
            className="w-full h-11 bg-ink text-canvas rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Guardando...' : 'Guardar presupuestos'}
          </button>
        </form>
      </div>
    </div>
  );
};
