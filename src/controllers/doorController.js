/**
 * Controller para portas
 */

import doorService from '../services/doorService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

class DoorController {
  /**
   * Busca último status de todas as portas
   * GET /api/doors/latest
   */
  async getLatestStatus(req, res) {
    try {
      const status = await doorService.getLatestStatus();
      return successResponse(res, 200, status);
    } catch (error) {
      logger.error('Erro no controller de portas:', error);
      return errorResponse(res, 500, 'Erro ao buscar status de portas', error.message);
    }
  }
}

export default new DoorController();
