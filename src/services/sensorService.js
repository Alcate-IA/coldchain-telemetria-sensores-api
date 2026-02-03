/**
 * Service Layer para lógica de negócio de sensores
 */

import telemetryRepository from '../repositories/telemetryRepository.js';
import configRepository from '../repositories/configRepository.js';
import doorRepository from '../repositories/doorRepository.js';
import { logger } from '../utils/logger.js';

class SensorService {
  /**
   * Busca últimas leituras de todos os sensores
   * @returns {Promise<Array>} Lista de sensores com últimas leituras
   */
  async getLatestReadings() {
    try {
      const [logs, configs, doorLogs] = await Promise.all([
        telemetryRepository.findLatest(),
        configRepository.findNamesAndMaintenance(),
        doorRepository.findLatestStatus(),
      ]);

      const configMap = new Map(configs.map(c => [c.mac, c]));
      const doorMap = new Map(doorLogs.map(d => [d.sensor_mac, d]));

      const result = logs.map(item => {
        const config = configMap.get(item.mac) || {};
        const statusPortaLog = doorMap.get(item.mac);

        let dadosPorta = null;
        if (statusPortaLog) {
          dadosPorta = {
            is_open: statusPortaLog.is_open,
            last_change: statusPortaLog.timestamp_read,
          };
        }

        return {
          ...item,
          display_name: config.display_name || 'Sensor Sem Nome',
          status_porta: dadosPorta,
          em_manutencao: !!config.em_manutencao,
        };
      });

      // Ordena por nome
      result.sort((a, b) => a.display_name.localeCompare(b.display_name));

      return result;
    } catch (error) {
      logger.error('Erro ao buscar últimas leituras:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de um sensor
   * @param {string} mac - Endereço MAC do sensor
   * @param {Object} filters - Filtros (period, limit)
   * @returns {Promise<Object>} Informações e histórico do sensor
   */
  async getSensorHistory(mac, filters = {}) {
    try {
      const { period = '24h', limit } = filters;

      // Calcula data de início baseado no período
      let startDate = null;
      if (period !== 'all') {
        const agora = new Date();
        if (period === '1h') {
          startDate = new Date(agora.getTime() - 3600000).toISOString();
        } else if (period === '24h') {
          startDate = new Date(agora.getTime() - 86400000).toISOString();
        } else if (period === '7d') {
          startDate = new Date(agora.getTime() - 604800000).toISOString();
        }
      }

      const [rawLogs, config] = await Promise.all([
        telemetryRepository.findByMac(mac, { startDate, limit }),
        configRepository.findByMac(mac),
      ]);

      // Aplica downsampling (mantém apenas uma leitura a cada 10 minutos)
      const filteredLogs = this._applyDownsampling(rawLogs);

      // Monta informações do sensor
      let sensorInfo = config || {
        mac: mac,
        display_name: 'Sensor Não Configurado',
        batt_warning: 20,
        temp_max: null,
        temp_min: null,
        hum_max: null,
        hum_min: null,
        em_manutencao: false,
      };

      // Adiciona coordenadas da última leitura
      if (rawLogs.length > 0) {
        const latest = rawLogs[0];
        sensorInfo = {
          ...sensorInfo,
          latitude: latest.latitude ?? latest.lat,
          longitude: latest.longitude ?? latest.lng,
          altitude: latest.altitude ?? 0,
        };
      }

      return {
        info: sensorInfo,
        history: filteredLogs,
      };
    } catch (error) {
      logger.error(`Erro ao buscar histórico do sensor ${mac}:`, error);
      throw error;
    }
  }

  /**
   * Busca coordenadas de um sensor
   * @param {string} mac - Endereço MAC do sensor
   * @param {Object} filters - Filtros de data
   * @returns {Promise<Array>} Lista de coordenadas
   */
  async getCoordinates(mac, filters = {}) {
    try {
      const logs = await telemetryRepository.findCoordinatesByMac(mac, filters);

      const coordinates = logs
        .map(item => ({
          ts: item.ts,
          lat: item.latitude ?? item.lat,
          lng: item.longitude ?? item.lng,
          alt: item.altitude ?? 0,
        }))
        .filter(c => c.lat != null && c.lng != null);

      return coordinates;
    } catch (error) {
      logger.error(`Erro ao buscar coordenadas do sensor ${mac}:`, error);
      throw error;
    }
  }

  /**
   * Aplica downsampling para reduzir quantidade de dados
   * Mantém apenas uma leitura a cada 10 minutos
   * @private
   */
  _applyDownsampling(logs) {
    const filteredLogs = [];
    let lastKeptTime = 0;
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    for (const log of logs) {
      const logTime = new Date(log.ts).getTime();
      if (filteredLogs.length === 0 || Math.abs(lastKeptTime - logTime) >= TEN_MINUTES_MS) {
        filteredLogs.push(log);
        lastKeptTime = logTime;
      }
    }

    return filteredLogs;
  }
}

export default new SensorService();
