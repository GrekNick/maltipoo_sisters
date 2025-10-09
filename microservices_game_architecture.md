# Архітектура мультиплатформенної гри-платформера на мікросервісах

## 🎯 Загальна концепція

Розподілена система гри типу Маріо з мікросервісною архітектурою, де кожен сервіс відповідає за окрему функціональність, а фронтенд складається з мікрофронтендів для різних частин додатка.

## 🏗️ Архітектура системи

### Frontend (Microfrontends)
```
┌─────────────────────────────────────────────────────────────┐
│                    Game Shell (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│ Game Engine MF  │ Auth MF      │ Leaderboard MF │ Chat MF  │
│ (Phaser 4)      │ (React)      │ (React)        │ (React)  │
│                 │              │                │          │
│ Lobby MF        │ Profile MF   │ Admin MF       │ Store MF │
│ (React)         │ (React)      │ (React)        │ (React)  │
└─────────────────────────────────────────────────────────────┘
```

### Backend Services
```
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Fastify)                    │
│                  + Apollo Federation                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │Auth     │         │Game       │         │User       │
   │Service  │         │Service    │         │Service    │
   │(NestJS) │         │(Fastify)  │         │(NestJS)   │
   └─────────┘         └───────────┘         └───────────┘
        │                     │                     │
        │              ┌─────▼─────┐                │
        │              │Leaderboard│                │
        │              │Service    │                │
        │              │(Express)  │                │
        │              └───────────┘                │
        │                     │                     │
   ┌────▼────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │Chat     │         │AI         │         │Analytics  │
   │Service  │         │Service    │         │Service    │
   │(Fastify)│         │(NestJS)   │         │(Express)  │
   └─────────┘         └───────────┘         └───────────┘
```

## 📦 Детальний опис сервісів

### 1. Frontend Microfrontends

#### Game Shell (Next.js + Module Federation)
- **Технології**: Next.js 14, TypeScript, Tailwind CSS
- **Функції**: 
  - Роутинг між мікрофронтендами
  - Глобальний стан (Zustand/Redux Toolkit)
  - Аутентифікація
  - Responsive дизайн
- **Тести**: Vitest, React Testing Library, Cypress

#### Game Engine Microfrontend (Phaser 4)
- **Технології**: Phaser 4, TypeScript, Socket.IO client
- **Функції**:
  - Ігровий движок
  - Мультиплеєр логіка
  - Фізичний движок
  - Графіка та анімації
- **Тести**: Vitest для логіки, Cypress для E2E

#### Auth Microfrontend (React)
- **Технології**: React, Apollo Client, TypeScript
- **Функції**:
  - Логін/реєстрація
  - OAuth integration
  - JWT токени
  - Profile management

#### Leaderboard Microfrontend (React)
- **Технології**: React, Apollo Client, Recharts
- **Функції**:
  - Таблиця лідерів
  - Статистика гравців
  - Досягнення
  - Рейтинги

#### Chat Microfrontend (React)
- **Технології**: React, Socket.IO, TypeScript
- **Функції**:
  - Реальний час чат
  - Приватні повідомлення
  - Групові чати
  - Модерація (AI)

### 2. Backend Microservices

#### API Gateway (Fastify + Apollo Federation)
- **Порт**: 3000
- **Технології**: Fastify, Apollo Federation, TypeScript
- **Функції**:
  - Роутинг запитів
  - Аутентифікація
  - Rate limiting
  - GraphQL Schema stitching
- **База даних**: Redis (кешування)

#### Auth Service (NestJS)
- **Порт**: 3001
- **Технології**: NestJS, Passport.js, JWT, TypeScript
- **Функції**:
  - Аутентифікація користувачів
  - OAuth (Google, GitHub)
  - JWT генерація/валідація
  - Права доступу (RBAC)
- **База даних**: PostgreSQL + Prisma
- **API**: GraphQL (Mercurius)

#### User Service (NestJS)
- **Порт**: 3002
- **Технології**: NestJS, TypeScript, Prisma
- **Функції**:
  - Профілі користувачів
  - Налаштування
  - Друзі та соціальні функції
  - Аватари
- **База даних**: PostgreSQL + Prisma
- **API**: GraphQL

#### Game Service (Fastify)
- **Порт**: 3003
- **Технології**: Fastify, Socket.IO, TypeScript
- **Функції**:
  - Ігрова логіка
  - Мультиплеєр сесії
  - Світи та рівні
  - Collision detection
- **База даних**: MongoDB + Prisma
- **API**: GraphQL + WebSocket

#### Leaderboard Service (Express)
- **Порт**: 3004
- **Технології**: Express, TypeScript, Redis
- **Функції**:
  - Збереження очок
  - Рейтинги
  - Досягнення
  - Статистика
- **База даних**: PostgreSQL + Redis
- **API**: GraphQL

#### Chat Service (Fastify)
- **Порт**: 3005
- **Технології**: Fastify, Socket.IO, TypeScript
- **Функції**:
  - Реальний час повідомлення
  - Історія чатів
  - Модерація
  - Приватні кімнати
- **База даних**: MongoDB
- **API**: WebSocket + GraphQL

#### AI Service (NestJS)
- **Порт**: 3006
- **Технології**: NestJS, OpenAI API, TypeScript
- **Функції**:
  - Генерація контенту
  - Модерація чатів
  - Підказки для гравців
  - Адаптивна складність
- **База даних**: PostgreSQL
- **API**: GraphQL

#### Analytics Service (Express)
- **Порт**: 3007
- **Технології**: Express, TypeScript, InfluxDB
- **Функції**:
  - Збір метрик
  - Аналіз поведінки
  - A/B тестування
  - Моніторинг
- **База даних**: InfluxDB + PostgreSQL
- **API**: GraphQL

## 🔄 Комунікація між сервісами

### Message Broker (RabbitMQ)
```
Events:
- user.created
- user.updated
- game.started
- game.finished
- score.updated
- chat.message
- achievement.unlocked
```

### GraphQL Federation Schema
```graphql
# Gateway Schema
type User @key(fields: "id") {
  id: ID!
  username: String!
  email: String!
  profile: Profile
  scores: [Score!]!
  achievements: [Achievement!]!
}

type Game @key(fields: "id") {
  id: ID!
  players: [User!]!
  status: GameStatus!
  level: Level!
  createdAt: DateTime!
}

type Score @key(fields: "id") {
  id: ID!
  user: User!
  game: Game!
  points: Int!
  createdAt: DateTime!
}
```

## 🛠️ Інфраструктура

### Kubernetes Cluster (Azure AKS)
```yaml
# Namespace structure
namespaces:
  - game-frontend
  - game-backend
  - game-infrastructure
  - game-monitoring

# Services deployment
services:
  - name: api-gateway
    replicas: 3
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

### Helm Charts Structure
```
charts/
├── game-frontend/
│   ├── templates/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   └── configmap.yaml
│   └── values.yaml
├── game-backend/
│   ├── templates/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── secret.yaml
│   │   └── configmap.yaml
│   └── values.yaml
└── game-infrastructure/
    ├── postgresql/
    ├── mongodb/
    ├── redis/
    └── rabbitmq/
```

### Terraform Infrastructure
```hcl
# main.tf
module "aks_cluster" {
  source = "./modules/aks"
  
  cluster_name     = "game-cluster"
  node_count       = 3
  vm_size          = "Standard_D2s_v3"
  location         = "West Europe"
  resource_group   = "game-rg"
}

module "databases" {
  source = "./modules/databases"
  
  postgres_tier = "GP_Gen5_2"
  mongo_tier    = "M10"
  redis_tier    = "Standard_C1"
}
```

## 🧪 Тестування

### Frontend Testing
```javascript
// Vitest config
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Backend Testing
```javascript
// Jest config for services
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Game Platform CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
      - name: E2E tests
        run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: |
          docker build -t game-frontend ./apps/frontend
          docker build -t game-backend ./apps/backend
      - name: Push to Azure Container Registry
        run: |
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/game-frontend
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/game-backend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AKS
        run: |
          helm upgrade --install game-platform ./charts/game-platform \
            --namespace game-platform \
            --create-namespace
```

## 📊 Моніторинг та Логування

### Prometheus + Grafana
- Метрики продуктивності
- Моніторинг ресурсів
- Алерти

### ELK Stack
- Централізоване логування
- Аналіз помилок
- Пошук по логам

### Sentry
- Error tracking
- Performance monitoring
- Release health

## 🔐 Безпека

### Security Measures
- JWT токени з refresh logic
- CORS налаштування
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection
- HTTPS everywhere

## 🎮 AI Інтеграція

### OpenAI Features
1. **Адаптивна складність**: AI аналізує гравця і підлаштовує складність
2. **Генерація контенту**: Процедурна генерація рівнів
3. **Модерація чатів**: Автоматична модерація токсичних повідомлень
4. **Помічник гравця**: Підказки та поради в реальному часі
5. **Аналіз поведінки**: Персоналізовані рекомендації

### Implementation Example
```typescript
// AI Service integration
@Injectable()
export class AIService {
  async generateLevel(difficulty: number): Promise<Level> {
    const prompt = `Generate a Mario-style level with difficulty ${difficulty}`;
    const response = await this.openai.createCompletion({
      model: "gpt-4",
      prompt,
      max_tokens: 1000
    });
    
    return this.parseLevelFromResponse(response.data.choices[0].text);
  }
}
```

## 🗂️ Структура проекту (NX Monorepo)

```
game-platform/
├── apps/
│   ├── game-shell/          # Main shell app
│   ├── game-engine/         # Phaser 4 game
│   ├── auth-app/           # Auth microfrontend
│   ├── leaderboard-app/    # Leaderboard microfrontend
│   ├── chat-app/           # Chat microfrontend
│   └── admin-app/          # Admin panel
├── services/
│   ├── api-gateway/        # API Gateway
│   ├── auth-service/       # Auth service
│   ├── user-service/       # User service
│   ├── game-service/       # Game service
│   ├── leaderboard-service/ # Leaderboard service
│   ├── chat-service/       # Chat service
│   ├── ai-service/         # AI service
│   └── analytics-service/  # Analytics service
├── libs/
│   ├── shared/
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── constants/      # Constants
│   │   └── validators/     # Validation schemas
│   ├── ui/
│   │   ├── components/     # Shared UI components
│   │   ├── styles/         # Shared styles
│   │   └── themes/         # Theme configurations
│   └── game-logic/
│       ├── physics/        # Physics engine
│       ├── entities/       # Game entities
│       └── systems/        # Game systems
├── infrastructure/
│   ├── terraform/          # Infrastructure as Code
│   ├── kubernetes/         # K8s manifests
│   ├── helm/              # Helm charts
│   └── docker/            # Docker configurations
├── tools/
│   ├── generators/        # NX generators
│   ├── scripts/           # Build scripts
│   └── configs/           # Configuration files
└── docs/
    ├── architecture/      # Architecture docs
    ├── api/              # API documentation
    └── deployment/       # Deployment guides
```

Ця архітектура забезпечує масштабованість, підтримуваність і дозволяє команді працювати над різними частинами системи незалежно. Кожен мікросервіс має свою відповідальність, а мікрофронтенди забезпечують модульність UI.