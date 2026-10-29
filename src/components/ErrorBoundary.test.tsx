import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

const Bomb = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra a los hijos cuando no hay errores', () => {
    render(
      <ErrorBoundary>
        <div>Contenido seguro</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Contenido seguro')).toBeInTheDocument()
  })

  it('muestra la pantalla de respaldo cuando un hijo falla', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('permite usar un respaldo personalizado', () => {
    render(
      <ErrorBoundary fallback={<div>Respaldo propio</div>}>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText('Respaldo propio')).toBeInTheDocument()
  })

  it('recarga la página al reintentar', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    const originalLocation = window.location

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    })

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })
})
