import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'

const renderNav = (activeTab: 'hoy' | 'cuentas' | 'deudas' | 'historial' = 'hoy') => {
  const onTabChange = vi.fn()
  render(<BottomNav activeTab={activeTab} onTabChange={onTabChange} />)
  return { onTabChange }
}

describe('BottomNav', () => {
  it('renderiza las cuatro pestañas', () => {
    renderNav()

    expect(screen.getByRole('button', { name: /Hoy/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cuentas/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Deudas/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Historial/ })).toBeInTheDocument()
  })

  it.each([
    ['Hoy', 'hoy'],
    ['Cuentas', 'cuentas'],
    ['Deudas', 'deudas'],
    ['Historial', 'historial'],
  ] as const)('notifica el cambio a la pestaña %s', async (label, tab) => {
    const user = userEvent.setup()
    const { onTabChange } = renderNav()

    await user.click(screen.getByRole('button', { name: new RegExp(label) }))

    expect(onTabChange).toHaveBeenCalledWith(tab)
  })

  it('marca visualmente la pestaña activa', () => {
    renderNav('deudas')

    const active = screen.getByRole('button', { name: /Deudas/ })
    const inactive = screen.getByRole('button', { name: /Hoy/ })

    expect(active.className).toContain('text-ink')
    expect(active.className).toContain('font-semibold')
    expect(inactive.className).toContain('text-muted')

    const activeIcon = active.querySelector('.material-symbols-outlined')
    const inactiveIcon = inactive.querySelector('.material-symbols-outlined')
    expect(activeIcon).toHaveStyle("font-variation-settings: 'FILL' 1")
    expect(inactiveIcon).toHaveStyle("font-variation-settings: 'FILL' 0")
  })
})
