import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavingsGoalsSection } from './SavingsGoalsSection'
import { FeedbackProvider } from '../context/FeedbackProvider'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeGoalContribution, makeSavingsGoal } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderSection = () =>
  render(
    <FeedbackProvider>
      <SavingsGoalsSection />
    </FeedbackProvider>
  )

describe('SavingsGoalsSection', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getSavingsGoals.mockResolvedValue([])
  })

  it('muestra un estado vacío cuando no hay metas', async () => {
    renderSection()

    expect(await screen.findByText(/Aún no tienes metas/)).toBeInTheDocument()
  })

  it('muestra el avance de cada meta', async () => {
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({
        id: 'goal-1',
        name: 'Viaje a la playa',
        target_amount: 1000,
        contributions: [
          makeGoalContribution({ id: 'c-1', amount: 250 }),
          makeGoalContribution({ id: 'c-2', amount: 250 }),
        ],
      }),
    ])

    renderSection()

    expect(await screen.findByText('Viaje a la playa')).toBeInTheDocument()
    expect(screen.getByText('$500.00 de $1,000.00')).toBeInTheDocument()
    expect(screen.getByText('50% · Faltan $500.00')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de Viaje a la playa' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    )
  })

  it('indica cuando se alcanza la meta', async () => {
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({
        target_amount: 100,
        contributions: [makeGoalContribution({ id: 'c-1', amount: 120 })],
      }),
    ])

    renderSection()

    expect(await screen.findByText('Meta alcanzada')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de Viaje a la playa' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    )
  })

  it('abre el modal para crear una meta', async () => {
    const user = userEvent.setup()
    renderSection()

    await screen.findByText(/Aún no tienes metas/)
    await user.click(screen.getByRole('button', { name: 'Nueva' }))

    expect(screen.getByText('Nueva meta de ahorro')).toBeInTheDocument()
  })

  it('abre el modal para aportar a una meta', async () => {
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({ id: 'goal-1', name: 'Viaje a la playa' }),
    ])

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Viaje a la playa')
    await user.click(screen.getByRole('button', { name: 'Aportar a Viaje a la playa' }))

    expect(screen.getByText('Aportar a Viaje a la playa')).toBeInTheDocument()
  })

  it('muestra y elimina los aportes de una meta', async () => {
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({
        id: 'goal-1',
        name: 'Viaje a la playa',
        contributions: [
          makeGoalContribution({ id: 'c-1', amount: 100, note: 'Primer aporte' }),
        ],
      }),
    ])
    financeServiceMock.deleteGoalContribution.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Viaje a la playa')
    await user.click(screen.getByRole('button', { name: 'Ver aportes de Viaje a la playa' }))

    expect(screen.getByText('Primer aporte')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar aporte' }))

    await waitFor(() => {
      expect(financeServiceMock.deleteGoalContribution).toHaveBeenCalledWith('c-1')
    })
    expect(screen.queryByText('Primer aporte')).not.toBeInTheDocument()
  })

  it('elimina una meta tras confirmar', async () => {
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({ id: 'goal-1', name: 'Viaje a la playa' }),
    ])
    financeServiceMock.deleteSavingsGoal.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Viaje a la playa')
    await user.click(screen.getByRole('button', { name: 'Eliminar meta Viaje a la playa' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(financeServiceMock.deleteSavingsGoal).toHaveBeenCalledWith('goal-1')
    })
    expect(screen.queryByText('Viaje a la playa')).not.toBeInTheDocument()
  })
})
