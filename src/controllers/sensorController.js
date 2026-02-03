/**
 * Controller para sensores
 */

import sensorService from '../services/sensorService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

class SensorController {
  /**
   * Busca últimas leituras de todos os sensores
   * GET /api/sensores/latest
   */
  async getLatestReadings(req, res) {
    try {
      const readings = await sensorService.getLatestReadings();
      return successResponse(res, 200, readings);
    } catch (error) {
      logger.error('Erro no controller de sensores (latest):', error);
      return errorResponse(res, 500, 'Erro ao buscar últimas leituras', error.message);
    }
  }

  /**
   * Busca histórico de um sensor
   * GET /api/sensores/:mac
   */
  async getSensorHistory(req, res) {
    try {
      const { mac } = req.params;
      const { period, limit } = req.query;

      const result = await sensorService.getSensorHistory(mac, { period, limit });
      return successResponse(res, 200, result);
    } catch (error) {
      logger.error(`Erro no controller de sensores (history) para MAC ${req.params.mac}:`, error);
      return errorResponse(res, 500, 'Erro ao buscar histórico do sensor', error.message);
    }
  }

  /**
   * Busca coordenadas de um sensor
   * GET /api/sensor/coordinates
   */
  async getCoordinates(req, res) {
    try {
      const { mac, startDate, endDate } = req.query;
      const coordinates = await sensorService.getCoordinates(mac, { startDate, endDate });
      return successResponse(res, 200, coordinates);
    } catch (error) {
      logger.error('Erro no controller de sensores (coordinates):', error);
      return errorResponse(res, 500, 'Erro ao buscar coordenadas', error.message);
    }
  }
}

export default new SensorController();
