// Database credentials must be loaded exclusively from .env via process.env
export const getSupabaseServiceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const getSupabaseUrl = () =>
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

export const getSupabaseAnonKey = () =>
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  getSupabaseServiceKey();

