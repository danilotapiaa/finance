import React, { useState, useEffect } from 'react';
import type { Account, AccountType } from '../types/database';
import { financeService } from '../services/financeService';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
  onSuccess: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceStr, setBalanceStr] = useState('0.00');
  const [accountNumber, setAccountNumber] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [icon, setIcon] = useState('account_balance');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableIcons = [
    { name: 'account_balance', label: 'Banco' },
    { name: 'savings', label: 'Ahorro' },
    { name: 'wallet', label: 'Billetera' },
    { name: 'credit_card', label: 'Tarjeta' },
    { name: 'payments', label: 'Efectivo' },
  ];

  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        setName(accountToEdit.name);
        setType(accountToEdit.type);
        setBalanceStr(Number(accountToEdit.current_balance).toFixed(2));
        setAccountNumber(accountToEdit.account_number_masked || '');
        setTargetAmountStr(
          accountToEdit.target_amount !== null && accountToEdit.target_amount !== undefined
            ? Number(accountToEdit.target_amount).toFixed(2)
            : ''
        );
        setIcon(accountToEdit.icon || 'account_balance');
      } else {
        setName('');
        setType('bank');
        setBalanceStr('0.00');
        setAccountNumber('');
        setTargetAmountStr('');
        setIcon('account_balance');
      }
      setErrorMessage(null);
    }
  }, [isOpen, accountToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor ingresa un nombre para la cuenta');
      return;
    }

    const numericBalance = parseFloat(balanceStr);
    if (isNaN(numericBalance)) {
      setErrorMessage('Ingresa un saldo numérico válido');
      return;
    }

    const numericTarget = targetAmountStr.trim() !== '' ? parseFloat(targetAmountStr) : null;
    if (numericTarget !== null && (isNaN(numericTarget) || numericTarget < 0)) {
      setErrorMessage('Ingresa una meta de ahorro válida');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (accountToEdit) {
        // Actualizar saldo actual y meta de ahorro en Supabase
        await financeService.updateAccount(accountToEdit.id, {
          name: name.trim(),
          type,
          current_balance: numericBalance,
          account_number_masked: accountNumber.trim() || null,
          target_amount: numericTarget,
          icon,
        });
      } else {
        // Crear cuenta nueva con saldo inicial y meta
        await financeService.createAccount({
          name: name.trim(),
          type,
          initial_balance: numericBalance,
          current_balance: numericBalance,
          account_number_masked: accountNumber.trim() || null,
          target_amount: numericTarget,
          color: null,
          icon,
          is_active: true,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error al guardar la cuenta.');
      }
    } finally {
      setIsSubmitting(false);
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
            {accountToEdit ? 'Editar Cuenta y Saldo' : 'Nueva Cuenta'}
          </h2>
          <div className="w-8"></div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center">{errorMessage}</div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs">
          {/* Nombre de la Cuenta */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Nombre de la Cuenta
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Banco Pichincha, Billetera USD..."
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
            />
          </div>

          {/* Tipo de Cuenta */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Tipo de Activo
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-[#F8F9FA] p-1 rounded-2xl border border-black/[0.05]">
              {(['bank', 'savings', 'cash', 'credit'] as AccountType[]).map((t) => {
                const labels: Record<AccountType, string> = {
                  bank: 'Banco',
                  savings: 'Ahorro',
                  cash: 'Efectivo',
                  credit: 'Tarjeta',
                };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 rounded-xl font-medium transition cursor-pointer ${
                      type === t ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#6B7280]'
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saldo de la Cuenta (Siempre visible y editable) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                {accountToEdit ? 'Saldo Actual ($)' : 'Saldo Inicial ($)'}
              </label>
              <span className="text-[10px] text-[#9CA3AF]">
                {accountToEdit ? 'Ajusta el saldo real' : 'Monto de apertura'}
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] font-semibold focus:outline-none focus:border-[#111827] tabular-nums"
            />
          </div>

          {/* Meta de Ahorro Objetivo (Visible y editable) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#2E7D56] uppercase tracking-wider">
                Meta de Ahorro Objetivo ($)
              </label>
              <span className="text-[10px] text-[#6B7280]">Opcional</span>
            </div>
            <input
              type="number"
              step="0.01"
              value={targetAmountStr}
              onChange={(e) => setTargetAmountStr(e.target.value)}
              placeholder="Ej. 6000.00"
              className="w-full h-11 px-3.5 bg-[#E8F5EE] border border-[#2E7D56]/20 rounded-xl text-sm text-[#2E7D56] font-semibold focus:outline-none focus:border-[#2E7D56] tabular-nums"
            />
          </div>

          {/* Número de Cuenta Enmascarado */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Últimos dígitos o referencia (opcional)
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="•••• 4821"
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
            />
          </div>

          {/* Selector de Icono */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Icono Representativo
            </label>
            <div className="flex gap-2">
              {availableIcons.map((ic) => (
                <button
                  key={ic.name}
                  type="button"
                  onClick={() => setIcon(ic.name)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition border cursor-pointer ${
                    icon === ic.name
                      ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                      : 'bg-[#F8F9FA] text-[#6B7280] border-black/5 hover:bg-neutral-200'
                  }`}
                  title={ic.label}
                >
                  <span className="material-symbols-outlined text-[20px]">{ic.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#111827] text-white rounded-2xl font-semibold text-sm hover:bg-black active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-3 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : accountToEdit ? (
              'Guardar Cambios en Cuenta'
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};