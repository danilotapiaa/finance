import React, { useState, useEffect } from 'react';
import type { Transaction, Account, Category, TransactionType } from '../types/database';
import { financeService } from '../services/financeService';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onDeleted,
  onUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Listas dinámicas de cuentas y categorías para selección
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Estados del formulario de edición
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  // Cargar cuentas y categorías al abrir el modal
  useEffect(() => {
    if (transaction) {
      Promise.all([
        financeService.getAccounts(),
        financeService.getCategories(),
      ]).then(([accs, cats]) => {
        setAccounts(accs);
        setCategories(cats);
      }).catch((err) => console.error('Error cargando catálogos:', err));

      setIsEditing(false);
      setErrorMessage(null);
      setEditType(transaction.type);
      setEditAmountStr(Number(transaction.amount).toFixed(2));
      setEditAccountId(transaction.account_id);
      setEditCategoryId(transaction.category_id);
      setEditNote(transaction.note || '');

      // Formatear fecha para input tipo datetime-local
      const d = new Date(transaction.date);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDate(isoLocal);
    }
  }, [transaction]);

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

  const filteredCategories = categories.filter((c) => c.type === editType);

  // Guardar edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(editAmountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!editAccountId) {
      setErrorMessage('Debes seleccionar una cuenta');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await financeService.updateTransaction(transaction.id, {
        account_id: editAccountId,
        category_id: editCategoryId,
        type: editType,
        amount: numericAmount,
        date: new Date(editDate).toISOString(),
        note: editNote.trim() || null,
      });

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al actualizar el movimiento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar transacción
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      '¿Estás seguro de que deseas eliminar este movimiento? El saldo de tu cuenta se actualizará automáticamente.'
    );
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
          <h2 className="text-[15px] font-semibold text-[#111827]">
            {isEditing ? 'Editar Movimiento' : 'Detalle del Movimiento'}
          </h2>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-semibold text-[#111827] bg-[#F8F9FA] hover:bg-neutral-200 px-3 py-1 rounded-full border border-black/5 transition cursor-pointer"
          >
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center">{errorMessage}</div>
        )}

        {/* MODO 1: EDICIÓN DIRECTA */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-1 text-xs">
            {/* Selector de Tipo: Gasto / Ingreso */}
            <div className="flex bg-[#F8F9FA] p-1 rounded-full text-xs font-medium">
              <button
                type="button"
                onClick={() => setEditType('expense')}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  editType === 'expense' ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6B7280]'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setEditType('income')}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  editType === 'income' ? 'bg-[#2E7D56] text-white shadow-sm' : 'text-[#6B7280]'
                }`}
              >
                Ingreso
              </button>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Monto ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editAmountStr}
                onChange={(e) => setEditAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-lg font-bold text-[#111827] focus:outline-none focus:border-[#111827] tabular-nums"
              />
            </div>

            {/* Cuenta */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Cuenta de cargo / depósito
              </label>
              <select
                value={editAccountId}
                onChange={(e) => setEditAccountId(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm font-semibold text-[#111827] outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${Number(acc.current_balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={editCategoryId || ''}
                onChange={(e) => setEditCategoryId(e.target.value || null)}
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm font-semibold text-[#111827] outline-none cursor-pointer"
              >
                <option value="">Sin categoría</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Fecha y Hora
              </label>
              <input
                type="datetime-local"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
              />
            </div>

            {/* Nota */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Concepto o Nota
              </label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Ej. Café con el equipo..."
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
              />
            </div>

            {/* Botón Guardar Cambios */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 bg-[#111827] text-white rounded-2xl font-semibold text-sm hover:bg-black active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </form>
        ) : (
          /* MODO 2: VISUALIZACIÓN DETALLADA */
          <>
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

            {/* Metadatos Agrupados */}
            <div className="bg-[#F8F9FA] rounded-2xl border border-black/[0.04] divide-y divide-black/[0.05] overflow-hidden text-xs my-1">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="font-medium">Fecha</span>
                </div>
                <span className="font-medium text-[#111827] text-right capitalize">{formattedDate}</span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                  <span className="font-medium">Cuenta</span>
                </div>
                <span className="font-semibold text-[#111827]">{transaction.account?.name || 'Cuenta activa'}</span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <span className="material-symbols-outlined text-sm">category</span>
                  <span className="font-medium">Categoría</span>
                </div>
                <span className="font-semibold text-[#111827]">{transaction.category?.name || 'Sin categoría'}</span>
              </div>

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

            {/* Acciones: Editar y Eliminar */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full h-11 bg-white hover:bg-neutral-50 border border-black/10 rounded-xl text-xs font-semibold text-[#111827] flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Editar este movimiento</span>
              </button>

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
          </>
        )}
      </div>
    </div>
  );
};