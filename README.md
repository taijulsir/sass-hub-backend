# SaaS Backend

A production-ready, multi-tenant SaaS backend built with TypeScript, Express.js, and MongoDB.

## Features

- 🔐 **Authentication**: JWT-based authentication with access and refresh tokens
- 👥 **Multi-tenancy**: Organization-based multi-tenant architecture
- 🛡️ **RBAC**: Role-based access control with fine-grained permissions
- 📊 **CRM**: Lead management system with status tracking
- 💰 **Finance**: Financial entry management with monthly summaries
- 📝 **Audit Logs**: Comprehensive audit logging for all actions
- 🏢 **Admin Panel**: Platform administration features
- 📧 **Invitations**: User invitation system

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts              # Server entry point
├── routes.ts              # Route aggregator
├── config/
│   ├── env.ts            # Environment configuration
│   ├── db.ts             # Database connection
│   └── logger.ts         # Logging configuration
├── middlewares/
│   ├── auth.middleware.ts    # Authentication
│   ├── rbac.middleware.ts    # Role-based access control
│   ├── validate.middleware.ts # Request validation
│   └── error.middleware.ts   # Error handling
├── modules/
│   ├── auth/             # Authentication module
│   ├── user/             # User management
│   ├── organization/     # Organization management
│   ├── membership/       # Membership management
│   ├── invitation/       # User invitations
│   ├── subscription/     # Subscription management
│   ├── crm/              # CRM (leads)
│   ├── finance/          # Financial management
│   ├── audit/            # Audit logging
│   └── admin/            # Admin features
├── types/
│   ├── enums.ts          # Enumerations
│   └── interfaces.ts     # Type definitions
└── utils/
    ├── api-error.ts      # Custom error classes
    ├── response.ts       # Response helpers
    └── jwt.ts            # JWT utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with your settings

5. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/saas_db |
| JWT_ACCESS_SECRET | Access token secret | - |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| JWT_ACCESS_EXPIRES_IN | Access token expiry | 15m |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization
- `PATCH /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/:id/members` - Get members

### CRM
- `POST /api/crm/:orgId/leads` - Create lead
- `GET /api/crm/:orgId/leads` - List leads
- `GET /api/crm/:orgId/leads/:id` - Get lead
- `PATCH /api/crm/:orgId/leads/:id` - Update lead
- `DELETE /api/crm/:orgId/leads/:id` - Delete lead

### Finance
- `POST /api/finance/:orgId` - Create entry
- `GET /api/finance/:orgId` - List entries
- `GET /api/finance/:orgId/summary?month=YYYY-MM` - Monthly summary
- `PATCH /api/finance/:orgId/:id` - Update entry
- `DELETE /api/finance/:orgId/:id` - Delete entry

### Subscriptions
- `GET /api/subscriptions/:orgId` - Get subscription
- `GET /api/subscriptions/:orgId/history` - Get history
- `PATCH /api/subscriptions/:orgId/plan` - Change plan

### Admin (Super Admin only)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/organizations` - List organizations
- `PATCH /api/admin/organizations/:id/status` - Change status
- `PATCH /api/admin/organizations/:id/plan` - Change plan

## Roles & Permissions

### Global Roles
- `SUPER_ADMIN` - Platform administrator
- `USER` - Regular user

### Organization Roles
- `OWNER` - Full access to organization
- `ADMIN` - Administrative access
- `MEMBER` - Basic member access

### Permissions
| Permission | OWNER | ADMIN | MEMBER |
|------------|-------|-------|--------|
| ORG_MANAGE | ✅ | ❌ | ❌ |
| USER_INVITE | ✅ | ✅ | ❌ |
| USER_REMOVE | ✅ | ✅ | ❌ |
| CRM_READ | ✅ | ✅ | ✅ |
| CRM_WRITE | ✅ | ✅ | ❌ |
| FINANCE_READ | ✅ | ✅ | ✅ |
| FINANCE_WRITE | ✅ | ✅ | ❌ |
| AUDIT_READ | ✅ | ✅ | ❌ |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run linter
npm run format   # Format code
```

## License

MIT
