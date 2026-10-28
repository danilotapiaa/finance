import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebtsScreen } from './DebtsScreen'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeDebt } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const debts = [
  makeDebt({
    id: 'debt-1',
    person_name: 'Carlos Martínez',
    type: 'lend',
    total_amount: 100,
    paid_amount: 20,
    status: 'partial',
  }),
]

describe('DebtsScreen con modales reales', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getDebts.mockResolvedValue(debts)
    financeServiceMock.getAccounts.mockResolvedValue([makeAccount()])
    financeServiceMock.createDebt.mockResolvedValue({})
    financeServiceMock.createDebtPayment.mockResolvedValue({})
  })

  it('no conserva los datos de la deuda recién creada', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: /Nueva deuda/ }))
    await user.type(
      screen.getByPlaceholderText('Ej. Carlos Martínez'),
      'Nuevo Deudor'
    )
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '75' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar deuda' }))

    await waitFor(() => expect(financeServiceMock.createDebt).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        screen.queryByText('Nuevo préstamo')
      ).not.toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: /Nueva deuda/ }))

    expect(screen.getByPlaceholderText('Ej. Carlos Martínez')).toHaveValue('')
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null)
  })

  it('no conserva los datos de un abono anterior', async () => {
    const user = userEvent.setup()
    render(<DebtsScreen />)
    await screen.findByText('Carlos Martínez')

    await user.click(screen.getByRole('button', { name: 'Registrar abono' }))
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '10' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirmar abono' }))

    await waitFor(() =>
      expect(financeServiceMock.createDebtPayment).toHaveBeenCalled()
    )
    await waitFor(() =>
      expect(screen.queryByText('Abono recibido de:')).not.toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: 'Registrar abono' }))

    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null)
  })
})
