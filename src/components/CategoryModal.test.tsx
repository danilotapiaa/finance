import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoryModal } from './CategoryModal'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeCategory } from '../test/fixtures'

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderModal = (
  props: Partial<React.ComponentProps<typeof CategoryModal>> = {}
) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <CategoryModal isOpen onClose={onClose} onSaved={onSaved} {...props} />
  )
  return { onClose, onSaved }
}

describe('CategoryModal', () => {
  beforeEach(() => {
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.createCategory.mockResolvedValue(makeCategory())
    financeServiceMock.updateCategory.mockResolvedValue(makeCategory())
  })

  it('no renderiza nada cerrado', () => {
    const { container } = render(
      <CategoryModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('valida que el nombre no esté vacío', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))

    expect(screen.getByText('Escribe un nombre para la categoría')).toBeInTheDocument()
    expect(financeServiceMock.createCategory).not.toHaveBeenCalled()
  })

  it('crea una categoría de ingreso con el ícono elegido', async () => {
    const user = userEvent.setup()
    const { onSaved, onClose } = renderModal()

    await user.type(screen.getByLabelText('Nombre'), 'Freelance')
    await user.click(screen.getByRole('button', { name: 'Ingreso' }))
    await user.click(screen.getByRole('button', { name: 'Trabajo' }))
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))

    await waitFor(() => {
      expect(financeServiceMock.createCategory).toHaveBeenCalledWith({
        name: 'Freelance',
        type: 'income',
        icon: 'work',
      })
    })
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('precarga y actualiza una categoría existente', async () => {
    const user = userEvent.setup()
    const { onSaved, onClose } = renderModal({
      categoryToEdit: makeCategory({
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Comida',
        type: 'expense',
        icon: 'restaurant',
      }),
    })

    expect(screen.getByLabelText('Nombre')).toHaveValue('Comida')

    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Alimentos')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(financeServiceMock.updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Alimentos',
        icon: 'restaurant',
      })
    })
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el error del servicio', async () => {
    financeServiceMock.createCategory.mockRejectedValue(
      new Error('No se pudo guardar')
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Nombre'), 'Mascotas')
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))

    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument()
  })
})
