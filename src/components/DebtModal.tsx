import React, { useState } from 'react';
import type { DebtType } from '../types/database';
import { financeService } from '../services/financeService';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('lend'); // 'lend' = presté dinero (me deben)
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  // Al abrirse el modal se limpia el formulario durante el render.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setPersonName('');
      setType('lend');
      setAmountStr('');
      setDueDate('');
      setNote('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setErrorMessage('Ingresa el nombre de la persona');
      return;
    }

    const numericAmount = parseFloat(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await financeService.createDebt({
        person_name: personName.trim(),
        type,
        total_amount: numericAmount,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        note: note.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error al registrar la deuda.');
      }
    } finally {
      setIsSubmitting(false);
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
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[15px] font-semibold text-ink">
            {type === 'lend' ? 'Nuevo préstamo' : 'Nueva deuda'}
          </h2>
          <div className="w-8"></div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs">
          {/* Selector de Tipo */}
          <div className="flex bg-canvas p-1 rounded-full text-xs font-medium">
            <button
              type="button"
              onClick={() => setType('lend')}
              className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
                type === 'lend' ? 'bg-accent text-canvas shadow-sm' : 'text-muted'
              }`}
            >
              Me deben
            </button>
            <button
              type="button"
              onClick={() => setType('borrow')}
              className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
                type === 'borrow' ? 'bg-expense text-canvas shadow-sm' : 'text-muted'
              }`}
            >
              Debo
            </button>
          </div>

          {/* Nombre de la Persona */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              {type === 'lend' ? 'Nombre del deudor' : 'Nombre del acreedor'}
            </label>
            <input
              type="text"
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ej. Carlos Martínez"
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          {/* Monto Total */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Monto ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-lg font-bold text-ink focus:outline-none focus:border-ink tabular-nums"
            />
          </div>

          {/* Fecha Límite de Pago */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Fecha límite (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          {/* Nota / Motivo */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Préstamo para repuesto de auto..."
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-ink text-canvas rounded-2xl font-semibold text-sm hover:bg-ink/90 active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-3 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin"></span>
            ) : (
              'Guardar deuda'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};