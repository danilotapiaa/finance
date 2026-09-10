import React, { useState, useEffect } from 'react';
import { financeService } from '../services/financeService';
import type { Account } from '../types/database';
import { TransferModal } from './TransferModal';

export const AccountsScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await financeService.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  // Cálculo de distribución porcentual
  const bankBalance = accounts
    .filter((a) => a.type === 'bank')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);
  const savingsBalance = accounts
    .filter((a) => a.type === 'savings')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);
  const cashBalance = accounts
    .filter((a) => a.type === 'cash')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const bankPct = totalBalance > 0 ? Math.round((bankBalance / totalBalance) * 100) : 0;
  const savingsPct = totalBalance > 0 ? Math.round((savingsBalance / totalBalance) * 100) : 0;
  const cashPct = totalBalance > 0 ? Math.max(0, 100 - bankPct - savingsPct) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#111827]/20 border-t-[#111827] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F8F9FA] text-[#111827] relative">
      {/* Header Fijo */}
      <header className="sticky top-0 w-full z-30 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Cuentas</h1>
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#E5E7EB] hover:bg-neutral-300 text-[#111827] transition-colors active:scale-95 text-xs font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            <span>Transferir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col w-full px-5 pb-32 pt-4 space-y-5">
        {/* Total Hero */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B7280] tracking-wider uppercase">
              Total en Cuentas
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              {accounts.length} activas
            </span>
          </div>

          <div className="text-3xl font-bold tracking-tight text-[#111827] tabular-nums">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>

          {/* Barra de Distribución Proporcional */}
          <div className="space-y-1.5 pt-1">
            <div className="h-2 w-full bg-[#F3F4F6] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#111827]" style={{ width: `${bankPct}%` }} title={`Bancos ${bankPct}%`}></div>
              <div className="h-full bg-[#2E7D56]" style={{ width: `${savingsPct}%` }} title={`Ahorros ${savingsPct}%`}></div>
              <div className="h-full bg-[#9CA3AF]" style={{ width: `${cashPct}%` }} title={`Efectivo ${cashPct}%`}></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#111827]"></span>Bancos {bankPct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2E7D56]"></span>Ahorros {savingsPct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#9CA3AF]"></span>Efectivo {cashPct}%
              </span>
            </div>
          </div>
        </section>

        {/* Tarjeta de Acción Rápida: Transferir entre cuentas */}
        <section
          onClick={() => setIsTransferModalOpen(true)}
          className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.04] flex items-center justify-between cursor-pointer active:scale-[0.99] transition"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">sync_alt</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111827]">Transferir entre cuentas</h4>
              <p className="text-xs text-[#6B7280]">Mueve saldo de banco a ahorros o efectivo al instante</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#9CA3AF] text-[20px]">chevron_right</span>
        </section>

        {/* Categorías de Cuentas */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-1">Tus Cuentas y Metas</h3>

          <div className="space-y-3">
            {accounts.map((acc) => {
              const balance = Number(acc.current_balance);
              const target = acc.target_amount ? Number(acc.target_amount) : 0;
              const progressPct = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0;

              return (
                <div
                  key={acc.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.04] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                        <span className="material-symbols-outlined text-[20px]">{acc.icon || 'account_balance'}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#111827]">{acc.name}</h4>
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          {acc.account_number_masked || (acc.type === 'savings' ? 'Meta de ahorro' : 'Disponible')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold text-[#111827] tabular-nums block">
                        ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {acc.type === 'savings' && target > 0 && (
                        <span className="text-[10px] font-semibold text-[#2E7D56] bg-[#E8F5EE] px-2 py-0.5 rounded-full">
                          {progressPct}% meta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progreso de Meta */}
                  {acc.type === 'savings' && target > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2E7D56] rounded-full" style={{ width: `${progressPct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#6B7280]">
                        <span>Objetivo: ${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span>Faltan: ${Math.max(0, target - balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nota de Privacidad */}
        <div className="p-3.5 bg-white rounded-2xl border border-black/[0.04] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Tus cuentas se actualizan automáticamente de forma atómica mediante triggers de Supabase.
          </p>
        </div>
      </main>

      {/* Modal de Transferencias */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onSuccess={loadAccounts}
      />
    </div>
  );
};