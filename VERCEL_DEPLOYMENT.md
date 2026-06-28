# Vercel Deployment Guide

## Prerequisites

1. Vercel account (free tier available)
2. GitHub repository connected to Vercel
3. Environment variables configured
4. Neon PostgreSQL database (already provisioned)

## Configuration Files

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["iad1", "sfo1"],
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "@next_public_clerk_publishable_key",
    "VITE_API_URL": "@vite_api_url"
  },
  "functions": {
    "server/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

## Setup Steps

### 1. Connect Repository

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Follow prompts to connect GitHub repo
```

### 2. Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL                         (from Neon)
CLERK_SECRET_KEY                     (from Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   (from Clerk)
AWS_ACCESS_KEY_ID                    (from AWS)
AWS_SECRET_ACCESS_KEY                (from AWS)
AWS_REGION                           us-east-1
AWS_S3_BUCKET                        modularflow-prod
CLOUDFRONT_DOMAIN                    https://cdn.modularflow.com
OPENAI_API_KEY                       (from OpenAI)
STRIPE_SECRET_KEY                    (from Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (from Stripe)
STRIPE_WEBHOOK_SECRET                (from Stripe)
```

### 3. Deploy

**First Deploy:**
```bash
vercel --prod
```

**Automatic Deploy:**
- Push to `main` branch triggers production deployment
- Push to `develop` branch triggers preview

### 4. Configure Domains

In Vercel Dashboard:
1. Add domain: `modularflow.com`
2. Add API domain: `api.modularflow.com`
3. Point DNS to Vercel nameservers

### 5. Setup Custom Domain Rewrites

For API requests to route correctly:

```json
// vercel.json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "https://api.modularflow.com/:path*"
  }
]
```

## Monitoring

### Vercel Analytics
- Automatic Page Speed Insights
- Web Vitals monitoring
- Error tracking

### Logs
```bash
vercel logs --prod
```

## Troubleshooting

### Build Failures

```bash
# Check build locally
npm run build

# View Vercel logs
vercel logs --prod --follow
```

### Function Timeout

Increase maxDuration in `vercel.json`:
```json
"functions": {
  "server/**/*.ts": {
    "maxDuration": 120
  }
}
```

### Environment Variable Not Available

1. Verify variable is set in Vercel dashboard
2. Use `NEXT_PUBLIC_` prefix for client-side variables
3. Redeploy after adding variables

## Rollback

```bash
# View deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-id>
```

## Cost Optimization

- Use Vercel's caching headers
- Configure CloudFront for static assets
- Monitor bandwidth usage
- Set appropriate memory limits for functions

## Next Steps

1. ✅ Deploy web app to Vercel
2. ⬜ Deploy Flutter app to App Stores
3. ⬜ Setup monitoring and alerts
4. ⬜ Configure CDN caching
5. ⬜ Setup backup strategies
