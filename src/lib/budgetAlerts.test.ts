import { describe, expect, it } from 'vitest'
import { buildBudgetAlerts } from './budgetAlerts'
import { makeBudget, makeCategory, makeTransaction } from '../test/fixtures'

const food = makeCategory({ id: 'cat-1', name: 'Alimentación' })
const transport = makeCategory({ id: 'cat-2', name: 'Transporte' })

const expense = (categoryId: string, amount: number, id = `tx-${categoryId}-${amount}`) =>
  makeTransaction({ id, category_id: categoryId, amount, type: 'expense' })

describe('buildBudgetAlerts', () => {
  it('no genera avisos por debajo del 80%', () => {
    const alerts = buildBudgetAlerts(
      [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 100, category: food })],
      [expense('cat-1', 79)]
    )

    expect(alerts).toHaveLength(0)
  })

  it('avisa al alcanzar el 80%', () => {
    const alerts = buildBudgetAlerts(
      [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 100, category: food })],
      [expense('cat-1', 85)]
    )

    expect(alerts[0]).toMatchObject({
      id: 'budget-budget-1',
      type: 'budget',
      title: 'Alimentación',
      spent: 85,
      limit: 100,
      progress: 85,
      level: 'warning',
    })
  })

  it('marca como excedido al llegar al 100%', () => {
    const alerts = buildBudgetAlerts(
      [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 100, category: food })],
      [expense('cat-1', 120)]
    )

    expect(alerts[0]).toMatchObject({ progress: 120, level: 'exceeded' })
  })

  it('ignora ingresos y gastos de otras categorías', () => {
    const alerts = buildBudgetAlerts(
      [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 100, category: food })],
      [
        expense('cat-2', 200),
        makeTransaction({ id: 'tx-income', category_id: 'cat-1', type: 'income', amount: 500 }),
      ]
    )

    expect(alerts).toHaveLength(0)
  })

  it('ignora presupuestos sin monto válido', () => {
    const alerts = buildBudgetAlerts(
      [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 0, category: food })],
      [expense('cat-1', 50)]
    )

    expect(alerts).toHaveLength(0)
  })

  it('ordena primero los excedidos y luego por avance', () => {
    const alerts = buildBudgetAlerts(
      [
        makeBudget({ id: 'budget-a', category_id: 'cat-1', amount: 100, category: food }),
        makeBudget({ id: 'budget-b', category_id: 'cat-2', amount: 100, category: transport }),
        makeBudget({ id: 'budget-c', category_id: 'cat-3', amount: 100, category: food }),
      ],
      [expense('cat-1', 85), expense('cat-2', 130), expense('cat-3', 95)]
    )

    expect(alerts.map((alert) => alert.id)).toEqual([
      'budget-budget-b',
      'budget-budget-c',
      'budget-budget-a',
    ])
  })
})
