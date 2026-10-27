import { vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

export const authState = {
  user: null as User | null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}
