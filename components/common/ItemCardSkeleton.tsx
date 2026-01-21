'use client';

import { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/**
 * Skeleton loader for item cards while loading more items
 * Matches the structure of ItemCard component
 */
export default function ItemCardSkeleton(): ReactElement {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Image placeholder - matches ItemCard image height */}
      <Skeleton variant="rectangular" height={140} />
      
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Item name */}
        <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 1 }} />
        
        {/* Item price */}
        <Skeleton variant="text" width="40%" sx={{ fontSize: '1.25rem', mb: 1 }} />
        
        {/* Color and fabric chips */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
        </Stack>
      </CardContent>
      
      {/* Action buttons */}
      <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </CardActions>
    </Card>
  );
}
