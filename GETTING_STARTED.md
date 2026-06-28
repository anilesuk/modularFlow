# ModularFlow - Getting Started Checklist

## 🎯 Step 1: Setup External Services (30 minutes)

### Clerk Authentication
- [ ] Go to https://clerk.com
- [ ] Sign up (free tier = 10k monthly active users)
- [ ] Create new application
- [ ] Copy `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
- [ ] Copy `Secret Key` → `CLERK_SECRET_KEY` in `.env.local`
- [ ] Enable OAuth providers (Google, GitHub, Apple)
- [ ] Set redirect URIs:
  - `http://localhost:5173` (dev)
  - `https://modularflow.com` (prod)

### OpenAI API
- [ ] Go to https://platform.openai.com/account/api-keys
- [ ] Create new API key
- [ ] Copy to `OPENAI_API_KEY` in `.env.local`
- [ ] Set usage limits (optional, for cost control)

### Stripe
- [ ] Go to https://stripe.com
- [ ] Create account (free test mode)
- [ ] Go to Products → Create Products:
  - **Pro**: $9.99/month (price_1Xxx...)
  - **Premium**: $19.99/month (price_1Yyy...)
- [ ] Copy `Secret Key` → `STRIPE_SECRET_KEY` in `.env.local`
- [ ] Copy `Publishable Key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`
- [ ] Create webhook endpoint: `http://localhost:5000/api/webhooks/stripe`

### AWS S3
- [ ] Go to https://aws.amazon.com
- [ ] Create S3 bucket: `modularflow-prod`
- [ ] Create IAM user with S3 permissions
- [ ] Generate access key
- [ ] Add to `.env.local`:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION=us-east-1`
  - `AWS_S3_BUCKET=modularflow-prod`

### Database (Already Configured)
- [ ] You have Neon PostgreSQL
- [ ] Connection string should be in `.env.local` as `DATABASE_URL`

---

## 🚀 Step 2: Local Development Setup (45 minutes)

### Install Prerequisites
```bash
# Check versions
node --version     # Should be 18+
docker --version   # Should be latest
git --version      # Should be installed
```

### Clone & Configure
```bash
# Clone repository
git clone https://github.com/your-repo/ModularFlow.git
cd ModularFlow

# Copy environment template
cp .env.example .env.local

# Edit with your keys (using VS Code, Sublime, etc.)
# IMPORTANT: Never commit .env.local!
```

### Start Services
```bash
# Terminal 1: Start PostgreSQL
docker-compose up -d

# Wait for database to be ready (~10 seconds)
docker-compose ps  # Should show "healthy"

# Terminal 2: Install dependencies
npm install

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Verify Installation
- [ ] Frontend loads at http://localhost:5173
- [ ] Can click "Sign In" button
- [ ] Clerk login modal appears
- [ ] Backend responds at http://localhost:5000/api/health

---

## ✅ Step 3: Test Core Features (30 minutes)

### Authentication
```bash
# Test login flow
1. Click "Sign In" on app
2. Choose login method (Email/Google/GitHub)
3. Complete authentication
4. You should be redirected back to app
5. Check Network tab - should have auth token
```

### File Upload to S3
```bash
# Test CV upload
1. Go to "Submit Job" page
2. Upload a PDF file
3. Check S3 bucket - file should appear
4. Check CloudWatch logs for upload confirmation
```

### Payment Processing
```bash
# Test Stripe subscription
1. Go to "Upgrade to Pro"
2. Use test card: 4242 4242 4242 4242
3. Enter any future date and CVC
4. Verify payment succeeds
5. Check Stripe dashboard for charge
```

### Database
```bash
# Verify data was saved
psql -h localhost -U postgres -d modularflow_dev

# List users who signed up
SELECT * FROM users;

# Check subscriptions
SELECT * FROM subscriptions;

# Exit
\q
```

---

## 🌐 Step 4: Deploy to Vercel (20 minutes)

### Connect to Vercel
```bash
# Login to Vercel
npm i -g vercel
vercel login

# Connect project
vercel link
```

### Set Environment Variables
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add all variables from `.env.local`:
   - `DATABASE_URL`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET`
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Deploy
```bash
# Production deployment
vercel --prod

# Frontend: https://modularflow.vercel.app
# Backend: https://api.modularflow.vercel.app
```

### Update Clerk Redirect URIs
1. Go to Clerk dashboard
2. Add production domain: `https://modularflow.vercel.app`
3. Test login on production

---

## 📱 Step 5: Mobile App (Flutter) - Optional

### Quick Start
```bash
# Check Flutter is installed
flutter --version

# Create Flutter project in mobile/ folder
cd mobile
flutter pub get
flutter run
```

### iOS Setup (macOS only)
```bash
cd ios
pod install
cd ..

# Open simulator
open -a Simulator

# Run on iOS
flutter run -d iphone
```

### Android Setup (All platforms)
```bash
# Start Android emulator first
# Then run:
flutter run -d emulator-5554
```

### Build for Distribution
```bash
# iOS (requires Apple Developer account)
flutter build ios --release

# Android (requires Google Play account)
flutter build appbundle --release
```

---

## 🧪 Step 6: Test End-to-End

### User Journey Test
```
1. Land on app
2. Click "Sign In"
3. Create account with email
4. Verify email (check inbox)
5. Upload CV PDF
6. Enter job URL or paste job description
7. Click "Process"
8. Wait for AI processing (2-3 minutes)
9. View results
10. Download CV PDF
11. Download Cover Letter PDF
12. Upgrade to Pro (use test card)
13. Verify subscription active
```

### Edge Cases to Test
- [ ] Invalid job URL
- [ ] Empty CV
- [ ] Very long CV (5+ pages)
- [ ] Large file upload (>5MB)
- [ ] Payment declined (use 4000 0000 0000 0002)
- [ ] Session timeout (wait 1 hour)

---

## 📊 Step 7: Monitor & Iterate

### Daily Checks
```bash
# Check logs
vercel logs --prod --follow

# Check database
npm run db:push  # Should say "no migrations pending"

# Check API health
curl https://api.modularflow.vercel.app/health

# Check Stripe webhooks
# Go to Stripe dashboard → Webhooks → View details
```

### Weekly Reviews
- [ ] Check Vercel analytics
- [ ] Review Stripe transactions
- [ ] Monitor error tracking
- [ ] Check database backups
- [ ] Review GitHub Actions logs

---

## 🚨 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| "Can't connect to database" | `docker-compose logs postgres` - check if running |
| "Clerk login not working" | Verify redirect URI in Clerk dashboard matches your URL |
| "Files not uploading to S3" | Check AWS credentials and bucket permissions |
| "Payment not processing" | Use Stripe test card, check webhook logs |
| "Build fails on Vercel" | Check `npm run build` works locally first |
| "TypeScript errors" | Run `npm run check` locally to see all errors |
| "Port 5000 already in use" | `lsof -i :5000` then `kill -9 <PID>` |

---

## 📚 Documentation Quick Links

- **Development**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- **Deployment**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Mobile**: [FLUTTER_SETUP.md](./FLUTTER_SETUP.md)
- **Architecture**: [TRANSFORMATION_PLAN.md](./TRANSFORMATION_PLAN.md)
- **Database**: [scripts/migration-schema.sql](./scripts/migration-schema.sql)

---

## ⏱️ Time Estimates

| Phase | Duration | Status |
|-------|----------|--------|
| Setup services | 30 min | ⬜ Not started |
| Local dev | 45 min | ⬜ Not started |
| Feature test | 30 min | ⬜ Not started |
| Vercel deploy | 20 min | ⬜ Not started |
| Mobile app | 2-3 hours | ⬜ Optional |
| App store | 1-2 weeks | ⬜ Future |
| **Total** | **3-4 hours** | |

---

## 🎉 Congratulations Milestones

✅ **Milestone 1**: Local app running with Clerk login  
✅ **Milestone 2**: Files uploading to S3  
✅ **Milestone 3**: Payments processing  
✅ **Milestone 4**: Deployed on Vercel  
✅ **Milestone 5**: Flutter app running  
✅ **Milestone 6**: On app stores (Top 10 goal!)  

---

**Questions?** Check [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) or create a GitHub issue!
