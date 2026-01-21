'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

interface ProgressBarWithLabelProps {
  value: number;
  maxValue: number;
  label: string;
  sublabel?: string;
  valueLabel: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  height?: number;
  isHighlighted?: boolean;
  emoji?: string;
}

/**
 * Reusable progress bar with label component
 * Shows a progress bar with main label, value label, and optional sublabel
 */
function ProgressBarWithLabel({
  value,
  maxValue,
  label,
  sublabel,
  valueLabel,
  color = 'primary',
  height = 20,
  isHighlighted = false,
  emoji
}: ProgressBarWithLabelProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="body2" fontWeight={isHighlighted ? 600 : 400}>
          {label} {isHighlighted && emoji}
        </Typography>
        {sublabel && (
          <Typography variant="body2" color="text.secondary">
            {sublabel}
          </Typography>
        )}
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={percentage}
            sx={{ 
              height, 
              borderRadius: 1,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: `${color}.main`,
              }
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ minWidth: 70 }}>
          {valueLabel}
        </Typography>
      </Box>
    </Box>
  );
}

export default ProgressBarWithLabel;
