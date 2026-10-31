# Sales System Backend

A production-ready Node.js backend for a sales system with Customer Portal and QuickBooks Online (QBO) integration.

## 🚀 Features

- **Clean, modular architecture** with function-based design
- **Data Access Layer (DAL)** abstraction for pluggable data stores
- **QuickBooks Online integration** with OAuth2 setup and SSL/TLS fixes
- **RESTful APIs** for all sales operations
- **Role-based access control** (Admin, SalesRep, Driver, Customer, Accountant)
- **Offline synchronization** support with conflict resolution
- **Background job processing** with BullMQ and Redis
- **Comprehensive API documentation** with Swagger/OpenAPI
- **Production-ready** with proper error handling, logging, and validation
- **SSL/TLS troubleshooting tools** for QuickBooks connectivity issues

## 🏗️ Architecture

### Core Components

- **Models**: Mongoose schemas for all business entities
- **DAL**: Data Access Layer with MongoDB implementation and QBO stub
- **Services**: Business logic layer for complex operations
- **Controllers**: Request/response handling
- **Routes**: API endpoint definitions
- **Middleware**: Authentication, RBAC, validation, and error handling
- **Jobs**: Background processing for sync operations

### Data Models

- **Customer**: Customer information and account management
- **Product**: Product catalog with inventory tracking
- **SalesOrder**: Sales orders with approval workflow
- **Invoice**: Billing and payment tracking
- **Payment**: Payment processing and methods
- **Route**: Driver route management
- **User**: User accounts with role-based access
- **AuditLog**: Comprehensive audit trail

## 🛠️ Technology Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Joi schema validation
- **Logging**: Pino structured logging
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **File Upload**: Multer with CSV parsing

## 📋 Prerequisites

- Node.js 18+
- MongoDB 5+
- Redis 6+
- QuickBooks Developer Account (for QBO integration)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd sales-system-backend
npm install
```

### 2. Environment Configuration

Copy the environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/sales_system
MONGODB_URI_TEST=mongodb://localhost:27017/sales_system_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379

# QuickBooks Configuration
QBO_CLIENT_ID=your-qbo-client-id
QBO_CLIENT_SECRET=your-qbo-client-secret
QBO_REDIRECT_URI=http://localhost:3000/qbo/oauth/callback
QBO_ENVIRONMENT=sandbox

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Start Services

Ensure MongoDB and Redis are running:

```bash
# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Start Redis (if using Docker)
docker run -d -p 6379:6379 --name redis redis:latest
```

### 4. Run the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### 5. Access the API

- **API Base URL**: `http://localhost:3000`
- **Health Check**: `GET /health`
- **API Documentation**: `GET /docs`
- **OpenAPI Spec**: `GET /docs.json`

## 📚 API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh

### Customers

- `GET /customers` - List customers (with search/pagination)
- `POST /customers` - Create customer
- `GET /customers/:id` - Get customer by ID
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### Products

- `GET /products` - List products (with search/pagination)
- `POST /products` - Create product
- `GET /products/:id` - Get product by ID
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/:id/stock` - Adjust stock

### Sales Orders

- `GET /orders` - List orders (with filtering)
- `POST /orders` - Create order
- `GET /orders/:id` - Get order by ID
- `PUT /orders/:id` - Update order
- `POST /orders/:id/approve` - Approve order
- `POST /orders/:id/cancel` - Cancel order

### Invoices

- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /invoices/:id` - Get invoice by ID
- `PUT /invoices/:id` - Update invoice
- `POST /invoices/:id/mark-paid` - Mark invoice as paid

### Payments

- `GET /payments` - List payments
- `POST /payments` - Record payment
- `GET /payments/:id` - Get payment by ID

### Routes

- `GET /routes` - List routes
- `POST /routes` - Create route
- `GET /routes/:id` - Get route by ID
- `PUT /routes/:id` - Update route
- `DELETE /routes/:id` - Delete route
- `POST /routes/import/csv` - Import routes from CSV
- `POST /routes/:id/start` - Start route
- `POST /routes/:id/complete` - Complete route

### Admin & Reports

- `GET /admin/reports/daily-sales` - Daily sales report
- `GET /admin/reports/collections` - Collections report
- `GET /admin/reports/aging-accounts` - Aging accounts report
- `GET /admin/reports/route-performance` - Route performance report
- `GET /admin/reports/sales-by-item` - Sales by item report
- `GET /admin/system/health` - System health status

### QuickBooks Integration

- `GET /qbo/oauth/start` - Start OAuth flow
- `GET /qbo/oauth/callback` - OAuth callback
- `GET /qbo/oauth/status` - OAuth connection status
- `POST /qbo/oauth/disconnect` - Disconnect OAuth
- `POST /qbo/sync/end-of-day` - Sync end-of-day sales
- `POST /qbo/sync/inventory` - Sync inventory
- `POST /qbo/sync/payments` - Sync payments
- `GET /qbo/sync/status/:jobId` - Get sync job status

### Offline Synchronization
### Customer Portal (New)

Authenticated customers can manage their own orders and invoices using a simplified flow (mirrors driver flow without customer selection step):

- `GET /customer-portal/orders` — List the authenticated customer's orders
- `POST /customer-portal/orders` — Create a new order (fields: items[], paymentMethod: cash|online, optional deliveryAddress, specialInstructions)
- `GET /customer-portal/orders/:orderId` — Fetch a specific order
- `GET /customer-portal/invoices` — List customer's invoices
- `GET /customer-portal/invoices/:invoiceId` — Fetch invoice details

Returned order/invoice objects include:
- `paymentMethod` (cash | online)
- `isPaidOnDelivery` (derived: true when cash)
- `isPaidOnline` (derived: true when online)

These flags enable UI badges and summary metrics without additional client logic.


- `POST /sync/push` - Push client changes
- `GET /sync/pull` - Pull server changes
- `GET /sync/status` - Get sync status
- `POST /sync/resolve-conflict` - Resolve sync conflicts
- `POST /sync/clear-queue` - Clear sync queue

## 🔐 Authentication & Authorization

### JWT Tokens

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) for token renewal

### Role-Based Access Control

- **Admin**: Full system access
- **SalesRep**: Customer, order, and invoice management
- **Driver**: Route management and completion
- **Customer**: Limited access to own data
- **Accountant**: Financial reports and QBO sync

### Protected Routes

Most endpoints require authentication via Bearer token:

```bash
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Data Access Layer

### Current Implementation

- **MongoDAL**: Full MongoDB implementation using Mongoose
- **QboDAL**: Stubbed implementation for future QBO integration

### DAL Interface

The system uses a common interface (`IDAL.js`) that allows easy swapping between data stores:

```javascript
// Example DAL usage
const dal = require("./dal/MongoDAL");

// Create customer
const customer = await dal.createCustomer(customerData);

// Get customers with filtering
const customers = await dal.getCustomers({
  search: "john",
  page: 1,
  limit: 20,
});
```

## 🔄 Background Jobs

### Job Types

- **End-of-Day Sales Sync**: Syncs completed orders to QuickBooks
- **Inventory Sync**: Updates inventory levels in QBO
- **Payment Sync**: Matches payments with QBO transactions

### Job Management

Jobs are processed using BullMQ with Redis as the backend:

```javascript
// Queue a sync job
const { queueEndOfDaySync } = require("./jobs/syncEndOfDay");

const result = await queueEndOfDaySync("2024-01-15", "warehouse-1", userId);
console.log(`Job queued: ${result.jobId}`);
```

## 📊 Offline Synchronization

### How It Works

1. **Client Push**: Clients send queued changes to `/sync/push`
2. **Conflict Detection**: Server checks for version conflicts
3. **Server Pull**: Clients fetch server changes from `/sync/pull`
4. **Conflict Resolution**: Manual or automatic conflict resolution

### Conflict Resolution Strategies

- **Client Wins**: Use client version
- **Server Wins**: Use server version
- **Merge**: Combine both versions

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
npm run lint:fix
```

### Test Structure

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Test Database**: Separate test database with cleanup

## 🚀 Deployment

### Production Considerations

- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up monitoring and logging
- Use environment-specific configurations
- Implement proper backup strategies

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

All configuration is done through environment variables following the 12-factor app methodology.

## 📝 API Documentation

### Swagger UI

Access interactive API documentation at `/docs` when the server is running.

### OpenAPI Specification

The complete API specification is available at `/docs.json` in OpenAPI 3.0 format.

## 🔧 Troubleshooting

### QuickBooks SSL/TLS Issues

If you're experiencing `ERR_SSL_WRONG_VERSION_NUMBER` errors with QuickBooks Online sync, see our comprehensive [SSL Troubleshooting Guide](SSL_TROUBLESHOOTING.md).

Quick test for SSL configuration:
```bash
npm run test:ssl
```

## 🔧 Development

### Project Structure

```
src/
├── app.js              # Express app configuration
├── server.js           # Server startup
├── config/             # Configuration management
├── db/                 # Database connection
├── models/             # Mongoose schemas
├── dal/                # Data Access Layer
├── routes/             # API route definitions
├── controllers/        # Request handlers
├── services/           # Business logic
├── middleware/         # Express middleware
├── jobs/               # Background job processors
└── utils/              # Utility functions
```

### Adding New Features

1. **Model**: Create Mongoose schema in `models/`
2. **DAL**: Add methods to `MongoDAL.js` and `IDAL.js`
3. **Service**: Implement business logic in `services/`
4. **Controller**: Handle HTTP requests in `controllers/`
5. **Routes**: Define API endpoints in `routes/`
6. **Tests**: Add comprehensive test coverage

### Code Style

- Use ES6+ features
- Function-based design (no classes)
- Consistent error handling
- Comprehensive logging
- Input validation with Joi
- Proper async/await usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact: support@sales-system.com

## 🔮 Roadmap

- [ ] Complete QuickBooks Online integration
- [ ] Real-time notifications
- [ ] Advanced reporting dashboard
- [ ] Mobile app API endpoints
- [ ] Multi-tenant support
- [ ] Advanced analytics
- [ ] Payment gateway integrations
- [ ] Email/SMS notifications
