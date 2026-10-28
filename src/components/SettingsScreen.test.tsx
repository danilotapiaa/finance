import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'
import { ThemeProvider } from '../context/ThemeContext'
import { THEME_STORAGE_KEY } from '../theme/themes'
import { authState } from '../test/mocks/authContext'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeProfile, makeTransaction, makeUser } from '../test/fixtures'

vi.mock('../context/AuthContext', async () => {
  const { authState: state } = await import('../test/mocks/authContext')
  return { useAuth: () => state }
})

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const renderSettings = (onClose = vi.fn()) =>
  render(
    <ThemeProvider>
      <SettingsScreen onClose={onClose} />
    </ThemeProvider>
  )

describe('SettingsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    authState.user = makeUser()
    authState.signOut.mockReset()
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getProfile.mockResolvedValue(
      makeProfile({
        full_name: 'Danilo Tapia',
        email: 'danilo@test.com',
        currency: 'EUR',
        number_format: '14.850,00',
        first_day_of_week: 'sunday',
      })
    )
  })

  it('muestra el spinner mientras carga el perfil', () => {
    financeServiceMock.getProfile.mockReturnValue(new Promise(() => {}))

    const { container } = renderSettings()

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra los datos del perfil y las preferencias guardadas', async () => {
    renderSettings()

    expect(await screen.findByText('Danilo Tapia')).toBeInTheDocument()
    expect(screen.getByText('danilo@test.com')).toBeInTheDocument()
    expect(screen.getByText('DT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('EUR (€)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('14.850,00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Domingo')).toBeInTheDocument()
  })

  it('guarda la preferencia de moneda', async () => {
    financeServiceMock.updateProfile.mockResolvedValue(undefined)
    renderSettings()
    await screen.findByText('Danilo Tapia')

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'GBP' },
    })

    await waitFor(() =>
      expect(financeServiceMock.updateProfile).toHaveBeenCalledWith({
        currency: 'GBP',
      })
    )
    expect(await screen.findByText('Preferencia guardada')).toBeInTheDocument()
  })

  it('guarda el formato de decimales y el inicio de semana', async () => {
    financeServiceMock.updateProfile.mockResolvedValue(undefined)
    renderSettings()
    await screen.findByText('Danilo Tapia')

    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: '14,850.00' },
    })
    fireEvent.change(screen.getAllByRole('combobox')[2], {
      target: { value: 'Lunes' },
    })

    await waitFor(() =>
      expect(financeServiceMock.updateProfile).toHaveBeenCalledWith({
        number_format: '14,850.00',
      })
    )
    expect(financeServiceMock.updateProfile).toHaveBeenCalledWith({
      first_day_of_week: 'monday',
    })
  })

  it('registra el error si no puede guardar la preferencia', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.updateProfile.mockRejectedValue(new Error('boom'))
    renderSettings()
    await screen.findByText('Danilo Tapia')

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'COP' },
    })

    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(screen.queryByText('Preferencia guardada')).not.toBeInTheDocument()
  })

  it('exporta las transacciones a CSV', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    financeServiceMock.getTransactions.mockResolvedValue([
      makeTransaction({
        id: 'tx-1',
        type: 'income',
        note: 'Café "especial"',
        amount: 12.5,
      }),
    ])
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Exportar movimientos (CSV)'))

    await waitFor(() =>
      expect(financeServiceMock.getTransactions).toHaveBeenCalledWith(1000)
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const content = await blob.text()
    expect(content).toContain('ID,Fecha,Tipo,Monto,Cuenta,Categoría,Nota')
    expect(content).toContain('"Café ""especial"""')
    expect(content).toContain('Ingreso')
  })

  it('avisa cuando no hay transacciones para exportar', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    financeServiceMock.getTransactions.mockResolvedValue([])
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Exportar movimientos (CSV)'))

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        'No tienes transacciones registradas para exportar.'
      )
    )
  })

  it('avisa si falla la exportación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.getTransactions.mockRejectedValue(new Error('boom'))
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Exportar movimientos (CSV)'))

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        'Ocurrió un error al exportar los datos.'
      )
    )
  })

  it('abre y cierra el modal de restablecer', async () => {
    const user = userEvent.setup()
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Restablecer datos'))
    expect(screen.getByPlaceholderText('RESTABLECER')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByPlaceholderText('RESTABLECER')).not.toBeInTheDocument()
  })

  it('mantiene deshabilitado el botón hasta escribir la palabra exacta', async () => {
    const user = userEvent.setup()
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Restablecer datos'))
    const confirm = screen.getByRole('button', { name: 'Restablecer' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByPlaceholderText('RESTABLECER'), 'RESTABLECER')
    expect(confirm).toBeEnabled()
  })

  it('restablece los datos sin eliminar las cuentas', async () => {
    const user = userEvent.setup()
    financeServiceMock.resetUserData.mockResolvedValue(undefined)
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Restablecer datos'))
    await user.type(screen.getByPlaceholderText('RESTABLECER'), 'restablecer')
    await user.click(screen.getByRole('button', { name: 'Restablecer' }))

    await waitFor(() =>
      expect(financeServiceMock.resetUserData).toHaveBeenCalledWith({
        deleteAccounts: false,
      })
    )
    expect(
      await screen.findByText('Datos restablecidos a cero correctamente')
    ).toBeInTheDocument()
  })

  it('restablece eliminando también las cuentas', async () => {
    const user = userEvent.setup()
    financeServiceMock.resetUserData.mockResolvedValue(undefined)
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Restablecer datos'))
    await user.click(screen.getByRole('checkbox'))
    await user.type(screen.getByPlaceholderText('RESTABLECER'), 'RESTABLECER')
    await user.click(screen.getByRole('button', { name: 'Restablecer' }))

    await waitFor(() =>
      expect(financeServiceMock.resetUserData).toHaveBeenCalledWith({
        deleteAccounts: true,
      })
    )
  })

  it('muestra el error si falla el restablecimiento', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.resetUserData.mockRejectedValue(
      new Error('No se pudo restablecer')
    )
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByText('Restablecer datos'))
    await user.type(screen.getByPlaceholderText('RESTABLECER'), 'RESTABLECER')
    await user.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(await screen.findByText('No se pudo restablecer')).toBeInTheDocument()
  })

  it('cierra sesión y cierra la pantalla', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderSettings(onClose)
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByRole('button', { name: /Cerrar Sesión/ }))
    expect(authState.signOut).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Listo' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renderiza aunque falle la carga del perfil', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    financeServiceMock.getProfile.mockRejectedValue(new Error('boom'))

    renderSettings()

    expect(await screen.findByText('Ajustes')).toBeInTheDocument()
    expect(screen.getByText('danilo@test.com')).toBeInTheDocument()
  })

  it('cambia el tema y lo guarda en el almacenamiento local', async () => {
    const user = userEvent.setup()
    renderSettings()
    await screen.findByText('Danilo Tapia')

    await user.click(screen.getByRole('button', { name: 'Tema Azul pastel' }))

    expect(document.documentElement.dataset.theme).toBe('blue')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('blue')
    expect(
      screen.getByRole('button', { name: 'Tema Azul pastel' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('carga el tema guardado al iniciar', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night')

    renderSettings()
    await screen.findByText('Danilo Tapia')

    expect(document.documentElement.dataset.theme).toBe('night')
    expect(
      screen.getByRole('button', { name: 'Tema Noche' })
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
