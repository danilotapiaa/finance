import React, { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import type { Transaction } from '../types/database';
import { TransactionDetailModal } from './TransactionDetailModal';

export const HistoryScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Fecha del mes seleccionado
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const loadMonthTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await financeService.getTransactionsByMonth(year, month);
      setTransactions(data);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    // Carga del mes: los cambios de estado ocurren después del await.
    const fetchMonth = async () => {
      await loadMonthTransactions();
    };
    void fetchMonth();
  }, [loadMonthTransactions]);

  // Navegación de mes
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNameFormatted = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  // Cálculos del resumen mensual
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;
  const spentPercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;

  // Filtrado por buscador y tipo
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      !term ||
      (tx.note && tx.note.toLowerCase().includes(term)) ||
      (tx.category?.name && tx.category.name.toLowerCase().includes(term)) ||
      (tx.account?.name && tx.account.name.toLowerCase().includes(term));

    return matchesType && matchesSearch;
  });

  // Agrupación cronológica por fecha
  const groupedTransactions: { [key: string]: { label: string; subtotal: number; items: Transaction[] } } = {};

  filteredTransactions.forEach((tx) => {
    const d = new Date(tx.date);
    const dateKey = d.toISOString().split('T')[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let label = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    if (dateKey === todayStr) label = `Hoy — ${label}`;
    else if (dateKey === yesterdayStr) label = `Ayer — ${label}`;

    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = { label, subtotal: 0, items: [] };
    }

    const txAmount = Number(tx.amount);
    groupedTransactions[dateKey].items.push(tx);
    groupedTransactions[dateKey].subtotal += tx.type === 'income' ? txAmount : -txAmount;
  });

  const dateKeys = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex-1 flex flex-col w-full bg-canvas text-ink relative">
      {/* Header Fijo */}
      <header className="sticky top-0 w-full z-30 bg-canvas/90 backdrop-blur-xl border-b border-ink/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold tracking-tight text-ink">Historial</h1>

          {/* Selector de Mes Interactivo */}
          <div className="flex items-center gap-1.5 bg-surface border border-ink/5 rounded-full px-2 py-1 shadow-sm text-xs font-medium">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-muted hover:text-ink active:scale-90 transition cursor-pointer"
              title="Mes anterior"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="capitalize px-1 text-ink">{monthNameFormatted}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-muted hover:text-ink active:scale-90 transition cursor-pointer"
              title="Mes siguiente"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col w-full px-5 pb-32 pt-4 space-y-4">
        {/* Resumen Mensual (Pulse Card) */}
        <section className="bg-surface rounded-2xl p-4 border border-ink/[0.05] shadow-sm space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-medium tracking-wider text-muted">
                Balance del mes
              </span>
              <div
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  netBalance >= 0 ? 'text-accent' : 'text-expense'
                }`}
              >
                {netBalance >= 0 ? `+$${netBalance.toFixed(2)}` : `-$${Math.abs(netBalance).toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <div>
                <div className="text-[11px] text-muted">Ingresos</div>
                <div className="text-sm font-semibold text-ink tabular-nums">${totalIncome.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-expense"></div>
              <div>
                <div className="text-[11px] text-muted">Gastos</div>
                <div className="text-sm font-semibold text-ink tabular-nums">${totalExpense.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Barra de Ritmo de Gasto */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-end items-center text-[11px] text-muted font-medium">
              <span>{spentPercent}% del ingreso gastado</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-ink transition-all duration-500"
                style={{ width: `${spentPercent}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* Buscador de Movimientos */}
        <div className="relative flex items-center bg-surface rounded-xl border border-ink/[0.06] px-3.5 py-2 shadow-sm">
          <span className="material-symbols-outlined text-subtle text-[18px] mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar movimiento..."
            className="w-full bg-transparent text-xs text-ink placeholder-subtle outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-subtle hover:text-ink text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        {/* Filtros en Píldoras */}
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-5 px-5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-ink text-canvas shadow-sm'
                : 'bg-surface border border-ink/5 text-muted hover:text-ink'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filterType === 'expense'
                ? 'bg-ink text-canvas shadow-sm'
                : 'bg-surface border border-ink/5 text-muted hover:text-ink'
            }`}
          >
            Gastos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filterType === 'income'
                ? 'bg-accent text-canvas shadow-sm'
                : 'bg-surface border border-ink/5 text-muted hover:text-ink'
            }`}
          >
            Ingresos
          </button>
        </section>

        {/* Feed Cronológico de Transacciones */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin mx-auto"></div>
          </div>
        ) : dateKeys.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 text-center text-xs text-subtle border border-ink/[0.04]">
            No hay movimientos en este periodo con los filtros seleccionados.
          </div>
        ) : (
          <div className="space-y-4">
            {dateKeys.map((dateKey) => {
              const group = groupedTransactions[dateKey];
              return (
                <div key={dateKey} className="space-y-1.5">
                  {/* Encabezado del Día con Subtotal */}
                  <div className="flex items-baseline justify-between px-1">
                    <span className="text-[11px] font-semibold text-muted capitalize">
                      {group.label}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        group.subtotal >= 0 ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {group.subtotal >= 0 ? `+$${group.subtotal.toFixed(2)}` : `-$${Math.abs(group.subtotal).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Tarjetas del Día */}
                  <div className="bg-surface rounded-2xl border border-ink/[0.04] shadow-sm divide-y divide-ink/[0.04] overflow-hidden">
                    {group.items.map((tx) => {
                      const isInc = tx.type === 'income';
                      const amt = Number(tx.amount);

                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTransaction(tx)}
                          className="p-3.5 flex items-center justify-between hover:bg-surface-muted transition-colors cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isInc ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {tx.category?.icon || (isInc ? 'payments' : 'receipt_long')}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-ink truncate">
                                {tx.note || tx.category?.name || 'Movimiento'}
                              </div>
                              <div className="text-[11px] text-muted truncate">
                                {tx.category?.name}{tx.account?.name ? ` en ${tx.account.name}` : ''}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-semibold tabular-nums ml-3 flex-shrink-0 ${
                              isInc ? 'text-accent' : 'text-ink'
                            }`}
                          >
                            {isInc ? `+$${amt.toFixed(2)}` : `-$${amt.toFixed(2)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalle, Edición y Eliminación */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDeleted={loadMonthTransactions}
        onUpdated={loadMonthTransactions}
      />
    </div>
  );
};