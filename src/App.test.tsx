import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { authState } from './test/mocks/authContext'
import { makeUser } from './test/fixtures'

vi.mock('./context/AuthContext', async () => {
  const { authState: state } = await import('./test/mocks/authContext')
  return {
    useAuth: () => state,
  }
})

vi.mock('./context/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('./components/AuthScreen', () => ({
  AuthScreen: () => <div>Pantalla de autenticación</div>,
}))

vi.mock('./components/Dashboard', () => ({
  Dashboard: ({ onOpenProfile }: { onOpenProfile: () => void }) => (
    <div>
      <span>Dashboard</span>
      <button onClick={onOpenProfile}>Abrir ajustes</button>
    </div>
  ),
}))

vi.mock('./components/AccountsScreen', () => ({
  AccountsScreen: () => <div>Pantalla de cuentas</div>,
}))

vi.mock('./components/DebtsScreen', () => ({
  DebtsScreen: () => <div>Pantalla de deudas</div>,
}))

vi.mock('./components/HistoryScreen', () => ({
  HistoryScreen: () => <div>Pantalla de historial</div>,
}))

vi.mock('./components/SettingsScreen', () => ({
  SettingsScreen: ({ onClose }: { onClose: () => void }) => (
    <div>
      <span>Ajustes</span>
      <button onClick={onClose}>Cerrar ajustes</button>
    </div>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    authState.user = null
    authState.loading = false
  })

  it('muestra el spinner mientras carga la sesión', () => {
    authState.loading = true

    const { container } = render(<App />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('muestra la pantalla de autenticación sin usuario', () => {
    render(<App />)

    expect(screen.getByText('Pantalla de autenticación')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('muestra el dashboard al iniciar sesión', () => {
    authState.user = makeUser()

    render(<App />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hoy/ })).toBeInTheDocument()
  })

  it('navega entre las pestañas', async () => {
    const user = userEvent.setup()
    authState.user = makeUser()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /Cuentas/ }))
    expect(screen.getByText('Pantalla de cuentas')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Deudas/ }))
    expect(screen.getByText('Pantalla de deudas')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Historial/ }))
    expect(screen.getByText('Pantalla de historial')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Hoy/ }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('abre y cierra los ajustes desde el dashboard', async () => {
    const user = userEvent.setup()
    authState.user = makeUser()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Abrir ajustes' }))
    expect(screen.getByText('Ajustes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hoy/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar ajustes' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
