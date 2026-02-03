# 🧊 Cold Chain Telemetria Sensores API

API REST para gerenciamento de telemetria de sensores de cold chain, desenvolvida com arquitetura em camadas seguindo os princípios SOLID e design patterns.

## 📋 Índice

- [Características](#-características)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Endpoints](#-endpoints)
- [Documentação](#-documentação)
- [Segurança](#-segurança)
- [Design Patterns Aplicados](#-design-patterns-aplicados)

## ✨ Características

- ✅ Arquitetura em camadas (Routes → Controllers → Services → Repositories)
- ✅ Repository Pattern para abstração de acesso a dados
- ✅ Service Layer para lógica de negócio
- ✅ Validação de dados com Joi
- ✅ Logger profissional com Winston
- ✅ Tratamento centralizado de erros
- ✅ Documentação Swagger/OpenAPI
- ✅ Rate Limiting e segurança com Helmet
- ✅ Validação de variáveis de ambiente
- ✅ Padrão de resposta da API consistente
- ✅ Conformidade com LGPD (dados sensíveis no backend)

## 🏗 Arquitetura

A API segue uma arquitetura em camadas (Layered Architecture) com separação clara de responsabilidades:

```
┌─────────────────────────────────────┐
│         Routes (Rotas)              │  ← Definição de endpoints
├─────────────────────────────────────┤
│      Controllers (Controladores)    │  ← Processamento de requisições HTTP
├─────────────────────────────────────┤
│       Services (Serviços)           │  ← Lógica de negócio
├─────────────────────────────────────┤
│    Repositories (Repositórios)       │  ← Acesso a dados (Supabase)
├─────────────────────────────────────┤
│      Database (Supabase)             │  ← Banco de dados
└─────────────────────────────────────┘
```

### Camadas

1. **Routes**: Define os endpoints e aplica middlewares de validação
2. **Controllers**: Processa requisições HTTP e retorna respostas
3. **Services**: Contém a lógica de negócio e orquestra operações
4. **Repositories**: Abstrai o acesso ao banco de dados (Repository Pattern)
5. **Middlewares**: Autenticação, logging, tratamento de erros, segurança

## 🛠 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Supabase** - Banco de dados e backend
- **Joi** - Validação de dados
- **Winston** - Sistema de logging
- **Swagger/OpenAPI** - Documentação da API
- **Helmet** - Segurança HTTP
- **Express Rate Limit** - Proteção contra abuso

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/Alcate-IA/coldchain-telemetria-sensores-api.git

# Entre no diretório
cd coldchain-telemetria-sensores-api

# Instale as dependências
npm install
```

## ⚙️ Configuração

1. Crie um arquivo `.env` na raiz do projeto:

```env
# Ambiente
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_do_supabase

# API Key (opcional - se não configurada, API roda sem autenticação)
API_KEY=sua_api_key_secreta

# Logging
LOG_LEVEL=info
```

2. Execute a aplicação:

```bash
# Modo desenvolvimento (com watch)
npm run dev

# Modo produção
npm start
```

## 📁 Estrutura do Projeto

```
coldchain-telemetria-sensores-api/
├── src/
│   ├── config/              # Configurações
│   │   ├── env.js          # Validação de variáveis de ambiente
│   │   ├── database.js     # Configuração do Supabase (Singleton)
│   │   └── swagger.js      # Configuração do Swagger
│   ├── controllers/         # Controladores (camada de apresentação)
│   │   ├── deviceController.js
│   │   ├── sensorController.js
│   │   ├── reportController.js
│   │   └── doorController.js
│   ├── services/           # Serviços (lógica de negócio)
│   │   ├── deviceService.js
│   │   ├── sensorService.js
│   │   ├── reportService.js
│   │   └── doorService.js
│   ├── repositories/       # Repositórios (acesso a dados)
│   │   ├── telemetryRepository.js
│   │   ├── configRepository.js
│   │   └── doorRepository.js
│   ├── routes/             # Rotas (definição de endpoints)
│   │   ├── deviceRoutes.js
│   │   ├── sensorRoutes.js
│   │   ├── reportRoutes.js
│   │   └── doorRoutes.js
│   ├── middlewares/        # Middlewares
│   │   ├── auth.js        # Autenticação por API Key
│   │   ├── errorHandler.js # Tratamento de erros
│   │   ├── requestLogger.js # Logging de requisições
│   │   └── security.js    # Segurança (Helmet, CORS, Rate Limit)
│   ├── utils/             # Utilitários
│   │   ├── logger.js      # Logger Winston
│   │   ├── response.js    # Padrão de resposta da API
│   │   └── validators.js  # Schemas de validação Joi
│   └── index.js           # Arquivo principal
├── .env                   # Variáveis de ambiente (não versionado)
├── .gitignore
├── package.json
└── README.md
```

## 🔌 Endpoints

### Dispositivos

- `GET /api/dispositivos` - Lista todos os dispositivos únicos
- `PATCH /api/dispositivos` - Atualiza configuração de um dispositivo

### Sensores

- `GET /api/sensores/latest` - Busca últimas leituras de todos os sensores
- `GET /api/sensores/:mac` - Busca histórico de um sensor
- `GET /api/sensor/coordinates` - Busca coordenadas de um sensor

### Relatórios

- `GET /api/sensor/report` - Gera relatório Excel (telemetria + eventos de porta)

### Portas

- `GET /api/doors/latest` - Busca último status de todas as portas

## 📚 Documentação

A documentação completa da API está disponível via Swagger UI:

```
http://localhost:3000/api-docs
```

A documentação inclui:
- Descrição de todos os endpoints
- Parâmetros esperados
- Exemplos de requisição e resposta
- Códigos de status HTTP
- Autenticação necessária

## 🔐 Segurança

### Implementações de Segurança

1. **Autenticação por API Key**
   - Header: `x-api-key`
   - Configurável via variável de ambiente `API_KEY`

2. **Helmet**
   - Headers de segurança HTTP
   - Proteção contra XSS, clickjacking, etc.

3. **Rate Limiting**
   - 100 requisições por IP a cada 15 minutos (rotas gerais)
   - 10 requisições por IP a cada hora (geração de relatórios)

4. **CORS**
   - Configurável por ambiente
   - Em produção, use `ALLOWED_ORIGINS` no `.env`

5. **Validação de Entrada**
   - Todos os dados de entrada são validados com Joi
   - Sanitização automática de dados

6. **LGPD Compliance**
   - Dados sensíveis processados apenas no backend
   - Logs não expõem informações sensíveis
   - Criptografia em trânsito (HTTPS recomendado)

## 🎨 Design Patterns Aplicados

### 1. Repository Pattern
Abstrai o acesso ao banco de dados, facilitando testes e manutenção:

```javascript
// Exemplo: telemetryRepository.js
class TelemetryRepository {
  async findByMac(mac, filters) {
    // Lógica de acesso ao banco isolada
  }
}
```

### 2. Service Layer Pattern
Separa a lógica de negócio da camada de apresentação:

```javascript
// Exemplo: deviceService.js
class DeviceService {
  async listDevices() {
    // Lógica de negócio complexa
  }
}
```

### 3. Singleton Pattern
Garante uma única instância do cliente Supabase:

```javascript
// Exemplo: database.js
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(...);
  }
  return supabaseInstance;
};
```

### 4. Middleware Pattern
Reutilização de lógica entre rotas:

```javascript
// Exemplo: auth.js, errorHandler.js, etc.
```

### 5. Dependency Injection
Services recebem repositories como dependências (facilita testes).

## 🚀 Melhorias Implementadas

### Antes
- ❌ Tudo em um único arquivo (`index.js`)
- ❌ Lógica de negócio misturada com rotas
- ❌ `console.log` para logging
- ❌ Tratamento de erros inconsistente
- ❌ Sem validação de dados
- ❌ Sem documentação
- ❌ Sem rate limiting
- ❌ Variáveis de ambiente não validadas

### Depois
- ✅ Arquitetura em camadas organizada
- ✅ Separação clara de responsabilidades
- ✅ Logger profissional (Winston)
- ✅ Tratamento centralizado de erros
- ✅ Validação completa com Joi
- ✅ Documentação Swagger/OpenAPI
- ✅ Rate limiting e segurança
- ✅ Validação de variáveis de ambiente

## 📝 Licença

ISC

## 👥 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

---

**Desenvolvido seguindo as melhores práticas de engenharia de software, segurança e conformidade com LGPD.**
