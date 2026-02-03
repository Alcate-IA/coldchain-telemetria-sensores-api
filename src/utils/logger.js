/**
 * Logger profissional usando Winston
 * Substitui console.log por sistema de logs estruturado
 */

import winston from 'winston';
import { config } from '../config/env.js';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Formato customizado para desenvolvimento
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Configuração do logger
export const logger = winston.createLogger({
  level: config.log.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    config.env === 'development' 
      ? combine(colorize(), devFormat)
      : json()
  ),
  defaultMeta: { service: 'coldchain-api' },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Em produção, adicionar transporte para arquivo
if (config.env === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}
