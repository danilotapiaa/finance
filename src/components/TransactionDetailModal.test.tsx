import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionDetailModal } from './TransactionDetailModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeCategory, makeTransaction } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const transaction = makeTransaction({
  id: 'tx-1',
  type: 'expense',
  amount: 50,
  note: 'Café con el equipo',
  account: makeAccount({ id: 'acc-1', name: 'Banco' }),
  category: makeCategory({ id: 'cat-1', name: 'Alimentación' }),
})

const renderModal = (
  props: Partial<React.ComponentProps<typeof TransactionDetailModal>> = {}
) => {
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  const onUpdated = vi.fn()
  render(
    <TransactionDetailModal
      transaction={transaction}
      onClose={onClose}
      onDeleted={onDeleted}
      onUpdated={onUpdated}
      {...props}
    />
  )
  return { onClose, onDeleted, onUpdated }
}

describe('TransactionDetailModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getAccounts.mockResolvedValue([
      makeAccount({ id: 'acc-1', name: 'Banco', current_balance: 100 }),
    ])
    financeServiceMock.getCategories.mockResolvedValue([
      makeCategory({ id: 'cat-1', name: 'Alimentación', type: 'expense' }),
      makeCategory({ id: 'cat-2', name: 'Salario', type: 'income' }),
    ])
    financeServiceMock.updateTransaction.mockResolvedValue({})
    financeServiceMock.deleteTransaction.mockResolvedValue(undefined)
  })

  it('no renderiza nada sin transacción', () => {
    const { container } = render(
      <TransactionDetailModal
        transaction={null}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el detalle de un gasto', () => {
    renderModal()

    expect(screen.getByText('Detalle del Movimiento')).toBeInTheDocument()
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
    expect(screen.getByText('Gasto registrado')).toBeInTheDocument()
    expect(screen.getByText('Banco')).toBeInTheDocument()
    expect(screen.getByText('Alimentación')).toBeInTheDocument()
    expect(screen.getAllByText('Café con el equipo').length).toBeGreaterThan(0)
  })

  it('muestra el detalle de un ingreso', () => {
    renderModal({
      transaction: makeTransaction({
        type: 'income',
        amount: 100,
        note: 'Salario',
      }),
    })

    expect(screen.getByText('+$100.00')).toBeInTheDocument()
    expect(screen.getByText('Ingreso registrado')).toBeInTheDocument()
  })

  it('abre el modo de edición con los valores actuales', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByText('Editar Movimiento')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50.00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Café con el equipo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar Cambios' })).toBeInTheDocument()
  })

  it('guarda los cambios del movimiento', async () => {
    const user = userEvent.setup()
    const { onClose, onUpdated } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByDisplayValue('50.00'), {
      target: { value: '75' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    await waitFor(() =>
      expect(financeServiceMock.updateTransaction).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({
          account_id: 'acc-1',
          category_id: 'cat-1',
          type: 'expense',
          amount: 75,
          note: 'Café con el equipo',
          date: expect.any(String),
        })
      )
    )
    expect(onUpdated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('cancela la edición y vuelve al detalle', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Detalle del Movimiento')).toBeInTheDocument()
  })

  it('valida el monto al guardar', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByDisplayValue('50.00'), {
      target: { value: '' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: 'Guardar Cambios' }).closest('form')!
    )

    expect(
      screen.getByText('Ingresa un monto válido mayor a 0')
    ).toBeInTheDocument()
    expect(financeServiceMock.updateTransaction).not.toHaveBeenCalled()
  })

  it('elimina el movimiento tras confirmar', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onClose, onDeleted } = renderModal()

    await user.click(
      screen.getByRole('button', { name: /Eliminar este movimiento/ })
    )

    expect(confirm).toHaveBeenCalled()
    await waitFor(() =>
      expect(financeServiceMock.deleteTransaction).toHaveBeenCalledWith('tx-1')
    )
    expect(onDeleted).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('no elimina si se cancela la confirmación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderModal()

    await user.click(
      screen.getByRole('button', { name: /Eliminar este movimiento/ })
    )

    expect(financeServiceMock.deleteTransaction).not.toHaveBeenCalled()
  })

  it('muestra el error al eliminar', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    financeServiceMock.deleteTransaction.mockRejectedValue(
      new Error('No se pudo eliminar')
    )
    renderModal()

    await user.click(
      screen.getByRole('button', { name: /Eliminar este movimiento/ })
    )

    expect(await screen.findByText('No se pudo eliminar')).toBeInTheDocument()
  })

  it('muestra el error del servicio al actualizar', async () => {
    const user = userEvent.setup()
    financeServiceMock.updateTransaction.mockRejectedValue(
      new Error('Error de red')
    )
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })

  it('cierra el modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
