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

## Recent Changes (July 2025)

### Added Features
1. **Bulk Order Import/Export** - `BulkOrderOperations.tsx`, `/api/orders/import`, `/api/orders/export`
2. **Categories & Tags** - Full CRUD with tree view and color picker
3. **Report Export** - Multi-format report generation
4. **Audit Logs** - System-wide logging with viewer component
5. **Order Audit Trail** - Timeline component for order history

### New Components
- `components/admin/CategoriesManager.tsx`
- `components/admin/TagsManager.tsx`
- `components/admin/AuditLogsViewer.tsx`
- `components/admin/BulkOrderOperations.tsx`
- `components/admin/ExportReports.tsx`
- `components/orders/OrderAuditTrail.tsx`

### New API Routes
- `/api/categories` (GET, POST)
- `/api/categories/[id]` (GET, PUT, DELETE)
- `/api/tags` (GET, POST)
- `/api/tags/[id]` (GET, PUT, DELETE)
- `/api/audit-logs` (GET)
- `/api/audit-logs/recent` (GET)
- `/api/orders/[id]/audit` (GET)
- `/api/orders/import` (POST)
- `/api/orders/export` (GET)
- `/api/reports/export` (GET)

### Admin Page Tabs
The admin page now has 6 tabs:
1. Users - User management
2. Categories - Category tree management
3. Tags - Tag management
4. Import/Export - Bulk order operations
5. Reports - Report generation
6. Audit Logs - System audit log viewer
