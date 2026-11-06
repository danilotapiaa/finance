import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoriesManager } from './CategoriesManager'
import { FeedbackProvider } from '../context/FeedbackProvider'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeCategory } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const expense = makeCategory({
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Comida',
  type: 'expense',
  icon: 'restaurant',
})
const globalCategory = makeCategory({
  id: 'global-1',
  user_id: null,
  name: 'Transporte',
  type: 'expense',
  icon: 'directions_car',
})
const income = makeCategory({
  id: 'inc-1',
  user_id: 'user-1',
  name: 'Salario',
  type: 'income',
  icon: 'payments',
})

const renderManager = () =>
  render(
    <FeedbackProvider>
      <CategoriesManager isOpen onClose={vi.fn()} />
    </FeedbackProvider>
  )

describe('CategoriesManager', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getCategories.mockResolvedValue([
      expense,
      globalCategory,
      income,
    ])
    financeServiceMock.createCategory.mockResolvedValue(makeCategory())
    financeServiceMock.updateCategory.mockResolvedValue(makeCategory())
    financeServiceMock.deleteCategory.mockResolvedValue(undefined)
  })

  it('lista las categorías de gasto y permite cambiar a ingresos', async () => {
    const user = userEvent.setup()
    renderManager()

    expect(await screen.findByText('Comida')).toBeInTheDocument()
    expect(screen.getByText('Transporte')).toBeInTheDocument()
    expect(screen.getByText('Predeterminada')).toBeInTheDocument()
    expect(screen.queryByText('Salario')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ingresos' }))

    expect(screen.getByText('Salario')).toBeInTheDocument()
    expect(screen.queryByText('Comida')).not.toBeInTheDocument()
  })

  it('solo permite eliminar categorías propias', async () => {
    renderManager()

    await screen.findByText('Comida')

    expect(
      screen.getByRole('button', { name: 'Eliminar Comida' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Eliminar Transporte' })
    ).not.toBeInTheDocument()
  })

  it('abre el modal de edición con los datos de la categoría', async () => {
    const user = userEvent.setup()
    renderManager()

    await screen.findByText('Comida')
    await user.click(screen.getByRole('button', { name: 'Editar Comida' }))

    expect(screen.getByText('Editar categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Comida')
  })

  it('elimina una categoría propia tras confirmar', async () => {
    financeServiceMock.getCategories
      .mockResolvedValueOnce([expense, globalCategory, income])
      .mockResolvedValue([])

    const user = userEvent.setup()
    renderManager()

    await screen.findByText('Comida')
    await user.click(screen.getByRole('button', { name: 'Eliminar Comida' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() =>
      expect(financeServiceMock.deleteCategory).toHaveBeenCalledWith('exp-1')
    )
    expect(await screen.findByText(/No hay categorías de gasto/)).toBeInTheDocument()
  })

  it('abre el modal para crear una categoría', async () => {
    const user = userEvent.setup()
    renderManager()

    await screen.findByText('Comida')
    await user.click(screen.getByRole('button', { name: 'Nueva' }))

    expect(screen.getByText('Nueva categoría')).toBeInTheDocument()
  })
})
