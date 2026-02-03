/**
 * Configuração e validação de variáveis de ambiente
 * Garante que todas as variáveis necessárias estejam presentes
 */

import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Schema de validação das variáveis de ambiente
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_KEY: Joi.string().required(),
  API_KEY: Joi.string().optional().allow(''),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`❌ Configuração de variáveis de ambiente inválida: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  supabase: {
    url: envVars.SUPABASE_URL,
    key: envVars.SUPABASE_KEY,
  },
  api: {
    key: envVars.API_KEY || null,
  },
  log: {
    level: envVars.LOG_LEVEL,
  },
};
