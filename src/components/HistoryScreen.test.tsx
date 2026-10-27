import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryScreen } from './HistoryScreen'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeTransaction } from '../test/fixtures'
import type { Transaction } from '../types/database'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

vi.mock('./TransactionDetailModal', () => ({
  TransactionDetailModal: ({ transaction }: { transaction: Transaction | null }) =>
    transaction ? <div>Detalle {transaction.note}</div> : null,
}))

const now = new Date()
const todayDate = now.toISOString()

const transactions = [
  makeTransaction({
    id: 'tx-1',
    type: 'income',
    amount: 300,
    note: 'Salario',
    date: todayDate,
  }),
  makeTransaction({
    id: 'tx-2',
    type: 'expense',
    amount: 50,
    note: 'Supermercado',
    date: todayDate,
  }),
]

describe('HistoryScreen', () => {
  beforeEach(() => {
    financeServiceMock.getTransactionsByMonth.mockReset()
    financeServiceMock.getTransactionsByMonth.mockResolvedValue(transactions)
  })

  it('muestra el spinner mientras carga', () => {
    financeServiceMock.getTransactionsByMonth.mockReturnValue(new Promise(() => {}))

    const { container } = render(<HistoryScreen />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('consulta el mes actual al montar', async () => {
    render(<HistoryScreen />)

    await waitFor(() =>
      expect(financeServiceMock.getTransactionsByMonth).toHaveBeenCalledWith(
        now.getFullYear(),
        now.getMonth() + 1
      )
    )
  })

  it('muestra el resumen del mes', async () => {
    render(<HistoryScreen />)

    expect(await screen.findAllByText('+$250.00')).toHaveLength(2)
    expect(screen.getByText('Superávit')).toBeInTheDocument()
    expect(screen.getByText('$300.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('17% gastado')).toBeInTheDocument()
  })

  it('lista las transacciones agrupadas por día', async () => {
    render(<HistoryScreen />)

    expect(await screen.findByText('Salario')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('+$300.00')).toBeInTheDocument()
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
    expect(screen.getAllByText(/Hoy/).length).toBeGreaterThan(0)
  })

  it('filtra por gastos e ingresos', async () => {
    const user = userEvent.setup()
    render(<HistoryScreen />)
    await screen.findByText('Salario')

    await user.click(screen.getByRole('button', { name: 'Gastos' }))
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.queryByText('Salario')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ingresos' }))
    expect(screen.getByText('Salario')).toBeInTheDocument()
    expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getByText('Salario')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })

  it('busca por nota, categoría o cuenta', async () => {
    const user = userEvent.setup()
    render(<HistoryScreen />)
    await screen.findByText('Salario')

    const search = screen.getByPlaceholderText('Buscar por nota, categoría o cuenta...')

    await user.type(search, 'super')
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.queryByText('Salario')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'alimentación')
    expect(screen.getByText('Salario')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'cuenta principal')
    expect(screen.getByText('Salario')).toBeInTheDocument()
  })

  it('navega al mes anterior y al siguiente', async () => {
    const user = userEvent.setup()
    render(<HistoryScreen />)
    await waitFor(() =>
      expect(financeServiceMock.getTransactionsByMonth).toHaveBeenCalled()
    )

    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    await user.click(screen.getByTitle('Mes anterior'))
    await waitFor(() =>
      expect(financeServiceMock.getTransactionsByMonth).toHaveBeenCalledWith(
        prev.getFullYear(),
        prev.getMonth() + 1
      )
    )

    const next = new Date(now.getFullYear(), now.getMonth(), 1)
    await user.click(screen.getByTitle('Mes siguiente'))
    await waitFor(() =>
      expect(financeServiceMock.getTransactionsByMonth).toHaveBeenCalledWith(
        next.getFullYear(),
        next.getMonth() + 1
      )
    )
  })

  it('muestra el estado vacío sin movimientos', async () => {
    financeServiceMock.getTransactionsByMonth.mockResolvedValue([])

    render(<HistoryScreen />)

    expect(
      await screen.findByText(
        'No hay movimientos en este periodo con los filtros seleccionados.'
      )
    ).toBeInTheDocument()
  })

  it('abre el detalle de una transacción', async () => {
    const user = userEvent.setup()
    render(<HistoryScreen />)
    await screen.findByText('Supermercado')

    await user.click(screen.getByText('Supermercado'))

    expect(screen.getByText('Detalle Supermercado')).toBeInTheDocument()
  })

  it('registra el error si falla la consulta', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.getTransactionsByMonth.mockRejectedValue(new Error('boom'))

    render(<HistoryScreen />)

    await waitFor(() => expect(error).toHaveBeenCalled())
  })
})
