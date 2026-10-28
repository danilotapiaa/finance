import React, { useState, useEffect } from 'react';
import type { Account } from '../types/database';
import { financeService } from '../services/financeService';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}) => {
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amountStr, setAmountStr] = useState('0');
  const [concept, setConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickPresets: number[] = [50, 100, 250];

  useEffect(() => {
    if (isOpen) {
      const firstAccount = accounts[0];
      const secondAccount = accounts[1];

      setFromAccountId(firstAccount?.id ?? '');
      setToAccountId(secondAccount?.id ?? '');
      setAmountStr('0');
      setConcept('');
      setErrorMessage(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  const handleSwapAccounts = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

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

  const handleQuickPreset = (value: number) => {
    setAmountStr(value.toString());
  };

  const handleSubmit = async () => {
    const numericAmount = parseFloat(amountStr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!fromAccountId || !toAccountId) {
      setErrorMessage('Selecciona las dos cuentas');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMessage('La cuenta de origen y destino deben ser diferentes');
      return;
    }

    if (fromAccount && Number(fromAccount.current_balance) < numericAmount) {
      setErrorMessage(`Saldo insuficiente en ${fromAccount.name}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await financeService.createTransfer({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: numericAmount,
        concept: concept.trim() || null,
        date: new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al realizar la transferencia.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericAmount = parseFloat(amountStr) || 0;
  const fromNewBalance = fromAccount ? Math.max(0, Number(fromAccount.current_balance) - numericAmount) : 0;
  const toNewBalance = toAccount ? Number(toAccount.current_balance) + numericAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-surface rounded-t-[32px] shadow-2xl border-t border-ink/5 overflow-hidden px-5 pt-3 pb-6 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        <div className="w-9 h-1 bg-ink/20 rounded-full mx-auto mb-1"></div>

        <div className="flex items-center justify-between border-b border-ink/[0.04] pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:bg-ink/10 transition active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[16px] font-semibold text-ink">Transferencia</h2>
          <div className="w-8"></div>
        </div>

        {/* Selector de Cuentas */}
        <div className="relative bg-canvas rounded-2xl border border-ink/[0.05] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Desde</span>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${Number(acc.current_balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-ink/[0.06]"></div>
            <button
              type="button"
              onClick={handleSwapAccounts}
              className="absolute w-7 h-7 rounded-full bg-surface border border-ink/[0.08] shadow-sm flex items-center justify-center text-ink hover:rotate-180 transition-transform active:scale-90 cursor-pointer"
              title="Intercambiar origen y destino"
            >
              <span className="material-symbols-outlined text-[16px]">swap_vert</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-accent">Hacia</span>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${Number(acc.current_balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Display del Importe */}
        <div className="text-center py-1">
          <div className="flex items-baseline justify-center tracking-tight">
            <span className="text-2xl text-subtle font-normal mr-1">$</span>
            <span className="text-4xl font-bold tracking-tight text-ink tabular-nums">{amountStr}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-2">
            {quickPresets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickPreset(val)}
                className="px-3 py-1 bg-surface border border-ink/5 rounded-full text-xs font-medium text-muted hover:text-ink shadow-sm active:scale-95 cursor-pointer"
              >
                +${val}
              </button>
            ))}
          </div>
        </div>

        {/* Vista previa de saldos */}
        <div className="bg-canvas rounded-xl p-3 text-xs space-y-1 border border-ink/[0.04]">
          <div className="flex justify-between text-muted">
            <span>Nuevo saldo {fromAccount?.name || 'Origen'}:</span>
            <span className="font-semibold text-ink tabular-nums">${fromNewBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Nuevo saldo {toAccount?.name || 'Destino'}:</span>
            <span className="font-semibold text-accent tabular-nums">${toNewBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Concepto opcional */}
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Ej. Aporte mensual"
          className="w-full h-10 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-xs text-ink focus:outline-none focus:border-ink"
        />

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center">{errorMessage}</div>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="h-[42px] text-lg font-medium text-ink rounded-xl hover:bg-ink/10 active:scale-95 transition flex items-center justify-center bg-canvas border border-ink/10 cursor-pointer"
            >
              {key === 'backspace' ? (
                <span className="material-symbols-outlined text-[20px]">backspace</span>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-[50px] rounded-2xl bg-ink text-canvas font-medium text-sm flex items-center justify-center shadow-lg shadow-ink/10 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 mt-1"
        >
          {isSubmitting ? (
            <span className="inline-block w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin"></span>
          ) : (
            'Transferir'
          )}
        </button>
      </div>
    </div>
  );
};