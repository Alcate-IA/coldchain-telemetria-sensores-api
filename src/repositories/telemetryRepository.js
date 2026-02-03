/**
 * Repository Pattern para acesso a dados de telemetria
 * Abstrai a lógica de acesso ao banco de dados
 */

import { getSupabaseClient } from '../config/database.js';
import { logger } from '../utils/logger.js';

class TelemetryRepository {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Busca todas as leituras de telemetria
   * @returns {Promise<Array>} Lista de logs de telemetria
   */
  async findAllLogs() {
    try {
      const { data, error } = await this.supabase
        .from('telemetry_logs')
        .select('gw, mac');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar logs de telemetria:', error);
      throw error;
    }
  }

  /**
   * Busca últimas leituras de telemetria
   * @returns {Promise<Array>} Lista de últimas leituras
   */
  async findLatest() {
    try {
      const { data, error } = await this.supabase
        .from('view_latest_telemetry')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar últimas leituras:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de telemetria por MAC
   * @param {string} mac - Endereço MAC do sensor
   * @param {Object} filters - Filtros de data e limite
   * @returns {Promise<Array>} Histórico de leituras
   */
  async findByMac(mac, filters = {}) {
    try {
      let query = this.supabase
        .from('telemetry_logs')
        .select('*')
        .eq('mac', mac)
        .order('ts', { ascending: false });

      if (filters.startDate) {
        query = query.gte('ts', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('ts', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar histórico para MAC ${mac}:`, error);
      throw error;
    }
  }

  /**
   * Busca coordenadas por MAC
   * @param {string} mac - Endereço MAC do sensor
   * @param {Object} filters - Filtros de data
   * @returns {Promise<Array>} Lista de coordenadas
   */
  async findCoordinatesByMac(mac, filters = {}) {
    try {
      let query = this.supabase
        .from('telemetry_logs')
        .select('*')
        .eq('mac', mac);

      if (filters.startDate && filters.endDate) {
        query = query
          .gte('ts', filters.startDate)
          .lte('ts', filters.endDate)
          .order('ts', { ascending: true });
      } else {
        query = query.order('ts', { ascending: false }).limit(1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar coordenadas para MAC ${mac}:`, error);
      throw error;
    }
  }
}

export default new TelemetryRepository();
