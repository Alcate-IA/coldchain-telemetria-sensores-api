/**
 * Repository Pattern para acesso a dados de configuração de sensores
 */

import { getSupabaseClient } from '../config/database.js';
import { logger } from '../utils/logger.js';

class ConfigRepository {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Busca todas as configurações de sensores
   * @returns {Promise<Array>} Lista de configurações
   */
  async findAll() {
    try {
      const { data, error } = await this.supabase
        .from('sensor_configs')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar configurações:', error);
      throw error;
    }
  }

  /**
   * Busca configuração por MAC
   * @param {string} mac - Endereço MAC do sensor
   * @returns {Promise<Object|null>} Configuração do sensor
   */
  async findByMac(mac) {
    try {
      const { data, error } = await this.supabase
        .from('sensor_configs')
        .select('*')
        .eq('mac', mac)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      logger.error(`Erro ao buscar configuração para MAC ${mac}:`, error);
      throw error;
    }
  }

  /**
   * Busca apenas nomes e status de manutenção
   * @returns {Promise<Array>} Lista com mac, display_name e em_manutencao
   */
  async findNamesAndMaintenance() {
    try {
      const { data, error } = await this.supabase
        .from('sensor_configs')
        .select('mac, display_name, em_manutencao');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar nomes e status:', error);
      throw error;
    }
  }

  /**
   * Atualiza ou cria configuração de sensor
   * @param {Object} configData - Dados da configuração
   * @returns {Promise<Object>} Configuração atualizada
   */
  async upsert(configData) {
    try {
      const payload = {
        ...configData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('sensor_configs')
        .upsert(payload, { onConflict: 'mac' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Erro ao atualizar configuração para MAC ${configData.mac}:`, error);
      throw error;
    }
  }
}

export default new ConfigRepository();
