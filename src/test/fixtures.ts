import type {
  Account,
  Category,
  Debt,
  DebtPayment,
  Profile,
  Transaction,
} from '../types/database'

export const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  user_id: 'user-1',
  name: 'Cuenta principal',
  type: 'bank',
  account_number_masked: '•••• 4821',
  initial_balance: 100,
  current_balance: 100,
  target_amount: null,
  color: null,
  icon: 'account_balance',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  user_id: null,
  name: 'Alimentación',
  type: 'expense',
  icon: 'Utensils',
  color: '#EF4444',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: 'tx-1',
  user_id: 'user-1',
  account_id: 'acc-1',
  category_id: 'cat-1',
  type: 'expense',
  amount: 50,
  date: new Date().toISOString(),
  note: 'Café con el equipo',
  receipt_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  account: makeAccount(),
  category: makeCategory(),
  ...overrides,
})

export const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: 'debt-1',
  user_id: 'user-1',
  person_name: 'Carlos Martínez',
  type: 'lend',
  total_amount: 100,
  paid_amount: 20,
  due_date: null,
  note: null,
  status: 'partial',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeDebtPayment = (
  overrides: Partial<DebtPayment> = {}
): DebtPayment => ({
  id: 'payment-1',
  debt_id: 'debt-1',
  user_id: 'user-1',
  account_id: 'acc-1',
  amount: 20,
  date: '2026-01-01T00:00:00.000Z',
  note: null,
  created_at: '2026-01-01T00:00:00.000Z',
  account: makeAccount(),
  ...overrides,
})

export const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-1',
  full_name: 'Danilo Tapia',
  email: 'danilo@test.com',
  currency: 'USD',
  number_format: '14,850.00',
  first_day_of_week: 'monday',
  biometric_enabled: false,
  discrete_mode_auto: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'user-1',
    email: 'danilo@test.com',
    user_metadata: { full_name: 'Danilo Tapia' },
    ...overrides,
  }) as never
