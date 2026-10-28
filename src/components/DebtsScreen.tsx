import React, { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import type { Debt, Account } from '../types/database';
import { DebtModal } from './DebtModal';
import { DebtPaymentModal } from './DebtPaymentModal';

export const DebtsScreen: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'lend' | 'borrow' | 'paid'>('lend');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [debtData, accData] = await Promise.all([
        financeService.getDebts(),
        financeService.getAccounts(),
      ]);
      setDebts(debtData);
      setAccounts(accData);
    } catch (err) {
      console.error('Error cargando deudas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos consolidados
  const totalLendPending = debts
    .filter((d) => d.type === 'lend' && d.status !== 'paid')
    .reduce((sum, d) => sum + (Number(d.total_amount) - Number(d.paid_amount)), 0);

  const totalBorrowPending = debts
    .filter((d) => d.type === 'borrow' && d.status !== 'paid')
    .reduce((sum, d) => sum + (Number(d.total_amount) - Number(d.paid_amount)), 0);

  const netDebtDifference = totalLendPending - totalBorrowPending;

  // Filtrado por segmento y búsqueda
  const filteredDebts = debts.filter((d) => {
    const matchesSegment = activeSegment === 'paid' ? d.status === 'paid' : d.type === activeSegment && d.status !== 'paid';
    const term = searchQuery.toLowerCase();
    const matchesSearch = !term || d.person_name.toLowerCase().includes(term) || (d.note && d.note.toLowerCase().includes(term));
    return matchesSegment && matchesSearch;
  });

  const handleDeleteDebt = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar el registro de deuda de ${name}?`);
    if (!confirmDelete) return;

    try {
      await financeService.deleteDebt(id);
      loadData();
    } catch (err) {
      console.error('Error eliminando deuda:', err);
      alert('Error al eliminar la deuda.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-canvas text-ink relative min-h-screen">
      {/* Header Fijo */}
      <header className="sticky top-0 w-full z-30 bg-canvas/90 backdrop-blur-xl border-b border-ink/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">Deudas</h1>
          <button
            type="button"
            onClick={() => setIsNewDebtOpen(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-ink text-canvas transition active:scale-95 text-xs font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nueva deuda</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 px-5 pt-4 pb-32 space-y-4">
        {/* Tarjeta Hero Resumen */}
        <section className="bg-surface rounded-2xl p-5 shadow-sm border border-ink/[0.04] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Me Deben */}
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                <span className="text-xs font-medium text-muted">
                  Me deben
                </span>
              </div>
              <span className="text-xl font-bold text-accent tabular-nums">
                ${totalLendPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Debo */}
            <div className="flex flex-col space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-expense"></div>
                <span className="text-xs font-medium text-muted">
                  Debo
                </span>
              </div>
              <span className="text-xl font-bold text-expense tabular-nums">
                ${totalBorrowPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs text-muted">
            <span>Balance neto</span>
            <span className={`font-bold tabular-nums ${netDebtDifference >= 0 ? 'text-accent' : 'text-expense'}`}>
              {netDebtDifference >= 0 ? `+$${netDebtDifference.toFixed(2)}` : `-$${Math.abs(netDebtDifference).toFixed(2)}`}
            </span>
          </div>
        </section>

        {/* Buscador */}
        <div className="relative flex items-center bg-surface rounded-xl border border-ink/[0.06] px-3.5 py-2 shadow-sm">
          <span className="material-symbols-outlined text-subtle text-[18px] mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar persona..."
            className="w-full bg-transparent text-xs text-ink placeholder-subtle outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-subtle hover:text-ink text-xs cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        {/* Segmented Control */}
        <div className="flex bg-surface-muted p-1 rounded-full text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveSegment('lend')}
            className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSegment === 'lend' ? 'bg-surface text-ink shadow-sm font-semibold' : 'text-muted'
            }`}
          >
            Me deben
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment('borrow')}
            className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSegment === 'borrow' ? 'bg-surface text-ink shadow-sm font-semibold' : 'text-muted'
            }`}
          >
            Debo
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment('paid')}
            className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSegment === 'paid' ? 'bg-surface text-ink shadow-sm font-semibold' : 'text-muted'
            }`}
          >
            Saldadas
          </button>
        </div>

        {/* Lista de Deudas */}
        <div className="space-y-3">
          {filteredDebts.length === 0 ? (
            <div className="bg-surface rounded-2xl p-8 text-center text-xs text-subtle border border-ink/[0.04]">
              No hay deudas en esta sección.
            </div>
          ) : (
            filteredDebts.map((debt) => {
              const total = Number(debt.total_amount);
              const paid = Number(debt.paid_amount);
              const remaining = Math.max(0, total - paid);
              const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
              const isLend = debt.type === 'lend';

              const personInitials = debt.person_name
                .split(' ')
                .filter(Boolean)
                .map((n) => n.charAt(0))
                .join('')
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={debt.id}
                  className="bg-surface rounded-2xl p-4 shadow-sm border border-ink/[0.04] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-surface-muted text-ink font-semibold flex items-center justify-center text-xs flex-shrink-0">
                        {personInitials}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-ink">{debt.person_name}</h4>
                        <span className="text-[11px] text-muted block">
                          Total ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-medium text-muted block">Pendiente</span>
                      <span
                        className={`text-base font-bold tabular-nums ${
                          isLend ? 'text-accent' : 'text-expense'
                        }`}
                      >
                        ${remaining.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso de Amortización */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Pagado ${paid.toFixed(2)}</span>
                      {debt.due_date && (
                        <span>Límite: {new Date(debt.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          debt.status === 'paid' ? 'bg-accent' : isLend ? 'bg-accent' : 'bg-expense'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-1 border-t border-ink/5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDeleteDebt(debt.id, debt.person_name)}
                      className="text-subtle hover:text-expense transition text-[11px] cursor-pointer"
                    >
                      Eliminar
                    </button>

                    {debt.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => setSelectedDebtForPayment(debt)}
                        className="px-3.5 py-1.5 rounded-full bg-ink text-canvas text-[11px] font-semibold transition active:scale-95 shadow-sm cursor-pointer"
                      >
                        Registrar abono
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modales */}
      <DebtModal
        isOpen={isNewDebtOpen}
        onClose={() => setIsNewDebtOpen(false)}
        onSuccess={loadData}
      />

      <DebtPaymentModal
        debt={selectedDebtForPayment}
        accounts={accounts}
        onClose={() => setSelectedDebtForPayment(null)}
        onSuccess={loadData}
      />
    </div>
  );
};