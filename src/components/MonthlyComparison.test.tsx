import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonthlyComparison } from './MonthlyComparison'
import { makeCategory, makeTransaction } from '../test/fixtures'
import type { Transaction } from '../types/database'

const food = makeCategory({ id: 'cat-1', name: 'Alimentación', icon: 'Utensils' })
const transport = makeCategory({ id: 'cat-2', name: 'Transporte', icon: 'Car' })

const renderComparison = (current: Transaction[], previous: Transaction[]) =>
  render(<MonthlyComparison currentTransactions={current} previousTransactions={previous} />)

describe('MonthlyComparison', () => {
  it('no renderiza nada cuando no hay gastos', () => {
    const { container } = renderComparison(
      [makeTransaction({ id: 'tx-1', type: 'income', amount: 100 })],
      []
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('muestra los totales y avisa cuando no hay base de comparación', () => {
    renderComparison(
      [
        makeTransaction({ id: 'tx-1', type: 'income', amount: 300 }),
        makeTransaction({ id: 'tx-2', type: 'expense', amount: 50, category: food }),
      ],
      []
    )

    expect(screen.getByText('Comparación mensual')).toBeInTheDocument()
    expect(screen.getAllByText('$50.00')).toHaveLength(2)
    expect(screen.getByText('$300.00')).toBeInTheDocument()
    expect(screen.getAllByText('Sin base de comparación')).toHaveLength(2)
  })

  it('compara totales y categorías con el mes anterior', () => {
    renderComparison(
      [
        makeTransaction({ id: 'tx-1', type: 'expense', amount: 100, category_id: 'cat-1', category: food }),
        makeTransaction({ id: 'tx-2', type: 'expense', amount: 50, category_id: 'cat-2', category: transport }),
      ],
      [makeTransaction({ id: 'tx-3', type: 'expense', amount: 100, category_id: 'cat-1', category: food })]
    )

    expect(screen.getByText('+50% vs mes anterior')).toBeInTheDocument()
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
    expect(screen.getByText('Nuevo este mes')).toBeInTheDocument()
  })

  it('limita la lista a cinco categorías y avisa cuántas quedan', () => {
    const current = [
      makeCategory({ id: 'cat-1', name: 'Uno' }),
      makeCategory({ id: 'cat-2', name: 'Dos' }),
      makeCategory({ id: 'cat-3', name: 'Tres' }),
      makeCategory({ id: 'cat-4', name: 'Cuatro' }),
      makeCategory({ id: 'cat-5', name: 'Cinco' }),
      makeCategory({ id: 'cat-6', name: 'Seis' }),
    ].map((category, index) =>
      makeTransaction({
        id: `tx-${index}`,
        type: 'expense',
        amount: 20 - index,
        category_id: category.id,
        category,
      })
    )

    renderComparison(current, [])

    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.queryByText('Seis')).not.toBeInTheDocument()
    expect(screen.getByText('1 categoría más con gastos este mes.')).toBeInTheDocument()
  })

  it('muestra la participación de cada categoría', () => {
    renderComparison(
      [
        makeTransaction({ id: 'tx-1', type: 'expense', amount: 75, category_id: 'cat-1', category: food }),
        makeTransaction({ id: 'tx-2', type: 'expense', amount: 25, category_id: 'cat-2', category: transport }),
      ],
      []
    )

    expect(screen.getByRole('progressbar', { name: 'Participación de Alimentación' })).toHaveAttribute(
      'aria-valuenow',
      '75'
    )
  })
})
