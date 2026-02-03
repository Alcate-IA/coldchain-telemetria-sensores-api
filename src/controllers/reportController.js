/**
 * Controller para relatórios
 */

import reportService from '../services/reportService.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

class ReportController {
  /**
   * Gera e retorna relatório Excel
   * GET /api/sensor/report
   */
  async generateReport(req, res) {
    try {
      const { mac, startDate, endDate } = req.query;

      const buffer = await reportService.generateExcelReport(mac, startDate, endDate);
      const filename = reportService.generateFilename(mac);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      logger.info(`✅ Relatório enviado com sucesso para MAC: ${mac}`);
      return res.send(buffer);
    } catch (error) {
      logger.error('Erro no controller de relatórios:', error);
      
      if (error.message === 'Nenhum dado encontrado para este período.') {
        return errorResponse(res, 404, error.message);
      }
      
      return errorResponse(res, 500, 'Erro ao gerar relatório', error.message);
    }
  }
}

export default new ReportController();
