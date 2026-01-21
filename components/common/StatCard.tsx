'use client';

import { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  color?: string;
  bgcolor?: string;
  borderColor?: string;
}

/**
 * Reusable statistic card component
 * Displays a value with label and optional icon
 */
function StatCard({ 
  value, 
  label, 
  icon, 
  color = 'primary',
  bgcolor,
  borderColor
}: StatCardProps) {
  return (
    <Card 
      sx={{ 
        height: '100%',
        ...(bgcolor && { bgcolor }),
        ...(borderColor && { border: '2px solid', borderColor })
      }}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        {icon && <Box sx={{ color: `${color}.main`, mb: 1 }}>{icon}</Box>}
        <Typography variant="h4" fontWeight={700} color={`${color}.main`}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default StatCard;
