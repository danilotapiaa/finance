import React, { useState, useEffect } from 'react';
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

  const loadMonthTransactions = async () => {
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
  };

  useEffect(() => {
    loadMonthTransactions();
  }, [currentDate]);

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

  // Filtrado por buscador y chips
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
    <div className="flex-1 flex flex-col w-full bg-[#F8F9FA] text-[#111827] relative">
      {/* Header Fijo */}
      <header className="sticky top-0 w-full z-30 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold tracking-tight text-[#111827]">Historial</h1>

          {/* Selector de Mes Interactivo */}
          <div className="flex items-center gap-1.5 bg-white border border-black/5 rounded-full px-2 py-1 shadow-sm text-xs font-medium">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-[#6B7280] hover:text-[#111827] active:scale-90 transition cursor-pointer"
              title="Mes anterior"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="capitalize px-1 text-[#111827]">{monthNameFormatted}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-[#6B7280] hover:text-[#111827] active:scale-90 transition cursor-pointer"
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
        <section className="bg-white rounded-2xl p-4 border border-black/[0.05] shadow-sm space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
                Balance Neto del Mes
              </span>
              <div
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  netBalance >= 0 ? 'text-[#2E7D56]' : 'text-[#C25E4A]'
                }`}
              >
                {netBalance >= 0 ? `+$${netBalance.toFixed(2)}` : `-$${Math.abs(netBalance).toFixed(2)}`}
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                netBalance >= 0 ? 'bg-[#E8F5EE] text-[#2E7D56]' : 'bg-[#FDF2F0] text-[#C25E4A]'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {netBalance >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>{netBalance >= 0 ? 'Superávit' : 'Déficit'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2E7D56]"></div>
              <div>
                <div className="text-[11px] text-[#6B7280]">Ingresos</div>
                <div className="text-sm font-semibold text-[#111827] tabular-nums">${totalIncome.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C25E4A]"></div>
              <div>
                <div className="text-[11px] text-[#6B7280]">Gastos</div>
                <div className="text-sm font-semibold text-[#111827] tabular-nums">${totalExpense.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Barra de Proporción de Gasto */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[10px] text-[#6B7280] font-medium">
              <span>Ritmo de Gasto</span>
              <span>{spentPercent}% gastado</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
              <div className="h-full bg-[#111827] transition-all duration-500" style={{ width: `${spentPercent}%` }}></div>
            </div>
          </div>
        </section>

        {/* Buscador de Movimientos */}
        <div className="relative flex items-center bg-white rounded-xl border border-black/[0.06] px-3.5 py-2 shadow-sm">
          <span className="material-symbols-outlined text-[#9CA3AF] text-[18px] mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nota, categoría o cuenta..."
            className="w-full bg-transparent text-xs text-[#111827] placeholder-[#9CA3AF] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#9CA3AF] hover:text-[#111827] text-xs">
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
                ? 'bg-[#111827] text-white shadow-sm'
                : 'bg-white border border-black/5 text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filterType === 'expense'
                ? 'bg-[#111827] text-white shadow-sm'
                : 'bg-white border border-black/5 text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Gastos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              filterType === 'income'
                ? 'bg-[#2E7D56] text-white shadow-sm'
                : 'bg-white border border-black/5 text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Ingresos
          </button>
        </section>

        {/* Feed Cronológico de Transacciones */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-[#111827]/20 border-t-[#111827] rounded-full animate-spin mx-auto"></div>
          </div>
        ) : dateKeys.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-[#9CA3AF] border border-black/[0.04]">
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
                    <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider capitalize">
                      {group.label}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        group.subtotal >= 0 ? 'text-[#2E7D56]' : 'text-[#111827]'
                      }`}
                    >
                      {group.subtotal >= 0 ? `+$${group.subtotal.toFixed(2)}` : `-$${Math.abs(group.subtotal).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Tarjetas del Día */}
                  <div className="bg-white rounded-2xl border border-black/[0.04] shadow-sm divide-y divide-black/[0.04] overflow-hidden">
                    {group.items.map((tx) => {
                      const isInc = tx.type === 'income';
                      const amt = Number(tx.amount);

                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTransaction(tx)}
                          className="p-3.5 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isInc ? 'bg-[#E8F5EE] text-[#2E7D56]' : 'bg-[#F3F4F6] text-[#111827]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {tx.category?.icon || (isInc ? 'payments' : 'receipt_long')}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#111827] truncate">
                                {tx.note || tx.category?.name || 'Movimiento'}
                              </div>
                              <div className="text-[11px] text-[#6B7280] truncate">
                                {tx.category?.name} • {tx.account?.name}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-semibold tabular-nums ml-3 flex-shrink-0 ${
                              isInc ? 'text-[#2E7D56]' : 'text-[#111827]'
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

      {/* Modal de Detalle y Eliminación */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDeleted={loadMonthTransactions}
      />
    </div>
  );
};