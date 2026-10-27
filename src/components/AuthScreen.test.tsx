import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'
import { authState } from '../test/mocks/authContext'

vi.mock('../context/AuthContext', async () => {
  const { authState: state } = await import('../test/mocks/authContext')
  return { useAuth: () => state }
})

const fillLogin = async (
  user: ReturnType<typeof userEvent.setup>,
  email = 'danilo@test.com',
  password = 'secreto'
) => {
  await user.type(screen.getByPlaceholderText('tu@correo.com'), email)
  await user.type(screen.getByPlaceholderText('••••••••'), password)
}

describe('AuthScreen', () => {
  beforeEach(() => {
    authState.signIn.mockReset()
    authState.signUp.mockReset()
  })

  it('inicia en modo de inicio de sesión', () => {
    render(<AuthScreen />)

    expect(screen.getByText('Serene Finance')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Ej. Juan Pérez')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('cambia al modo de registro', async () => {
    const user = userEvent.setup()
    render(<AuthScreen />)

    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    expect(screen.getByPlaceholderText('Ej. Juan Pérez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  })

  it('inicia sesión con las credenciales ingresadas', async () => {
    const user = userEvent.setup()
    authState.signIn.mockResolvedValue(undefined)
    render(<AuthScreen />)

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(authState.signIn).toHaveBeenCalledWith('danilo@test.com', 'secreto')
  })

  it('exige el nombre completo al registrarse', async () => {
    const user = userEvent.setup()
    render(<AuthScreen />)

    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))
    await fillLogin(user)
    fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!)

    expect(
      await screen.findByText('Por favor ingresa tu nombre completo.')
    ).toBeInTheDocument()
    expect(authState.signUp).not.toHaveBeenCalled()
  })

  it('registra al usuario recortando el nombre', async () => {
    const user = userEvent.setup()
    authState.signUp.mockResolvedValue(undefined)
    render(<AuthScreen />)

    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))
    await user.type(screen.getByPlaceholderText('Ej. Juan Pérez'), '  Danilo Tapia  ')
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(authState.signUp).toHaveBeenCalledWith(
      'danilo@test.com',
      'secreto',
      'Danilo Tapia'
    )
  })

  it('muestra el mensaje de error devuelto por el servicio', async () => {
    const user = userEvent.setup()
    authState.signIn.mockRejectedValue(new Error('Credenciales inválidas'))
    render(<AuthScreen />)

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })

  it('muestra un mensaje genérico ante errores desconocidos', async () => {
    const user = userEvent.setup()
    authState.signIn.mockRejectedValue('fallo')
    render(<AuthScreen />)

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByText('Ocurrió un error inesperado al autenticar.')
    ).toBeInTheDocument()
  })

  it('deshabilita el botón mientras autentica', async () => {
    const user = userEvent.setup()
    let resolveSignIn: () => void = () => {}
    authState.signIn.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignIn = resolve
      })
    )
    render(<AuthScreen />)

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const button = screen.getByRole('button', { name: '' })
    expect(button).toBeDisabled()

    resolveSignIn()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    )
  })
})
