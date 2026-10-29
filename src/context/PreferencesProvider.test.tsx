import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferencesProvider } from './PreferencesProvider'
import { usePreferences } from './PreferencesContext'
import { useFormat } from '../hooks/useFormat'
import { authState } from '../test/mocks/authContext'
import { financeServiceMock } from '../test/mocks/financeService'
import { makeProfile, makeUser } from '../test/fixtures'

vi.mock('./AuthContext', async () => {
  const { authState: state } = await import('../test/mocks/authContext')
  return { useAuth: () => state }
})

vi.mock('../services/financeService', async () => {
  const { financeServiceMock: mock } = await import('../test/mocks/financeService')
  return { financeService: mock }
})

const Consumer = () => {
  const { currency, locale, firstDayOfWeek, setPreferences } = usePreferences()
  const { formatMoney } = useFormat()

  return (
    <div>
      <span>{`${currency}|${locale}|${firstDayOfWeek}`}</span>
      <span data-testid="money">{formatMoney(1234.5)}</span>
      <button
        type="button"
        onClick={() => setPreferences({ currency: 'GBP', numberFormat: '14,850.00' })}
      >
        cambiar
      </button>
    </div>
  )
}

const renderWithProvider = () =>
  render(
    <PreferencesProvider>
      <Consumer />
    </PreferencesProvider>
  )

describe('PreferencesProvider', () => {
  beforeEach(() => {
    authState.user = makeUser()
    Object.values(financeServiceMock).forEach((mock) => mock.mockReset())
    financeServiceMock.getProfile.mockResolvedValue(
      makeProfile({ currency: 'EUR', number_format: '14.850,00', first_day_of_week: 'sunday' })
    )
  })

  it('carga las preferencias del perfil y las aplica al formato monetario', async () => {
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText('EUR|es-EC|sunday')).toBeInTheDocument()
    })

    expect(screen.getByTestId('money').textContent).toContain('1.234,50')
  })

  it('usa los valores por defecto cuando no hay usuario', () => {
    authState.user = null

    renderWithProvider()

    expect(screen.getByText('USD|en-US|monday')).toBeInTheDocument()
    expect(financeServiceMock.getProfile).not.toHaveBeenCalled()
  })

  it('recalcula el locale cuando cambia el formato de número', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByText('EUR|es-EC|sunday')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'cambiar' }))

    expect(await screen.findByText('GBP|en-US|sunday')).toBeInTheDocument()
    expect(screen.getByTestId('money').textContent).toBe('£1,234.50')
  })
})
