/**
 * Rotas para portas
 */

import express from 'express';
import doorController from '../controllers/doorController.js';

const router = express.Router();

/**
 * @swagger
 * /api/doors/latest:
 *   get:
 *     summary: Busca último status de todas as portas
 *     tags: [Portas]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de status de portas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/latest', doorController.getLatestStatus.bind(doorController));

export default router;
