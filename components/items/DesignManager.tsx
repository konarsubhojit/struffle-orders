'use client';

import { useState, useEffect, type ChangeEvent, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import imageCompression from 'browser-image-compression';
import { useNotification } from '@/contexts/NotificationContext';
import type { ItemDesign } from '@/types';

export interface DesignImage {
  id: string;
  name: string;
  imageData: string;
  isPrimary: boolean;
}

interface DesignManagerProps {
  itemId: number;
  existingDesigns?: ItemDesign[];
  newDesigns: DesignImage[];
  onNewDesignsChange: (designs: DesignImage[]) => void;
  onExistingDesignDelete?: (designId: number) => void;
  onExistingDesignPrimary?: (designId: number) => void;
  onProcessing?: (processing: boolean) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

function DesignManager({ 
  itemId,
  existingDesigns = [],
  newDesigns, 
  onNewDesignsChange,
  onExistingDesignDelete,
  onExistingDesignPrimary,
  onProcessing 
}: DesignManagerProps): ReactElement {
  const { showError } = useNotification();
  const [processing, setProcessing] = useState(false);
  const [deletingDesigns, setDeletingDesigns] = useState<Set<number>>(new Set());

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showError(`File size should be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setProcessing(true);
    if (onProcessing) onProcessing(true);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

      const newDesign: DesignImage = {
        id: `design-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: `Design ${existingDesigns.length + newDesigns.length + 1}`,
        imageData: base64,
        isPrimary: existingDesigns.length === 0 && newDesigns.length === 0
      };

      onNewDesignsChange([...newDesigns, newDesign]);
    } catch (error) {
      console.error('Image compression failed:', error);
      showError('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
      if (onProcessing) onProcessing(false);
      e.target.value = '';
    }
  };

  const handleRemoveNewDesign = (id: string) => {
    const updatedDesigns = newDesigns.filter(d => d.id !== id);
    
    if (updatedDesigns.length > 0) {
      const removedWasPrimary = newDesigns.find(d => d.id === id)?.isPrimary;
      if (removedWasPrimary && existingDesigns.length === 0) {
        updatedDesigns[0].isPrimary = true;
      }
    }
    
    onNewDesignsChange(updatedDesigns);
  };

  const handleToggleNewPrimary = (id: string) => {
    const updatedDesigns = newDesigns.map(d => ({
      ...d,
      isPrimary: d.id === id
    }));
    onNewDesignsChange(updatedDesigns);
  };

  const handleNewNameChange = (id: string, newName: string) => {
    const updatedDesigns = newDesigns.map(d => 
      d.id === id ? { ...d, name: newName } : d
    );
    onNewDesignsChange(updatedDesigns);
  };

  const handleExistingDelete = async (designId: number) => {
    if (!onExistingDesignDelete) return;
    if (!confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
      return;
    }

    setDeletingDesigns(prev => new Set(prev).add(designId));
    try {
      await onExistingDesignDelete(designId);
    } finally {
      setDeletingDesigns(prev => {
        const next = new Set(prev);
        next.delete(designId);
        return next;
      });
    }
  };

  const handleExistingPrimary = async (designId: number) => {
    if (!onExistingDesignPrimary) return;
    await onExistingDesignPrimary(designId);
  };

  const totalDesigns = existingDesigns.length + newDesigns.length;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={600}>
          Design Variants
        </Typography>
        <Button
          variant="outlined"
          size="small"
          component="label"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Add Design'}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleImageChange}
          />
        </Button>
      </Box>

      {totalDesigns === 0 ? (
        <Box 
          sx={{ 
            p: 3, 
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
            bgcolor: 'background.default'
          }}
        >
          <AddPhotoAlternateIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No designs added yet. Click &quot;Add Design&quot; to upload your first design variant.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {/* Existing designs */}
          {existingDesigns.map((design) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={design.id}>
              <Card variant="outlined">
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
          loading="lazy"
                    height="200"
                    image={design.imageUrl}
                    alt={design.designName}
                    sx={{ objectFit: 'cover' }}
                  />
                  {design.isPrimary && (
                    <Chip
                      label="Primary"
                      size="small"
                      color="primary"
                      icon={<StarIcon />}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {design.designName}
                  </Typography>
                  <CardActions sx={{ p: 0, mt: 1, gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={design.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                      onClick={() => handleExistingPrimary(design.id)}
                      disabled={design.isPrimary || deletingDesigns.has(design.id)}
                      sx={{ flex: 1 }}
                    >
                      {design.isPrimary ? 'Primary' : 'Set Primary'}
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleExistingDelete(design.id)}
                      disabled={deletingDesigns.has(design.id)}
                    >
                      {deletingDesigns.has(design.id) ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </CardActions>
                </Box>
              </Card>
            </Grid>
          ))}
          
          {/* New designs */}
          {newDesigns.map((design) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={design.id}>
              <Card variant="outlined" sx={{ border: '2px dashed', borderColor: 'primary.main' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
          loading="lazy"
                    height="200"
                    image={design.imageData}
                    alt={design.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  {design.isPrimary && (
                    <Chip
                      label="Primary (New)"
                      size="small"
                      color="primary"
                      icon={<StarIcon />}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                  <Chip
                    label="New"
                    size="small"
                    color="success"
                    sx={{ position: 'absolute', top: 8, left: 8 }}
                  />
                </Box>
                <Box sx={{ p: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={design.name}
                    onChange={(e) => handleNewNameChange(design.id, e.target.value)}
                    placeholder="Design name"
                    sx={{ mb: 1 }}
                  />
                  <CardActions sx={{ p: 0, gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={design.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                      onClick={() => handleToggleNewPrimary(design.id)}
                      disabled={design.isPrimary || existingDesigns.some(d => d.isPrimary)}
                      sx={{ flex: 1 }}
                    >
                      {design.isPrimary ? 'Primary' : 'Set Primary'}
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveNewDesign(design.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {totalDesigns > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          {existingDesigns.length} existing design{existingDesigns.length !== 1 ? 's' : ''}, 
          {' '}{newDesigns.length} new design{newDesigns.length !== 1 ? 's' : ''}.
          {' '}The primary design will be shown by default in order forms.
        </Typography>
      )}
    </Box>
  );
}

export default DesignManager;
