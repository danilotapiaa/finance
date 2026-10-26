-- =======================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS: SERENE FINANCE
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- =======================================================

-- 1. Tabla: profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  currency text default 'USD',
  number_format text default 'es-EC',
  first_day_of_week text default 'monday',
  biometric_enabled boolean default false,
  discrete_mode_auto boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabla: accounts
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null check (type in ('bank', 'savings', 'cash', 'credit')),
  account_number_masked text,
  initial_balance numeric default 0,
  current_balance numeric default 0,
  target_amount numeric,
  color text,
  icon text default 'wallet',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tabla: categories
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon text not null,
  color text,
  created_at timestamptz default now()
);

-- 4. Tabla: transactions
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  type text not null check (type in ('expense', 'income')),
  amount numeric not null,
  date timestamptz not null default now(),
  note text,
  receipt_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Tabla: transfers
create table if not exists public.transfers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  from_account_id uuid references public.accounts on delete cascade not null,
  to_account_id uuid references public.accounts on delete cascade not null,
  amount numeric not null,
  concept text,
  date timestamptz not null default now(),
  created_at timestamptz default now()
);

-- 6. Tabla: debts
create table if not exists public.debts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  person_name text not null,
  type text not null check (type in ('lend', 'borrow')),
  total_amount numeric not null,
  paid_amount numeric default 0,
  due_date date,
  note text,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Tabla: debt_payments
create table if not exists public.debt_payments (
  id uuid default gen_random_uuid() primary key,
  debt_id uuid references public.debts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts on delete set null,
  amount numeric not null,
  date timestamptz not null default now(),
  note text,
  created_at timestamptz default now()
);

-- =======================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- =======================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

-- Políticas de Profiles
create policy "Usuarios gestionan su propio perfil" on public.profiles
  for all using (auth.uid() = id);

-- Políticas de Accounts
create policy "Usuarios gestionan sus cuentas" on public.accounts
  for all using (auth.uid() = user_id);

-- Políticas de Categories (generales o propias)
create policy "Usuarios leen categorias generales y propias" on public.categories
  for select using (user_id is null or auth.uid() = user_id);

create policy "Usuarios gestionan sus propias categorias" on public.categories
  for all using (auth.uid() = user_id);

-- Políticas de Transactions
create policy "Usuarios gestionan sus transacciones" on public.transactions
  for all using (auth.uid() = user_id);

-- Políticas de Transfers
create policy "Usuarios gestionan sus transferencias" on public.transfers
  for all using (auth.uid() = user_id);

-- Políticas de Debts
create policy "Usuarios gestionan sus deudas" on public.debts
  for all using (auth.uid() = user_id);

-- Políticas de Debt Payments
create policy "Usuarios gestionan sus pagos de deudas" on public.debt_payments
  for all using (auth.uid() = user_id);

-- =======================================================
-- CATEGORÍAS POR DEFECTO
-- =======================================================

insert into public.categories (user_id, name, type, icon, color) values
  (null, 'Alimentación', 'expense', 'Utensils', '#EF4444'),
  (null, 'Transporte', 'expense', 'Car', '#F59E0B'),
  (null, 'Servicios', 'expense', 'Zap', '#3B82F6'),
  (null, 'Vivienda', 'expense', 'Home', '#8B5CF6'),
  (null, 'Salud', 'expense', 'HeartPulse', '#EC4899'),
  (null, 'Educación', 'expense', 'GraduationCap', '#10B981'),
  (null, 'Entretenimiento', 'expense', 'Film', '#6366F1'),
  (null, 'Compras', 'expense', 'ShoppingBag', '#14B8A6'),
  (null, 'Sueldo / Salario', 'income', 'Briefcase', '#10B981'),
  (null, 'Negocio / Ventas', 'income', 'TrendingUp', '#059669'),
  (null, 'Inversiones', 'income', 'LineChart', '#047857'),
  (null, 'Otros Ingresos', 'income', 'PlusCircle', '#34D399')
on conflict do nothing;

-- =======================================================
-- TRIGGER: Creación automática de perfil al registrarse
-- =======================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =======================================================
-- PERMISOS PARA POSTGREST DATA API
-- =======================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;

