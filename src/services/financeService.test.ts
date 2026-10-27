import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financeService } from './financeService'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }))

interface QueryResult {
  data?: unknown
  error?: unknown
}

const createQuery = (result: QueryResult = { data: null, error: null }) => {
  const query: Record<string, unknown> = {}
  const chain = () => query

  Object.assign(query, {
    select: vi.fn(chain),
    insert: vi.fn(chain),
    update: vi.fn(chain),
    delete: vi.fn(chain),
    eq: vi.fn(chain),
    gte: vi.fn(chain),
    lte: vi.fn(chain),
    in: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled: unknown, onRejected: unknown) =>
      Promise.resolve(result).then(onFulfilled as never, onRejected as never),
  })

  return query as never
}

const createRejectedQuery = (error: unknown) => {
  const query: Record<string, unknown> = {}
  const chain = () => query

  Object.assign(query, {
    select: vi.fn(chain),
    insert: vi.fn(chain),
    update: vi.fn(chain),
    delete: vi.fn(chain),
    eq: vi.fn(chain),
    gte: vi.fn(chain),
    lte: vi.fn(chain),
    in: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    maybeSingle: vi.fn(() => Promise.reject(error)),
    single: vi.fn(() => Promise.reject(error)),
    then: (onFulfilled: unknown, onRejected: unknown) =>
      Promise.reject(error).then(onFulfilled as never, onRejected as never),
  })

  return query as never
}

const session = {
  data: { session: { user: { id: 'user-1' } } },
}

const noSession = {
  data: { session: null },
}

describe('financeService', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.getSession.mockResolvedValue(session)
  })

  describe('perfil', () => {
    it('devuelve null cuando no hay sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(financeService.getProfile()).resolves.toBeNull()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('obtiene el perfil del usuario autenticado', async () => {
      const profile = { id: 'user-1', full_name: 'Danilo' }
      const query = createQuery({ data: profile, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getProfile()).resolves.toEqual(profile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect((query as never as { select: ReturnType<typeof vi.fn> }).select).toHaveBeenCalledWith('*')
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith('id', 'user-1')
      expect((query as never as { maybeSingle: ReturnType<typeof vi.fn> }).maybeSingle).toHaveBeenCalled()
    })

    it('devuelve null y avisa si Supabase falla', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const query = createQuery({ data: null, error: { message: 'boom' } })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getProfile()).resolves.toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('actualiza el perfil del usuario', async () => {
      const query = createQuery({ data: null, error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.updateProfile({ currency: 'EUR' })

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect((query as never as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith({
        currency: 'EUR',
      })
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('rechaza actualizar sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(financeService.updateProfile({ currency: 'EUR' })).rejects.toThrow(
        'No autenticado'
      )
    })

    it('propaga el error al actualizar el perfil', async () => {
      const error = { message: 'denied' }
      mockSupabase.from.mockReturnValue(createQuery({ data: null, error }))

      await expect(financeService.updateProfile({ currency: 'EUR' })).rejects.toBe(error)
    })
  })

  describe('cuentas', () => {
    it('lista solo las cuentas activas ordenadas por creación', async () => {
      const accounts = [{ id: 'acc-1' }]
      const query = createQuery({ data: accounts, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getAccounts()).resolves.toEqual(accounts)
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'is_active',
        true
      )
      expect((query as never as { order: ReturnType<typeof vi.fn> }).order).toHaveBeenCalledWith(
        'created_at',
        { ascending: true }
      )
    })

    it('devuelve un arreglo vacío si no hay datos', async () => {
      mockSupabase.from.mockReturnValue(createQuery({ data: null, error: null }))

      await expect(financeService.getAccounts()).resolves.toEqual([])
    })

    it('propaga el error al listar cuentas', async () => {
      const error = { message: 'boom' }
      mockSupabase.from.mockReturnValue(createQuery({ data: null, error }))

      await expect(financeService.getAccounts()).rejects.toBe(error)
    })

    it('crea una cuenta con el user_id de la sesión', async () => {
      const created = { id: 'acc-1', name: 'Banco' }
      const query = createQuery({ data: created, error: null })
      mockSupabase.from.mockReturnValue(query)

      const payload = {
        name: 'Banco',
        type: 'bank' as const,
        initial_balance: 10,
        current_balance: 10,
        account_number_masked: null,
        target_amount: null,
        color: null,
        icon: 'account_balance',
        is_active: true,
      }

      await expect(financeService.createAccount(payload)).resolves.toEqual(created)
      expect((query as never as { insert: ReturnType<typeof vi.fn> }).insert).toHaveBeenCalledWith([
        { ...payload, user_id: 'user-1' },
      ])
    })

    it('rechaza crear una cuenta sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(
        financeService.createAccount({
          name: 'Banco',
          type: 'bank',
          initial_balance: 0,
          current_balance: 0,
          account_number_masked: null,
          target_amount: null,
          color: null,
          icon: 'account_balance',
          is_active: true,
        })
      ).rejects.toThrow('No autenticado')
    })

    it('actualiza una cuenta por id', async () => {
      const query = createQuery({ data: null, error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.updateAccount('acc-1', { current_balance: 25 })

      expect((query as never as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith({
        current_balance: 25,
      })
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'id',
        'acc-1'
      )
    })

    it('propaga el error al actualizar una cuenta', async () => {
      const error = { message: 'boom' }
      mockSupabase.from.mockReturnValue(createQuery({ data: null, error }))

      await expect(
        financeService.updateAccount('acc-1', { current_balance: 25 })
      ).rejects.toBe(error)
    })
  })

  describe('categorías', () => {
    it('lista todas las categorías ordenadas por nombre', async () => {
      const categories = [{ id: 'cat-1' }]
      const query = createQuery({ data: categories, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getCategories()).resolves.toEqual(categories)
      expect((query as never as { order: ReturnType<typeof vi.fn> }).order).toHaveBeenCalledWith(
        'name'
      )
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).not.toHaveBeenCalled()
    })

    it('filtra por tipo cuando se indica', async () => {
      const query = createQuery({ data: [], error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.getCategories('income')

      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'type',
        'income'
      )
    })
  })

  describe('transacciones', () => {
    it('lista las últimas transacciones con cuenta y categoría', async () => {
      const transactions = [{ id: 'tx-1' }]
      const query = createQuery({ data: transactions, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getTransactions(10)).resolves.toEqual(transactions)
      expect((query as never as { order: ReturnType<typeof vi.fn> }).order).toHaveBeenCalledWith(
        'date',
        { ascending: false }
      )
      expect((query as never as { limit: ReturnType<typeof vi.fn> }).limit).toHaveBeenCalledWith(10)
    })

    it('usa 50 como límite por defecto', async () => {
      const query = createQuery({ data: [], error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.getTransactions()

      expect((query as never as { limit: ReturnType<typeof vi.fn> }).limit).toHaveBeenCalledWith(50)
    })

    it('consulta transacciones por mes con rango de fechas', async () => {
      const query = createQuery({ data: [], error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.getTransactionsByMonth(2026, 3)

      const gte = (query as never as { gte: ReturnType<typeof vi.fn> }).gte
      const lte = (query as never as { lte: ReturnType<typeof vi.fn> }).lte
      expect(gte).toHaveBeenCalled()
      expect(lte).toHaveBeenCalled()
      expect(new Date(gte.mock.calls[0][1] as string).getMonth()).toBe(2)
      expect(new Date(lte.mock.calls[0][1] as string).getMonth()).toBe(2)
    })

    it('crea una transacción con el user_id de la sesión', async () => {
      const created = { id: 'tx-1' }
      const query = createQuery({ data: created, error: null })
      mockSupabase.from.mockReturnValue(query)

      const payload = {
        account_id: 'acc-1',
        category_id: 'cat-1',
        type: 'expense' as const,
        amount: 15,
        date: '2026-03-01T12:00:00.000Z',
        note: 'Café',
      }

      await expect(financeService.createTransaction(payload)).resolves.toEqual(created)
      expect((query as never as { insert: ReturnType<typeof vi.fn> }).insert).toHaveBeenCalledWith([
        { ...payload, user_id: 'user-1' },
      ])
    })

    it('rechaza crear una transacción sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(
        financeService.createTransaction({
          account_id: 'acc-1',
          category_id: null,
          type: 'expense',
          amount: 1,
          date: '2026-03-01T12:00:00.000Z',
        })
      ).rejects.toThrow('No autenticado')
    })

    it('actualiza una transacción', async () => {
      const updated = { id: 'tx-1', amount: 99 }
      const query = createQuery({ data: updated, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(
        financeService.updateTransaction('tx-1', { amount: 99 })
      ).resolves.toEqual(updated)
      expect((query as never as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith({
        amount: 99,
      })
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'id',
        'tx-1'
      )
    })

    it('elimina una transacción por id', async () => {
      const query = createQuery({ data: null, error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.deleteTransaction('tx-1')

      expect((query as never as { delete: ReturnType<typeof vi.fn> }).delete).toHaveBeenCalled()
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'id',
        'tx-1'
      )
    })
  })

  describe('transferencias', () => {
    it('crea una transferencia con el user_id de la sesión', async () => {
      const created = { id: 'tr-1' }
      const query = createQuery({ data: created, error: null })
      mockSupabase.from.mockReturnValue(query)

      const payload = {
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: 50,
        concept: 'Ahorro',
        date: '2026-03-01T12:00:00.000Z',
      }

      await expect(financeService.createTransfer(payload)).resolves.toEqual(created)
      expect((query as never as { insert: ReturnType<typeof vi.fn> }).insert).toHaveBeenCalledWith([
        { ...payload, user_id: 'user-1' },
      ])
    })

    it('rechaza transferir sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(
        financeService.createTransfer({
          from_account_id: 'acc-1',
          to_account_id: 'acc-2',
          amount: 10,
          date: '2026-03-01T12:00:00.000Z',
        })
      ).rejects.toThrow('No autenticado')
    })
  })

  describe('deudas', () => {
    it('lista las deudas ordenadas por creación descendente', async () => {
      const debts = [{ id: 'debt-1' }]
      const query = createQuery({ data: debts, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getDebts()).resolves.toEqual(debts)
      expect((query as never as { order: ReturnType<typeof vi.fn> }).order).toHaveBeenCalledWith(
        'created_at',
        { ascending: false }
      )
    })

    it('crea una deuda con el user_id de la sesión', async () => {
      const created = { id: 'debt-1' }
      const query = createQuery({ data: created, error: null })
      mockSupabase.from.mockReturnValue(query)

      const payload = {
        person_name: 'Carlos',
        type: 'lend' as const,
        total_amount: 100,
        due_date: null,
        note: null,
      }

      await expect(financeService.createDebt(payload)).resolves.toEqual(created)
      expect((query as never as { insert: ReturnType<typeof vi.fn> }).insert).toHaveBeenCalledWith([
        { ...payload, user_id: 'user-1' },
      ])
    })

    it('rechaza crear una deuda sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(
        financeService.createDebt({
          person_name: 'Carlos',
          type: 'lend',
          total_amount: 100,
        })
      ).rejects.toThrow('No autenticado')
    })

    it('elimina una deuda por id', async () => {
      const query = createQuery({ data: null, error: null })
      mockSupabase.from.mockReturnValue(query)

      await financeService.deleteDebt('debt-1')

      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'id',
        'debt-1'
      )
    })

    it('lista los abonos de una deuda', async () => {
      const payments = [{ id: 'pay-1' }]
      const query = createQuery({ data: payments, error: null })
      mockSupabase.from.mockReturnValue(query)

      await expect(financeService.getDebtPayments('debt-1')).resolves.toEqual(payments)
      expect((query as never as { eq: ReturnType<typeof vi.fn> }).eq).toHaveBeenCalledWith(
        'debt_id',
        'debt-1'
      )
    })

    it('crea un abono con el user_id de la sesión', async () => {
      const created = { id: 'pay-1' }
      const query = createQuery({ data: created, error: null })
      mockSupabase.from.mockReturnValue(query)

      const payload = {
        debt_id: 'debt-1',
        account_id: 'acc-1',
        amount: 20,
        date: '2026-03-01T12:00:00.000Z',
        note: null,
      }

      await expect(financeService.createDebtPayment(payload)).resolves.toEqual(created)
      expect((query as never as { insert: ReturnType<typeof vi.fn> }).insert).toHaveBeenCalledWith([
        { ...payload, user_id: 'user-1' },
      ])
    })
  })

  describe('resetUserData', () => {
    it('rechaza sin sesión', async () => {
      mockSupabase.auth.getSession.mockResolvedValue(noSession)

      await expect(financeService.resetUserData()).rejects.toThrow('No autenticado')
    })

    it('pone saldos en cero y purga deudas, transferencias y transacciones', async () => {
      const accountsSelect = createQuery({ data: [{ id: 'acc-1' }], error: null })
      const accountsUpdate = createQuery({ data: null, error: null })
      const debtsSelect = createQuery({ data: [{ id: 'debt-1' }], error: null })
      const deleteQuery = createQuery({ data: null, error: null })

      let accountCalls = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'accounts') {
          accountCalls += 1
          return accountCalls === 1 ? accountsSelect : accountsUpdate
        }
        if (table === 'debts') return debtsSelect
        return deleteQuery
      })

      await financeService.resetUserData()

      expect(
        (accountsUpdate as never as { update: ReturnType<typeof vi.fn> }).update
      ).toHaveBeenCalledWith({ current_balance: 0, initial_balance: 0 })
      expect((deleteQuery as never as { in: ReturnType<typeof vi.fn> }).in).toHaveBeenCalledWith(
        'debt_id',
        ['debt-1']
      )
      expect(mockSupabase.from).toHaveBeenCalledWith('debts')
      expect(mockSupabase.from).toHaveBeenCalledWith('transfers')
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions')
    })

    it('elimina las cuentas si se solicita', async () => {
      const accountsSelect = createQuery({ data: [{ id: 'acc-1' }], error: null })
      const accountsUpdate = createQuery({ data: null, error: null })
      const accountsDelete = createQuery({ data: null, error: null })
      const debtsSelect = createQuery({ data: [], error: null })
      const deleteQuery = createQuery({ data: null, error: null })

      let accountCalls = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'accounts') {
          accountCalls += 1
          if (accountCalls === 1) return accountsSelect
          if (accountCalls === 2) return accountsUpdate
          return accountsDelete
        }
        if (table === 'debts') return debtsSelect
        return deleteQuery
      })

      await financeService.resetUserData({ deleteAccounts: true })

      expect(
        (accountsDelete as never as { delete: ReturnType<typeof vi.fn> }).delete
      ).toHaveBeenCalled()
    })

    it('aplica borrado lógico si el DELETE de cuentas falla', async () => {
      const accountsSelect = createQuery({ data: [{ id: 'acc-1' }], error: null })
      const accountsUpdate = createQuery({ data: null, error: null })
      const accountsDelete = createQuery({ data: null, error: { message: 'denied' } })
      const debtsSelect = createQuery({ data: [], error: null })
      const deleteQuery = createQuery({ data: null, error: null })

      let accountCalls = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'accounts') {
          accountCalls += 1
          if (accountCalls === 1) return accountsSelect
          if (accountCalls === 2) return accountsUpdate
          if (accountCalls === 3) return accountsDelete
          return accountsUpdate
        }
        if (table === 'debts') return debtsSelect
        return deleteQuery
      })

      await financeService.resetUserData({ deleteAccounts: true })

      expect(
        (accountsUpdate as never as { update: ReturnType<typeof vi.fn> }).update
      ).toHaveBeenCalledWith({ is_active: false, current_balance: 0 })
    })

    it('continúa y avisa aunque fallen las purgas intermedias', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const accountsSelect = createQuery({ data: [{ id: 'acc-1' }], error: null })
      const debtsSelect = createQuery({ data: [{ id: 'debt-1' }], error: null })
      const rejected = createRejectedQuery({ message: 'denied' })

      let accountCalls = 0
      let debtCalls = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'accounts') {
          accountCalls += 1
          return accountCalls === 1 ? accountsSelect : rejected
        }
        if (table === 'debts') {
          debtCalls += 1
          return debtCalls === 1 ? debtsSelect : rejected
        }
        return rejected
      })

      await expect(financeService.resetUserData()).resolves.toBeUndefined()

      expect(warn).toHaveBeenCalledTimes(6)
    })
  })
})
