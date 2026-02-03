/**
 * Middleware de logging de requisições
 * Registra todas as requisições recebidas
 */

import { logger } from '../utils/logger.js';

/**
 * Middleware para logar requisições HTTP
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log da requisição recebida
  logger.info(`📡 ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(req.method === 'POST' || req.method === 'PATCH' ? { body: req.body } : {}),
  });

  // Intercepta o fim da resposta para logar tempo de processamento
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`✅ ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
