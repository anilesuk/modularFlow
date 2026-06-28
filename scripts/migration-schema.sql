# Database Schema Updates for Production

## Migration: Add Stripe & Subscription Tables

Run these SQL commands to update your database:

```sql
-- 1. Add users table (from Clerk integration)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Stripe customers mapping
CREATE TABLE IF NOT EXISTS stripe_customers (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Subscriptions & billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Usage tracking (for metering)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'cv_generation', 'api_call', etc
  action_count INT DEFAULT 1,
  reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add S3 storage info to processing_runs (if not exists)
ALTER TABLE processing_runs 
  ADD COLUMN IF NOT EXISTS s3_cv_path TEXT,
  ADD COLUMN IF NOT EXISTS s3_letter_path TEXT,
  ADD COLUMN IF NOT EXISTS s3_notes_path TEXT,
  ADD COLUMN IF NOT EXISTS presigned_cv_url TEXT,
  ADD COLUMN IF NOT EXISTS presigned_letter_url TEXT,
  ADD COLUMN IF NOT EXISTS presigned_notes_url TEXT;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_runs_user_id ON processing_runs(user_id);

-- 7. Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Schema Relationship Diagram

```
┌─────────────────┐
│     users       │ (from Clerk)
│  id (PK, TEXT)  │
│  email          │
│  first_name     │
│  last_name      │
└────────┬────────┘
         │
         │ 1-to-1
    ┌────┴─────────────────────┐
    │                           │
    ▼                           ▼
┌──────────────────┐  ┌────────────────────┐
│ stripe_customers │  │ subscriptions      │
│ user_id (FK)     │  │ user_id (FK)       │
│ stripe_cust_id   │  │ stripe_sub_id      │
│ created_at       │  │ tier (enum)        │
└──────────────────┘  │ status (enum)      │
                      │ current_period_*   │
                      └────────────────────┘
                               │
                               │ 1-to-many
                               ▼
                      ┌────────────────────┐
                      │  usage_tracking    │
                      │  user_id (FK)      │
                      │  action_type       │
                      │  action_count      │
                      └────────────────────┘
```

## Data Migration Steps

If you have existing users:

```sql
-- 1. Copy users from old auth table (if exists)
INSERT INTO users (id, email, first_name, last_name)
SELECT id, email, first_name, last_name FROM old_users_table
ON CONFLICT (id) DO NOTHING;

-- 2. Assign free tier to existing users
INSERT INTO subscriptions (user_id, tier, status)
SELECT id, 'free', 'active' FROM users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify migration
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as subscription_count FROM subscriptions;
```
