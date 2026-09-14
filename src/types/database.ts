export type AccountType = 'bank' | 'savings' | 'cash' | 'credit';
export type TransactionType = 'expense' | 'income';
export type CategoryType = 'expense' | 'income';
export type DebtType = 'lend' | 'borrow'; // 'lend' = me deben, 'borrow' = debo
export type DebtStatus = 'pending' | 'partial' | 'paid';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  currency: string;
  number_format: string;
  first_day_of_week: string;
  biometric_enabled: boolean;
  discrete_mode_auto: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  account_number_masked: string | null;
  initial_balance: number;
  current_balance: number;
  target_amount: number | null;
  color: string | null;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  account?: Account;
  category?: Category;
}

export interface Transfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  concept: string | null;
  date: string;
  created_at: string;
  from_account?: Account;
  to_account?: Account;
}

export interface Debt {
  id: string;
  user_id: string;
  person_name: string;
  type: DebtType;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  note: string | null;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  account_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
  account?: Account;
}