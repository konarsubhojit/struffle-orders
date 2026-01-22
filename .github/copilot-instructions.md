# Struffle Orders - Project Instructions

## Overview

This is an order management web application built with Next.js 16 for a bakery/restaurant business. It allows users to:

- Create, manage, and track customer orders
- Manage inventory items with designs and categories
- View sales analytics and reports
- Handle customer feedback
- Bulk import/export orders
- Track audit logs for all operations

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **UI**: Material-UI v6 (MUI)
- **Database**: PostgreSQL with Drizzle ORM v0.45
- **Auth**: NextAuth.js
- **State**: TanStack React Query v5
- **Styling**: CSS Modules + MUI theming

## Project Structure

```
app/                     # Next.js App Router pages
├── api/                 # API route handlers
│   ├── audit-logs/      # Audit log endpoints
│   ├── categories/      # Category CRUD endpoints
│   ├── feedbacks/       # Customer feedback endpoints
│   ├── items/           # Inventory item endpoints
│   ├── orders/          # Order CRUD + import/export
│   ├── reports/         # Report generation endpoints
│   ├── tags/            # Tag CRUD endpoints
│   └── users/           # User management endpoints
├── admin/               # Admin pages
├── dashboard/           # Dashboard page
├── items/               # Item management pages
├── orders/              # Order management pages
└── sales/               # Sales analytics page

components/              # React components
├── admin/               # Admin-specific components
│   ├── AdminPage.tsx    # Main admin page with tabs
│   ├── CategoriesManager.tsx  # Category tree management
│   ├── TagsManager.tsx  # Tag management with colors
│   ├── AuditLogsViewer.tsx    # Audit log table
│   ├── BulkOrderOperations.tsx # Import/export UI
│   └── ExportReports.tsx      # Report generation UI
├── analytics/           # Analytics components
├── common/              # Shared components
├── items/               # Item management components
├── orders/              # Order components
│   └── OrderAuditTrail.tsx    # Order history timeline

hooks/
├── domain/              # Domain-specific hooks
├── queries/             # React Query hooks
│   ├── useCategoriesQueries.ts
│   ├── useTagsQueries.ts
│   ├── useAuditLogsQueries.ts
│   └── ...
├── mutations/           # Mutation hooks
└── utils/               # Utility hooks

lib/
├── db/                  # Database layer
│   └── schema.ts        # Drizzle schema definitions
├── models/              # Data models (Category, Tag, AuditLog)
├── services/            # Business logic services
│   ├── importExportService.ts  # Bulk import/export
│   └── excelExportService.ts   # Report generation
├── utils/               # Utility functions
│   └── dateUtils.ts     # Date formatting
└── queryKeys.ts         # React Query key definitions

types/
├── entities.ts          # TypeScript entity interfaces
├── brandedIds.ts        # Branded ID types (OrderId, ItemId)
└── index.ts             # Type exports
```

## Key Features

### Bulk Order Import/Export
- CSV file upload with preview
- Template download
- Export with date range filters
- Progress tracking via import/export jobs

### Item Categories & Tags
- Hierarchical categories with parent-child relationships
- Color-coded tags for item organization
- Tree view for category management

### Report Generation
- Multiple report types: orders, sales summary, audit logs
- Export formats: CSV, TSV, HTML, XLS
- Date range filtering

### Audit Logs
- Comprehensive logging of all CRUD operations
- Entity-specific audit trails (orders, items, categories, etc.)
- User tracking with email/name
- Previous/new data snapshots

### Order Audit Trail
- Timeline view of order changes
- Shows status changes, field updates, user info
- Visual timeline using custom Box-based layout

## Database Schema

Key tables added for new features:

- `categories` - Hierarchical categories with parent_id
- `tags` - Color-coded tags
- `item_categories` - Many-to-many item-category junction
- `item_tags` - Many-to-many item-tag junction
- `audit_logs` - System-wide audit log
- `order_audit` - Order-specific audit trail
- `import_export_jobs` - Bulk operation tracking

## API Patterns

### Route Handler Structure
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  // ... logic
}
```

### Query Key Structure
```typescript
queryKeys.categories.all       // ['categories']
queryKeys.categories.list()    // ['categories', 'list']
queryKeys.categories.detail(1) // ['categories', 'detail', '1']
queryKeys.auditLogs.list(filters) // ['auditLogs', 'list', filters]
```

## Coding Conventions

- Use TypeScript strictly - minimize `any` types
- Use branded ID types (OrderId, ItemId) for type safety
- Components use Material-UI with sx prop for styling
- All hooks in `hooks/` directory with appropriate subdirectories
- API routes follow RESTful conventions
- Use `executeWithRetry` for database operations

## Database Schema Best Practices (January 2026 Optimization)

The schema was optimized following PostgreSQL best practices:

### Key Optimizations Applied

1. **Timezone-aware timestamps** - All `timestamp` columns now use `{ withTimezone: true }`
2. **Proper enums** - Status fields (`status`, `paymentStatus`, `deliveryStatus`, etc.) use PostgreSQL enums instead of text
3. **JSONB for JSON data** - `auditLogs.previousData`, `newData`, `changedFields`, `metadata` and `importExportJobs.errors` use `jsonb` type
4. **inet for IP addresses** - `auditLogs.ipAddress` uses PostgreSQL `inet` type
5. **Boolean for boolean fields** - `feedbacks.isPublic` and `feedbackTokens.used` use `boolean` (not integer)
6. **bigserial for high-volume tables** - `auditLogs`, `orderAuditTrail`, `stockTransactions` use `bigserial` PKs
7. **Composite primary keys** - `itemCategories` and `itemTags` use composite PKs (no surrogate `id`)
8. **Missing foreign keys added** - `orders.customerIdRef` → `customers.id`, `categories.parentId` → `categories.id` (self-ref)
9. **Check constraints** - Rating ranges (1-5), positive quantities, non-negative stock, priority range (0-10)
10. **Partial indexes** - Soft-delete patterns (`items_active_idx`), public feedbacks, unused tokens
11. **Composite indexes** - Dashboard query patterns (`status + createdAt`), cursor pagination
12. **Removed redundant indexes** - Unique constraints already create indexes

### New Enums Added
- `paymentStatusEnum` - 'unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'
- `confirmationStatusEnum` - 'unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'
- `deliveryStatusEnum` - 'not_shipped', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned'
- `digestStatusEnum` - 'pending', 'started', 'running', 'sent', 'completed', 'failed'
- `jobTypeEnum` - 'import', 'export'
- `jobStatusEnum` - 'pending', 'processing', 'completed', 'failed'
- `stockReferenceTypeEnum` - 'order', 'manual', 'return', 'adjustment'

### Migration Required
Run `lib/db/migrations/0001_schema_optimization.sql` to:
- Create `updated_at` trigger function
- Apply triggers to all tables with `updatedAt`
- Analyze tables for query planner optimization

## Recent Changes (January 2026)

### New Features Added
1. **Bulk Order Operations** - `/api/orders/bulk-update`, `/api/orders/bulk-delete`
2. **Order Notes/Timeline** - `OrderNotesPanel.tsx`, `/api/orders/[id]/notes`
3. **Customer CRM** - Full customer management with autocomplete
4. **Stock/Inventory Management** - Quantity tracking, low stock alerts
5. **Profit Margin Tracking** - Cost tracking and margin analytics
6. **Advanced Analytics** - Trends, top items, top customers, profit analysis

### New Database Tables
- `customers` - Customer CRM with contact info, order stats
- `order_notes` - Internal/customer/system notes per order
- `stock_transactions` - Stock movement history

### New Columns on Existing Tables
- `items`: stockQuantity, lowStockThreshold, trackStock, costPrice, supplierName, supplierSku, updatedAt
- `order_items`: costPrice (snapshot at order time), createdAt, updatedAt
- `orders`: customerIdRef (FK to customers), updatedAt
- `/api/orders/[id]/notes` (GET, POST) - Order notes CRUD
- `/api/orders/[id]/notes/[noteId]` (GET, PUT, DELETE)
- `/api/customers` (GET, POST) - Customer list/create
- `/api/customers/[id]` (GET, PUT, DELETE)
- `/api/customers/search` (GET) - Autocomplete search
- `/api/customers/[id]/orders` (GET) - Customer order history
- `/api/stock` (GET) - Inventory with stock info
- `/api/stock/low` (GET) - Low stock alerts
- `/api/items/[id]/stock` (GET, POST) - Item stock info/adjustment
- `/api/items/[id]/stock/history` (GET) - Stock transaction history
- `/api/analytics/profit` (GET) - Profit margin analytics
- `/api/analytics/trends` (GET) - Sales trends by day/week/month
- `/api/analytics/top-items` (GET) - Top selling items
- `/api/analytics/top-customers` (GET) - Top customers

### New Components
- `components/orders/OrderNotesPanel.tsx` - Notes management
- `components/orders/BulkOrderToolbar.tsx` - Bulk operations UI
- `components/customers/CustomerManager.tsx` - Customer list page
- `components/customers/CustomerDialog.tsx` - Create/edit customer
- `components/customers/CustomerAutocomplete.tsx` - Search autocomplete
- `components/inventory/StockManager.tsx` - Inventory management
- `components/inventory/StockAdjustmentDialog.tsx` - Stock adjustment
- `components/inventory/LowStockAlert.tsx` - Dashboard alert
- `components/inventory/StockHistoryDialog.tsx` - Transaction history
- `components/analytics/ProfitAnalytics.tsx` - Profit margins
- `components/analytics/SalesTrends.tsx` - Trend charts
- `components/analytics/TopItemsChart.tsx` - Top items
- `components/analytics/TopCustomersChart.tsx` - Top customers
- `components/analytics/AnalyticsDashboard.tsx` - Combined dashboard

### New Models
- `lib/models/OrderNote.ts` - Order notes CRUD
- `lib/models/Customer.ts` - Customer CRM operations
- `lib/models/Stock.ts` - Stock management

### New React Query Hooks
- `useOrderNotesQueries.ts` - Order notes hooks
- `useCustomersQueries.ts` - Customer CRM hooks
- `useStockQueries.ts` - Stock/inventory hooks
- `useBulkOrderQueries.ts` - Bulk operations hooks
- `useAnalyticsQueries.ts` - Advanced analytics hooks
