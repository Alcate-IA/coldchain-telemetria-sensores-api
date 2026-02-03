/**
 * Middlewares de segurança
 * Helmet, CORS e Rate Limiting
 */

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

/**
 * Configuração do CORS
 */
export const corsConfig = cors({
  origin: config.env === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
});

/**
 * Configuração do Helmet para segurança HTTP
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Rate Limiting para prevenir abuso
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP a cada 15 minutos
  message: {
    success: false,
    error: 'Muitas requisições deste IP. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiting mais restritivo para rotas de relatórios
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 relatórios por IP a cada hora
  message: {
    success: false,
    error: 'Limite de geração de relatórios excedido. Tente novamente em uma hora.',
  },
});
