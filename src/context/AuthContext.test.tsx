import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'
import { makeUser } from '../test/fixtures'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }))

const user = makeUser()

const makeSession = (currentUser: unknown = user) => ({
  access_token: 'token',
  user: currentUser,
})

const renderAuth = () =>
  renderHook(() => useAuth(), { wrapper: AuthProvider })

describe('AuthContext', () => {
  let unsubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    unsubscribe = vi.fn()
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    })
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    mockSupabase.auth.signUp.mockResolvedValue({ error: null })
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
  })

  it('lanza error si useAuth se usa fuera del provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth debe ser utilizado dentro de un AuthProvider'
    )

    consoleError.mockRestore()
  })

  it('carga la sesión inicial y deja de estar en loading', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: makeSession() },
    })

    const { result } = renderAuth()

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toEqual(user)
    expect(result.current.session).toEqual(makeSession())
    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
  })

  it('deja user en null cuando no hay sesión', async () => {
    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('actualiza el estado cuando Supabase notifica un cambio de sesión', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    const onChange = mockSupabase.auth.onAuthStateChange.mock.calls[0][0]
    act(() => onChange('SIGNED_IN', makeSession()))

    expect(result.current.user).toEqual(user)

    act(() => onChange('SIGNED_OUT', null))

    expect(result.current.user).toBeNull()
  })

  it('cancela la suscripción al desmontar', async () => {
    const { unmount } = renderAuth()
    await waitFor(() =>
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    )

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('inicia sesión con email y contraseña', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.signIn('danilo@test.com', 'secreto'))

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'danilo@test.com',
      password: 'secreto',
    })
  })

  it('propaga el error de inicio de sesión', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: new Error('Credenciales inválidas'),
    })

    await expect(
      result.current.signIn('danilo@test.com', 'mal')
    ).rejects.toThrow('Credenciales inválidas')
  })

  it('registra un usuario enviando el nombre completo', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() =>
      result.current.signUp('danilo@test.com', 'secreto', 'Danilo Tapia')
    )

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'danilo@test.com',
      password: 'secreto',
      options: { data: { full_name: 'Danilo Tapia' } },
    })
  })

  it('propaga el error de registro', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockSupabase.auth.signUp.mockResolvedValue({
      error: new Error('Email en uso'),
    })

    await expect(
      result.current.signUp('danilo@test.com', 'secreto', 'Danilo')
    ).rejects.toThrow('Email en uso')
  })

  it('cierra la sesión', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.signOut())

    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('propaga el error al cerrar sesión', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockSupabase.auth.signOut.mockResolvedValue({
      error: new Error('Sin conexión'),
    })

    await expect(result.current.signOut()).rejects.toThrow('Sin conexión')
  })
})
