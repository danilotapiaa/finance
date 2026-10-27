import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountModal } from './AccountModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeAccount } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderModal = (props: Partial<React.ComponentProps<typeof AccountModal>> = {}) => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <AccountModal
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
      accountToEdit={null}
      {...props}
    />
  )
  return { onClose, onSuccess }
}

describe('AccountModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createAccount.mockResolvedValue({})
    financeServiceMock.updateAccount.mockResolvedValue({})
  })

  it('no renderiza nada si está cerrado', () => {
    const { container } = render(
      <AccountModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el formulario de nueva cuenta', () => {
    renderModal()

    expect(screen.getByText('Nueva Cuenta')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(0)
    expect(screen.getByRole('button', { name: 'Crear Cuenta' })).toBeInTheDocument()
  })

  it('muestra la meta y los dígitos solo para ahorros', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.queryByPlaceholderText('Ej. 6000.00')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ahorro' }))

    expect(screen.getByPlaceholderText('Ej. 6000.00')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('•••• 9021')).toBeInTheDocument()
  })

  it('oculta los dígitos para cuentas de efectivo', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Efectivo' }))

    expect(screen.queryByPlaceholderText('•••• 4821')).not.toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Ej. Billetera personal, Efectivo en casa, Caja chica...')
    ).toBeInTheDocument()
  })

  it('valida el nombre obligatorio', () => {
    renderModal()

    fireEvent.submit(screen.getByRole('button', { name: 'Crear Cuenta' }).closest('form')!)

    expect(
      screen.getByText('Por favor ingresa un nombre para la cuenta')
    ).toBeInTheDocument()
    expect(financeServiceMock.createAccount).not.toHaveBeenCalled()
  })

  it('valida que el saldo sea numérico', () => {
    renderModal()

    fireEvent.change(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...'),
      { target: { value: 'Banco' } }
    )
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Crear Cuenta' }).closest('form')!)

    expect(screen.getByText('Ingresa un saldo numérico válido')).toBeInTheDocument()
  })

  it('crea una cuenta con los datos ingresados', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()

    await user.type(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...'),
      '  Banco del Pacífico  '
    )
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '150.50' },
    })
    await user.type(screen.getByPlaceholderText('•••• 4821'), '•••• 1234')
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    await waitFor(() =>
      expect(financeServiceMock.createAccount).toHaveBeenCalledWith({
        name: 'Banco del Pacífico',
        type: 'bank',
        initial_balance: 150.5,
        current_balance: 150.5,
        account_number_masked: '•••• 1234',
        target_amount: null,
        color: null,
        icon: 'account_balance',
        is_active: true,
      })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('crea una cuenta de ahorro con meta', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Ahorro' }))
    await user.type(screen.getByPlaceholderText('Ej. Fondo de Emergencia, Ahorro Vacaciones...'), 'Fondo')
    await user.type(screen.getByPlaceholderText('Ej. 6000.00'), '1000')
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    await waitFor(() =>
      expect(financeServiceMock.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fondo',
          type: 'savings',
          target_amount: 1000,
          icon: 'savings',
        })
      )
    )
  })

  it('edita una cuenta existente', async () => {
    const user = userEvent.setup()
    const account = makeAccount({
      id: 'acc-9',
      name: 'Cuenta principal',
      current_balance: 100,
      account_number_masked: '•••• 4821',
    })
    const { onClose, onSuccess } = renderModal({ accountToEdit: account })

    expect(screen.getByText('Editar Cuenta y Saldo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Cuenta principal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100.00')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('100.00'), {
      target: { value: '250' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios en Cuenta' }))

    await waitFor(() =>
      expect(financeServiceMock.updateAccount).toHaveBeenCalledWith(
        'acc-9',
        expect.objectContaining({
          name: 'Cuenta principal',
          current_balance: 250,
        })
      )
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el error del servicio al guardar', async () => {
    const user = userEvent.setup()
    financeServiceMock.createAccount.mockRejectedValue(new Error('Nombre duplicado'))
    renderModal()

    await user.type(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...'),
      'Banco'
    )
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument()
  })

  it('valida la meta de ahorro', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Ahorro' }))
    await user.type(
      screen.getByPlaceholderText('Ej. Fondo de Emergencia, Ahorro Vacaciones...'),
      'Fondo'
    )
    fireEvent.change(screen.getByPlaceholderText('Ej. 6000.00'), {
      target: { value: '-5' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Crear Cuenta' }).closest('form')!)

    expect(
      screen.getByText('Ingresa una meta de ahorro válida')
    ).toBeInTheDocument()
    expect(financeServiceMock.createAccount).not.toHaveBeenCalled()
  })

  it('permite elegir un icono representativo', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...'),
      'Billetera'
    )
    await user.click(screen.getByTitle('Billetera'))
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    await waitFor(() =>
      expect(financeServiceMock.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'wallet' })
      )
    )
  })

  it('muestra un error genérico ante fallos desconocidos', async () => {
    const user = userEvent.setup()
    financeServiceMock.createAccount.mockRejectedValue('fallo')
    renderModal()

    await user.type(
      screen.getByPlaceholderText('Ej. Banco Pichincha, BBVA, Santander...'),
      'Banco'
    )
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    expect(
      await screen.findByText('Ocurrió un error al guardar la cuenta.')
    ).toBeInTheDocument()
  })

  it('cierra el modal con el botón de la esquina', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
