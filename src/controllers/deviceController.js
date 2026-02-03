/**
 * Controller para dispositivos
 * Camada de apresentação - processa requisições HTTP
 */

import deviceService from '../services/deviceService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

class DeviceController {
  /**
   * Lista todos os dispositivos
   * GET /api/dispositivos
   */
  async listDevices(req, res) {
    try {
      const dispositivos = await deviceService.listDevices();
      return successResponse(res, 200, dispositivos);
    } catch (error) {
      logger.error('Erro no controller de dispositivos (list):', error);
      return errorResponse(res, 500, 'Erro ao listar dispositivos', error.message);
    }
  }

  /**
   * Atualiza configuração de um dispositivo
   * PATCH /api/dispositivos
   */
  async updateDevice(req, res) {
    try {
      const updatedConfig = await deviceService.updateDevice(req.body);
      return successResponse(res, 200, updatedConfig, 'Configuração salva!');
    } catch (error) {
      logger.error('Erro no controller de dispositivos (update):', error);
      return errorResponse(res, 500, 'Erro ao atualizar dispositivo', error.message);
    }
  }
}

export default new DeviceController();
