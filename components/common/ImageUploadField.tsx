'use client';

import { ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';

interface ImageUploadFieldProps {
  id: string;
  imagePreview: string;
  imageProcessing: boolean;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  label?: string;
}

/**
 * Reusable image upload field component
 * Displays upload button and image preview with remove functionality
 */
function ImageUploadField({
  id,
  imagePreview,
  imageProcessing,
  onImageChange,
  onClearImage,
  label = 'Item Image (Max size: 5MB, auto-compressed)'
}: ImageUploadFieldProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={imageProcessing ? <CircularProgress size={16} /> : <ImageIcon />}
          disabled={imageProcessing}
        >
          {imageProcessing ? 'Processing...' : 'Upload Image'}
          <input
            id={id}
            type="file"
            accept="image/*"
            onChange={onImageChange}
            hidden
          />
        </Button>
        {imagePreview && (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Box
              component="img"
          loading="lazy"
              src={imagePreview}
              alt="Preview"
              sx={{ 
                width: 80, 
                height: 80, 
                objectFit: 'cover', 
                borderRadius: 1,
                border: '2px solid',
                borderColor: 'grey.300',
              }}
            />
            <IconButton
              size="small"
              onClick={onClearImage}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': { bgcolor: 'error.dark' },
              }}
              aria-label="Remove image"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ImageUploadField;
