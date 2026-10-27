import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransferModal } from './TransferModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const accounts = [
  makeAccount({ id: 'acc-1', name: 'Banco', current_balance: 100 }),
  makeAccount({ id: 'acc-2', name: 'Ahorro', type: 'savings', current_balance: 50 }),
]

const renderModal = (props: Partial<React.ComponentProps<typeof TransferModal>> = {}) => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <TransferModal
      isOpen
      onClose={onClose}
      accounts={accounts}
      onSuccess={onSuccess}
      {...props}
    />
  )
  return { onClose, onSuccess }
}

const pressKeys = async (
  user: ReturnType<typeof userEvent.setup>,
  keys: string[]
) => {
  for (const key of keys) {
    await user.click(screen.getByRole('button', { name: key }))
  }
}

describe('TransferModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createTransfer.mockResolvedValue({})
  })

  it('no renderiza nada si está cerrado', () => {
    const { container } = render(
      <TransferModal
        isOpen={false}
        onClose={vi.fn()}
        accounts={accounts}
        onSuccess={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('preselecciona las dos primeras cuentas y los montos rápidos', () => {
    renderModal()

    expect(screen.getByText('Transferencia Interna')).toBeInTheDocument()
    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue('acc-1')
    expect(selects[1]).toHaveValue('acc-2')
    expect(screen.getByRole('button', { name: '+$50' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+$100' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+$250' })).toBeInTheDocument()
  })

  it('intercambia las cuentas de origen y destino', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByTitle('Intercambiar origen y destino'))

    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue('acc-2')
    expect(selects[1]).toHaveValue('acc-1')
  })

  it('construye el monto con el teclado numérico', async () => {
    const user = userEvent.setup()
    renderModal()

    await pressKeys(user, ['5', '0', '.', '2', '5', '9'])

    expect(screen.getByText('50.25')).toBeInTheDocument()
  })

  it('aplica los montos rápidos', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: '+$100' }))

    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('valida que el monto sea mayor a cero', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    expect(
      screen.getByText('Ingresa un monto válido mayor a 0')
    ).toBeInTheDocument()
  })

  it('rechaza transferir a la misma cuenta', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: '+$50' }))
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'acc-1' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    expect(
      screen.getByText('La cuenta de origen y destino deben ser diferentes')
    ).toBeInTheDocument()
  })

  it('rechaza montos mayores al saldo disponible', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: '+$250' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    expect(screen.getByText('Saldo insuficiente en Banco')).toBeInTheDocument()
  })

  it('crea la transferencia y notifica el éxito', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()

    await user.click(screen.getByRole('button', { name: '+$50' }))
    await user.type(
      screen.getByPlaceholderText('Concepto: ej. Aporte de ahorro mensual'),
      '  Ahorro mensual  '
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    await waitFor(() =>
      expect(financeServiceMock.createTransfer).toHaveBeenCalledWith({
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: 50,
        concept: 'Ahorro mensual',
        date: expect.any(String),
      })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('envía concept null si está vacío', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: '+$50' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    await waitFor(() =>
      expect(financeServiceMock.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ concept: null })
      )
    )
  })

  it('muestra el error del servicio', async () => {
    const user = userEvent.setup()
    financeServiceMock.createTransfer.mockRejectedValue(new Error('Sin conexión'))
    renderModal()

    await user.click(screen.getByRole('button', { name: '+$50' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Transferencia' }))

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument()
  })

  it('restablece el formulario al reabrir', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const props = { onClose, onSuccess, accounts }
    const { rerender } = render(<TransferModal isOpen {...props} />)

    await user.click(screen.getByRole('button', { name: '+$100' }))
    await user.type(
      screen.getByPlaceholderText('Concepto: ej. Aporte de ahorro mensual'),
      'Aporte'
    )
    await user.click(screen.getByTitle('Intercambiar origen y destino'))

    rerender(<TransferModal isOpen={false} {...props} />)
    rerender(<TransferModal isOpen {...props} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue('acc-1')
    expect(selects[1]).toHaveValue('acc-2')
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Concepto: ej. Aporte de ahorro mensual')
    ).toHaveValue('')
  })

  it('cierra el modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
