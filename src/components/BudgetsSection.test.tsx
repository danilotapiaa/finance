import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BudgetsSection } from './BudgetsSection'
import { makeBudget, makeCategory, makeTransaction } from '../test/fixtures'

const categories = [
  makeCategory({ id: 'cat-1', name: 'Alimentación', icon: 'Utensils' }),
  makeCategory({ id: 'cat-2', name: 'Transporte', icon: 'Car' }),
]

const budgets = [
  makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 200, category: categories[0] }),
]

const renderSection = (
  props: Partial<React.ComponentProps<typeof BudgetsSection>> = {}
) => {
  const onConfigure = vi.fn()
  render(
    <BudgetsSection
      budgets={budgets}
      monthTransactions={[]}
      isBalanceVisible
      onConfigure={onConfigure}
      {...props}
    />
  )
  return { onConfigure }
}

describe('BudgetsSection', () => {
  it('muestra el gasto acumulado frente al límite', () => {
    renderSection({
      monthTransactions: [
        makeTransaction({ id: 'tx-1', category_id: 'cat-1', type: 'expense', amount: 50 }),
        makeTransaction({ id: 'tx-2', category_id: 'cat-1', type: 'income', amount: 999 }),
        makeTransaction({ id: 'tx-3', category_id: 'cat-2', type: 'expense', amount: 30 }),
      ],
    })

    expect(screen.getByText('$50.00 / $200.00')).toBeInTheDocument()
    expect(screen.getByText('25% usado')).toBeInTheDocument()
    expect(screen.getByText('Quedan $150.00')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })

  it('avisa cuando se supera el límite', () => {
    renderSection({
      monthTransactions: [
        makeTransaction({ id: 'tx-1', category_id: 'cat-1', type: 'expense', amount: 250 }),
      ],
    })

    expect(screen.getByText('100% usado')).toBeInTheDocument()
    expect(screen.getByText('Excedido por $50.00')).toBeInTheDocument()
  })

  it('oculta los montos cuando el balance está oculto', () => {
    renderSection({
      isBalanceVisible: false,
      monthTransactions: [
        makeTransaction({ id: 'tx-1', category_id: 'cat-1', type: 'expense', amount: 50 }),
      ],
    })

    expect(screen.queryByText('$50.00 / $200.00')).not.toBeInTheDocument()
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío y permite configurar', async () => {
    const user = userEvent.setup()
    const { onConfigure } = renderSection({ budgets: [] })

    expect(
      screen.getByText(/Aún no defines presupuestos/)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Definir presupuestos/ }))
    expect(onConfigure).toHaveBeenCalledTimes(1)
  })

  it('abre la configuración desde el encabezado', async () => {
    const user = userEvent.setup()
    const { onConfigure } = renderSection()

    await user.click(screen.getByRole('button', { name: /Configurar/ }))
    expect(onConfigure).toHaveBeenCalledTimes(1)
  })
})
