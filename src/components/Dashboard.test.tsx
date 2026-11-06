import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard'
import { authState } from '../test/mocks/authContext'
import { financeServiceMock } from '../test/mocks/financeService'
import {
  makeAccount,
  makeBudget,
  makeCategory,
  makeProfile,
  makeRecurringTransaction,
  makeSavingsGoal,
  makeTransaction,
  makeUser,
} from '../test/fixtures'

vi.mock('../context/AuthContext', async () => {
  const { authState: state } = await import('../test/mocks/authContext')
  return { useAuth: () => state }
})

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

vi.mock('./TransactionModal', () => ({
  TransactionModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Modal de transacción</div> : null,
}))

const now = new Date()
const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString()

const setupHappyPath = () => {
  financeServiceMock.getProfile.mockResolvedValue(makeProfile())
  financeServiceMock.getAccounts.mockResolvedValue([
    makeAccount({ id: 'acc-1', name: 'Banco Pichincha', current_balance: 100 }),
    makeAccount({ id: 'acc-2', name: 'Efectivo', type: 'cash', current_balance: 50 }),
    makeAccount({
      id: 'acc-3',
      name: 'Fondo viaje',
      type: 'savings',
      current_balance: 200,
      target_amount: 400,
    }),
  ])
  financeServiceMock.getCategories.mockResolvedValue([makeCategory()])
  financeServiceMock.getTransactions.mockResolvedValue([
    makeTransaction({
      id: 'tx-1',
      type: 'income',
      amount: 300,
      note: 'Salario',
      date: currentMonthDate,
    }),
    makeTransaction({
      id: 'tx-2',
      type: 'expense',
      amount: 50,
      note: 'Supermercado',
      date: currentMonthDate,
    }),
    makeTransaction({
      id: 'tx-3',
      type: 'income',
      amount: 200,
      note: 'Ahorro',
      date: currentMonthDate,
    }),
  ])
  financeServiceMock.getTransactionsByMonth.mockResolvedValue([
    makeTransaction({
      id: 'tx-1',
      type: 'income',
      amount: 300,
      note: 'Salario',
      date: currentMonthDate,
    }),
    makeTransaction({
      id: 'tx-2',
      type: 'expense',
      amount: 50,
      note: 'Supermercado',
      date: currentMonthDate,
    }),
    makeTransaction({
      id: 'tx-3',
      type: 'income',
      amount: 200,
      note: 'Ahorro',
      date: currentMonthDate,
    }),
  ])
  financeServiceMock.getBudgets.mockResolvedValue([])
  financeServiceMock.getRecurringTransactions.mockResolvedValue([])
  financeServiceMock.getSavingsGoals.mockResolvedValue([])
}

const renderDashboard = () => {
  const onOpenProfile = vi.fn()
  render(<Dashboard onOpenProfile={onOpenProfile} />)
  return { onOpenProfile }
}

describe('Dashboard', () => {
  beforeEach(() => {
    authState.user = makeUser()
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    setupHappyPath()
  })

  it('muestra el spinner mientras carga', () => {
    financeServiceMock.getAccounts.mockReturnValue(new Promise(() => {}))

    const { container } = render(<Dashboard onOpenProfile={vi.fn()} />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('saluda al usuario y muestra el balance disponible sin ahorros', async () => {
    renderDashboard()

    expect(await screen.findByText('Hola, Danilo')).toBeInTheDocument()
    expect(screen.getByText('150.00')).toBeInTheDocument()
    expect(screen.getByText(/\$200\.00 en ahorros/)).toBeInTheDocument()
  })

  it('calcula el flujo mensual solo con transacciones del mes actual', async () => {
    renderDashboard()

    await screen.findByText('Hola, Danilo')

    expect(screen.getByText('+$450.00 este mes')).toBeInTheDocument()
    expect(screen.getAllByText('$50.00')).toHaveLength(2)
    expect(screen.getByText('10% del ingreso utilizado')).toBeInTheDocument()
    expect(screen.getByText('$450.00 disponible')).toBeInTheDocument()
    expect(screen.queryByText('$1299.00')).not.toBeInTheDocument()
  })

  it('lista los movimientos recientes con su signo', async () => {
    renderDashboard()

    expect(await screen.findByText('Salario')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('+$300.00')).toBeInTheDocument()
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
  })

  it('oculta los saldos al alternar la visibilidad', async () => {
    renderDashboard()
    await screen.findByText('Hola, Danilo')

    fireEvent.click(screen.getByText('visibility').closest('button')!)

    expect(screen.getAllByText('••••••')).toHaveLength(4)
    expect(screen.queryByText('150.00')).not.toBeInTheDocument()
    expect(screen.queryByText(/\$200\.00 en ahorros/)).not.toBeInTheDocument()
  })

  it('abre el modal de nueva transacción', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await screen.findByText('Hola, Danilo')

    await user.click(screen.getByTitle('Nueva Transacción'))

    expect(screen.getByText('Modal de transacción')).toBeInTheDocument()
  })

  it('muestra los presupuestos del mes con su avance', async () => {
    financeServiceMock.getBudgets.mockResolvedValue([
      makeBudget({
        id: 'budget-1',
        category_id: 'cat-1',
        amount: 100,
        category: makeCategory({ id: 'cat-1', name: 'Alimentación' }),
      }),
    ])

    renderDashboard()

    expect(await screen.findByText('Presupuestos')).toBeInTheDocument()
    expect(await screen.findByText('$50.00 / $100.00')).toBeInTheDocument()
    expect(screen.getByText('50% usado')).toBeInTheDocument()
  })

  it('abre el modal para configurar presupuestos', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await screen.findByText('Presupuestos')

    await user.click(screen.getByRole('button', { name: /Configurar/ }))

    expect(screen.getByText('Presupuestos mensuales')).toBeInTheDocument()
  })

  it('muestra recordatorios de metas y movimientos recurrentes', async () => {
    const inTwoDays = new Date()
    inTwoDays.setDate(inTwoDays.getDate() + 2)
    const dateOnly = `${inTwoDays.getFullYear()}-${String(inTwoDays.getMonth() + 1).padStart(2, '0')}-${String(inTwoDays.getDate()).padStart(2, '0')}`

    financeServiceMock.getRecurringTransactions.mockResolvedValue([
      makeRecurringTransaction({
        id: 'recurring-1',
        note: 'Internet',
        amount: 40,
        next_run_date: dateOnly,
      }),
    ])
    financeServiceMock.getSavingsGoals.mockResolvedValue([
      makeSavingsGoal({
        id: 'goal-1',
        name: 'Viaje',
        target_amount: 100,
        target_date: dateOnly,
      }),
    ])

    renderDashboard()

    expect(await screen.findByText('Recordatorios')).toBeInTheDocument()
    expect(screen.getByText('Se registrará en 2 días · Mensual')).toBeInTheDocument()
    expect(screen.getByText('Faltan $100.00 · vence en 2 días')).toBeInTheDocument()
  })

  it('muestra el aviso cuando se supera un presupuesto', async () => {
    financeServiceMock.getBudgets.mockResolvedValue([
      makeBudget({
        id: 'budget-1',
        category_id: 'cat-1',
        amount: 50,
        category: makeCategory({ id: 'cat-1', name: 'Alimentación' }),
      }),
    ])

    renderDashboard()

    expect(await screen.findByText('Recordatorios')).toBeInTheDocument()
    expect(screen.getByText('100% · límite alcanzado')).toBeInTheDocument()
  })

  it('no muestra recordatorios cuando no hay pendientes', async () => {
    renderDashboard()

    await screen.findByText('Hola, Danilo')

    expect(screen.queryByText('Recordatorios')).not.toBeInTheDocument()
  })

  it('notifica al abrir el perfil', async () => {
    const user = userEvent.setup()
    const { onOpenProfile } = renderDashboard()
    await screen.findByText('Hola, Danilo')

    await user.click(screen.getByTitle('Ajustes'))

    expect(onOpenProfile).toHaveBeenCalledTimes(1)
  })

  it('muestra el estado vacío cuando no hay movimientos', async () => {
    financeServiceMock.getTransactions.mockResolvedValue([])
    financeServiceMock.getTransactionsByMonth.mockResolvedValue([])

    renderDashboard()

    expect(
      await screen.findByText(/Aún no tienes movimientos/)
    ).toBeInTheDocument()
  })

  it('renderiza aunque falle la carga del perfil', async () => {
    financeServiceMock.getProfile.mockRejectedValue(new Error('sin perfil'))

    renderDashboard()

    expect(await screen.findByText(/Hola,/)).toBeInTheDocument()
  })
})
