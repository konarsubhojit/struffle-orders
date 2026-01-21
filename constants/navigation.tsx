import type { ReactElement } from 'react';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FeedbackIcon from '@mui/icons-material/Feedback';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export interface NavigationRoute {
  id: string
  label: string
  icon: ReactElement
  group: string
}

export interface NavigationGroup {
  id: string
  label: string
  routes: NavigationRoute[]
}

/**
 * Navigation route constants for state-based routing.
 * These IDs are used to identify different pages/views in the application
 * without using React Router (maintaining Vercel compatibility).
 * 
 * @example
 * ```tsx
 * setCurrentRoute(NAVIGATION_ROUTES.CREATE_ORDER)
 * ```
 */
export const NAVIGATION_ROUTES = {
  // Orders
  CREATE_ORDER: 'create-order',
  ORDER_HISTORY: 'order-history',
  
  // Items
  BROWSE_ITEMS: 'browse-items',
  CREATE_ITEM: 'create-item',
  MANAGE_DELETED_ITEMS: 'manage-deleted-items',
  
  // Analytics
  SALES_REPORT: 'sales-report',
  CUSTOMER_FEEDBACK: 'customer-feedback',
  
  // Admin
  ADMIN_PANEL: 'admin-panel',
} as const

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'orders',
    label: 'Orders',
    routes: [
      {
        id: NAVIGATION_ROUTES.CREATE_ORDER,
        label: 'Create Order',
        icon: <AddShoppingCartIcon />,
        group: 'orders',
      },
      {
        id: NAVIGATION_ROUTES.ORDER_HISTORY,
        label: 'Order History',
        icon: <HistoryIcon />,
        group: 'orders',
      },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    routes: [
      {
        id: NAVIGATION_ROUTES.BROWSE_ITEMS,
        label: 'Browse Items',
        icon: <InventoryIcon />,
        group: 'items',
      },
      {
        id: NAVIGATION_ROUTES.CREATE_ITEM,
        label: 'Create Item',
        icon: <AddCircleIcon />,
        group: 'items',
      },
      {
        id: NAVIGATION_ROUTES.MANAGE_DELETED_ITEMS,
        label: 'Manage Deleted Items',
        icon: <DeleteOutlineIcon />,
        group: 'items',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    routes: [
      {
        id: NAVIGATION_ROUTES.SALES_REPORT,
        label: 'Sales Report',
        icon: <AssessmentIcon />,
        group: 'analytics',
      },
      {
        id: NAVIGATION_ROUTES.CUSTOMER_FEEDBACK,
        label: 'Customer Feedback',
        icon: <FeedbackIcon />,
        group: 'analytics',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    routes: [
      {
        id: NAVIGATION_ROUTES.ADMIN_PANEL,
        label: 'Admin Panel',
        icon: <AdminPanelSettingsIcon />,
        group: 'admin',
      },
    ],
  },
]
