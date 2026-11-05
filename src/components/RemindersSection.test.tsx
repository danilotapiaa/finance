import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RemindersSection } from './RemindersSection'
import type { Reminder } from '../lib/reminders'

const recurring: Reminder = {
  id: 'recurring-1',
  type: 'recurring',
  title: 'Internet',
  amount: 40,
  daysUntil: 2,
  frequency: 'monthly',
  transactionType: 'expense',
}

const goalDeadline: Reminder = {
  id: 'goal-date-1',
  type: 'goal_deadline',
  title: 'Viaje',
  remaining: 750,
  daysUntil: 4,
}

const goalNear: Reminder = {
  id: 'goal-near-1',
  type: 'goal_near',
  title: 'Laptop',
  remaining: 50,
  progress: 95,
}

describe('RemindersSection', () => {
  it('no renderiza nada sin recordatorios', () => {
    const { container } = render(<RemindersSection reminders={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('muestra un movimiento recurrente próximo', () => {
    render(<RemindersSection reminders={[recurring]} />)

    expect(screen.getByText('Recordatorios')).toBeInTheDocument()
    expect(screen.getByText('Internet')).toBeInTheDocument()
    expect(screen.getByText('Se registrará en 2 días · Mensual')).toBeInTheDocument()
    expect(screen.getByText('-$40.00')).toBeInTheDocument()
  })

  it('muestra una meta por vencer', () => {
    render(<RemindersSection reminders={[goalDeadline]} />)

    expect(screen.getByText('Viaje')).toBeInTheDocument()
    expect(screen.getByText('Faltan $750.00 · vence en 4 días')).toBeInTheDocument()
  })

  it('muestra una meta cerca de completarse', () => {
    render(<RemindersSection reminders={[goalNear]} />)

    expect(screen.getByText('Laptop')).toBeInTheDocument()
    expect(screen.getByText('Te faltan $50.00 · 95% completado')).toBeInTheDocument()
  })

  it('oculta los montos cuando el balance está oculto', () => {
    render(<RemindersSection reminders={[recurring, goalDeadline, goalNear]} isBalanceVisible={false} />)

    expect(screen.getByText('-••••••')).toBeInTheDocument()
    expect(screen.getByText('Faltan •••••• · vence en 4 días')).toBeInTheDocument()
    expect(screen.getByText('Te faltan •••••• · 95% completado')).toBeInTheDocument()
  })

  it('indica "hoy" y "mañana" según los días restantes', () => {
    render(
      <RemindersSection
        reminders={[
          { ...recurring, id: 'r-hoy', daysUntil: 0 },
          { ...recurring, id: 'r-manana', daysUntil: 1, title: 'Renta' },
        ]}
      />
    )

    expect(screen.getByText('Se registrará hoy · Mensual')).toBeInTheDocument()
    expect(screen.getByText('Se registrará mañana · Mensual')).toBeInTheDocument()
  })
})
