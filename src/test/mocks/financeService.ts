import { vi } from 'vitest'

export const financeServiceMock = {
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  getCategories: vi.fn(),
  getTransactions: vi.fn(),
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  createTransfer: vi.fn(),
  getDebts: vi.fn(),
  createDebt: vi.fn(),
  deleteDebt: vi.fn(),
  getDebtPayments: vi.fn(),
  createDebtPayment: vi.fn(),
  resetUserData: vi.fn(),
}
