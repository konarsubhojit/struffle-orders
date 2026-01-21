'use client';

import { useState, type ChangeEvent, type ReactElement } from 'react';
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
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import imageCompression from 'browser-image-compression';

export interface DesignImage {
  id: string;
  name: string;
  imageData: string;
  isPrimary: boolean;
}

interface MultipleDesignUploadProps {
  designs: DesignImage[];
  onDesignsChange: (designs: DesignImage[]) => void;
  onProcessing?: (processing: boolean) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

function MultipleDesignUpload({ 
  designs, 
  onDesignsChange,
  onProcessing 
}: MultipleDesignUploadProps): ReactElement {
  const [processing, setProcessing] = useState(false);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File size should be less than ${MAX_FILE_SIZE_MB}MB`);
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
        name: `Design ${designs.length + 1}`,
        imageData: base64,
        isPrimary: designs.length === 0
      };

      onDesignsChange([...designs, newDesign]);
    } catch (error) {
      console.error('Image compression failed:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
      if (onProcessing) onProcessing(false);
      e.target.value = '';
    }
  };

  const handleRemoveDesign = (id: string) => {
    const updatedDesigns = designs.filter(d => d.id !== id);
    
    if (updatedDesigns.length > 0) {
      const removedWasPrimary = designs.find(d => d.id === id)?.isPrimary;
      if (removedWasPrimary) {
        updatedDesigns[0].isPrimary = true;
      }
    }
    
    onDesignsChange(updatedDesigns);
  };

  const handleTogglePrimary = (id: string) => {
    const updatedDesigns = designs.map(d => ({
      ...d,
      isPrimary: d.id === id
    }));
    onDesignsChange(updatedDesigns);
  };

  const handleNameChange = (id: string, newName: string) => {
    const updatedDesigns = designs.map(d => 
      d.id === id ? { ...d, name: newName } : d
    );
    onDesignsChange(updatedDesigns);
  };

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

      {designs.length === 0 ? (
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
          {designs.map((design, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={design.id}>
              <Card variant="outlined">
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
                      label="Primary"
                      size="small"
                      color="primary"
                      icon={<StarIcon />}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={design.name}
                    onChange={(e) => handleNameChange(design.id, e.target.value)}
                    placeholder="Design name"
                    sx={{ mb: 1 }}
                  />
                  <CardActions sx={{ p: 0, gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={design.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                      onClick={() => handleTogglePrimary(design.id)}
                      disabled={design.isPrimary}
                      sx={{ flex: 1 }}
                    >
                      {design.isPrimary ? 'Primary' : 'Set Primary'}
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveDesign(design.id)}
                      disabled={designs.length === 1}
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

      {designs.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          {designs.length} design{designs.length > 1 ? 's' : ''} added.
          The primary design will be shown by default in order forms.
        </Typography>
      )}
    </Box>
  );
}

export default MultipleDesignUpload;
