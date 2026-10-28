import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountsScreen } from './AccountsScreen'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount } from '../test/fixtures'
import type { Account } from '../types/database'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

vi.mock('./TransferModal', () => ({
  TransferModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Modal de transferencia</div> : null,
}))

vi.mock('./AccountModal', () => ({
  AccountModal: ({
    isOpen,
    accountToEdit,
  }: {
    isOpen: boolean
    accountToEdit: Account | null
  }) =>
    isOpen ? (
      <div>Modal de cuenta {accountToEdit ? accountToEdit.name : 'nueva'}</div>
    ) : null,
}))

const accounts = [
  makeAccount({ id: 'acc-1', name: 'Banco Pichincha', type: 'bank', current_balance: 100 }),
  makeAccount({ id: 'acc-2', name: 'Tarjeta Visa', type: 'credit', current_balance: 50 }),
  makeAccount({ id: 'acc-3', name: 'Efectivo', type: 'cash', current_balance: 25 }),
  makeAccount({
    id: 'acc-4',
    name: 'Fondo viaje',
    type: 'savings',
    current_balance: 200,
    target_amount: 400,
  }),
]

describe('AccountsScreen', () => {
  beforeEach(() => {
    financeServiceMock.getAccounts.mockReset()
    financeServiceMock.getAccounts.mockResolvedValue(accounts)
  })

  it('muestra el spinner mientras carga', () => {
    financeServiceMock.getAccounts.mockReturnValue(new Promise(() => {}))

    const { container } = render(<AccountsScreen />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra el balance disponible sin incluir ahorros', async () => {
    render(<AccountsScreen />)

    expect(await screen.findByText('$175.00')).toBeInTheDocument()
    expect(screen.getByText('Bancos 57%')).toBeInTheDocument()
    expect(screen.getByText('Tarjetas 29%')).toBeInTheDocument()
    expect(screen.getByText('Efectivo 14%')).toBeInTheDocument()
  })

  it('muestra el bloque de ahorros con su progreso', async () => {
    render(<AccountsScreen />)

    await screen.findByText('$175.00')

    expect(screen.getByText('Balance en ahorros')).toBeInTheDocument()
    expect(screen.getAllByText('$200.00')).toHaveLength(2)
    expect(screen.getByText(/Objetivo: \$400\.00/)).toBeInTheDocument()
    expect(screen.getByText(/Faltan: \$200\.00/)).toBeInTheDocument()
  })

  it('lista todas las cuentas', async () => {
    render(<AccountsScreen />)

    await screen.findByText('$175.00')

    expect(screen.getByText('Banco Pichincha')).toBeInTheDocument()
    expect(screen.getByText('Tarjeta Visa')).toBeInTheDocument()
    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.getByText('Fondo viaje')).toBeInTheDocument()
  })

  it('abre el modal de transferencia desde el encabezado', async () => {
    const user = userEvent.setup()
    render(<AccountsScreen />)
    await screen.findByText('$175.00')

    await user.click(screen.getByRole('button', { name: /Transferir/ }))

    expect(screen.getByText('Modal de transferencia')).toBeInTheDocument()
  })

  it('abre el modal de transferencia desde la acción rápida', async () => {
    const user = userEvent.setup()
    render(<AccountsScreen />)
    await screen.findByText('$175.00')

    await user.click(screen.getByText('Transferir entre cuentas'))

    expect(screen.getByText('Modal de transferencia')).toBeInTheDocument()
  })

  it('abre el modal de nueva cuenta', async () => {
    const user = userEvent.setup()
    render(<AccountsScreen />)
    await screen.findByText('$175.00')

    await user.click(screen.getByTitle('Añadir nueva cuenta'))

    expect(screen.getByText('Modal de cuenta nueva')).toBeInTheDocument()
  })

  it('abre el modal de edición con la cuenta seleccionada', async () => {
    const user = userEvent.setup()
    render(<AccountsScreen />)
    await screen.findByText('$175.00')

    await user.click(screen.getByText('Banco Pichincha'))

    expect(screen.getByText('Modal de cuenta Banco Pichincha')).toBeInTheDocument()
  })

  it('registra el error y deja de cargar si el servicio falla', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.getAccounts.mockRejectedValue(new Error('boom'))

    render(<AccountsScreen />)

    await screen.findByText('Cuentas')
    expect(error).toHaveBeenCalled()
    expect(screen.queryByText('$175.00')).not.toBeInTheDocument()
  })
})
