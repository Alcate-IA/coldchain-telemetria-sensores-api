/**
 * Service Layer para geração de relatórios Excel
 */

import telemetryRepository from '../repositories/telemetryRepository.js';
import doorRepository from '../repositories/doorRepository.js';
import XLSX from 'xlsx';
import { logger } from '../utils/logger.js';

class ReportService {
  /**
   * Gera relatório Excel com telemetria e eventos de porta
   * @param {string} mac - Endereço MAC do sensor
   * @param {string} startDate - Data inicial
   * @param {string} endDate - Data final
   * @returns {Promise<Buffer>} Buffer do arquivo Excel
   */
  async generateExcelReport(mac, startDate, endDate) {
    try {
      logger.info(`📊 Gerando relatório Excel para: ${mac}`);

      const [telemetryData, doorData] = await Promise.all([
        telemetryRepository.findByMac(mac, { startDate, endDate }),
        doorRepository.findByMacAndPeriod(mac, startDate, endDate),
      ]);

      if (!telemetryData || telemetryData.length === 0) {
        throw new Error('Nenhum dado encontrado para este período.');
      }

      // Prepara dados de telemetria
      const excelData = telemetryData.map(item => ({
        'Tipo': 'Leitura',
        'Data/Hora': new Date(item.ts).toLocaleString('pt-BR'),
        'Temperatura (°C)': item.temp,
        'Umidade (%)': item.hum,
        'Bateria (%)': item.batt,
        'Gateway': item.gw,
        'Sensor MAC': item.mac,
      }));

      // Prepara dados de eventos de porta
      const excelDoorData = (doorData || []).map(item => ({
        'Data/Hora': new Date(item.timestamp_read).toLocaleString('pt-BR'),
        'Estado': item.is_open ? 'ABERTO (Virtual)' : 'FECHADO',
        'Detalhe': item.is_open ? 'Subida Brusca Temp' : 'Resfriamento',
        'Sensor MAC': item.sensor_mac,
      }));

      // Cria workbook
      const workBook = XLSX.utils.book_new();

      const sheetTemp = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workBook, sheetTemp, 'Temperatura e Umidade');

      if (excelDoorData.length > 0) {
        const sheetDoor = XLSX.utils.json_to_sheet(excelDoorData);
        XLSX.utils.book_append_sheet(workBook, sheetDoor, 'Eventos de Porta');
      }

      // Gera buffer
      const buffer = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });
      logger.info('✅ Relatório gerado com sucesso');

      return buffer;
    } catch (error) {
      logger.error('Erro ao gerar relatório Excel:', error);
      throw error;
    }
  }

  /**
   * Gera nome do arquivo para download
   * @param {string} mac - Endereço MAC do sensor
   * @returns {string} Nome do arquivo
   */
  generateFilename(mac) {
    const cleanMac = mac.replace(/:/g, '');
    return `relatorio_${cleanMac}_${Date.now()}.xlsx`;
  }
}

export default new ReportService();
