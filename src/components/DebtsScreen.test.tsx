import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebtsScreen } from './DebtsScreen'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeDebt } from '../test/fixtures'
import type { Debt } from '../types/database'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

vi.mock('./DebtModal', () => ({
  DebtModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Modal nueva deuda</div> : null,
}))

vi.mock('./DebtPaymentModal', () => ({
  DebtPaymentModal: ({ debt }: { debt: Debt | null }) =>
    debt ? <div>Modal abono {debt.person_name}</div> : null,
}))

const debts = [
  makeDebt({
    id: 'debt-1',
    person_name: 'Carlos Martínez',
    type: 'lend',
    total_amount: 100,
    paid_amount: 20,
    status: 'partial',
  }),
  makeDebt({
    id: 'debt-2',
    person_name: 'Ana Torres',
    type: 'lend',
    total_amount: 50,
    paid_amount: 50,
    status: 'paid',
  }),
  makeDebt({
    id: 'debt-3',
    person_name: 'Luis Pérez',
    type: 'borrow',
    total_amount: 30,
    paid_amount: 10,
    status: 'partial',
  }),
]

describe('DebtsScreen', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getDebts.mockResolvedValue(debts)
    financeServiceMock.getAccounts.mockResolvedValue([makeAccount()])
  })

  it('muestra el spinner mientras carga', () => {
    financeServiceMock.getDebts.mockReturnValue(new Promise(() => {}))

    const { container } = render(<DebtsScreen />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('resume los saldos pendientes y el balance neto', async () => {
    render(<DebtsScreen />)

    expect(await screen.findAllByText('$80.00')).toHaveLength(2)
    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('+$60.00')).toBeInTheDocument()
  })

  it('muestra por defecto las deudas por cobrar pendientes', async () => {
    render(<DebtsScreen />)

    expect(await screen.findByText('Carlos Martínez')).toBeInTheDocument()
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument()
    expect(screen.queryByText('Ana Torres')).not.toBeInTheDocument()
    expect(screen.getByText(/Préstamo otorgado/)).toBeInTheDocument()
    expect(screen.getAllByText('$80.00')).toHaveLength(2)
    expect(screen.getByText('Pagado: $20.00 (20%)')).toBeInTheDocument()
  })

  it('cambia entre los segmentos de deudas', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Debo' }))
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Martínez')).not.toBeInTheDocument()
    expect(screen.getByText(/Deuda contraída/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Saldadas' }))
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar Abono' })).not.toBeInTheDocument()
  })

  it('filtra por nombre y limpia la búsqueda', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.type(
      screen.getByPlaceholderText('Buscar por nombre de persona...'),
      'luis'
    )
    expect(screen.queryByText('Carlos Martínez')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Debo' }))
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument()

    await user.click(screen.getByText('cancel').closest('button')!)
    await user.click(screen.getByRole('button', { name: 'Me deben' }))
    expect(screen.getByText('Carlos Martínez')).toBeInTheDocument()
  })

  it('abre el modal de nueva deuda', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: /Nueva Deuda/ }))

    expect(screen.getByText('Modal nueva deuda')).toBeInTheDocument()
  })

  it('abre el modal de abono con la deuda seleccionada', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Registrar Abono' }))

    expect(screen.getByText('Modal abono Carlos Martínez')).toBeInTheDocument()
  })

  it('elimina una deuda tras confirmar', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    financeServiceMock.deleteDebt.mockResolvedValue(undefined)
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(confirm).toHaveBeenCalled()
    expect(financeServiceMock.deleteDebt).toHaveBeenCalledWith('debt-1')
    await waitFor(() => expect(financeServiceMock.getDebts).toHaveBeenCalledTimes(2))
  })

  it('no elimina si se cancela la confirmación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(financeServiceMock.deleteDebt).not.toHaveBeenCalled()
  })

  it('avisa si falla la eliminación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.deleteDebt.mockRejectedValue(new Error('boom'))
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al eliminar la deuda.'))
    expect(error).toHaveBeenCalled()
  })

  it('muestra el estado vacío del segmento', async () => {
    financeServiceMock.getDebts.mockResolvedValue([])

    render(<DebtsScreen />)

    expect(
      await screen.findByText('No hay registros en esta sección.')
    ).toBeInTheDocument()
  })
})
