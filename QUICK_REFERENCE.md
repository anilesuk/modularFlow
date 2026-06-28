# ModularFlow - Quick Reference Guide

## 🚀 Development Commands

```bash
# Start development server
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:5000

# Type checking
npm run check

# Build for production
npm run build

# Run production build locally
npm run start

# Database migrations
npm run db:push              # Apply pending migrations
npm run db:reset             # Reset database (dev only)
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres

# Connect to database
psql -h localhost -U postgres -d modularflow_dev

# Remove everything (careful!)
docker-compose down -v
```

## 🔐 Environment Variables

### Development (.env.local)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/modularflow_dev

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=modularflow-prod

# OpenAI
OPENAI_API_KEY=sk-xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# App
NODE_ENV=development
VITE_API_URL=http://localhost:5000
PORT=5000
```

### Production (Vercel Secrets)
Set via Vercel dashboard, never in code.

## 🌐 API Endpoints

### Authentication
```
POST   /api/auth/login           # Create session
POST   /api/auth/logout          # Destroy session
GET    /api/auth/me              # Current user
POST   /api/auth/refresh         # Refresh token
```

### CV Processing
```
POST   /api/cv/process           # Submit job + CV
GET    /api/cv/:jobId/status     # Get processing status
GET    /api/cv/:jobId/results    # Get results
POST   /api/documents/:jobId/download-url  # Get S3 presigned URL
```

### Subscriptions
```
GET    /api/subscriptions/current # Current tier
POST   /api/subscriptions/checkout # Create Stripe session
POST   /api/subscriptions/cancel  # Cancel subscription
POST   /api/webhooks/stripe       # Stripe events
```

### Account
```
GET    /api/user/profile         # User info
PUT    /api/user/profile         # Update profile
POST   /api/user/avatar          # Upload avatar
GET    /api/user/usage           # Usage stats
```

## 📊 Database Queries

```sql
-- Users
SELECT * FROM users;
SELECT * FROM users WHERE id = 'user_123';

-- Subscriptions
SELECT * FROM subscriptions WHERE tier != 'free';
SELECT COUNT(*) as pro_users FROM subscriptions WHERE tier = 'pro';

-- Processing runs
SELECT * FROM processing_runs WHERE status = 'processing';
SELECT * FROM processing_runs WHERE user_id = 'user_123' ORDER BY created_at DESC LIMIT 10;

-- Usage tracking
SELECT user_id, action_type, SUM(action_count) FROM usage_tracking GROUP BY user_id, action_type;

-- Stripe integration
SELECT u.email, s.tier, s.status FROM users u JOIN subscriptions s ON u.id = s.user_id WHERE s.tier != 'free';
```

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes
git add .
git commit -m "Add amazing feature"

# Push to GitHub
git push origin feature/amazing-feature

# Create Pull Request
# -> Auto-deploys preview to Vercel
# -> CI runs tests
# -> Team reviews

# Merge to main
git merge feature/amazing-feature
# -> Auto-deploys to production
```

## 📦 Testing Stripe Locally

```bash
# Terminal 1: Start Stripe CLI listener
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Terminal 2: Trigger test event
stripe trigger customer.subscription.created

# Use test card in UI
4242 4242 4242 4242  # Visa
4000 0000 0000 0002  # Decline
```

## ☁️ AWS S3 Operations

```bash
# Upload file
aws s3 cp file.pdf s3://modularflow-prod/users/123/cv/file.pdf

# List files
aws s3 ls s3://modularflow-prod/users/123/ --recursive

# Download file
aws s3 cp s3://modularflow-prod/users/123/cv/file.pdf ./download.pdf

# Delete file
aws s3 rm s3://modularflow-prod/users/123/cv/file.pdf
```

## 🧪 Test Coverage

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

## 🚀 Deployment

```bash
# Deploy to Vercel (production)
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs --prod

# Rollback
vercel rollback deployment-id
```

## 📱 Flutter Commands

```bash
# Create project
flutter create mobile

# Run on simulator/device
flutter run

# Run on specific device
flutter run -d iphone
flutter run -d emulator-5554

# Build for iOS
flutter build ios --release

# Build for Android
flutter build appbundle --release

# Clean
flutter clean

# Get dependencies
flutter pub get

# Format code
dart format lib/
```

## 🐛 Debugging

### Frontend Debugging
```bash
# Chrome DevTools
npm run dev
# Open http://localhost:5173
# F12 or right-click → Inspect
```

### Backend Debugging
```bash
# VS Code Launch Config (.vscode/launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Start Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

### Database Debugging
```bash
# Connect directly
psql -h localhost -U postgres -d modularflow_dev

# List tables
\dt

# View query results
\x on  # Expanded mode
SELECT * FROM users;
```

## 📈 Performance Monitoring

```bash
# Vercel Analytics
# Dashboard → Analytics → Web Vitals

# Stripe Dashboard
# Reports → Revenue → Overview

# Clerk Dashboard
# Analytics → Sessions & Users

# AWS CloudWatch
# S3 → Metrics → Storage
```

## 🔒 Security Checklist

- [ ] .env.local in .gitignore
- [ ] Secrets never in code
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on server
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS protection (React escaping)
- [ ] HTTPS only in production
- [ ] Database backups automated
- [ ] Security headers set

## 🆘 Quick Fixes

### Port already in use
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Database connection timeout
```bash
# Check Docker
docker-compose ps

# Restart
docker-compose restart postgres
```

### Clerk redirect URI issues
```
In Clerk dashboard:
1. Settings → Paths
2. Update Redirect URL to match current domain
3. Clear browser cache (Ctrl+Shift+Delete)
```

### S3 permission denied
```bash
# Check IAM user permissions
aws iam get-user-policy --user-name s3-user --policy-name s3-policy

# Verify S3 bucket policy allows PutObject, GetObject
```

### Stripe webhook not working
```
1. Check webhook endpoint in Stripe dashboard
2. Verify STRIPE_WEBHOOK_SECRET matches
3. Check server logs for webhook delivery
4. Use Stripe CLI: stripe logs tail
```

## 📞 Support Resources

| Resource | Link |
|----------|------|
| Clerk Docs | https://clerk.com/docs |
| Stripe Docs | https://stripe.com/docs/api |
| AWS Docs | https://docs.aws.amazon.com |
| OpenAI Docs | https://platform.openai.com/docs |
| React Docs | https://react.dev |
| Flutter Docs | https://flutter.dev/docs |
| Vercel Docs | https://vercel.com/docs |

## 🎯 Useful Links

- **Local App**: http://localhost:5173
- **Local API**: http://localhost:5000
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **AWS Console**: https://console.aws.amazon.com
- **OpenAI Dashboard**: https://platform.openai.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub**: https://github.com/your-repo/ModularFlow
