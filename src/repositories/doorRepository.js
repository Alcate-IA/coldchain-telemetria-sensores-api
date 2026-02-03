/**
 * Repository Pattern para acesso a dados de portas (door logs)
 */

import { getSupabaseClient } from '../config/database.js';
import { logger } from '../utils/logger.js';

class DoorRepository {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Busca último status de todas as portas
   * @returns {Promise<Array>} Lista de status de portas
   */
  async findLatestStatus() {
    try {
      const { data, error } = await this.supabase
        .from('view_latest_door_status')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar status de portas:', error);
      throw error;
    }
  }

  /**
   * Busca eventos de porta por MAC e período
   * @param {string} mac - Endereço MAC do sensor
   * @param {string} startDate - Data inicial
   * @param {string} endDate - Data final
   * @returns {Promise<Array>} Lista de eventos de porta
   */
  async findByMacAndPeriod(mac, startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('door_logs')
        .select('*')
        .eq('sensor_mac', mac)
        .gte('timestamp_read', startDate)
        .lte('timestamp_read', endDate)
        .order('timestamp_read', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar eventos de porta para MAC ${mac}:`, error);
      throw error;
    }
  }
}

export default new DoorRepository();
