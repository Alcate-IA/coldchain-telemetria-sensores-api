/**
 * Rotas para sensores
 */

import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { validate, sensorHistoryParamsSchema, coordinatesParamsSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * @swagger
 * /api/sensores/latest:
 *   get:
 *     summary: Busca últimas leituras de todos os sensores
 *     tags: [Sensores]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de sensores com últimas leituras
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/latest', sensorController.getLatestReadings.bind(sensorController));

/**
 * @swagger
 * /api/sensores/{mac}:
 *   get:
 *     summary: Busca histórico de um sensor
 *     tags: [Sensores]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: mac
 *         required: true
 *         schema:
 *           type: string
 *         description: Endereço MAC do sensor
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, all]
 *           default: 24h
 *         description: Período de dados
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *         description: Limite de registros
 *     responses:
 *       200:
 *         description: Histórico do sensor
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:mac', validate(sensorHistoryParamsSchema, 'params'), sensorController.getSensorHistory.bind(sensorController));

export default router;
