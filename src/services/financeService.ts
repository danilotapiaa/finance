import { supabase } from '../lib/supabase';
import type { Account, Category, Transaction, Transfer, Profile } from '../types/database';

export const financeService = {
  // ==========================================
  // PERFIL
  // ==========================================
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(updates: Partial<Profile>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
  // TRANSACCIONES (MOVIMIENTOS)
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    return data;
  }
};