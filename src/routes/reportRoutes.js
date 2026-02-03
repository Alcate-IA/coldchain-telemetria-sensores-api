/**
 * Rotas para relatórios
 */

import express from 'express';
import reportController from '../controllers/reportController.js';
import sensorController from '../controllers/sensorController.js';
import { validate, reportParamsSchema, coordinatesParamsSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * @swagger
 * /api/sensor/report:
 *   get:
 *     summary: Gera relatório Excel com telemetria e eventos de porta
 *     tags: [Relatórios]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: mac
 *         required: true
 *         schema:
 *           type: string
 *         description: Endereço MAC do sensor
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial (ISO 8601)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final (ISO 8601)
 *     responses:
 *       200:
 *         description: Arquivo Excel gerado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Nenhum dado encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/report', validate(reportParamsSchema, 'query'), reportController.generateReport.bind(reportController));

/**
 * @swagger
 * /api/sensor/coordinates:
 *   get:
 *     summary: Busca coordenadas de um sensor
 *     tags: [Sensores]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: mac
 *         required: true
 *         schema:
 *           type: string
 *         description: Endereço MAC do sensor
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final (ISO 8601)
 *     responses:
 *       200:
 *         description: Lista de coordenadas
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/coordinates', validate(coordinatesParamsSchema, 'query'), sensorController.getCoordinates.bind(sensorController));

export default router;
