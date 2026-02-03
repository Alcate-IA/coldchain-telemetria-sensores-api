/**
 * Configuração do Swagger/OpenAPI para documentação da API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cold Chain Telemetria Sensores API',
      version: '1.0.0',
      description: 'API REST para gerenciamento de telemetria de sensores de cold chain',
      contact: {
        name: 'Suporte API',
        email: 'suporte@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desenvolvimento',
      },
      {
        url: 'https://api.example.com',
        description: 'Servidor de produção',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API Key para autenticação',
        },
      },
    },
    tags: [
      {
        name: 'Dispositivos',
        description: 'Endpoints para gerenciamento de dispositivos',
      },
      {
        name: 'Sensores',
        description: 'Endpoints para leituras e histórico de sensores',
      },
      {
        name: 'Portas',
        description: 'Endpoints para status de portas',
      },
      {
        name: 'Relatórios',
        description: 'Endpoints para geração de relatórios',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/index.js'], // Caminhos para arquivos com anotações Swagger
};

export const swaggerSpec = swaggerJsdoc(options);
