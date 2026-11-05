import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContributionModal } from './ContributionModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeSavingsGoal } from '../test/fixtures'
import { toDateOnly } from '../lib/recurrence'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const goal = makeSavingsGoal({ id: 'goal-1', name: 'Viaje a la playa' })

const renderModal = (
  props: Partial<React.ComponentProps<typeof ContributionModal>> = {}
) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <ContributionModal isOpen goal={goal} onClose={onClose} onSaved={onSaved} {...props} />
  )
  return { onClose, onSaved }
}

describe('ContributionModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.addGoalContribution.mockResolvedValue(undefined)
  })

  it('no renderiza nada cerrado', () => {
    const { container } = render(
      <ContributionModal isOpen={false} goal={goal} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza nada sin meta seleccionada', () => {
    const { container } = render(
      <ContributionModal isOpen goal={null} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('valida que el aporte sea mayor a cero', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Monto del aporte'), '0')
    await user.click(screen.getByRole('button', { name: 'Registrar aporte' }))

    expect(screen.getByText('Ingresa un monto mayor a 0')).toBeInTheDocument()
    expect(financeServiceMock.addGoalContribution).not.toHaveBeenCalled()
  })

  it('registra el aporte con la fecha seleccionada', async () => {
    const user = userEvent.setup()
    const { onSaved, onClose } = renderModal()

    await user.type(screen.getByLabelText('Monto del aporte'), '150.75')
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Quincena')
    await user.click(screen.getByRole('button', { name: 'Registrar aporte' }))

    await waitFor(() => {
      expect(financeServiceMock.addGoalContribution).toHaveBeenCalledWith({
        goal_id: 'goal-1',
        amount: 150.75,
        date: new Date(`${toDateOnly(new Date())}T12:00:00`).toISOString(),
        note: 'Quincena',
      })
    })

    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el error cuando falla el registro', async () => {
    financeServiceMock.addGoalContribution.mockRejectedValue(new Error('Sin conexión'))
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Monto del aporte'), '10')
    await user.click(screen.getByRole('button', { name: 'Registrar aporte' }))

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument()
  })
})
