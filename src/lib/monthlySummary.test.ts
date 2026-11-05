import { describe, expect, it } from 'vitest'
import { expenseByCategory, percentChange, summarizeMonth } from './monthlySummary'
import { makeCategory, makeTransaction } from '../test/fixtures'

describe('monthlySummary', () => {
  it('suma ingresos, gastos y balance neto', () => {
    const totals = summarizeMonth([
      makeTransaction({ id: 'tx-1', type: 'income', amount: 500 }),
      makeTransaction({ id: 'tx-2', type: 'expense', amount: 120.5 }),
      makeTransaction({ id: 'tx-3', type: 'expense', amount: 30 }),
    ])

    expect(totals).toEqual({ income: 500, expense: 150.5, net: 349.5 })
  })

  it('ignora montos no numéricos', () => {
    const totals = summarizeMonth([
      makeTransaction({ id: 'tx-1', type: 'expense', amount: Number.NaN }),
      makeTransaction({ id: 'tx-2', type: 'income', amount: 100 }),
    ])

    expect(totals).toEqual({ income: 100, expense: 0, net: 100 })
  })

  it('agrupa gastos por categoría y calcula su participación', () => {
    const food = makeCategory({ id: 'cat-1', name: 'Alimentación' })
    const transport = makeCategory({ id: 'cat-2', name: 'Transporte' })

    const categories = expenseByCategory([
      makeTransaction({ id: 'tx-1', category_id: 'cat-1', category: food, amount: 75 }),
      makeTransaction({ id: 'tx-2', category_id: 'cat-1', category: food, amount: 25 }),
      makeTransaction({ id: 'tx-3', category_id: 'cat-2', category: transport, amount: 50 }),
      makeTransaction({ id: 'tx-4', type: 'income', category_id: 'cat-2', amount: 999 }),
    ])

    expect(categories).toHaveLength(2)
    expect(categories[0]).toMatchObject({ categoryId: 'cat-1', name: 'Alimentación', amount: 100, share: 67 })
    expect(categories[1]).toMatchObject({ categoryId: 'cat-2', name: 'Transporte', amount: 50, share: 33 })
  })

  it('usa "Sin categoría" cuando el gasto no tiene categoría', () => {
    const categories = expenseByCategory([
      makeTransaction({ id: 'tx-1', category_id: null, category: undefined, amount: 20 }),
    ])

    expect(categories[0].name).toBe('Sin categoría')
  })

  it('calcula la variación porcentual', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(100, 100)).toBe(0)
  })

  it('devuelve null cuando no hay base de comparación', () => {
    expect(percentChange(100, 0)).toBeNull()
    expect(percentChange(0, 0)).toBeNull()
  })
})
