import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FeedbackProvider } from './FeedbackProvider'
import { useFeedback } from './FeedbackContext'

const Consumer = () => {
  const { toast, confirm } = useFeedback()

  return (
    <div>
      <button
        type="button"
        onClick={() => toast({ message: 'Cambios guardados', variant: 'success', duration: 100 })}
      >
        lanzar toast
      </button>
      <button
        type="button"
        onClick={() => {
          void confirm({
            title: 'Eliminar registro',
            message: 'No se puede deshacer',
            confirmLabel: 'Eliminar',
            danger: true,
          }).then((accepted) => {
            toast(accepted ? 'Confirmado' : 'Cancelado')
          })
        }}
      >
        pedir confirmación
      </button>
    </div>
  )
}

const renderProvider = () =>
  render(
    <FeedbackProvider>
      <Consumer />
    </FeedbackProvider>
  )

describe('FeedbackProvider', () => {
  it('muestra un toast y lo retira automáticamente', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'lanzar toast' }))

    const toast = await screen.findByText('Cambios guardados')
    expect(toast.closest('[role="status"]')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Cambios guardados'))
  })

  it('resuelve la confirmación al aceptar', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'pedir confirmación' }))

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAccessibleName('Eliminar registro')
    expect(dialog).toHaveTextContent('No se puede deshacer')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Confirmado')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resuelve la confirmación al cancelar', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'pedir confirmación' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
  })

  it('cancela la confirmación con Escape', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'pedir confirmación' }))
    await user.keyboard('{Escape}')

    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
