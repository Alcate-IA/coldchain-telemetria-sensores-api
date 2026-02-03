/**
 * Configuração do cliente Supabase
 * Implementa Singleton Pattern para garantir uma única instância
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseInstance = null;

/**
 * Obtém ou cria a instância do cliente Supabase
 * @returns {SupabaseClient} Instância do cliente Supabase
 */
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.supabase.url, config.supabase.key);
      logger.info('✅ Cliente Supabase inicializado com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao inicializar cliente Supabase:', error);
      throw error;
    }
  }
  return supabaseInstance;
};
