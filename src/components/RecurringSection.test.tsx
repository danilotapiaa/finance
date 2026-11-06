import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringSection } from './RecurringSection'
import { FeedbackProvider } from '../context/FeedbackProvider'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeRecurringTransaction } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderSection = () =>
  render(
    <FeedbackProvider>
      <RecurringSection />
    </FeedbackProvider>
  )

describe('RecurringSection', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getRecurringTransactions.mockResolvedValue([])
    financeServiceMock.getAccounts.mockResolvedValue([])
    financeServiceMock.getCategories.mockResolvedValue([])
  })

  it('muestra un estado vacío cuando no hay automatizaciones', async () => {
    renderSection()

    expect(await screen.findByText(/Aún no tienes movimientos recurrentes/)).toBeInTheDocument()
  })

  it('lista las automatizaciones con su monto y frecuencia', async () => {
    financeServiceMock.getRecurringTransactions.mockResolvedValue([
      makeRecurringTransaction({
        id: 'recurring-1',
        note: 'Internet del hogar',
        amount: 30,
        frequency: 'monthly',
        next_run_date: '2026-01-15',
      }),
    ])

    renderSection()

    expect(await screen.findByText('Internet del hogar')).toBeInTheDocument()
    expect(screen.getByText(/Mensual/)).toBeInTheDocument()
    expect(screen.getByText('-$30.00')).toBeInTheDocument()
  })

  it('pausa una automatización y revierte si falla', async () => {
    const rule = makeRecurringTransaction({ id: 'recurring-1', is_active: true })
    financeServiceMock.getRecurringTransactions.mockResolvedValue([rule])
    financeServiceMock.toggleRecurringTransaction.mockRejectedValue(new Error('boom'))

    const user = userEvent.setup()
    renderSection()

    const toggle = await screen.findByRole('switch', { name: /Pausar/ })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle)

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /Pausar/ })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })
    expect(financeServiceMock.toggleRecurringTransaction).toHaveBeenCalledWith(
      'recurring-1',
      false
    )
  })

  it('pausa una automatización correctamente', async () => {
    financeServiceMock.getRecurringTransactions.mockResolvedValue([
      makeRecurringTransaction({ id: 'recurring-1', is_active: true }),
    ])
    financeServiceMock.toggleRecurringTransaction.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('switch', { name: /Pausar/ }))

    expect(screen.getByRole('switch', { name: /Activar/ })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByText(/Pausada/)).toBeInTheDocument()
  })

  it('abre el modal para crear una automatización', async () => {
    const user = userEvent.setup()
    renderSection()

    await screen.findByText(/Aún no tienes movimientos recurrentes/)
    await user.click(screen.getByRole('button', { name: 'Nueva' }))

    expect(screen.getByText('Nueva automatización')).toBeInTheDocument()
  })

  it('abre el modal para editar una automatización', async () => {
    financeServiceMock.getRecurringTransactions.mockResolvedValue([
      makeRecurringTransaction({
        id: 'recurring-1',
        note: 'Internet del hogar',
        account_id: 'acc-1',
        category_id: 'cat-1',
      }),
    ])

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Internet del hogar')
    await user.click(
      screen.getByRole('button', { name: 'Editar Internet del hogar' })
    )

    expect(await screen.findByText('Editar automatización')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toHaveValue('Internet del hogar')
  })

  it('elimina una automatización tras confirmar', async () => {
    financeServiceMock.getRecurringTransactions.mockResolvedValue([
      makeRecurringTransaction({ id: 'recurring-1', note: 'Internet del hogar' }),
    ])
    financeServiceMock.deleteRecurringTransaction.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderSection()

    await screen.findByText('Internet del hogar')
    await user.click(screen.getByRole('button', { name: /Eliminar Internet del hogar/ }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(financeServiceMock.deleteRecurringTransaction).toHaveBeenCalledWith('recurring-1')
    })
    expect(screen.queryByText('Internet del hogar')).not.toBeInTheDocument()
  })
})
