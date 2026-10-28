import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'
import { THEME_STORAGE_KEY } from '../theme/themes'

const renderTheme = () =>
  renderHook(() => useTheme(), { wrapper: ThemeProvider })

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = ''
    document.querySelector('meta[name="theme-color"]')?.remove()

    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#F8F9FA'
    document.head.appendChild(meta)
  })

  it('lanza error si useTheme se usa fuera del provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme debe usarse dentro de ThemeProvider'
    )

    consoleError.mockRestore()
  })

  it('aplica el tema por defecto y lo persiste', () => {
    const { result } = renderTheme()

    expect(result.current.theme).toBe('forest')
    expect(document.documentElement.dataset.theme).toBe('forest')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('forest')
  })

  it('carga el tema guardado al iniciar', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night')

    const { result } = renderTheme()

    expect(result.current.theme).toBe('night')
    expect(document.documentElement.dataset.theme).toBe('night')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('actualiza el tema, el color del navegador y el almacenamiento', () => {
    const { result } = renderTheme()

    act(() => result.current.setTheme('blue'))

    expect(result.current.theme).toBe('blue')
    expect(document.documentElement.dataset.theme).toBe('blue')
    expect(
      document.querySelector('meta[name="theme-color"]')
    ).toHaveAttribute('content', '#F4F8FC')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('blue')
  })

  it('vuelve al tema por defecto si el valor guardado no es válido', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'invalid')

    const { result } = renderTheme()

    expect(result.current.theme).toBe('forest')
  })
})
