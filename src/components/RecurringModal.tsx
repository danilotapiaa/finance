import React, { useEffect, useState } from 'react';
import { financeService } from '../services/financeService';
import { toDateOnly } from '../lib/recurrence';
import type { Account, Category, RecurringFrequency, TransactionType } from '../types/database';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const frequencies: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Cada semana' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'yearly', label: 'Cada año' },
];

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(toDateOnly(new Date()));
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  // Al abrirse el modal se reinicia el formulario durante el render.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setType('expense');
      setAmountStr('');
      setNote('');
      setFrequency('monthly');
      setStartDate(toDateOnly(new Date()));
      setErrorMessage(null);
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [accountsData, categoriesData] = await Promise.all([
          financeService.getAccounts(),
          financeService.getCategories(),
        ]);

        if (cancelled) return;

        const safeAccounts = accountsData ?? [];
        const safeCategories = categoriesData ?? [];

        setAccounts(safeAccounts);
        setCategories(safeCategories);
        setAccountId(safeAccounts[0]?.id ?? '');
        setCategoryId(
          safeCategories.find((category) => category.type === 'expense')?.id ?? null
        );
      } catch {
        if (!cancelled) {
          setErrorMessage('No se pudieron cargar las cuentas y categorías.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredCategories = categories.filter((category) => category.type === type);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategoryId(
      categories.find((category) => category.type === nextType)?.id ?? null
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const amount = Number(amountStr.replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!accountId) {
      setErrorMessage('Debes seleccionar una cuenta');
      return;
    }

    setIsSaving(true);

    try {
      await financeService.createRecurringTransaction({
        account_id: accountId,
        category_id: categoryId,
        type,
        amount,
        note: note.trim() || null,
        frequency,
        start_date: startDate,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo crear la automatización.');
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
          <h2 className="text-[15px] font-semibold text-ink">Nueva automatización</h2>
          <div className="w-8"></div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          El movimiento se registra automáticamente en la fecha indicada y se repite
          según la frecuencia elegida.
        </p>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p className="text-center py-6 text-xs text-subtle">Cargando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`h-10 rounded-xl font-semibold transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-expense text-white'
                    : 'bg-canvas text-muted border border-ink/[0.06]'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`h-10 rounded-xl font-semibold transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-accent text-white'
                    : 'bg-canvas text-muted border border-ink/[0.06]'
                }`}
              >
                Ingreso
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-amount">
                Monto
              </label>
              <input
                id="recurring-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amountStr}
                onChange={(event) => setAmountStr(event.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-account">
                Cuenta
              </label>
              <select
                id="recurring-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
              >
                {accounts.length === 0 && <option value="">Sin cuentas disponibles</option>}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-category">
                Categoría
              </label>
              <select
                id="recurring-category"
                value={categoryId ?? ''}
                onChange={(event) => setCategoryId(event.target.value || null)}
                className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
              >
                <option value="">Sin categoría</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-note">
                Descripción
              </label>
              <input
                id="recurring-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ej. Internet del hogar"
                className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-frequency">
                  Frecuencia
                </label>
                <select
                  id="recurring-frequency"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}
                  className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
                >
                  {frequencies.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="recurring-date">
                  Primera fecha
                </label>
                <input
                  id="recurring-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving || accounts.length === 0}
              className="w-full h-11 bg-ink text-canvas rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Guardando...' : 'Crear automatización'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
