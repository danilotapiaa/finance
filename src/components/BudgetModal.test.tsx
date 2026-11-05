import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetModal } from './BudgetModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeBudget, makeCategory } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const categories = [
  makeCategory({ id: 'cat-1', name: 'Alimentación', icon: 'Utensils' }),
  makeCategory({ id: 'cat-2', name: 'Transporte', icon: 'Car' }),
  makeCategory({ id: 'cat-3', name: 'Salario', type: 'income', icon: 'Wallet' }),
]

const budgets = [makeBudget({ id: 'budget-1', category_id: 'cat-1', amount: 100 })]

const renderModal = (
  props: Partial<React.ComponentProps<typeof BudgetModal>> = {}
) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <BudgetModal
      isOpen
      onClose={onClose}
      categories={categories}
      budgets={budgets}
      onSaved={onSaved}
      {...props}
    />
  )
  return { onClose, onSaved }
}

describe('BudgetModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.upsertBudget.mockResolvedValue({})
    financeServiceMock.deleteBudget.mockResolvedValue(undefined)
  })

  it('no renderiza nada cerrado', () => {
    const { container } = render(
      <BudgetModal
        isOpen={false}
        onClose={vi.fn()}
        categories={categories}
        budgets={budgets}
        onSaved={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('precarga los límites actuales y solo lista categorías de gasto', () => {
    renderModal()

    expect(screen.getByLabelText('Presupuesto de Alimentación')).toHaveValue(100)
    expect(screen.getByLabelText('Presupuesto de Transporte')).toHaveValue(null)
    expect(screen.queryByLabelText('Presupuesto de Salario')).not.toBeInTheDocument()
  })

  it('crea un presupuesto nuevo y cierra al guardar', async () => {
    const user = userEvent.setup()
    const { onClose, onSaved } = renderModal()

    fireEvent.change(screen.getByLabelText('Presupuesto de Transporte'), {
      target: { value: '250' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar presupuestos' }))

    await waitFor(() =>
      expect(financeServiceMock.upsertBudget).toHaveBeenCalledWith({
        category_id: 'cat-2',
        amount: 250,
      })
    )
    expect(financeServiceMock.deleteBudget).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('elimina el presupuesto cuando se deja el campo vacío', async () => {
    const user = userEvent.setup()
    renderModal()

    fireEvent.change(screen.getByLabelText('Presupuesto de Alimentación'), {
      target: { value: '' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar presupuestos' }))

    await waitFor(() =>
      expect(financeServiceMock.deleteBudget).toHaveBeenCalledWith('budget-1')
    )
    expect(financeServiceMock.upsertBudget).not.toHaveBeenCalled()
  })

  it('rechaza montos negativos', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    fireEvent.change(screen.getByLabelText('Presupuesto de Transporte'), {
      target: { value: '-5' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar presupuestos' }))

    expect(
      screen.getByText('Ingresa un monto válido para Transporte')
    ).toBeInTheDocument()
    expect(financeServiceMock.upsertBudget).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('cierra sin llamadas si no hay cambios', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Guardar presupuestos' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(financeServiceMock.upsertBudget).not.toHaveBeenCalled()
    expect(financeServiceMock.deleteBudget).not.toHaveBeenCalled()
  })

  it('muestra el error del servicio', async () => {
    const user = userEvent.setup()
    financeServiceMock.upsertBudget.mockRejectedValue(new Error('sin conexión'))
    renderModal()

    fireEvent.change(screen.getByLabelText('Presupuesto de Transporte'), {
      target: { value: '80' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar presupuestos' }))

    expect(await screen.findByText('sin conexión')).toBeInTheDocument()
  })
})
