import React, { useState, useEffect } from 'react';
import type { Account, Category, TransactionType } from '../types/database';
import { financeService } from '../services/financeService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSuccess,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('0');
  // Sin cuenta seleccionada por defecto: selección estrictamente obligatoria
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('0');
      setNote('');
      setIsEditingNote(false);
      setErrorMessage(null);
      setSelectedAccountId(''); // Siempre inicia vacío para obligar al usuario a elegir
    }
  }, [isOpen]);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    const [firstCategory] = filteredCategories;
    if (firstCategory) {
      setSelectedCategoryId(firstCategory.id);
    } else {
      setSelectedCategoryId(null);
    }
  }, [type, categories]);

  if (!isOpen) return null;

  const handleKeypadPress = (key: string) => {
    setErrorMessage(null);

    if (key === 'backspace') {
      if (amountStr.length <= 1) {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (key === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    if (amountStr.includes('.')) {
      const decimalPart = amountStr.substring(amountStr.indexOf('.') + 1);
      if (decimalPart.length >= 2) {
        return;
      }
    }

    if (amountStr === '0') {
      setAmountStr(key);
    } else {
      setAmountStr(amountStr + key);
    }
  };

  const handleSubmit = async () => {
    const numericAmount = parseFloat(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    // Validación obligatoria: exige elegir una cuenta
    if (!selectedAccountId) {
      setErrorMessage('Debes seleccionar la cuenta obligatoriamente');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await financeService.createTransaction({
        account_id: selectedAccountId,
        category_id: selectedCategoryId,
        type,
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
        setErrorMessage('Error al registrar el movimiento.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-white/60 overflow-hidden px-5 pt-3 pb-6 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        {/* Píldora de arrastre */}
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-1"></div>

        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="bg-gray-100 p-1 rounded-full flex gap-1 items-center text-xs font-medium">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                type === 'expense' ? 'bg-[#111827] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                type === 'income' ? 'bg-[#2E7D56] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Ingreso
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-100/80 px-2.5 py-1.5 rounded-full flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            <span>Hoy</span>
          </div>
        </div>

        {/* Display del Importe */}
        <div className="flex flex-col items-center justify-center py-2 space-y-1">
          <div className="flex items-baseline justify-center tracking-tight">
            <span className="text-2xl text-gray-400 font-normal mr-1">$</span>
            <span className="text-4xl font-bold tracking-tight text-gray-900 tabular-nums">
              {amountStr}
            </span>
          </div>

          {isEditingNote ? (
            <input
              type="text"
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setIsEditingNote(false)}
              placeholder="Escribe una nota..."
              className="text-xs text-center border-b border-gray-300 focus:outline-none focus:border-gray-900 py-1 w-48 text-gray-800"
            />
          ) : (
            <div
              onClick={() => setIsEditingNote(true)}
              className="text-xs text-gray-400 flex items-center justify-center gap-1.5 cursor-pointer hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              <span>{note ? note : 'Toca para escribir nota...'}</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Selectores */}
        <div className="flex flex-col gap-2.5">
          {/* Selector Obligatorio de Cuenta */}
          <div
            className={`flex items-center justify-between border rounded-xl px-3 py-2.5 text-xs transition ${
              !selectedAccountId
                ? 'bg-[#FDF2F0] border-[#C25E4A]/30'
                : 'bg-gray-50/80 border-gray-100'
            }`}
          >
            <span className="text-gray-500 font-medium">
              Cuenta <span className="text-[#C25E4A]">*</span>
            </span>
            <select
              required
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setErrorMessage(null);
              }}
              className={`bg-transparent font-semibold cursor-pointer outline-none text-right text-xs max-w-[220px] truncate ${
                !selectedAccountId ? 'text-[#C25E4A] font-bold' : 'text-gray-800'
              }`}
            >
              <option value="" disabled>
                -- Seleccionar cuenta obligatoria --
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${Number(acc.current_balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Categorías */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-gray-400 font-medium flex-shrink-0 mr-1">Categoría</span>
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#111827] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Teclado Numérico */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="h-[44px] text-lg font-medium text-gray-800 rounded-xl hover:bg-gray-100 active:scale-95 transition flex items-center justify-center bg-gray-50/50 border border-gray-100/50 cursor-pointer"
            >
              {key === 'backspace' ? (
                <span className="material-symbols-outlined text-[20px]">backspace</span>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        {/* Botón Guardar */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-[50px] rounded-2xl bg-[#111827] text-white font-medium text-sm flex items-center justify-center shadow-lg shadow-gray-900/10 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 mt-1"
        >
          {isSubmitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            `Guardar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`
          )}
        </button>
      </div>
    </div>
  );
};