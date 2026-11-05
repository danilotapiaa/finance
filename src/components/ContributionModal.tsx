import React, { useState } from 'react';
import { financeService } from '../services/financeService';
import { toDateOnly } from '../lib/recurrence';
import type { SavingsGoal } from '../types/database';

interface ContributionModalProps {
  isOpen: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  goal,
  onClose,
  onSaved,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(toDateOnly(new Date()));
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  // Al abrirse el modal se reinicia el formulario durante el render.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setAmountStr('');
      setDate(toDateOnly(new Date()));
      setNote('');
      setErrorMessage(null);
      setIsSaving(false);
    }
  }

  if (!isOpen || !goal) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const amount = Number(amountStr.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Ingresa un monto mayor a 0');
      return;
    }

    setIsSaving(true);

    try {
      await financeService.addGoalContribution({
        goal_id: goal.id,
        amount,
        date: new Date(`${date}T12:00:00`).toISOString(),
        note: note.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo registrar el aporte.');
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
          <h2 className="text-[15px] font-semibold text-ink truncate max-w-[220px]">
            Aportar a {goal.name}
          </h2>
          <div className="w-8"></div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="contribution-amount">
              Monto del aporte
            </label>
            <input
              id="contribution-amount"
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
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="contribution-date">
              Fecha
            </label>
            <input
              id="contribution-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="contribution-note">
              Nota (opcional)
            </label>
            <input
              id="contribution-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej. Ahorro de la quincena"
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 bg-ink text-canvas rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Guardando...' : 'Registrar aporte'}
          </button>
        </form>
      </div>
    </div>
  );
};
