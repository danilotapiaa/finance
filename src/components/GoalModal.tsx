import React, { useState } from 'react';
import { financeService } from '../services/financeService';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const icons = [
  { value: 'savings', label: 'Ahorro' },
  { value: 'flight', label: 'Viaje' },
  { value: 'home', label: 'Casa' },
  { value: 'school', label: 'Estudios' },
  { value: 'directions_car', label: 'Auto' },
];

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('savings');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  // Al abrirse el modal se reinicia el formulario durante el render.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setName('');
      setTargetStr('');
      setTargetDate('');
      setIcon('savings');
      setErrorMessage(null);
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Escribe un nombre para la meta');
      return;
    }

    const target = Number(targetStr.replace(',', '.'));
    if (!Number.isFinite(target) || target <= 0) {
      setErrorMessage('Ingresa un monto objetivo mayor a 0');
      return;
    }

    setIsSaving(true);

    try {
      await financeService.createSavingsGoal({
        name: trimmedName,
        target_amount: target,
        target_date: targetDate || null,
        icon,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo crear la meta.');
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
          <h2 className="text-[15px] font-semibold text-ink">Nueva meta de ahorro</h2>
          <div className="w-8"></div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          Define cuánto quieres ahorrar y ve sumando aportes hasta alcanzar la meta.
        </p>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="goal-name">
              Nombre
            </label>
            <input
              id="goal-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Viaje a la playa"
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="goal-target">
              Monto objetivo
            </label>
            <input
              id="goal-target"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={targetStr}
              onChange={(event) => setTargetStr(event.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="goal-date">
              Fecha objetivo (opcional)
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="goal-icon">
              Ícono
            </label>
            <select
              id="goal-icon"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            >
              {icons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 bg-ink text-canvas rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Guardando...' : 'Crear meta'}
          </button>
        </form>
      </div>
    </div>
  );
};
