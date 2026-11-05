import { describe, expect, it } from 'vitest'
import { buildReminders, savedAmount } from './reminders'
import { makeGoalContribution, makeRecurringTransaction, makeSavingsGoal } from '../test/fixtures'

const today = new Date(2026, 10, 5)

describe('reminders', () => {
  it('incluye los movimientos recurrentes activos dentro del horizonte', () => {
    const reminders = buildReminders(
      [
        makeRecurringTransaction({
          id: 'recurring-1',
          note: 'Internet',
          next_run_date: '2026-11-08',
          is_active: true,
        }),
        makeRecurringTransaction({
          id: 'recurring-2',
          note: 'Pausada',
          next_run_date: '2026-11-06',
          is_active: false,
        }),
        makeRecurringTransaction({
          id: 'recurring-3',
          note: 'Lejana',
          next_run_date: '2026-12-01',
          is_active: true,
        }),
      ],
      [],
      today
    )

    expect(reminders).toHaveLength(1)
    expect(reminders[0]).toMatchObject({
      id: 'recurring-recurring-1',
      type: 'recurring',
      title: 'Internet',
      daysUntil: 3,
    })
  })

  it('ignora los movimientos recurrentes vencidos', () => {
    const reminders = buildReminders(
      [
        makeRecurringTransaction({
          id: 'recurring-1',
          next_run_date: '2026-11-01',
          is_active: true,
        }),
      ],
      [],
      today
    )

    expect(reminders).toHaveLength(0)
  })

  it('incluye las metas que vencen dentro del horizonte', () => {
    const reminders = buildReminders(
      [],
      [
        makeSavingsGoal({
          id: 'goal-1',
          name: 'Viaje',
          target_amount: 1000,
          target_date: '2026-11-09',
          contributions: [makeGoalContribution({ amount: 250 })],
        }),
      ],
      today
    )

    expect(reminders[0]).toMatchObject({
      id: 'goal-date-goal-1',
      type: 'goal_deadline',
      title: 'Viaje',
      remaining: 750,
      daysUntil: 4,
    })
  })

  it('no incluye metas ya alcanzadas aunque estén por vencer', () => {
    const reminders = buildReminders(
      [],
      [
        makeSavingsGoal({
          target_amount: 100,
          target_date: '2026-11-06',
          contributions: [makeGoalContribution({ amount: 150 })],
        }),
      ],
      today
    )

    expect(reminders).toHaveLength(0)
  })

  it('incluye metas con 90% o más de avance', () => {
    const reminders = buildReminders(
      [],
      [
        makeSavingsGoal({
          id: 'goal-1',
          target_amount: 1000,
          target_date: null,
          contributions: [makeGoalContribution({ amount: 950 })],
        }),
      ],
      today
    )

    expect(reminders[0]).toMatchObject({
      id: 'goal-near-goal-1',
      type: 'goal_near',
      remaining: 50,
      progress: 95,
    })
  })

  it('ordena por días restantes y deja al final las metas cercanas', () => {
    const reminders = buildReminders(
      [
        makeRecurringTransaction({
          id: 'recurring-1',
          next_run_date: '2026-11-10',
          is_active: true,
        }),
      ],
      [
        makeSavingsGoal({
          id: 'goal-near',
          target_amount: 100,
          target_date: null,
          contributions: [makeGoalContribution({ amount: 95 })],
        }),
        makeSavingsGoal({
          id: 'goal-date',
          target_amount: 100,
          target_date: '2026-11-06',
          contributions: [],
        }),
      ],
      today
    )

    expect(reminders.map((reminder) => reminder.id)).toEqual([
      'goal-date-goal-date',
      'recurring-recurring-1',
      'goal-near-goal-near',
    ])
  })

  it('suma los aportes de una meta', () => {
    const goal = makeSavingsGoal({
      contributions: [
        makeGoalContribution({ id: 'c-1', amount: 100 }),
        makeGoalContribution({ id: 'c-2', amount: 50.5 }),
      ],
    })

    expect(savedAmount(goal)).toBe(150.5)
  })
})
