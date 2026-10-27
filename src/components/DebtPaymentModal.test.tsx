import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebtPaymentModal } from './DebtPaymentModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeDebt } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const accounts = [makeAccount({ id: 'acc-1', name: 'Banco', current_balance: 100 })]
const debt = makeDebt({
  id: 'debt-1',
  person_name: 'Carlos Martínez',
  type: 'lend',
  total_amount: 100,
  paid_amount: 20,
})

const renderModal = (
  props: Partial<React.ComponentProps<typeof DebtPaymentModal>> = {}
) => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <DebtPaymentModal
      debt={debt}
      accounts={accounts}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />
  )
  return { onClose, onSuccess }
}

describe('DebtPaymentModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createDebtPayment.mockResolvedValue({})
  })

  it('no renderiza nada sin deuda', () => {
    const { container } = render(
      <DebtPaymentModal
        debt={null}
        accounts={accounts}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el resumen de la deuda pendiente', () => {
    renderModal()

    expect(screen.getByText('Registrar Abono')).toBeInTheDocument()
    expect(screen.getByText('Abono recibido de:')).toBeInTheDocument()
    expect(screen.getByText('Carlos Martínez')).toBeInTheDocument()
    expect(screen.getByText('$80.00')).toBeInTheDocument()
  })

  it('adapta el texto cuando es una deuda contraída', () => {
    renderModal({ debt: makeDebt({ type: 'borrow' }) })

    expect(screen.getByText('Pago realizado a:')).toBeInTheDocument()
    expect(
      screen.getByText(/¿De qué cuenta salió el pago\?/)
    ).toBeInTheDocument()
  })

  it('rellena el saldo pendiente con Pagar todo', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /Pagar todo/ }))

    expect(screen.getByPlaceholderText('0.00')).toHaveValue(80)
  })

  it('valida un monto mayor a cero', () => {
    renderModal()

    fireEvent.submit(
      screen.getByRole('button', { name: 'Confirmar Abono' }).closest('form')!
    )

    expect(
      screen.getByText('Ingresa un monto válido mayor a 0')
    ).toBeInTheDocument()
  })

  it('rechaza abonos mayores al saldo pendiente', async () => {
    const user = userEvent.setup()
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '100' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirmar Abono' }))

    expect(
      screen.getByText('El abono no puede superar el saldo pendiente de $80.00')
    ).toBeInTheDocument()
  })

  it('registra un abono vinculado a una cuenta', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '20' },
    })
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'acc-1' },
    })
    await user.type(
      screen.getByPlaceholderText('Ej. Transferencia bancaria parte 1...'),
      '  Parte 1  '
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar Abono' }))

    await waitFor(() =>
      expect(financeServiceMock.createDebtPayment).toHaveBeenCalledWith({
        debt_id: 'debt-1',
        account_id: 'acc-1',
        amount: 20,
        date: expect.any(String),
        note: 'Parte 1',
      })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('registra un abono sin cuenta ni nota', async () => {
    const user = userEvent.setup()
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '20' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirmar Abono' }))

    await waitFor(() =>
      expect(financeServiceMock.createDebtPayment).toHaveBeenCalledWith(
        expect.objectContaining({ account_id: null, note: null })
      )
    )
  })

  it('muestra el error del servicio', async () => {
    const user = userEvent.setup()
    financeServiceMock.createDebtPayment.mockRejectedValue(
      new Error('No se pudo registrar')
    )
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '20' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirmar Abono' }))

    expect(await screen.findByText('No se pudo registrar')).toBeInTheDocument()
  })

  it('cierra el modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
