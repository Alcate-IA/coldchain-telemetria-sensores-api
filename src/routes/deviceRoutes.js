/**
 * Rotas para dispositivos
 */

import express from 'express';
import deviceController from '../controllers/deviceController.js';
import { validate, updateDeviceSchema } from '../utils/validators.js';

const router = express.Router();

/**
 * @swagger
 * /api/dispositivos:
 *   get:
 *     summary: Lista todos os dispositivos únicos
 *     tags: [Dispositivos]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de dispositivos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', deviceController.listDevices.bind(deviceController));

/**
 * @swagger
 * /api/dispositivos:
 *   patch:
 *     summary: Atualiza configuração de um dispositivo
 *     tags: [Dispositivos]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mac
 *             properties:
 *               mac:
 *                 type: string
 *                 example: "AA:BB:CC:DD:EE:FF"
 *               display_name:
 *                 type: string
 *               batt_warning:
 *                 type: number
 *               max_temp:
 *                 type: number
 *               min_temp:
 *                 type: number
 *               max_hum:
 *                 type: number
 *               min_hum:
 *                 type: number
 *               sensor_porta_vinculado:
 *                 type: string
 *               maintenance_mode:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuração atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.patch('/', validate(updateDeviceSchema, 'body'), deviceController.updateDevice.bind(deviceController));

export default router;
