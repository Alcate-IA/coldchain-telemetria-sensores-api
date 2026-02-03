/**
 * Middleware centralizado de tratamento de erros
 * Captura todos os erros e retorna respostas padronizadas
 */

import { logger } from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';
import { config } from '../config/env.js';

/**
 * Middleware de tratamento de erros
 * Deve ser o último middleware registrado
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Erro capturado:', {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Erro de validação
  if (err.name === 'ValidationError') {
    return errorResponse(res, 400, 'Dados de entrada inválidos', err.details);
  }

  // Erro do Supabase
  if (err.code && err.message) {
    return errorResponse(res, 500, 'Erro ao processar requisição no banco de dados', 
      config.env === 'development' ? err.message : undefined);
  }

  // Erro genérico
  const message = config.env === 'development' 
    ? err.message 
    : 'Erro interno do servidor';

  return errorResponse(res, err.statusCode || 500, message);
};

/**
 * Middleware para rotas não encontradas
 */
export const notFoundHandler = (req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  return errorResponse(res, 404, 'Rota não encontrada');
};
