import React, { useState } from 'react';
import type { Debt, Account } from '../types/database';
import { financeService } from '../services/financeService';

interface DebtPaymentModalProps {
  debt: Debt | null;
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  debt,
  accounts,
  onClose,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!debt) return null;

  const total = Number(debt.total_amount);
  const paid = Number(debt.paid_amount);
  const remaining = Math.max(0, total - paid);
  const isLend = debt.type === 'lend';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    if (numericAmount > remaining + 0.001) {
      setErrorMessage(`El abono no puede superar el saldo pendiente de $${remaining.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await financeService.createDebtPayment({
        debt_id: debt.id,
        account_id: selectedAccountId || null,
        amount: numericAmount,
        date: new Date().toISOString(),
        note: note.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error al registrar el abono.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-white/60 overflow-hidden px-5 pt-3 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-1"></div>

        <div className="flex items-center justify-between border-b border-black/[0.04] pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[15px] font-semibold text-[#111827]">Registrar Abono</h2>
          <div className="w-8"></div>
        </div>

        {/* Resumen de la Deuda */}
        <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-black/[0.05] text-center space-y-1">
          <span className="text-xs text-[#6B7280] font-medium block">
            {isLend ? 'Abono recibido de:' : 'Pago realizado a:'}
          </span>
          <span className="text-base font-bold text-[#111827] block">{debt.person_name}</span>
          <div className="flex justify-between items-center text-xs pt-2 border-t border-black/5 mt-2">
            <span className="text-[#6B7280]">Saldo pendiente:</span>
            <span className={`font-bold tabular-nums text-sm ${isLend ? 'text-[#2E7D56]' : 'text-[#C25E4A]'}`}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs">
          {/* Monto del Abono */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                Monto del Abono ($)
              </label>
              <button
                type="button"
                onClick={() => setAmountStr(remaining.toFixed(2))}
                className="text-[10px] font-semibold text-[#2E7D56] bg-[#E8F5EE] px-2 py-0.5 rounded-full cursor-pointer"
              >
                Pagar todo ($ {remaining.toFixed(2)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-lg font-bold text-[#111827] focus:outline-none focus:border-[#111827] tabular-nums"
            />
          </div>

          {/* Cuenta donde entra o sale el dinero (opcional) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              {isLend ? '¿Dónde ingresó el dinero? (opcional)' : '¿De qué cuenta salió el pago? (opcional)'}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm font-semibold text-[#111827] outline-none cursor-pointer"
            >
              <option value="">No vincular con saldo de cuentas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${Number(acc.current_balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Nota o comprobante (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Transferencia bancaria parte 1..."
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#111827] text-white rounded-2xl font-semibold text-sm hover:bg-black active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-3 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Confirmar Abono'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};