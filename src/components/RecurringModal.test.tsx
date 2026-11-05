import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringModal } from './RecurringModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount, makeCategory } from '../test/fixtures'
import { toDateOnly } from '../lib/recurrence'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const accounts = [makeAccount({ id: 'acc-1', name: 'Cuenta principal' })]
const categories = [
  makeCategory({ id: 'cat-1', name: 'Servicios', icon: 'Zap' }),
  makeCategory({ id: 'cat-2', name: 'Salario', type: 'income', icon: 'Wallet' }),
]

const renderModal = (
  props: Partial<React.ComponentProps<typeof RecurringModal>> = {}
) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(<RecurringModal isOpen onClose={onClose} onSaved={onSaved} {...props} />)
  return { onClose, onSaved }
}

describe('RecurringModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getAccounts.mockResolvedValue(accounts)
    financeServiceMock.getCategories.mockResolvedValue(categories)
    financeServiceMock.createRecurringTransaction.mockResolvedValue({})
  })

  it('no renderiza nada cerrado', () => {
    const { container } = render(
      <RecurringModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('carga cuentas y categorías al abrirse', async () => {
    renderModal()

    expect(await screen.findByRole('option', { name: 'Cuenta principal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Servicios' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Salario' })).not.toBeInTheDocument()
  })

  it('valida que el monto sea mayor a cero', async () => {
    const user = userEvent.setup()
    renderModal()

    await screen.findByRole('option', { name: 'Cuenta principal' })
    await user.type(screen.getByLabelText('Monto'), '0')
    await user.click(screen.getByRole('button', { name: 'Crear automatización' }))

    expect(screen.getByText('Ingresa un monto válido mayor a 0')).toBeInTheDocument()
    expect(financeServiceMock.createRecurringTransaction).not.toHaveBeenCalled()
  })

  it('crea la automatización con los datos del formulario', async () => {
    const user = userEvent.setup()
    const { onSaved, onClose } = renderModal()

    await screen.findByRole('option', { name: 'Cuenta principal' })
    await user.type(screen.getByLabelText('Monto'), '45.50')
    await user.type(screen.getByLabelText('Descripción'), 'Internet del hogar')
    await user.click(screen.getByRole('button', { name: 'Crear automatización' }))

    await waitFor(() => {
      expect(financeServiceMock.createRecurringTransaction).toHaveBeenCalledWith({
        account_id: 'acc-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: 45.5,
        note: 'Internet del hogar',
        frequency: 'monthly',
        start_date: toDateOnly(new Date()),
      })
    })

    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('cambia a ingreso y usa sus categorías', async () => {
    const user = userEvent.setup()
    renderModal()

    await screen.findByRole('option', { name: 'Cuenta principal' })
    await user.click(screen.getByRole('button', { name: 'Ingreso' }))

    expect(screen.getByRole('option', { name: 'Salario' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Servicios' })).not.toBeInTheDocument()
  })

  it('muestra el error cuando falla la creación', async () => {
    financeServiceMock.createRecurringTransaction.mockRejectedValue(
      new Error('Sin conexión')
    )
    const user = userEvent.setup()
    renderModal()

    await screen.findByRole('option', { name: 'Cuenta principal' })
    await user.type(screen.getByLabelText('Monto'), '20')
    await user.click(screen.getByRole('button', { name: 'Crear automatización' }))

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument()
  })
})
