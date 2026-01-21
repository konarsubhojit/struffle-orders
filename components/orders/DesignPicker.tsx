'use client';

import { useEffect, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import type { ItemDesign } from '@/types/entities';

interface DesignPickerProps {
  designs: ItemDesign[];
  selectedDesignId?: number;
  onDesignSelect: (designId: number) => void;
}

/**
 * Enhanced Design Picker Component
 * 
 * Features modern UX patterns for product variant selection:
 * - Visual swatches with instant feedback
 * - Clear selection indicators
 * - Touch-friendly large buttons
 * - Responsive grid layout
 * - Accessible with keyboard navigation and screen readers
 * - Auto-selects primary design by default
 */
function DesignPicker({ 
  designs, 
  selectedDesignId, 
  onDesignSelect 
}: DesignPickerProps): ReactElement {
  // Auto-select primary design if no selection made (UX best practice)
  useEffect(() => {
    if (!selectedDesignId && designs.length > 0) {
      const primaryDesign = designs.find(d => d.isPrimary) || designs[0];
      onDesignSelect(primaryDesign.id);
    }
  }, [designs, selectedDesignId, onDesignSelect]);

  if (designs.length === 0) {
    return (
      <Box 
        sx={{ 
          p: 2.5, 
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1.5,
          textAlign: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No design variants available for this item
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600} color="text.primary">
          Select Design Variant
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({designs.length} option{designs.length !== 1 ? 's' : ''})
        </Typography>
      </Box>
      
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {designs.map((design) => {
          const isSelected = selectedDesignId === design.id;
          
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={design.id}>
              <Tooltip 
                title={`${design.designName}${design.isPrimary ? ' (Recommended)' : ''}`} 
                arrow 
                placement="top"
              >
                <Card 
                  variant={isSelected ? 'elevation' : 'outlined'}
                  sx={{
                    position: 'relative',
                    border: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'primary.50' : 'background.paper',
                    '&:hover': {
                      borderColor: isSelected ? 'primary.dark' : 'primary.light',
                      boxShadow: isSelected ? 4 : 2,
                      transform: 'translateY(-2px)'
                    },
                    '&:active': {
                      transform: 'translateY(0)'
                    }
                  }}
                >
                  <CardActionArea 
                    onClick={() => onDesignSelect(design.id)}
                    sx={{ 
                      height: '100%',
                      // Larger touch target for mobile (min 48px recommended)
                      minHeight: { xs: 140, sm: 160 }
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        loading="lazy"
                        height="120"
                        image={design.imageUrl}
                        alt={design.designName}
                        sx={{ 
                          objectFit: 'cover',
                          height: { xs: 100, sm: 120 }
                        }}
                      />
                      
                      {/* Selection indicator - prominent visual feedback */}
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 2,
                            animation: 'scaleIn 0.2s ease-out'
                          }}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </Box>
                      )}
                      
                      {/* Primary/Recommended indicator */}
                      {design.isPrimary && (
                        <Chip
                          label="Recommended"
                          size="small"
                          icon={<StarIcon sx={{ fontSize: 14 }} />}
                          color="primary"
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            height: 24,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            boxShadow: 1
                          }}
                        />
                      )}
                      
                      {/* Overlay for selected state */}
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'primary.main',
                            opacity: 0.08,
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </Box>
                    
                    <Box 
                      sx={{ 
                        p: { xs: 1, sm: 1.5 }, 
                        textAlign: 'center',
                        bgcolor: isSelected ? 'primary.50' : 'transparent'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        fontWeight={isSelected ? 600 : 500}
                        color={isSelected ? 'primary.main' : 'text.primary'}
                        sx={{ 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      >
                        {design.designName}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
      
      {/* Helper text for clarity */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
        Click on a design to select it. The selected design will be used for this order item.
      </Typography>
    </Box>
  );
}

export default DesignPicker;
