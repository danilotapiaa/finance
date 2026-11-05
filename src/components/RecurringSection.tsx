import React, { useEffect, useState } from 'react';
import { financeService } from '../services/financeService';
import { useFormat } from '../hooks/useFormat';
import { useFeedback } from '../context/FeedbackContext';
import { frequencyLabel, parseDateOnly } from '../lib/recurrence';
import { RecurringModal } from './RecurringModal';
import type { RecurringTransaction } from '../types/database';

export const RecurringSection: React.FC = () => {
  const { formatMoney, formatDate } = useFormat();
  const { confirm, toast } = useFeedback();

  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadRules = async () => {
    try {
      const data = await financeService.getRecurringTransactions();
      setRules(data ?? []);
    } catch {
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadRules();
    };
    load();
  }, []);

  const handleToggle = async (rule: RecurringTransaction) => {
    const nextActive = !rule.is_active;

    setRules((previous) =>
      previous.map((item) =>
        item.id === rule.id ? { ...item, is_active: nextActive } : item
      )
    );

    try {
      await financeService.toggleRecurringTransaction(rule.id, nextActive);
    } catch {
      setRules((previous) =>
        previous.map((item) =>
          item.id === rule.id ? { ...item, is_active: rule.is_active } : item
        )
      );
      toast({ message: 'No se pudo actualizar la automatización.', variant: 'error' });
    }
  };

  const handleDelete = async (rule: RecurringTransaction) => {
    const accepted = await confirm({
      title: 'Eliminar automatización',
      message: 'Los movimientos ya registrados se conservan. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });

    if (!accepted) return;

    try {
      await financeService.deleteRecurringTransaction(rule.id);
      setRules((previous) => previous.filter((item) => item.id !== rule.id));
      toast({ message: 'Automatización eliminada.', variant: 'success' });
    } catch {
      toast({ message: 'No se pudo eliminar la automatización.', variant: 'error' });
    }
  };

  return (
    <section className="bg-surface rounded-2xl p-4 border border-ink/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Automatizaciones</h2>
          <p className="text-[11px] text-muted mt-0.5">
            Movimientos que se registran solos según una frecuencia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-8 px-3 rounded-lg bg-ink text-canvas text-[11px] font-semibold transition active:scale-95 cursor-pointer"
        >
          Nueva
        </button>
      </div>

      {isLoading ? (
        <p className="text-[11px] text-subtle py-3">Cargando...</p>
      ) : rules.length === 0 ? (
        <p className="text-[11px] text-subtle py-3">
          Aún no tienes movimientos recurrentes. Crea uno para registrar gastos fijos
          como el internet o la renta.
        </p>
      ) : (
        <ul className="divide-y divide-ink/[0.04]">
          {rules.map((rule) => {
            const label = rule.note || rule.category?.name || 'Movimiento recurrente';

            return (
              <li key={rule.id} className="flex items-center gap-3 py-2.5">
                <div className="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-ink">
                    {rule.type === 'income' ? 'payments' : 'event_repeat'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink truncate">{label}</p>
                  <p className="text-[11px] text-muted">
                    {frequencyLabel(rule.frequency)} ·{' '}
                    {formatDate(parseDateOnly(rule.next_run_date), {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {!rule.is_active && ' · Pausada'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-[13px] font-semibold tabular-nums ${
                      rule.type === 'income' ? 'text-accent' : 'text-expense'
                    }`}
                  >
                    {rule.type === 'income' ? '+' : '-'}
                    {formatMoney(Number(rule.amount))}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.is_active}
                    aria-label={`Activar ${label}`}
                    onClick={() => handleToggle(rule)}
                    className={`w-9 h-5 rounded-full transition relative cursor-pointer ${
                      rule.is_active ? 'bg-accent' : 'bg-ink/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        rule.is_active ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rule)}
                    aria-label={`Eliminar ${label}`}
                    className="w-7 h-7 rounded-lg text-muted hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RecurringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadRules}
      />
    </section>
  );
};
