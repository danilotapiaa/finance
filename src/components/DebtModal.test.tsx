import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebtModal } from './DebtModal'
import { financeServiceMock } from '../test/mocks/financeService'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderModal = (props: Partial<React.ComponentProps<typeof DebtModal>> = {}) => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<DebtModal isOpen onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

describe('DebtModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createDebt.mockResolvedValue({})
  })

  it('no renderiza nada si está cerrado', () => {
    const { container } = render(
      <DebtModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('inicia como préstamo otorgado', () => {
    renderModal()

    expect(screen.getByText('Nuevo préstamo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar deuda' })).toBeInTheDocument()
  })

  it('cambia el título al registrar una deuda contraída', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(
      screen.getByRole('button', { name: 'Debo' })
    )

    expect(screen.getByText('Nueva deuda')).toBeInTheDocument()
  })

  it('valida el nombre de la persona', () => {
    renderModal()

    fireEvent.submit(screen.getByRole('button', { name: 'Guardar deuda' }).closest('form')!)

    expect(screen.getByText('Ingresa el nombre de la persona')).toBeInTheDocument()
    expect(financeServiceMock.createDebt).not.toHaveBeenCalled()
  })

  it('valida el monto mayor a cero', () => {
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('Ej. Carlos Martínez'), {
      target: { value: 'Carlos' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar deuda' }).closest('form')!)

    expect(
      screen.getByText('Ingresa un monto válido mayor a 0')
    ).toBeInTheDocument()
  })

  it('crea un préstamo con fecha y nota', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()

    await user.type(
      screen.getByPlaceholderText('Ej. Carlos Martínez'),
      '  Carlos Martínez  '
    )
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '100' },
    })
    fireEvent.change(document.querySelector('input[type="date"]')!, {
      target: { value: '2026-12-31' },
    })
    await user.type(
      screen.getByPlaceholderText('Ej. Préstamo para repuesto de auto...'),
      'Repuesto'
    )
    await user.click(screen.getByRole('button', { name: 'Guardar deuda' }))

    await waitFor(() =>
      expect(financeServiceMock.createDebt).toHaveBeenCalledWith({
        person_name: 'Carlos Martínez',
        type: 'lend',
        total_amount: 100,
        due_date: expect.stringContaining('2026-12-31'),
        note: 'Repuesto',
      })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('crea una deuda contraída sin fecha ni nota', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(
      screen.getByRole('button', { name: 'Debo' })
    )
    await user.type(screen.getByPlaceholderText('Ej. Carlos Martínez'), 'Luis')
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '75.5' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar deuda' }))

    await waitFor(() =>
      expect(financeServiceMock.createDebt).toHaveBeenCalledWith({
        person_name: 'Luis',
        type: 'borrow',
        total_amount: 75.5,
        due_date: null,
        note: null,
      })
    )
  })

  it('muestra el error del servicio', async () => {
    const user = userEvent.setup()
    financeServiceMock.createDebt.mockRejectedValue(new Error('Error de red'))
    renderModal()

    await user.type(screen.getByPlaceholderText('Ej. Carlos Martínez'), 'Carlos')
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '100' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar deuda' }))

    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })

  it('limpia el formulario al reabrirse tras guardar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const { rerender } = render(
      <DebtModal isOpen onClose={onClose} onSuccess={onSuccess} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Debo' })
    )
    await user.type(screen.getByPlaceholderText('Ej. Carlos Martínez'), 'Carlos')
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '100' },
    })
    fireEvent.change(document.querySelector('input[type="date"]')!, {
      target: { value: '2026-12-31' },
    })
    await user.type(
      screen.getByPlaceholderText('Ej. Préstamo para repuesto de auto...'),
      'Repuesto'
    )
    await user.click(screen.getByRole('button', { name: 'Guardar deuda' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())

    rerender(<DebtModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />)
    rerender(<DebtModal isOpen onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByText('Nuevo préstamo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej. Carlos Martínez')).toHaveValue('')
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null)
    expect(document.querySelector('input[type="date"]')).toHaveValue('')
    expect(
      screen.getByPlaceholderText('Ej. Préstamo para repuesto de auto...')
    ).toHaveValue('')
  })

  it('descarta un borrador al cerrar sin guardar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const { rerender } = render(
      <DebtModal isOpen onClose={onClose} onSuccess={onSuccess} />
    )

    await user.type(screen.getByPlaceholderText('Ej. Carlos Martínez'), 'Borrador')
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '25' },
    })

    rerender(<DebtModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />)
    rerender(<DebtModal isOpen onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByPlaceholderText('Ej. Carlos Martínez')).toHaveValue('')
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null)
  })

  it('cierra el modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByText('close').closest('button')!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
