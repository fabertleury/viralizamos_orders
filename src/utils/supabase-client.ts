import { createClient } from '@supabase/supabase-js';

// Singleton para o cliente Supabase
let supabaseInstance: any = null;

/**
 * Cria e retorna um cliente Supabase configurado para acessar o Supabase do site principal
 */
export function createSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas');
  }

  // Criar e armazenar a instância
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseInstance;
} 