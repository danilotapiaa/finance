import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoalModal } from './GoalModal'
import { financeServiceMock } from '../test/mocks/financeService'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderModal = (props: Partial<React.ComponentProps<typeof GoalModal>> = {}) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(<GoalModal isOpen onClose={onClose} onSaved={onSaved} {...props} />)
  return { onClose, onSaved }
}

describe('GoalModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createSavingsGoal.mockResolvedValue({})
  })

  it('no renderiza nada cerrado', () => {
    const { container } = render(
      <GoalModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('exige un nombre para la meta', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Monto objetivo'), '500')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    expect(screen.getByText('Escribe un nombre para la meta')).toBeInTheDocument()
    expect(financeServiceMock.createSavingsGoal).not.toHaveBeenCalled()
  })

  it('exige un monto objetivo mayor a cero', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Nombre'), 'Viaje')
    await user.type(screen.getByLabelText('Monto objetivo'), '0')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    expect(screen.getByText('Ingresa un monto objetivo mayor a 0')).toBeInTheDocument()
    expect(financeServiceMock.createSavingsGoal).not.toHaveBeenCalled()
  })

  it('crea la meta con los datos del formulario', async () => {
    const user = userEvent.setup()
    const { onSaved, onClose } = renderModal()

    await user.type(screen.getByLabelText('Nombre'), 'Viaje a la playa')
    await user.type(screen.getByLabelText('Monto objetivo'), '1200.50')
    await user.selectOptions(screen.getByLabelText('Ícono'), 'flight')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    await waitFor(() => {
      expect(financeServiceMock.createSavingsGoal).toHaveBeenCalledWith({
        name: 'Viaje a la playa',
        target_amount: 1200.5,
        target_date: null,
        icon: 'flight',
      })
    })

    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el error cuando falla la creación', async () => {
    financeServiceMock.createSavingsGoal.mockRejectedValue(new Error('Sin conexión'))
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Nombre'), 'Viaje')
    await user.type(screen.getByLabelText('Monto objetivo'), '100')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument()
  })
})
