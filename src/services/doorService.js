/**
 * Service Layer para lógica de negócio de portas
 */

import doorRepository from '../repositories/doorRepository.js';
import configRepository from '../repositories/configRepository.js';
import { logger } from '../utils/logger.js';

class DoorService {
  /**
   * Busca último status de todas as portas
   * @returns {Promise<Array>} Lista de status de portas
   */
  async getLatestStatus() {
    try {
      const [logs, configs] = await Promise.all([
        doorRepository.findLatestStatus(),
        configRepository.findNamesAndMaintenance(),
      ]);

      // Mapa: MAC -> Nome da Câmara
      const nameMap = new Map(configs.map(c => [c.mac, c.display_name]));

      const result = logs.map(log => {
        const nomeAmigavel = nameMap.get(log.sensor_mac) || `Câmara ${log.sensor_mac}`;

        return {
          ...log,
          display_name: nomeAmigavel,
          status_text: log.is_open ? 'ABERTA (Virtual)' : 'FECHADO',
          status_color: log.is_open ? 'red' : 'green',
          is_configured: nameMap.has(log.sensor_mac),
        };
      });

      // Ordena por nome
      result.sort((a, b) => a.display_name.localeCompare(b.display_name));

      return result;
    } catch (error) {
      logger.error('Erro ao buscar status de portas:', error);
      throw error;
    }
  }
}

export default new DoorService();
