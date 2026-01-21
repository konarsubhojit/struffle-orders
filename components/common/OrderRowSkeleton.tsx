'use client';

import { ReactElement } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Skeleton from '@mui/material/Skeleton';

/**
 * Skeleton loader for order table rows while loading more orders
 * Matches the structure of OrderHistoryTableHeader (9 columns)
 */
export default function OrderRowSkeleton(): ReactElement {
  return (
    <TableRow>
      {/* Order ID */}
      <TableCell>
        <Skeleton variant="text" />
      </TableCell>
      {/* Customer Name */}
      <TableCell>
        <Skeleton variant="text" />
        <Skeleton variant="text" width="60%" />
      </TableCell>
      {/* Order Source */}
      <TableCell>
        <Skeleton variant="rounded" width={80} height={24} />
      </TableCell>
      {/* Confirmation Status */}
      <TableCell>
        <Skeleton variant="rounded" width={90} height={24} />
      </TableCell>
      {/* Status */}
      <TableCell>
        <Skeleton variant="rounded" width={80} height={24} />
      </TableCell>
      {/* Payment Status */}
      <TableCell>
        <Skeleton variant="rounded" width={90} height={24} />
      </TableCell>
      {/* Delivery Status */}
      <TableCell>
        <Skeleton variant="rounded" width={90} height={24} />
      </TableCell>
      {/* Total Price */}
      <TableCell align="right">
        <Skeleton variant="text" />
      </TableCell>
      {/* Expected Delivery Date */}
      <TableCell>
        <Skeleton variant="text" />
        <Skeleton variant="rounded" width={70} height={24} sx={{ mt: 0.5 }} />
      </TableCell>
    </TableRow>
  );
}
