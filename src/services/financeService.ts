import { supabase } from '../lib/supabase';
import { nextOccurrence, occurrenceTimestamp, parseDateOnly, toDateOnly } from '../lib/recurrence';
import type { Account, Category, Transaction, Transfer, Profile, Debt, DebtPayment, Budget, RecurringTransaction, SavingsGoal } from '../types/database';

export interface ResetOptions {
  /**
   * Si es true, desactiva o elimina las cuentas.
   * Si es false (recomendado), conserva las cuentas creadas pero con saldo en 0.00.
   */
  deleteAccounts?: boolean;
}

export const financeService = {
  // ==========================================
  // PERFIL (Optimizado sin bloqueos de red)
  // ==========================================
  async getProfile(): Promise<Profile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Advertencia obteniendo perfil:', error.message);
      return null;
    }
    return data;
  },

  async updateProfile(updates: Partial<Profile>): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
  },

  // ==========================================
  // CUENTAS
  // ==========================================
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // ==========================================
  // CATEGORÍAS
  // ==========================================
  async getCategories(type?: 'expense' | 'income'): Promise<Category[]> {
    let query = supabase.from('categories').select('*').order('name');
    if (type) {
      query = query.eq('type', type);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // ==========================================
  // TRANSACCIONES (CRUD COMPLETO)
  // ==========================================
  async getTransactions(limit = 50): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createTransaction(transaction: {
    account_id: string;
    category_id: string | null;
    type: 'expense' | 'income';
    amount: number;
    date: string;
    note?: string | null;
    receipt_url?: string | null;
  }): Promise<Transaction> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: user.id }])
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .single();

    if (error) throw error;
    
    // Actualizar saldo de la cuenta implicada
    if (data.account_id) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', data.account_id)
        .single();
      const current = acc?.current_balance ?? 0;
      const newBalance = transaction.type === 'income'
        ? current + transaction.amount
        : current - transaction.amount;
      await supabase
        .from('accounts')
        .update({ current_balance: newBalance })
        .eq('id', data.account_id);
    }
    
    return data;
  },

  async updateTransaction(
    id: string,
    updates: {
      account_id?: string;
      category_id?: string | null;
      type?: 'expense' | 'income';
      amount?: number;
      date?: string;
      note?: string | null;
      receipt_url?: string | null;
    }
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==========================================
  // TRANSFERENCIAS
  // ==========================================
  async createTransfer(transfer: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    concept?: string | null;
    date: string;
  }): Promise<Transfer> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('transfers')
      .insert([{ ...transfer, user_id: user.id }])
      .select(`
        *,
        from_account:accounts!from_account_id(*),
        to_account:accounts!to_account_id(*)
      `)
      .single();

    if (error) throw error;
    
    // Actualizar saldos de ambas cuentas
    if (data.from_account_id) {
      const { data: fromAcc } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', data.from_account_id)
        .single();
      const fromCurrent = fromAcc?.current_balance ?? 0;
      const fromNewBalance = Math.max(0, fromCurrent - transfer.amount);
      await supabase
        .from('accounts')
        .update({ current_balance: fromNewBalance })
        .eq('id', data.from_account_id);
    }
    if (data.to_account_id) {
      const { data: toAcc } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', data.to_account_id)
        .single();
      const toCurrent = toAcc?.current_balance ?? 0;
      const toNewBalance = toCurrent + transfer.amount;
      await supabase
        .from('accounts')
        .update({ current_balance: toNewBalance })
        .eq('id', data.to_account_id);
    }
    
    return data;
  },

  // ==========================================
  // DEUDAS Y DEUDORES (CRUD COMPLETO)
  // ==========================================
  async getDebts(): Promise<Debt[]> {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createDebt(debt: {
    person_name: string;
    type: 'lend' | 'borrow';
    total_amount: number;
    due_date?: string | null;
    note?: string | null;
  }): Promise<Debt> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('debts')
      .insert([{ ...debt, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDebt(id: string): Promise<void> {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getDebtPayments(debtId: string): Promise<DebtPayment[]> {
    const { data, error } = await supabase
      .from('debt_payments')
      .select(`
        *,
        account:accounts(*)
      `)
      .eq('debt_id', debtId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createDebtPayment(payment: {
    debt_id: string;
    account_id?: string | null;
    amount: number;
    date: string;
    note?: string | null;
  }): Promise<DebtPayment> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('debt_payments')
      .insert([{ ...payment, user_id: user.id }])
      .select(`
        *,
        account:accounts(*)
      `)
      .single();

    if (error) throw error;
    
    // Actualizar deuda
    const { data: debt } = await supabase
      .from('debts')
      .select('total_amount, paid_amount, status')
      .eq('id', payment.debt_id)
      .single();
    const newPaid = (Number(debt?.paid_amount ?? 0) + payment.amount).toFixed(2);
    const newStatus = Number(newPaid) >= Number(debt?.total_amount) ? 'paid' : 'partial';
    await supabase
      .from('debts')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', payment.debt_id);
    
    return data;
  },

  // ==========================================
  // PRESUPUESTOS MENSUALES
  // ==========================================
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(*)
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async upsertBudget(budget: { category_id: string; amount: number }): Promise<Budget> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        [{
          user_id: user.id,
          category_id: budget.category_id,
          amount: budget.amount,
          period: 'monthly',
        }],
        { onConflict: 'user_id,category_id,period' }
      )
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBudget(id: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==========================================
  // MOVIMIENTOS RECURRENTES
  // ==========================================
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .order('next_run_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createRecurringTransaction(rule: {
    account_id: string;
    category_id: string | null;
    type: 'expense' | 'income';
    amount: number;
    note?: string | null;
    frequency: 'weekly' | 'monthly' | 'yearly';
    start_date: string;
  }): Promise<RecurringTransaction> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { start_date, ...rest } = rule;

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([{
        ...rest,
        user_id: user.id,
        next_run_date: start_date,
      }])
      .select(`
        *,
        account:accounts(*),
        category:categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async toggleRecurringTransaction(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteRecurringTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Genera los movimientos pendientes de las reglas activas y adelanta su
   * próxima fecha. Es idempotente: el índice único por regla y fecha evita
   * duplicados si se ejecuta desde varios dispositivos.
   */
  async processRecurringTransactions(): Promise<number> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return 0;

    const today = toDateOnly(new Date());

    const { data: rules, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', today);

    if (error) throw error;
    if (!rules || rules.length === 0) return 0;

    let created = 0;

    for (const rule of rules) {
      let cursor = parseDateOnly(rule.next_run_date);
      let guard = 0;

      while (toDateOnly(cursor) <= today && guard < 60) {
        guard += 1;

        const { data: inserted, error: insertError } = await supabase
          .from('transactions')
          .insert([{
            user_id: user.id,
            account_id: rule.account_id,
            category_id: rule.category_id,
            type: rule.type,
            amount: rule.amount,
            date: occurrenceTimestamp(toDateOnly(cursor)),
            note: rule.note,
            recurring_id: rule.id,
          }])
          .select('id');

        if (insertError) {
          if (insertError.code !== '23505') throw insertError;
        } else if (inserted && inserted.length > 0) {
          created += 1;

          const { data: account } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', rule.account_id)
            .single();

          const current = Number(account?.current_balance ?? 0);
          const newBalance = rule.type === 'income'
            ? current + Number(rule.amount)
            : current - Number(rule.amount);

          await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', rule.account_id);
        }

        cursor = nextOccurrence(cursor, rule.frequency);
      }

      await supabase
        .from('recurring_transactions')
        .update({ next_run_date: toDateOnly(cursor) })
        .eq('id', rule.id);
    }

    return created;
  },

  // ==========================================
  // METAS DE AHORRO
  // ==========================================
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('savings_goals')
      .select(`
        *,
        contributions:goal_contributions(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((goal) => ({
      ...goal,
      contributions: [...(goal.contributions ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
  },

  async createSavingsGoal(goal: {
    name: string;
    target_amount: number;
    target_date?: string | null;
    icon?: string;
  }): Promise<SavingsGoal> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('savings_goals')
      .insert([{
        user_id: user.id,
        name: goal.name,
        target_amount: goal.target_amount,
        target_date: goal.target_date ?? null,
        icon: goal.icon ?? 'savings',
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addGoalContribution(contribution: {
    goal_id: string;
    amount: number;
    date: string;
    note?: string | null;
  }): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('goal_contributions')
      .insert([{
        user_id: user.id,
        goal_id: contribution.goal_id,
        amount: contribution.amount,
        date: contribution.date,
        note: contribution.note ?? null,
      }]);

    if (error) throw error;
  },

  async deleteGoalContribution(id: string): Promise<void> {
    const { error } = await supabase
      .from('goal_contributions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==========================================
  // RESTABLECER DATOS DEL USUARIO A CERO
  // ==========================================
  async resetUserData(options: ResetOptions = { deleteAccounts: false }): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('No autenticado');

    // 1. Obtener todas las cuentas del usuario
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id);

    // 2. Blindaje: poner el saldo de cada cuenta en 0.00 de inmediato
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        try {
          await supabase
            .from('accounts')
            .update({ current_balance: 0, initial_balance: 0 })
            .eq('id', acc.id);
        } catch (e) {
          console.warn(`No se pudo actualizar saldo a 0 en cuenta ${acc.id}:`, e);
        }
      }
    }

    // 3. Purgar abonos de deudas primero para evitar fallos de Foreign Key
    try {
      const { data: debts } = await supabase
        .from('debts')
        .select('id')
        .eq('user_id', user.id);

      if (debts && debts.length > 0) {
        const debtIds = debts.map((d) => d.id);
        await supabase
          .from('debt_payments')
          .delete()
          .in('debt_id', debtIds);
      }
    } catch (e) {
      console.warn('Aviso purgando debt_payments por debt_id:', e);
    }

    try {
      await supabase
        .from('debt_payments')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.warn('Aviso purgando debt_payments por user_id:', e);
    }

    // 4. Purgar deudas
    try {
      await supabase
        .from('debts')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.warn('Aviso purgando debts:', e);
    }

    // 5. Purgar transferencias
    try {
      await supabase
        .from('transfers')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.warn('Aviso purgando transfers:', e);
    }

    // 6. Purgar transacciones
    try {
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.warn('Aviso purgando transactions:', e);
    }

    // 7. Si se solicitó eliminar cuentas
    if (options.deleteAccounts && accounts && accounts.length > 0) {
      for (const acc of accounts) {
        // Intentar hard delete
        const { error: hardDelErr } = await supabase
          .from('accounts')
          .delete()
          .eq('id', acc.id);

        // Si PostgreSQL o RLS bloquean el DELETE, aplicar soft delete (is_active = false)
        // Como getAccounts() solo lee is_active = true, desaparecen por completo
        if (hardDelErr) {
          await supabase
            .from('accounts')
            .update({ is_active: false, current_balance: 0 })
            .eq('id', acc.id);
        }
      }
    }
  },
};