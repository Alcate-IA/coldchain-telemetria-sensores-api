/**
 * Arquivo principal da aplicação
 * Configura e inicializa o servidor Express
 */

import express from 'express';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiKeyAuth } from './middlewares/auth.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { corsConfig, helmetConfig, apiLimiter, reportLimiter } from './middlewares/security.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Importa rotas
import deviceRoutes from './routes/deviceRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import doorRoutes from './routes/doorRoutes.js';

const app = express();

// ==================================================================
// MIDDLEWARES GLOBAIS
// ==================================================================

// Segurança
app.use(helmetConfig);
app.use(corsConfig);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(requestLogger);

// Rate Limiting
app.use('/api', apiLimiter);
app.use('/api/sensor/report', reportLimiter);

// ==================================================================
// DOCUMENTAÇÃO SWAGGER
// ==================================================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Cold Chain API - Documentação',
}));

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Cold Chain Telemetria Sensores API',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// ==================================================================
// ROTAS DA API
// ==================================================================

// Aplica autenticação em todas as rotas /api
app.use('/api', apiKeyAuth);

// Registra rotas
app.use('/api/dispositivos', deviceRoutes);
app.use('/api/sensores', sensorRoutes);
app.use('/api/sensor', reportRoutes);
app.use('/api/doors', doorRoutes);

// ==================================================================
// TRATAMENTO DE ERROS
// ==================================================================

// Middleware para rotas não encontradas (deve vir antes do errorHandler)
app.use(notFoundHandler);

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// ==================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ==================================================================

app.listen(config.port, () => {
  logger.info(`🚀 API Cold Chain rodando em http://localhost:${config.port}`);
  logger.info(`📚 Documentação disponível em http://localhost:${config.port}/api-docs`);
  logger.info(`🌍 Ambiente: ${config.env}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
