import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionModal } from './TransactionModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeCategory } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const accounts = [makeAccount({ id: 'acc-1', name: 'Banco', current_balance: 100 })]
const categories = [
  makeCategory({ id: 'cat-exp', name: 'Alimentación', type: 'expense' }),
  makeCategory({ id: 'cat-inc', name: 'Salario', type: 'income' }),
]

const renderModal = (
  props: Partial<React.ComponentProps<typeof TransactionModal>> = {}
) => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <TransactionModal
      isOpen
      onClose={onClose}
      accounts={accounts}
      categories={categories}
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

describe('TransactionModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createTransaction.mockResolvedValue({})
  })

  it('no renderiza nada si está cerrado', () => {
    const { container } = render(
      <TransactionModal
        isOpen={false}
        onClose={vi.fn()}
        accounts={accounts}
        categories={categories}
        onSuccess={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('inicia como gasto y muestra sus categorías', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Gasto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alimentación/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Salario/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar Gasto' })).toBeInTheDocument()
  })

  it('cambia a ingreso y muestra las categorías de ingreso', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Ingreso' }))

    expect(screen.getByRole('button', { name: /Salario/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Alimentación/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar Ingreso' })).toBeInTheDocument()
  })

  it('construye el monto con el teclado', async () => {
    const user = userEvent.setup()
    renderModal()

    await pressKeys(user, ['4', '5', '.', '5', '0'])

    expect(screen.getByText('45.50')).toBeInTheDocument()
  })

  it('valida que el monto sea mayor a cero', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Guardar Gasto' }))

    expect(
      screen.getByText('Ingresa un monto válido mayor a 0')
    ).toBeInTheDocument()
  })

  it('exige seleccionar una cuenta', async () => {
    const user = userEvent.setup()
    renderModal()

    await pressKeys(user, ['5', '0'])
    await user.click(screen.getByRole('button', { name: 'Guardar Gasto' }))

    expect(
      screen.getByText('Debes seleccionar la cuenta obligatoriamente')
    ).toBeInTheDocument()
    expect(financeServiceMock.createTransaction).not.toHaveBeenCalled()
  })

  it('registra un gasto con cuenta, categoría y nota', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()

    await pressKeys(user, ['5', '0'])
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'acc-1' },
    })
    await user.click(screen.getByText('Toca para escribir nota...'))
    await user.type(screen.getByPlaceholderText('Escribe una nota...'), '  Café  ')
    await user.click(screen.getByRole('button', { name: 'Guardar Gasto' }))

    await waitFor(() =>
      expect(financeServiceMock.createTransaction).toHaveBeenCalledWith({
        account_id: 'acc-1',
        category_id: 'cat-exp',
        type: 'expense',
        amount: 50,
        date: expect.any(String),
        note: 'Café',
      })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('registra un ingreso sin nota', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Ingreso' }))
    await pressKeys(user, ['1', '0', '0'])
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'acc-1' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar Ingreso' }))

    await waitFor(() =>
      expect(financeServiceMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          category_id: 'cat-inc',
          amount: 100,
          note: null,
        })
      )
    )
  })

  it('muestra el error del servicio', async () => {
    const user = userEvent.setup()
    financeServiceMock.createTransaction.mockRejectedValue(new Error('Saldo insuficiente'))
    renderModal()

    await pressKeys(user, ['5'])
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'acc-1' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar Gasto' }))

    expect(await screen.findByText('Saldo insuficiente')).toBeInTheDocument()
  })

  it('cierra el modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
