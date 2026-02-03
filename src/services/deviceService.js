/**
 * Service Layer para lógica de negócio de dispositivos
 * Implementa a lógica de processamento e transformação de dados
 */

import telemetryRepository from '../repositories/telemetryRepository.js';
import configRepository from '../repositories/configRepository.js';
import { logger } from '../utils/logger.js';

class DeviceService {
  /**
   * Lista todos os dispositivos únicos com suas configurações
   * @returns {Promise<Array>} Lista de dispositivos
   */
  async listDevices() {
    try {
      const [logs, configs] = await Promise.all([
        telemetryRepository.findAllLogs(),
        configRepository.findAll(),
      ]);

      // Cria mapa de configurações por MAC
      const configMap = new Map(configs.map(c => [c.mac, c]));

      // Processa logs para obter dispositivos únicos
      const dispositivosUnicos = logs.reduce((acc, current) => {
        const idUnico = `${current.gw}-${current.mac}`;
        if (!acc.mapa.has(idUnico)) {
          acc.mapa.add(idUnico);
          const config = configMap.get(current.mac) || {};

          acc.lista.push({
            gw: current.gw,
            mac: current.mac,
            display_name: config.display_name || 'Novo Sensor',
            batt_warning: config.batt_warning === '' ? null : config.batt_warning,
            max_temp: config.temp_max === '' ? null : config.temp_max,
            min_temp: config.temp_min === '' ? null : config.temp_min,
            max_hum: config.hum_max === '' ? null : config.hum_max,
            min_hum: config.hum_min === '' ? null : config.hum_min,
            sensor_porta_vinculado: config.sensor_porta_vinculado || null,
            em_manutencao: !!config.em_manutencao,
          });
        }
        return acc;
      }, { mapa: new Set(), lista: [] }).lista;

      return dispositivosUnicos;
    } catch (error) {
      logger.error('Erro no serviço de dispositivos:', error);
      throw error;
    }
  }

  /**
   * Atualiza configuração de um dispositivo
   * @param {Object} deviceData - Dados do dispositivo
   * @returns {Promise<Object>} Configuração atualizada
   */
  async updateDevice(deviceData) {
    try {
      const { mac, display_name, batt_warning, max_temp, min_temp, max_hum, min_hum, sensor_porta_vinculado, maintenance_mode } = deviceData;

      const payload = {
        mac: mac,
        display_name: display_name ?? null,
        batt_warning: batt_warning === '' ? null : Number(batt_warning),
        temp_max: max_temp === '' ? null : Number(max_temp),
        temp_min: min_temp === '' ? null : Number(min_temp),
        hum_max: max_hum === '' ? null : Number(max_hum),
        hum_min: min_hum === '' ? null : Number(min_hum),
        sensor_porta_vinculado: sensor_porta_vinculado ?? null,
        em_manutencao: maintenance_mode !== undefined ? maintenance_mode : false,
      };

      const updatedConfig = await configRepository.upsert(payload);
      logger.info(`✅ Configuração atualizada para MAC: ${mac}`);

      return updatedConfig;
    } catch (error) {
      logger.error('Erro ao atualizar dispositivo:', error);
      throw error;
    }
  }
}

export default new DeviceService();
