/**
 * Utilitário para padronizar respostas da API
 * Garante consistência em todas as respostas
 */

/**
 * Formata resposta de sucesso
 * @param {Object} res - Objeto response do Express
 * @param {number} statusCode - Código HTTP de status
 * @param {any} data - Dados a serem retornados
 * @param {string} message - Mensagem opcional
 */
export const successResponse = (res, statusCode = 200, data = null, message = null) => {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Formata resposta de erro
 * @param {Object} res - Objeto response do Express
 * @param {number} statusCode - Código HTTP de status
 * @param {string} message - Mensagem de erro
 * @param {any} errors - Detalhes adicionais do erro (opcional)
 */
export const errorResponse = (res, statusCode = 500, message = 'Erro interno do servidor', errors = null) => {
  const response = {
    success: false,
    error: message,
    ...(errors && { details: errors }),
  };
  return res.status(statusCode).json(response);
};
