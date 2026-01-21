# API Tester - Project Instructions

## Overview

This is an API testing web application built with TanStack Start, similar to Postman but simplified. It allows users to:

- Make HTTP requests with different methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Configure request parameters, headers, body, and authentication
- Organize requests into collections
- Use environment variables with `{{variableName}}` substitution
- View request history
- Export/import data in native or Postman format

## Tech Stack

- **Framework**: TanStack Start (React 19 + TanStack Router + Vite 7)
- **Styling**: Tailwind CSS v4
- **Storage**: IndexedDB via `idb` library
- **State**: React hooks + local state (no Redux/Zustand)
- **UI Components**: Custom shadcn-style components in `src/components/ui/`

## Project Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (Button, Input, Tabs, Dialog, etc.)
│   ├── shared/          # Reusable components (KeyValueTable, CodeEditor, etc.)
│   ├── collections/     # Collection sidebar and tree components
│   ├── request/         # Request builder components
│   ├── response/        # Response viewer components
│   ├── history/         # Request history components
│   ├── environments/    # Environment variable components
│   ├── export-import/   # Export/import dialogs
│   └── layout/          # App layout components
├── hooks/
│   ├── useEnvironments.ts    # Environment state management
│   ├── useRequest.ts         # HTTP request execution
│   └── useRequestHistory.ts  # History management
├── lib/
│   ├── db/              # IndexedDB schema and CRUD operations
│   ├── types/           # TypeScript type definitions
│   ├── variables/       # Variable substitution logic
│   ├── export-import/   # Export/import utilities
│   ├── http-client.ts   # HTTP request building utilities
│   ├── auth-helpers.ts  # Auth header builders
│   ├── url-parser.ts    # URL parsing for auto-populating params
│   ├── date-utils.ts    # Date formatting utilities
│   └── utils.ts         # Tailwind class utilities
├── server/
│   └── functions/
│       └── proxy.ts     # Server function to proxy requests (CORS bypass)
└── routes/
    ├── __root.tsx       # Root layout
    └── index.tsx        # Main API tester page
```

## Key Features

### URL Auto-Parse
When pasting a URL with query parameters, they are automatically extracted and populated in the Params tab.

### Variable Substitution
Variables use `{{variableName}}` syntax. Resolution order (highest to lowest priority):
1. Collection variables
2. Active environment variables
3. Global variables

### Server-Side Proxy
API requests are proxied through a TanStack Start server function (`src/server/functions/proxy.ts`) to avoid CORS issues.

### Persistence
- Collections, requests, environments: IndexedDB
- History: IndexedDB (auto-pruned at 500 entries)
- Active environment: localStorage (for quick access)

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Adding New Features

1. **New UI components**: Add to `src/components/ui/`, export from `index.ts`
2. **New database operations**: Add to appropriate file in `src/lib/db/`
3. **New types**: Add to `src/lib/types/index.ts`
4. **New routes**: Add to `src/routes/`

## Coding Conventions

- Use TypeScript strictly - no `any` types
- Prefix unused variables with underscore (`_variables`)
- Use `cn()` utility for class name merging
- Components are function components with explicit return types
- Use `nanoid` for ID generation

## Important Patterns

### SSR Safety
All hooks that access browser-only APIs (IndexedDB, localStorage) must include SSR guards:
```typescript
if (typeof window === 'undefined') return
```

### Race Condition Prevention
Async operations in hooks should use:
1. `isMountedRef` to prevent setState on unmounted components
2. `fetchIdRef` to prevent stale updates from earlier requests

### Regex Safety
Never use module-level regex with the `g` flag. Create new instances inside functions to avoid race conditions:
```typescript
// Good: Create inside function
function extractVariables(text: string) {
  const pattern = /\{\{([^{}]+)\}\}/g
  // ...
}

// Bad: Module-level global regex
const PATTERN = /\{\{([^{}]+)\}\}/g
```

### Variable Pattern
The variable substitution pattern `{{variableName}}` is defined in `src/lib/variables/substitutor.ts`. Use `VARIABLE_PATTERN_STRING` for consistent regex creation across the codebase.

### UTF-8 Encoding
Use `safeBase64Encode()` from `auth-helpers.ts` instead of raw `btoa()` to handle non-ASCII characters.

### Component Memoization
For components that render in lists or trees, use `React.memo` with custom comparison functions:
```typescript
function propsAreEqual(
  prevProps: Readonly<ComponentProps>,
  nextProps: Readonly<ComponentProps>
): boolean {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected
    // Compare relevant props only
  )
}

export const MemoizedComponent = memo(Component, propsAreEqual)
```

### Collection Tree Virtualization
The collection tree (`src/components/collections/CollectionTree.tsx`) uses `@tanstack/react-virtual` for large lists:
- Virtualization activates when there are 50+ visible items
- Tree is flattened into a single array respecting expanded/collapsed state
- Each item tracks its depth for proper indentation
- Use `useMemo` for computed data structures (indexed maps, flattened trees)

### Shared Components
Reusable components live in `src/components/shared/`:
- `HighlightedInput`: Input that highlights `{{variable}}` patterns in orange
- `KeyValueTable`: Editable table for key-value pairs
- `CodeEditor`: Syntax-highlighted code editor
- `MethodBadge`/`StatusBadge`: HTTP method and status indicators
- `VariableInput`: Input with variable autocomplete

### Accessibility Patterns
All interactive elements must have accessible labels:
```typescript
// Use htmlFor to associate labels with inputs
<label htmlFor="input-id">Label</label>
<input id="input-id" />

// Use sr-only for screen reader only text
<label htmlFor="url" className="sr-only">Request URL</label>

// Use aria-label for elements without visible labels
<button aria-label="Delete row">×</button>

// Use role="radiogroup" with aria-checked for button groups
<div role="radiogroup">
  <button role="radio" aria-checked={selected === 'a'}>A</button>
</div>

// Tables need scope and aria-label
<table aria-label="HTTP Headers">
  <th scope="col">Header Name</th>
</table>
```
