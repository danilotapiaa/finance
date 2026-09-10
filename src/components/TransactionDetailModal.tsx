import React, { useState } from 'react';
import type { Transaction } from '../types/database';
import { financeService } from '../services/financeService';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDeleted: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const amountNumber = Number(transaction.amount);

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(transaction.date));

  const handleDelete = async () => {
    const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este movimiento? El saldo de tu cuenta se actualizará automáticamente.');
    if (!confirmDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await financeService.deleteTransaction(transaction.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al eliminar el movimiento.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-white/60 overflow-hidden px-5 pt-3 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        {/* Píldora de arrastre */}
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-1"></div>

        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-black/[0.04] pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[15px] font-semibold text-[#111827]">Detalle del Movimiento</h2>
          <div className="w-8"></div>
        </div>

        {/* Identidad del Movimiento */}
        <div className="flex flex-col items-center text-center pt-2 pb-2">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border border-black/5 mb-2 ${
              isIncome ? 'bg-[#E8F5EE] text-[#2E7D56]' : 'bg-[#F3F4F6] text-[#111827]'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {transaction.category?.icon || (isIncome ? 'payments' : 'receipt_long')}
            </span>
          </div>

          <h3 className="text-lg font-bold text-[#111827]">
            {transaction.note || transaction.category?.name || 'Movimiento'}
          </h3>

          <div
            className={`text-3xl font-bold tracking-tight tabular-nums mt-0.5 ${
              isIncome ? 'text-[#2E7D56]' : 'text-[#111827]'
            }`}
          >
            {isIncome ? `+$${amountNumber.toFixed(2)}` : `-$${amountNumber.toFixed(2)}`}
          </div>

          <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F8F9FA] border border-black/5 text-[11px] font-medium text-[#6B7280]">
            {isIncome ? 'Ingreso registrado' : 'Gasto registrado'}
          </span>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center">{errorMessage}</div>
        )}

        {/* Tarjeta de Metadatos Agrupados */}
        <div className="bg-[#F8F9FA] rounded-2xl border border-black/[0.04] divide-y divide-black/[0.05] overflow-hidden text-xs my-1">
          {/* Fila 1: Fecha */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span className="font-medium">Fecha</span>
            </div>
            <span className="font-medium text-[#111827] text-right capitalize">{formattedDate}</span>
          </div>

          {/* Fila 2: Cuenta */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <span className="material-symbols-outlined text-sm">account_balance</span>
              <span className="font-medium">Cuenta</span>
            </div>
            <span className="font-semibold text-[#111827]">{transaction.account?.name || 'Cuenta activa'}</span>
          </div>

          {/* Fila 3: Categoría */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <span className="material-symbols-outlined text-sm">category</span>
              <span className="font-medium">Categoría</span>
            </div>
            <span className="font-semibold text-[#111827]">{transaction.category?.name || 'Sin categoría'}</span>
          </div>

          {/* Fila 4: Nota */}
          {transaction.note && (
            <div className="p-3.5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-[#6B7280] shrink-0 pt-0.5">
                <span className="material-symbols-outlined text-sm">notes</span>
                <span className="font-medium">Nota</span>
              </div>
              <span className="font-normal text-[#111827] text-right leading-relaxed max-w-[200px]">
                {transaction.note}
              </span>
            </div>
          )}
        </div>

        {/* Botón de Eliminación Destructiva */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full h-11 bg-[#FDF2F0] hover:bg-[#FBE8E5] border border-[#C25E4A]/15 rounded-xl text-xs font-semibold text-[#C25E4A] flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>{isDeleting ? 'Eliminando...' : 'Eliminar este movimiento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};