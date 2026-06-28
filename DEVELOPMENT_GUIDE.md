# ModularFlow Development Guide (Post-Replit)

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- Docker Desktop (for PostgreSQL)
- Clerk account (free tier)
- AWS S3 credentials
- OpenAI API key
- Stripe account (free tier)

### 1. Setup Environment

```bash
# Clone and setup
git clone <repo>
cd ModularFlow
cp .env.example .env.local

# Edit .env.local with your credentials
```

### 2. Start Database

```bash
# Start PostgreSQL via Docker
docker-compose up -d

# Verify connection
psql -h localhost -U postgres -d modularflow_dev

# Run migrations
npm run db:push
```

### 3. Install Dependencies & Run

```bash
# Install
npm install

# Start dev server (both frontend + backend)
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:5000

# TypeScript checking
npm run check
```

---

## 📦 Environment Variables

### Development (.env.local)
```env
# Use test/development credentials
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# LocalStack for S3 testing (optional)
AWS_ENDPOINT_URL=http://localhost:4566

# OpenAI (test key)
OPENAI_API_KEY=sk-test-xxx

# Stripe (test key)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### Production (Vercel Environment Variables)
```
Set via Vercel dashboard:
- CLERK_SECRET_KEY
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- OPENAI_API_KEY
- STRIPE_SECRET_KEY
- DATABASE_URL (from Neon)
```

**Never commit .env.local!**

---

## 🏗️ Project Structure

```
ModularFlow/
├── client/                 # React/Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/
│   │   │   ├── api.ts      # API client wrapper
│   │   │   ├── clerk.ts    # Clerk integration
│   │   │   └── stripe.ts   # Stripe integration
│   │   └── App.tsx
│   └── vite.config.ts
│
├── server/                 # Express backend
│   ├── api/                # API route handlers
│   │   ├── auth/
│   │   ├── documents/
│   │   ├── subscriptions/
│   │   └── cv/
│   ├── lib/
│   │   ├── clerk.ts        # Clerk utilities
│   │   ├── s3.ts           # AWS S3 utilities
│   │   ├── stripe.ts       # Stripe utilities
│   │   ├── db.ts           # Database connection
│   │   └── openai.ts       # OpenAI wrapper
│   ├── middleware/         # Express middleware
│   ├── index.ts            # Server entry
│   └── routes.ts           # Route registration
│
├── shared/                 # Shared types
│   ├── schema.ts           # Database schema
│   └── types.ts
│
├── scripts/                # Database scripts
│   └── migrate-cv-schema.ts
│
├── TRANSFORMATION_PLAN.md  # Detailed migration guide
├── .env.example            # Environment template
├── docker-compose.yml      # Local services
└── package.json
```

---

## 🔐 Authentication (Clerk)

### Setup Clerk
1. Go to https://clerk.com (free tier available)
2. Create new application
3. Copy publishable & secret keys to .env.local

### Frontend Integration
```typescript
// src/App.tsx
import { ClerkProvider } from '@clerk/react';

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_KEY}>
      {/* Your app */}
    </ClerkProvider>
  );
}
```

### Backend Verification
```typescript
// server/middleware/auth.ts
import { verifyToken } from '@clerk/express';

app.use(verifyToken());
```

---

## 💾 Database (PostgreSQL)

### Schema

```sql
-- Users table (created from Clerk)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tier VARCHAR(50) DEFAULT 'free',
  stripe_subscription_id TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Stripe customers mapping
CREATE TABLE stripe_customers (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CV Processing runs
CREATE TABLE processing_runs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_posting_id INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Running Migrations
```bash
# Push schema to database
npm run db:push

# See pending migrations
npm run db:migrate

# Reset database (development only)
npm run db:reset
```

---

## 💳 Payments (Stripe)

### Setup Stripe
1. Create Stripe account (free tier)
2. Create products:
   - **Pro**: $9.99/month
   - **Premium**: $19.99/month
3. Copy price IDs to .env

### Webhook Integration
```typescript
// server/api/webhooks/stripe.ts
app.post('/api/webhooks/stripe', 
  express.raw({type: 'application/json'}),
  (req, res) => {
    const event = verifyWebhookSignature(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
    // Handle event
  }
);
```

### Testing Payments
```bash
# Use Stripe CLI for local webhook testing
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Use test card numbers
# Visa: 4242 4242 4242 4242
# Fail: 4000 0000 0000 0002
```

---

## 📁 Storage (AWS S3)

### Setup AWS
1. Create S3 bucket: `modularflow-prod`
2. Create IAM user with S3 permissions
3. Generate access key/secret
4. Set up CloudFront distribution (optional, for CDN)

### Usage
```typescript
import { uploadToS3, generatePresignedDownloadUrl } from '@/lib/s3';

// Upload
await uploadToS3(
  `users/${userId}/cv/cv_2024.pdf`,
  pdfBuffer,
  'application/pdf'
);

// Generate download link (15-min expiry)
const url = await generatePresignedDownloadUrl(
  `users/${userId}/cv/cv_2024.pdf`
);
```

---

## 🤖 AI Integration (OpenAI)

### Remove Replit AI
```typescript
// OLD (Replit): Already removed
// const response = await Replit.AI.generateText()

// NEW (OpenAI)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
});
```

---

## 🧪 Testing Locally

### Database
```bash
# Connect to local DB
psql -h localhost -U postgres -d modularflow_dev

# Example queries
SELECT * FROM users;
SELECT * FROM subscriptions;
```

### API
```bash
# Test authenticated endpoint
curl -H "Authorization: Bearer $(clerk token)" \
  http://localhost:5000/api/user

# Test webhook (use Stripe CLI)
stripe trigger customer.subscription.created
```

### Frontend
```bash
# Dev with hot reload
npm run dev

# Build for production
npm run build
```

---

## 🚀 Deployment

### Deploy Frontend (Vercel)
```bash
# Connect to Vercel
vercel link

# Set environment variables in Vercel dashboard

# Deploy
vercel
```

### Deploy Backend (Vercel Functions or self-hosted)

#### Option 1: Vercel Functions
```
server/api/
├── auth/login.ts
├── cv/generate.ts
├── subscriptions/check.ts
└── webhooks/stripe.ts
```

#### Option 2: Self-hosted (Docker)
```bash
# Build Docker image
docker build -t modularflow:latest .

# Deploy to your VPS/cloud
docker run -d \
  -e DATABASE_URL=... \
  -e CLERK_SECRET_KEY=... \
  modularflow:latest
```

---

## ✅ Migration Checklist

- [ ] Setup Clerk account & copy credentials
- [ ] Setup AWS S3 bucket & IAM credentials
- [ ] Setup Stripe account & product prices
- [ ] Setup OpenAI API key
- [ ] Update package.json (remove Replit deps)
- [ ] Create .env.local from .env.example
- [ ] Run `docker-compose up -d`
- [ ] Run `npm install && npm run db:push`
- [ ] Test locally with `npm run dev`
- [ ] Connect GitHub to Vercel
- [ ] Set environment variables in Vercel
- [ ] Deploy to Vercel
- [ ] Configure Stripe webhooks
- [ ] Test payment flow end-to-end

---

## 📝 Common Issues

### "Cannot find module '@clerk/backend'"
```bash
npm install @clerk/backend @clerk/express
```

### Database connection error
```bash
# Check if Docker is running
docker ps

# Check logs
docker logs modularflow_db

# Verify credentials in .env.local
```

### AWS S3 access denied
```
Check IAM permissions:
✓ s3:GetObject
✓ s3:PutObject
✓ s3:DeleteObject
✓ s3:ListBucket
```

### Stripe webhook not firing
```bash
# Use Stripe CLI
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Trigger test event
stripe trigger customer.subscription.created
```

---

## 🔗 Useful Resources

- [Clerk Docs](https://clerk.com/docs)
- [AWS S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Stripe API](https://stripe.com/docs/api)
- [OpenAI API](https://platform.openai.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [React + Vite](https://vitejs.dev/guide/)
- [Drizzle ORM](https://orm.drizzle.team/)
