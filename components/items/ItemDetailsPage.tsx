'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ImageIcon from '@mui/icons-material/Image';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useItemDetails, type ItemEditForm } from '@/hooks';
import { useImageProcessing } from '@/hooks';
import ImageUploadField from '../common/ImageUploadField';
import DesignManager, { type DesignImage } from './DesignManager';
import type { ItemId, ItemDesign } from '@/types';

interface ItemDetailsPageProps {
  itemId: ItemId;
  onBack: () => void;
  onItemUpdated: () => void;
}

function ItemDetailsPage({ itemId, onBack, onItemUpdated }: ItemDetailsPageProps) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  
  const {
    item,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    imagePreview,
    setError,
    setImagePreview,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  } = useItemDetails(itemId, showSuccess, showError, onItemUpdated);

  // Design management state
  const [existingDesigns, setExistingDesigns] = useState<ItemDesign[]>([]);
  const [newDesigns, setNewDesigns] = useState<DesignImage[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [designProcessing, setDesignProcessing] = useState(false);

  // Use image processing hook for edit form
  const {
    image: editImage,
    imagePreview: newImagePreview,
    imageProcessing: editImageProcessing,
    imageError: editImageError,
    setImage: setEditImage,
    setImagePreview: setNewImagePreview,
    handleImageChange: handleEditImageChangeRaw,
    clearImage: clearEditImage,
  } = useImageProcessing(showSuccess);

  // Fetch existing designs when item loads or when entering edit mode
  useEffect(() => {
    const fetchDesigns = async () => {
      if (!item?._id) return;
      
      setDesignsLoading(true);
      try {
        const response = await fetch(`/api/items/${item._id}/designs`);
        if (!response.ok) {
          throw new Error('Failed to fetch designs');
        }
        const designs = await response.json();
        setExistingDesigns(designs);
      } catch (err) {
        console.error('Error fetching designs:', err);
        showError('Failed to load design variants');
      } finally {
        setDesignsLoading(false);
      }
    };

    if (item) {
      fetchDesigns();
    }
  }, [item, showError]);

  const handleEditImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleEditImageChangeRaw(file);
    handleEditChange('removeImage', false);
  };

  const clearEditImageWrapper = () => {
    clearEditImage();
    handleEditChange('removeImage', true);
    // Reset the file input - using getElementById is acceptable here as it's a controlled operation
    const fileInput = document.getElementById('editItemImage') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDesignDelete = async (designId: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}/designs/${designId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete design');
      }
      
      setExistingDesigns(prev => prev.filter(d => d.id !== designId));
      showSuccess('Design deleted successfully');
      onItemUpdated();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleDesignPrimary = async (designId: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}/designs/${designId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set primary design');
      }
      
      setExistingDesigns(prev => prev.map(d => ({
        ...d,
        isPrimary: d.id === designId
      })));
      showSuccess('Primary design updated');
      onItemUpdated();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update primary design');
    }
  };

  const handleSaveClick = async () => {
    try {
      // Save the item changes first
      await handleSave(editImage);
      
      // Upload new designs if any (in parallel for better performance)
      if (newDesigns.length > 0 && item?._id) {
        const uploadPromises = newDesigns.map(design =>
          fetch(`/api/items/${item._id}/designs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              designName: design.name,
              image: design.imageData,
              isPrimary: design.isPrimary,
              displayOrder: 0
            })
          }).then(async response => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                message: `Upload failed with HTTP ${response.status}` 
              }));
              throw new Error(`Failed to upload design "${design.name}": ${errorData.message}`);
            }
            return response.json();
          })
        );

        await Promise.all(uploadPromises);
        
        // Refresh designs after upload with error handling
        try {
          const response = await fetch(`/api/items/${item._id}/designs`);
          if (response.ok) {
            const designs = await response.json();
            setExistingDesigns(designs);
          }
        } catch (err) {
          console.error('Failed to refresh designs:', err);
          // Don't show error to user as the designs were uploaded successfully
        }
        
        showSuccess(`Item updated with ${newDesigns.length} new design${newDesigns.length > 1 ? 's' : ''}`);
        onItemUpdated();
      }
      
      // Clear the new design and image state after save
      setNewDesigns([]);
      setEditImage('');
      setNewImagePreview('');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Item Details
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error && !item) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Item Details
          </Typography>
        </Box>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!item) {
    return null;
  }

  // Determine which image preview to show in edit mode
  const currentImagePreview = newImagePreview || (editForm.removeImage ? '' : imagePreview);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" component="h2" fontWeight={600}>
              {item.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatPrice(item.price)}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          {!isEditing && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={startEditing}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Content */}
      {isEditing ? (
        <Box component="form" id="item-edit-form" onSubmit={(e) => e.preventDefault()}>
          <Stack spacing={3}>
            {/* Image Section */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Item Image
              </Typography>
              <ImageUploadField
                id="editItemImage"
                imagePreview={currentImagePreview}
                imageProcessing={editImageProcessing}
                onImageChange={handleEditImageChange}
                onClearImage={clearEditImageWrapper}
              />
            </Box>

            <Divider />

            {/* Basic Information */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Basic Information
              </Typography>
              <Stack spacing={2} mt={1}>
                <TextField
                  label="Item Name"
                  value={editForm.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  placeholder="Enter item name"
                  fullWidth
                  required
                />
                
                <TextField
                  label="Price"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  value={editForm.price}
                  onChange={(e) => handleEditChange('price', e.target.value)}
                  placeholder="Enter price"
                  fullWidth
                  required
                />
              </Stack>
            </Box>

            <Divider />

            {/* Additional Details */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Details
              </Typography>
              <Stack spacing={2} mt={1}>
                <TextField
                  label="Color"
                  value={editForm.color}
                  onChange={(e) => handleEditChange('color', e.target.value)}
                  placeholder="e.g., Red, Blue, Multi-color"
                  fullWidth
                />

                <TextField
                  label="Fabric"
                  value={editForm.fabric}
                  onChange={(e) => handleEditChange('fabric', e.target.value)}
                  placeholder="e.g., Cotton, Silk, Polyester"
                  fullWidth
                />

                <TextField
                  label="Special Features"
                  value={editForm.specialFeatures}
                  onChange={(e) => handleEditChange('specialFeatures', e.target.value)}
                  placeholder="e.g., Handmade, Embroidered, Washable"
                  fullWidth
                  multiline
                  rows={2}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Design Variants */}
            {item && (
              <Box>
                {designsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <DesignManager
                    itemId={item._id}
                    existingDesigns={existingDesigns}
                    newDesigns={newDesigns}
                    onNewDesignsChange={setNewDesigns}
                    onExistingDesignDelete={handleDesignDelete}
                    onExistingDesignPrimary={handleDesignPrimary}
                    onProcessing={setDesignProcessing}
                  />
                )}
              </Box>
            )}

            {editImageError && (
              <Alert severity="error">
                {editImageError}
              </Alert>
            )}
          </Stack>

          {/* Edit Actions */}
          <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
            <Button onClick={handleCancelEdit} color="inherit">
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleSaveClick}
              disabled={saving || editImageProcessing || designProcessing}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* Image Section */}
          {item.imageUrl ? (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Item Image
              </Typography>
              <CardMedia
                component="img"
          loading="lazy"
                image={item.imageUrl}
                alt={item.name}
                sx={{ 
                  maxWidth: '100%',
                  maxHeight: 400,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Item Image
              </Typography>
              <Box 
                sx={{ 
                  height: 200, 
                  bgcolor: 'grey.100', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ImageIcon sx={{ fontSize: 64, color: 'grey.400' }} />
              </Box>
            </Box>
          )}

          <Divider />

          {/* Basic Information */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={1.5} mt={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {item.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="body1" fontWeight={500} color="primary">
                  {formatPrice(item.price)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Additional Details */}
          {(item.color || item.fabric || item.specialFeatures) && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Additional Details
                </Typography>
                <Stack spacing={1.5} mt={1}>
                  {item.color && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Color
                      </Typography>
                      <Typography variant="body1">
                        {item.color}
                      </Typography>
                    </Box>
                  )}
                  {item.fabric && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fabric
                      </Typography>
                      <Typography variant="body1">
                        {item.fabric}
                      </Typography>
                    </Box>
                  )}
                  {item.specialFeatures && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Special Features
                      </Typography>
                      <Typography variant="body1">
                        {item.specialFeatures}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
              <Divider />
            </>
          )}

          <Divider />

          {/* Design Variants Display (View Mode) */}
          {existingDesigns.length > 0 && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Design Variants
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  {existingDesigns.map((design) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={design.id}>
                      <Card variant="outlined">
                        <CardMedia
                          component="img"
                          loading="lazy"
                          height="120"
                          image={design.imageUrl}
                          alt={design.designName}
                          sx={{ objectFit: 'cover' }}
                        />
                        <Box sx={{ p: 1 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}
                            >
                              {design.designName}
                            </Typography>
                            {design.isPrimary && (
                              <Chip label="Primary" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Stack>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              <Divider />
            </>
          )}

          {/* Metadata */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Item Information
            </Typography>
            <Stack spacing={1.5} mt={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body2">
                  {new Date(item.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}

export default ItemDetailsPage;
