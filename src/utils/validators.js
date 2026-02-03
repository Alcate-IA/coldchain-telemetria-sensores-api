/**
 * Schemas de validação usando Joi
 * Centraliza todas as validações de entrada
 */

import Joi from 'joi';

/**
 * Validação para atualização de dispositivo
 */
export const updateDeviceSchema = Joi.object({
  mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required()
    .messages({
      'string.pattern.base': 'MAC deve estar no formato válido (ex: AA:BB:CC:DD:EE:FF)',
    }),
  display_name: Joi.string().max(255).allow(null, ''),
  batt_warning: Joi.number().min(0).max(100).allow(null, ''),
  max_temp: Joi.number().allow(null, ''),
  min_temp: Joi.number().allow(null, ''),
  max_hum: Joi.number().min(0).max(100).allow(null, ''),
  min_hum: Joi.number().min(0).max(100).allow(null, ''),
  sensor_porta_vinculado: Joi.string().allow(null, ''),
  maintenance_mode: Joi.boolean().allow(null),
});

/**
 * Validação para parâmetros de relatório
 */
export const reportParamsSchema = Joi.object({
  mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
}).custom((value, helpers) => {
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  if (start > end) {
    return helpers.error('any.invalid', { message: 'startDate deve ser anterior a endDate' });
  }
  return value;
});

/**
 * Validação para parâmetros de coordenadas
 */
export const coordinatesParamsSchema = Joi.object({
  mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  startDate: Joi.string().isoDate().allow(''),
  endDate: Joi.string().isoDate().allow(''),
});

/**
 * Validação para parâmetros de histórico de sensor
 */
export const sensorHistoryParamsSchema = Joi.object({
  mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  period: Joi.string().valid('1h', '24h', '7d', 'all').default('24h'),
  limit: Joi.number().integer().min(1).max(10000).optional(),
});

/**
 * Middleware de validação genérico
 * @param {Joi.Schema} schema - Schema Joi para validação
 * @param {string} source - Origem dos dados ('body', 'query', 'params')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Dados de entrada inválidos',
        details: errors,
      });
    }

    // Substitui os dados originais pelos validados e sanitizados
    req[source] = value;
    next();
  };
};
