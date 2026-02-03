/**
 * Middleware de autenticação via API Key
 * Valida a chave de API nas requisições
 */

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware de autenticação por API Key
 * Se API_KEY estiver configurada no .env, exige autenticação
 */
export const apiKeyAuth = (req, res, next) => {
  // Se não houver API_KEY configurada, permite acesso (modo desenvolvimento)
  if (!config.api.key) {
    logger.warn('⚠️  API rodando sem autenticação (API_KEY não configurada)');
    return next();
  }

  const userApiKey = req.header('x-api-key');

  if (!userApiKey) {
    logger.warn(`[!] Tentativa de acesso sem API Key: ${req.ip} - ${req.path}`);
    return errorResponse(res, 401, 'Acesso não autorizado. API Key ausente.');
  }

  if (userApiKey !== config.api.key) {
    logger.warn(`[!] Tentativa de acesso com API Key inválida: ${req.ip} - ${req.path}`);
    return errorResponse(res, 401, 'Acesso não autorizado. API Key inválida.');
  }

  next();
};
