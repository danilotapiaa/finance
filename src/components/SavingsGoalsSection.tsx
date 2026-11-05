import React, { useEffect, useState } from 'react';
import { financeService } from '../services/financeService';
import { useFormat } from '../hooks/useFormat';
import { useFeedback } from '../context/FeedbackContext';
import { parseDateOnly } from '../lib/recurrence';
import { GoalModal } from './GoalModal';
import { ContributionModal } from './ContributionModal';
import type { SavingsGoal } from '../types/database';

export const SavingsGoalsSection: React.FC = () => {
  const { formatMoney, formatDate } = useFormat();
  const { confirm, toast } = useFeedback();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadGoals = async () => {
    try {
      const data = await financeService.getSavingsGoals();
      setGoals(data ?? []);
    } catch {
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadGoals();
    };
    load();
  }, []);

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    const accepted = await confirm({
      title: 'Eliminar meta',
      message: 'Se eliminarán también los aportes registrados. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });

    if (!accepted) return;

    try {
      await financeService.deleteSavingsGoal(goal.id);
      setGoals((previous) => previous.filter((item) => item.id !== goal.id));
      toast({ message: 'Meta eliminada.', variant: 'success' });
    } catch {
      toast({ message: 'No se pudo eliminar la meta.', variant: 'error' });
    }
  };

  const handleDeleteContribution = async (goal: SavingsGoal, contributionId: string) => {
    try {
      await financeService.deleteGoalContribution(contributionId);
      setGoals((previous) =>
        previous.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                contributions: (item.contributions ?? []).filter(
                  (contribution) => contribution.id !== contributionId
                ),
              }
            : item
        )
      );
      toast({ message: 'Aporte eliminado.', variant: 'success' });
    } catch {
      toast({ message: 'No se pudo eliminar el aporte.', variant: 'error' });
    }
  };

  return (
    <section className="bg-surface rounded-2xl p-4 border border-ink/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Metas de ahorro</h2>
          <p className="text-[11px] text-muted mt-0.5">
            Suma aportes y sigue el avance hasta tu objetivo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsGoalModalOpen(true)}
          className="h-8 px-3 rounded-lg bg-ink text-canvas text-[11px] font-semibold transition active:scale-95 cursor-pointer"
        >
          Nueva
        </button>
      </div>

      {isLoading ? (
        <p className="text-[11px] text-subtle py-3">Cargando...</p>
      ) : goals.length === 0 ? (
        <p className="text-[11px] text-subtle py-3">
          Aún no tienes metas. Crea una para separar el ahorro de un viaje, un equipo o
          cualquier proyecto.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const contributions = goal.contributions ?? [];
            const saved = contributions.reduce(
              (sum, contribution) => sum + Number(contribution.amount),
              0
            );
            const target = Number(goal.target_amount);
            const progressPct =
              target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
            const isExpanded = Boolean(expanded[goal.id]);
            const reached = target > 0 && saved >= target;

            return (
              <div
                key={goal.id}
                className="bg-canvas rounded-xl p-3 border border-ink/[0.04] space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-ink">
                      {goal.icon || 'savings'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink truncate">{goal.name}</p>
                    <p className="text-[11px] text-muted">
                      {formatMoney(saved)} de {formatMoney(target)}
                      {goal.target_date &&
                        ` · ${formatDate(parseDateOnly(goal.target_date), {
                          day: 'numeric',
                          month: 'short',
                        })}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(goal)}
                    aria-label={`Eliminar meta ${goal.name}`}
                    className="w-7 h-7 rounded-lg text-muted hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Avance de ${goal.name}`}
                    className={`h-full rounded-full ${reached ? 'bg-accent' : 'bg-ink'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={reached ? 'text-accent font-medium' : 'text-muted'}>
                    {reached
                      ? 'Meta alcanzada'
                      : `${progressPct}% · Faltan ${formatMoney(Math.max(0, target - saved))}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {contributions.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((previous) => ({
                            ...previous,
                            [goal.id]: !previous[goal.id],
                          }))
                        }
                        aria-label={`Ver aportes de ${goal.name}`}
                        className="text-muted hover:text-ink transition cursor-pointer"
                      >
                        Aportes ({contributions.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setContributionGoal(goal)}
                      aria-label={`Aportar a ${goal.name}`}
                      className="h-7 px-2.5 rounded-lg bg-surface border border-ink/[0.06] text-ink text-[11px] font-medium transition active:scale-95 cursor-pointer"
                    >
                      Aportar
                    </button>
                  </div>
                </div>

                {isExpanded && contributions.length > 0 && (
                  <ul className="divide-y divide-ink/[0.04] border-t border-ink/[0.04] pt-1">
                    {contributions.map((contribution) => (
                      <li
                        key={contribution.id}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] text-ink truncate">
                            {contribution.note || 'Aporte'}
                          </p>
                          <p className="text-[10px] text-subtle">
                            {formatDate(new Date(contribution.date), {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-medium text-ink tabular-nums">
                            {formatMoney(Number(contribution.amount))}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteContribution(goal, contribution.id)
                            }
                            aria-label="Eliminar aporte"
                            className="w-6 h-6 rounded-md text-subtle hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              close
                            </span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSaved={loadGoals}
      />

      <ContributionModal
        isOpen={contributionGoal !== null}
        goal={contributionGoal}
        onClose={() => setContributionGoal(null)}
        onSaved={loadGoals}
      />
    </section>
  );
};
