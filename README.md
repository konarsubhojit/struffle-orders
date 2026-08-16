# Next.js Order Management System

A full-stack order management application built with Next.js 16, featuring complete feature parity with the React/Vite frontend plus improvements.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The app runs on **http://localhost:3000**

## ✨ Features

### Order Management
- Create orders with multiple items
- View order history with pagination
- Duplicate existing orders
- Priority notifications for urgent orders
- Order filtering and search

### Item Management
- Browse items with infinite scroll
- Create items with image upload
- Copy existing items
- Manage soft-deleted items
- Restore deleted items

### Analytics & Reports
- Sales reports with time-based filtering
- Customer feedback management
- Priority order tracking

### Authentication
- Google OAuth login via NextAuth.js
- **Guest mode** (view-only access)
- Session management

### Offline order entry
- Installable PWA with an app-shell cache
- Orders and items queue in IndexedDB during temporary outages
- Automatic Background Sync where supported, reconnect fallback elsewhere
- Visible pending/conflict status and a manual retry action

## 🗂️ Project Structure

```
next/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (24 endpoints)
│   ├── orders/              # Order pages
│   ├── items/               # Item pages
│   ├── sales/               # Sales analytics
│   ├── feedback/            # Customer feedback
│   └── login/               # Login page
├── components/              # React components
│   ├── orders/             # Order components
│   ├── items/              # Item components
│   ├── analytics/          # Analytics components
│   └── common/             # Shared components
├── hooks/                   # Custom React hooks
│   ├── queries/            # TanStack Query hooks
│   └── mutations/          # TanStack Mutation hooks
├── lib/                     # Utilities and configs
│   ├── api/                # API client
│   ├── db/                 # Database connection
│   ├── models/             # Data models
│   └── utils/              # Helper functions
├── contexts/               # React Context providers
└── types/                  # TypeScript type definitions
```

## 🛣️ Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/orders/create` |
| `/login` | Login with Google or guest mode |
| `/orders/create` | Create new order |
| `/orders/history` | View order history |
| `/items/browse` | Browse all items |
| `/items/create` | Create new item |
| `/items/deleted` | Manage deleted items |
| `/sales` | Sales analytics |
| `/feedback` | Customer feedback |

## 🔧 Tech Stack

- **Framework**: Next.js 16 with App Router
- **React**: 19.2.1
- **TypeScript**: Full type coverage
- **UI**: Material-UI v6
- **State Management**: TanStack React Query
- **Auth**: NextAuth.js with Google OAuth
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Storage**: Cloudflare R2 or Vercel Blob through a reversible provider interface
- **Email**: Resend or SMTP
- **Styling**: Emotion CSS-in-JS
- **Caching**: Redis with stale-while-revalidate strategy

## ⚡ Performance Optimizations

### Recent Optimizations (December 2025)

The application has been optimized for maximum performance and scalability:

1. **Stale-While-Revalidate Caching** 
   - Instant response times (~1-5ms for cached data)
   - Background cache revalidation
   - 95%+ reduction in API response time for cached requests

2. **Cursor Pagination**
   - Scalable pagination for large datasets
   - Hybrid support (cursor + offset) for backward compatibility
   - Efficient keyset pagination (O(log n) vs O(n))

3. **Optimized React Query**
   - 5-minute stale time for better cache utilization
   - Reduced unnecessary refetches
   - ~50% reduction in API calls

4. **Error Boundaries**
   - Graceful error handling on all routes
   - User-friendly error messages
   - Clear recovery paths

5. **Image Optimization**
   - Lazy loading on all images
   - Next.js Image component for optimization
   - Vercel Blob Storage with CDN

### Performance Metrics

| Metric | Value | Description |
|--------|-------|-------------|
| Build Time | ~9s | Fast builds with Turbopack |
| Cache Hit Response | 1-5ms | Redis-cached responses |
| Cache Miss Response | 50-200ms | Fresh database queries |
| Stale Response | 1-5ms | Stale data while revalidating |
| Cache Hit Ratio | 70-80% | Expected with optimizations |

### Cache Strategy

```
Request Flow:
1. Check fresh cache (5 min TTL) → Return immediately if hit
2. Check stale cache (15 min TTL) → Return stale + refresh in background
3. Query database → Cache both fresh and stale data
```

### API Response Headers

All cached endpoints include proper cache headers:
```http
Cache-Control: public, max-age=300, stale-while-revalidate=600
X-Cache: HIT | MISS | STALE
```

For more details, see:
- `OPTIMIZATION_IMPLEMENTATION_REPORT.md` - Complete implementation details
- `PERFORMANCE_OPTIMIZATION_REPORT.md` - Original recommendations

## 📦 Environment Variables

Create `.env.local`:

```env
# API
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_VERSION=2.0.0

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Development (disable auth for testing)
AUTH_DISABLED=true
NODE_ENV=development

# Database
NEON_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Redis (optional)
REDIS_URL=
```

## 🧪 Development

```bash
# Start dev server
npm run dev

# Build app
npm run build

# Run linter
npx eslint .

# Type check
npm run typecheck
```

## 📚 Key Features

### TanStack React Query
- Efficient data fetching and caching
- Automatic background refetching
- Optimistic updates
- Query invalidation

### File-Based Routing
- Clean URLs (`/orders/create`)
- Deep linking support
- URL parameters for state
- Browser navigation works

### Guest Mode
- View-only access without login
- Click "Continue as Guest" on login page
- No authentication required

## 🔗 API Endpoints

24 API routes migrated from Express:

- **Items**: 7 endpoints (CRUD, soft delete, restore)
- **Orders**: 5 endpoints (CRUD, priority)
- **Feedbacks**: 9 endpoints (CRUD, tokens, public)
- **Analytics**: 1 endpoint (sales data)
- **Digest**: 1 endpoint (email digest)
- **Health**: 1 endpoint (health check)

## 📖 Additional Documentation

- `API_DOCUMENTATION.md` - Detailed API reference
- `DASHBOARD_README.md` - Comprehensive usage guide
- `FEATURE_COMPARISON.md` - Feature parity comparison

## 🎯 Improvements Over React/Vite

1. **Better Routing** - Clean URLs instead of state-based
2. **Unified Backend** - API routes in same app
3. **Deep Linking** - Share direct links to orders/items
4. **Better SEO** - Server-side rendering ready
5. **Modern Stack** - Latest Next.js 16 features

## 🚢 Deployment

### Scheduled digest

Set `DIGEST_SECRET` and the Resend variables in the app. In GitHub, add repository
secrets `DIGEST_URL` (the deployed app origin) and `DIGEST_SECRET`. The
`Scheduled Sales Digest` workflow runs daily at 03:30 UTC and can be run
manually. Set the `DIGEST_PERIOD` repository variable to `daily` or `weekly`.
Runs in the same period are deduplicated in PostgreSQL.

If email is not configured, the endpoint returns a successful `skipped` result
without marking the period as sent.

### Offline limits

The PWA caches the shell and recently viewed item/order API responses on the
current device. Create requests are queued, but edits and deletes still require
a connection. Keep the page installed or revisit it after reconnecting on
browsers without Background Sync. Conflicts remain in the queue with their data
intact until the source item is restored or the operation is corrected.

### R2 migration and rollback

1. Create a public R2 bucket and configure all `R2_*` variables.
2. Preview the copy with `npm run storage:migrate -- --dry-run`.
3. Run `npm run storage:migrate`. It skips same-sized objects already in R2 and
   verifies every copied object; Vercel source objects are never deleted.
4. Set `STORAGE_PROVIDER=r2`. Missing R2 objects fall back to Vercel Blob and
   are logged.

To roll back, set `STORAGE_PROVIDER=vercel`; no database rewrite or reverse
migration is required. Retain `BLOB_READ_WRITE_TOKEN` during the dual-read
window.

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t order-management .
docker run -p 3000:3000 order-management
```

### Manual
```bash
npm run build
npm start
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

---

**Status**: Production Ready ✅
**Version**: 2.0.0
**Build**: Passing ✅
