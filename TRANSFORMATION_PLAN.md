# ModularFlow: Replit → Production-Grade Independence

## Phase 1: Immediate Setup (This Week)
- [ ] Replace Replit Auth → Clerk
- [ ] Replace Replit Object Storage → AWS S3 + CloudFront
- [ ] Replace Replit AI → OpenAI API (direct)
- [ ] Setup environment configuration (.env files)
- [ ] Update dependencies (remove Replit packages)
- [ ] Local development workflow
- [ ] GitHub CI/CD pipeline

## Phase 2: Payments & Monetization (Week 2)
- [ ] Stripe integration (accounts, products, subscriptions)
- [ ] Database schema for subscription management
- [ ] Paywall enforcement in API
- [ ] Usage tracking and metering
- [ ] Receipt management

## Phase 3: Mobile-First UX (Week 3)
- [ ] Responsive design audit
- [ ] Touch optimizations
- [ ] Mobile-first Tailwind overrides
- [ ] Offline capability (service workers)
- [ ] Native app shell preparation

## Phase 4: Flutter Mobile Apps (Weeks 4-6)
- [ ] Flutter project scaffolding
- [ ] Shared API client
- [ ] Authentication flows (Clerk native)
- [ ] Payment processing (Stripe + RevenueCat optional)
- [ ] App store configuration (iOS/Android)

## Phase 5: Deployment & Scaling (Week 7+)
- [ ] Vercel deployment
- [ ] AWS infrastructure
- [ ] Database backups & monitoring
- [ ] CDN caching strategies
- [ ] Performance optimization

---

## Technology Decisions

### Authentication (Clerk)
**Why Clerk:**
- Seamless OAuth (Google, Apple, GitHub)
- Built-in email verification
- Organization management (future B2B)
- Native mobile SDKs
- Ready for app store

**What changes:**
- Remove `replitAuth.ts`
- Add Clerk middleware
- User object from Clerk instead of custom DB

### Storage (AWS S3)
**Why S3 + CloudFront:**
- 99.999999999% durability
- Global CDN distribution
- Presigned URLs (secure temporary access)
- Versioning & lifecycle policies
- Cost-effective

**Presigned URL flow:**
```
1. User requests download
2. Backend generates presigned URL (15-min expiry)
3. User downloads directly from S3 via CloudFront
4. No bandwidth costs for backend
```

### Payments (Stripe)
**Pricing Model Options:**
```
Option A: Pay-per-use
- $0.99 per CV generation
- Popular for single-use users

Option B: Subscription tiers
- Free: 2 CV/month
- Pro: $9.99/month (unlimited)
- Premium: $19.99/month (priority AI, 24hr support)

Option C: Hybrid
- Free tier + pay-per-use overage
- Subscription for unlimited
```

### Mobile (Flutter)
**Why Flutter:**
- Single codebase for iOS/Android
- 2M+ downloads threshold achievable
- Hot reload for dev productivity
- Excellent Stripe integration
- App store optimized

---

## File Structure (Post-Transformation)

```
ModularFlow/
├── .github/
│   └── workflows/
│       ├── test.yml
│       ├── deploy-web.yml
│       └── deploy-mobile.yml
├── web/                          (React - Vercel)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── lib/
│   │   │   ├── api.ts           (NEW - API client)
│   │   │   ├── stripe.ts        (NEW)
│   │   │   ├── clerk.ts         (NEW)
│   │   │   └── storage.ts       (NEW)
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
├── server/                       (Vercel Functions)
│   ├── api/
│   │   ├── auth/
│   │   ├── documents/
│   │   ├── subscriptions/
│   │   ├── webhooks/            (Stripe)
│   │   └── cv/
│   ├── lib/
│   │   ├── clerk.ts            (NEW)
│   │   ├── stripe.ts           (NEW)
│   │   ├── s3.ts               (NEW)
│   │   └── db.ts
│   └── middleware/
├── mobile/                       (Flutter)
│   ├── lib/
│   │   ├── services/
│   │   │   ├── api_service.dart
│   │   │   ├── auth_service.dart
│   │   │   └── payment_service.dart
│   │   ├── screens/
│   │   └── models/
│   ├── pubspec.yaml
│   └── ios/
│   └── android/
├── shared/                       (Shared code)
│   ├── types.ts
│   └── schema.ts
├── .env.example
├── .env.local (DO NOT COMMIT)
└── docker-compose.yml           (For local Postgres)
```

---

## Environment Variables (Before → After)

### BEFORE (Replit)
```
REPLIT_DB_URL=...
REPLIT_AUTH_ORIGIN=...
REPLIT_OBJECT_STORAGE_KEY=...
OPENAI_API_KEY=...
```

### AFTER (Independent)
```
# Database
DATABASE_URL=postgresql://...
POSTGRES_PASSWORD=...

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Storage (AWS)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=modularflow-prod
CLOUDFRONT_DOMAIN=...

# AI (OpenAI)
OPENAI_API_KEY=...

# Payments (Stripe)
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# App
NODE_ENV=production
VITE_API_URL=https://api.modularflow.com
```

---

## Migration Checklist

### Remove Replit Dependencies
- [ ] `@replit/vite-plugin-cartographer`
- [ ] `@replit/vite-plugin-dev-banner`
- [ ] `@replit/vite-plugin-runtime-error-modal`
- [ ] `replitAuth.ts` → Clerk
- [ ] Replit Object Storage → AWS SDK

### Add New Dependencies
- [ ] `@clerk/clerk-react`
- [ ] `@clerk/backend` 
- [ ] `@aws-sdk/client-s3`
- [ ] `@stripe/stripe-js`
- [ ] `stripe` (Node.js SDK)
- [ ] `dotenv`
- [ ] `pino` (logging)

### Database Migrations
- [ ] Create `users` from Clerk (remove local auth)
- [ ] Add `subscriptions` table
- [ ] Add `stripe_customers` table
- [ ] Add `payments` table
- [ ] Add `usage_tracking` table

---

## Success Metrics for App Store
✅ Top 10 category requires:
- 100K+ installs (6 months)
- 4.5+ star rating
- < 2% crash rate
- < 10MB app size
- Fast load time (< 2s)

**Our advantages:**
- Unique AI value prop
- Enterprise-grade security
- Premium monetization
- Professional UX

---

## Next Steps
1. Start with Phase 1 setup
2. Migrate database schema
3. Test locally with Docker
4. Deploy to Vercel
5. Begin Flutter app development
