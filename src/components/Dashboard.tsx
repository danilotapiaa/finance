import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import type { Account, Category, Transaction, Profile } from '../types/database';
import { TransactionModal } from './TransactionModal';

interface DashboardProps {
  onOpenProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carga robusta de datos: independiente y no bloqueante
  const loadData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        financeService.getProfile(),
        financeService.getAccounts(),
        financeService.getCategories(),
        financeService.getTransactions(10),
      ]);

      const [profRes, accRes, catRes, txRes] = results;

      if (profRes.status === 'fulfilled' && profRes.value) {
        setProfile(profRes.value);
      }
      if (accRes.status === 'fulfilled') {
        setAccounts(accRes.value);
      }
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value);
      }
      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Se ejecuta de inmediato cuando el usuario se autentica
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Balance Disponible Consolidado (Banco, Tarjeta, Efectivo)
  const spendableBalance = accounts
    .filter((acc) => acc.type !== 'savings')
    .reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  // Balance Total en Ahorros (Separado)
  const savingsBalance = accounts
    .filter((acc) => acc.type === 'savings')
    .reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  // Flujo mensual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthTransactions = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalExpense = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const netMonth = totalIncome - totalExpense;
  const spentPercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  const availableBalance = Math.max(0, totalIncome - totalExpense);

  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = (userName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loading && accounts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-canvas text-ink relative">
      {/* 1. Header Unificado */}
      <header className="sticky top-0 w-full z-30 bg-canvas/90 backdrop-blur-xl border-b border-ink/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-medium text-muted capitalize">
              {todayFormatted}
            </span>
            <span className="text-[17px] font-semibold text-ink tracking-tight">
              Hola, {userName.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-9 h-9 rounded-full bg-ink text-canvas flex items-center justify-center shadow-sm active:scale-95 transition-transform hover:opacity-90 cursor-pointer"
              title="Nueva Transacción"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full bg-surface-muted border border-ink/5 flex items-center justify-center shadow-sm active:scale-95 transition-transform cursor-pointer"
              title="Ajustes"
            >
              <span className="text-xs font-semibold text-ink">{userInitials}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col w-full px-5 pb-32 pt-4 space-y-6">
        {/* 2. Hero Balance Disponible */}
        <section className="flex flex-col items-center text-center space-y-1.5 py-1">
          <div className="flex items-center space-x-1.5 text-muted">
            <span className="text-xs font-medium">Balance Disponible</span>
            <button
              type="button"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="flex items-center justify-center p-0.5 rounded-full hover:text-ink transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isBalanceVisible ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>

          <div className="flex items-baseline justify-center tracking-tight">
            <span className="text-2xl text-muted font-normal mr-1">$</span>
            <span className="text-4xl font-bold tracking-tight text-ink tabular-nums">
              {isBalanceVisible ? spendableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-accent-soft text-accent">
              <span className="material-symbols-outlined text-[14px]">
                {netMonth >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="text-xs font-semibold tabular-nums">
                {netMonth >= 0 ? `+$${netMonth.toFixed(2)}` : `-$${Math.abs(netMonth).toFixed(2)}`} este mes
              </span>
            </div>

            {savingsBalance > 0 && (
              <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-surface-muted text-muted">
                <span className="material-symbols-outlined text-[14px] text-accent">savings</span>
                <span className="text-xs font-semibold tabular-nums">
                  {isBalanceVisible ? `$${savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••'} en ahorros
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 3. Carrusel de Cuentas Reales */}
        <section className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Mis Cuentas</h2>
          </div>

          <div className="flex space-x-3.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="min-w-[210px] bg-surface rounded-2xl p-4 shadow-sm border border-ink/[0.04] flex flex-col justify-between h-[140px] flex-shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-ink">
                    <span className="material-symbols-outlined text-[18px]">{acc.icon || 'account_balance'}</span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">{acc.account_number_masked}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block truncate">{acc.name}</span>
                  <span className="text-lg font-bold text-ink mt-0.5 block tabular-nums">
                    {isBalanceVisible ? `$${Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Flujo Mensual */}
        <section className="flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Flujo Mensual</h2>
            <span className="text-xs text-muted capitalize">
              {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date())}
            </span>
          </div>

          <div className="bg-surface rounded-2xl p-4 shadow-sm border border-ink/[0.04] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-xs text-muted">Ingresos</span>
                </div>
                <span className="text-base font-semibold text-ink tabular-nums">
                  ${totalIncome.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-expense"></div>
                  <span className="text-xs text-muted">Gastos</span>
                </div>
                <span className="text-base font-semibold text-ink tabular-nums">
                  ${totalExpense.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="w-full h-1.5 rounded-full bg-surface-muted flex overflow-hidden">
                <div className="bg-ink h-full transition-all duration-500" style={{ width: `${spentPercent}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-muted text-[11px] font-medium">
                <span>{spentPercent}% del ingreso utilizado</span>
                <span className="tabular-nums">${availableBalance.toFixed(2)} disponible</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Movimientos Recientes */}
        <section className="flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Movimientos recientes</h2>
          </div>

          <div className="bg-surface rounded-2xl p-2 shadow-sm border border-ink/[0.04] space-y-1">
            {transactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-subtle">
                Aún no tienes movimientos. Toca el botón <strong>+</strong> para registrar el primero.
              </div>
            ) : (
              transactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isIncome ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {tx.category?.icon || (isIncome ? 'payments' : 'receipt_long')}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-ink truncate">
                          {tx.note || tx.category?.name || 'Movimiento'}
                        </span>
                        <span className="text-[11px] text-muted truncate">
                          {tx.category?.name}{tx.account?.name ? ` en ${tx.account.name}` : ''}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold flex-shrink-0 ml-3 tabular-nums ${
                        isIncome ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {isIncome ? `+$${Number(tx.amount).toFixed(2)}` : `-$${Number(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Modal de Registro Rápido */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts}
        categories={categories}
        onSuccess={loadData}
      />
    </div>
  );
};