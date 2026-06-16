import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Email fijo del usuario compartido. Sólo se pide la contraseña al usuario;
 * el frontend completa este email al hacer login.
 */
export const SHARED_AUTH_EMAIL = 'partido@basquet.app';
