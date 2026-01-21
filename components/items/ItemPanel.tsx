'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { createItem, deleteItem, updateItem, restoreItem, permanentlyDeleteItem } from '@/lib/api/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useUrlSync } from '@/hooks';
import { useItemForm } from '@/hooks';
import { useImageProcessing } from '@/hooks';
import { useItemsData } from '@/hooks';
import { useDeletedItems } from '@/hooks';
import { useInfiniteScroll } from '@/hooks';
import ImageUploadField from '../common/ImageUploadField';
import ItemCard from '../common/ItemCard';
import ItemCardSkeleton from '../common/ItemCardSkeleton';
import DesignManager, { type DesignImage } from './DesignManager';
import type { Item, ItemId, ItemDesign } from '@/types';

interface ItemPanelProps {
  onItemsChange: () => void;
}

interface EditingItemState extends Item {
  editName: string;
  editPrice: string;
  editColor: string;
  editFabric: string;
  editSpecialFeatures: string;
  removeImage: boolean;
}

function ItemPanel({ onItemsChange }: ItemPanelProps) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  
  // Use URL sync hook (only for deleted state now that pagination is removed)
  const { getBoolParam, updateUrl } = useUrlSync();
  
  // Use item form hook
  const {
    name,
    price,
    color,
    fabric,
    specialFeatures,
    copiedFrom,
    error: formError,
    setName,
    setPrice,
    setColor,
    setFabric,
    setSpecialFeatures,
    setError: setFormError,
    validateForm,
    getFormData,
    resetForm,
    setFormFromItem,
  } = useItemForm();
  
  // Use image processing hook for create form
  const {
    image,
    imagePreview,
    imageProcessing,
    imageError,
    handleImageChange: handleImageChangeRaw,
    clearImage,
    resetImage,
  } = useImageProcessing(showSuccess);
  
  // Use items data hook with infinite scroll
  const {
    items: activeItems,
    loading: loadingActive,
    loadingMore: loadingMoreActive,
    hasMore: hasMoreActive,
    error: activeError,
    search: activeSearch,
    searchInput: activeSearchInput,
    setSearchInput: setActiveSearchInput,
    handleSearch: handleActiveSearch,
    clearSearch: clearActiveSearch,
    loadMore: loadMoreActive,
    fetchItems: fetchActiveItems,
    setError: setActiveError,
  } = useItemsData();
  
  // Infinite scroll observer for active items
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMoreActive,
    loading: loadingMoreActive,
    hasMore: hasMoreActive,
  });
  
  // Deleted items state
  const [showDeleted, setShowDeleted] = useState(getBoolParam('deleted', false));
  
  // Use deleted items hook with infinite scroll
  const {
    deletedItems,
    loadingDeleted,
    loadingMoreDeleted,
    hasMoreDeleted,
    deletedSearch,
    deletedSearchInput,
    setDeletedSearchInput,
    handleDeletedSearch,
    clearDeletedSearch,
    loadMoreDeleted,
    fetchDeletedItems,
  } = useDeletedItems(showDeleted);
  
  // Infinite scroll observer for deleted items
  const loadMoreDeletedRef = useInfiniteScroll({
    onLoadMore: loadMoreDeleted,
    loading: loadingMoreDeleted,
    hasMore: hasMoreDeleted,
  });
  
  const [loading, setLoading] = useState(false);
  
  // Edit mode state
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Design management state for edit modal
  const [existingDesigns, setExistingDesigns] = useState<ItemDesign[]>([]);
  const [newDesigns, setNewDesigns] = useState<DesignImage[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [designProcessing, setDesignProcessing] = useState(false);
  
  // Use image processing hook for edit form
  const {
    image: editImage,
    imagePreview: editImagePreview,
    imageProcessing: editImageProcessing,
    imageError: editImageError,
    setImage: setEditImage,
    setImagePreview: setEditImagePreview,
    handleImageChange: handleEditImageChangeRaw,
    clearImage: clearEditImage,
  } = useImageProcessing(showSuccess);
  
  // Combined error from multiple sources
  const error = formError || imageError || activeError || editImageError;
  
  // Set error across all error sources to ensure consistency
  const setError = (err: string) => {
    setFormError(err);
    setActiveError(err);
  };

  // Update URL when state changes (removed pagination params for infinite scroll)
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeSearch) params.set('search', activeSearch);
    if (showDeleted) params.set('deleted', 'true');
    updateUrl(params);
  }, [activeSearch, showDeleted, updateUrl]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageChangeRaw(file);
    }
  };

  const handleEditImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleEditImageChangeRaw(file);
    setEditingItem(prev => prev ? ({
      ...prev,
      removeImage: false
    }) : null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.error || 'Validation failed');
      return;
    }

    setLoading(true);
    try {
      const formData = getFormData(validation.priceNum!, image);
      await createItem(formData);
      const itemName = name.trim();
      resetForm();
      resetImage();
      const fileInput = document.getElementById('itemImage') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      onItemsChange();
      fetchActiveItems();
      showSuccess(`Item "${itemName}" has been added successfully.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create item';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: ItemId, itemName: string) => {
    if (!globalThis.confirm(`Are you sure you want to delete "${itemName}"? This item can be restored later.`)) {
      return;
    }
    try {
      await deleteItem(id);
      onItemsChange();
      fetchActiveItems();
      if (showDeleted) {
        fetchDeletedItems();
      }
      showSuccess(`Item "${itemName}" has been deleted.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleRestore = async (id: ItemId, itemName: string) => {
    try {
      await restoreItem(id);
      onItemsChange();
      fetchActiveItems();
      fetchDeletedItems();
      showSuccess(`Item "${itemName}" has been restored.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore item';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handlePermanentDelete = async (id: ItemId, itemName: string, hasImage: boolean) => {
    const message = hasImage 
      ? `Are you sure you want to permanently remove the image for "${itemName}"? This action cannot be undone. The item record will be kept for historical orders.`
      : `This item "${itemName}" has no image to remove.`;
    
    if (!hasImage) {
      showError(message);
      return;
    }

    if (!globalThis.confirm(message)) {
      return;
    }

    try {
      await permanentlyDeleteItem(id);
      fetchDeletedItems();
      showSuccess(`Image for item "${itemName}" has been permanently removed.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to permanently delete item';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem({
      ...item,
      editName: item.name,
      editPrice: String(item.price),
      editColor: item.color || '',
      editFabric: item.fabric || '',
      editSpecialFeatures: item.specialFeatures || '',
      removeImage: false
    });
    setEditImage('');
    setEditImagePreview(item.imageUrl || '');
    setNewDesigns([]);
    setShowEditModal(true);
    
    // Fetch existing designs for this item
    const fetchDesigns = async () => {
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
    
    fetchDesigns();
  };

  // Copy item - pre-fill the create form with existing item data
  const handleCopy = (item: Item) => {
    setFormFromItem(item);
    resetImage();
    setError('');
    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel copy mode and clear form
  const handleCancelCopy = () => {
    resetForm();
    resetImage();
    const fileInput = document.getElementById('itemImage') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const clearEditImageWrapper = () => {
    clearEditImage();
    setEditingItem(prev => prev ? ({
      ...prev,
      removeImage: true
    }) : null);
    const fileInput = document.getElementById('editItemImage') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleDesignDelete = async (designId: number) => {
    if (!editingItem) return;
    
    try {
      const response = await fetch(`/api/items/${editingItem._id}/designs/${designId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete design');
      }
      
      setExistingDesigns(prev => prev.filter(d => d.id !== designId));
      showSuccess('Design deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleDesignPrimary = async (designId: number) => {
    if (!editingItem) return;
    
    try {
      const response = await fetch(`/api/items/${editingItem._id}/designs/${designId}`, {
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
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update primary design');
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!editingItem?.editName.trim() || !editingItem?.editPrice) {
      setError('Please fill in name and price');
      return;
    }

    const priceNum = Number.parseFloat(editingItem.editPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const updateData: {
        name: string;
        price: number;
        color: string;
        fabric: string;
        specialFeatures: string;
        image?: string | null;
      } = {
        name: editingItem.editName.trim(),
        price: priceNum,
        color: editingItem.editColor.trim(),
        fabric: editingItem.editFabric.trim(),
        specialFeatures: editingItem.editSpecialFeatures.trim()
      };

      // Handle image changes - use editImage from the hook
      if (editImage) {
        updateData.image = editImage;
      } else if (editingItem.removeImage) {
        updateData.image = null;
      }

      const itemName = editingItem.editName.trim();
      await updateItem(editingItem._id, updateData);
      
      // Upload new designs if any (in parallel for better performance)
      if (newDesigns.length > 0) {
        const uploadPromises = newDesigns.map(design =>
          fetch(`/api/items/${editingItem._id}/designs`, {
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
        
        showSuccess(`Item "${itemName}" updated with ${newDesigns.length} new design${newDesigns.length > 1 ? 's' : ''}`);
      } else {
        showSuccess(`Item "${itemName}" has been updated.`);
      }
      
      setShowEditModal(false);
      setEditingItem(null);
      setNewDesigns([]);
      setExistingDesigns([]);
      onItemsChange();
      fetchActiveItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setNewDesigns([]);
    setExistingDesigns([]);
    setError('');
  };

  // Format item name with color and fabric
  const formatItemName = (item: Item) => {
    const details: string[] = [];
    if (item.color) details.push(item.color);
    if (item.fabric) details.push(item.fabric);
    
    if (details.length > 0) {
      return `${item.name} (${details.join(', ')})`;
    }
    return item.name;
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Item Management
      </Typography>
      
      {/* Copy mode notice */}
      <Collapse in={!!copiedFrom}>
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleCancelCopy}>
              Cancel
            </Button>
          }
        >
          <strong>📋 Creating variant of &quot;{copiedFrom}&quot;</strong> — 
          Modify the color, fabric, or features to create a new item variant.
        </Alert>
      </Collapse>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="itemName"
              label="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              fullWidth
              required
              aria-required="true"
            />
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="itemPrice"
              label="Price"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              fullWidth
              required
              aria-required="true"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemColor"
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g., Red, Blue, Multi-color"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemFabric"
              label="Fabric"
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              placeholder="e.g., Cotton, Silk, Polyester"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="itemSpecialFeatures"
              label="Special Features"
              value={specialFeatures}
              onChange={(e) => setSpecialFeatures(e.target.value)}
              placeholder="e.g., Handmade, Embroidered"
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <ImageUploadField
              id="itemImage"
              imagePreview={imagePreview}
              imageProcessing={imageProcessing}
              onImageChange={handleImageChange}
              onClearImage={clearImage}
            />
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{ mt: 3 }}
        >
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h6" component="h3">
            Available Items
          </Typography>
          <Button
            variant={showDeleted ? 'contained' : 'outlined'}
            color={showDeleted ? 'warning' : 'inherit'}
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setShowDeleted(!showDeleted)}
            size="small"
          >
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'} ({deletedItems.length})
          </Button>
        </Box>
        
        {/* Search for active items */}
        <Box component="form" onSubmit={handleActiveSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by name, color, fabric..."
            value={activeSearchInput}
            onChange={(e) => setActiveSearchInput(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            aria-label="Search items"
          />
          <Button type="submit" variant="contained" size="small">
            Search
          </Button>
          {activeSearch && (
            <Button 
              type="button" 
              variant="outlined" 
              size="small"
              onClick={clearActiveSearch}
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
          )}
        </Box>
        
        {loadingActive && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loadingActive && activeItems.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No items found
          </Typography>
        )}
        
        {!loadingActive && activeItems.length > 0 && (
          <>
            <Grid container spacing={2}>
              {activeItems.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                  <ItemCard
                    item={item}
                    formatPrice={formatPrice}
                    onCopy={handleCopy}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </Grid>
              ))}
              
              {/* Loading skeletons while fetching more items */}
              {loadingMoreActive && Array.from({ length: 3 }).map((_, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`skeleton-${index}`}>
                  <ItemCardSkeleton />
                </Grid>
              ))}
            </Grid>
            
            {/* Infinite scroll trigger element */}
            <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />
            
            {/* Show message when all items are loaded */}
            {!hasMoreActive && !loadingMoreActive && activeItems.length > 0 && (
              <Typography color="text.secondary" textAlign="center" py={2}>
                All items loaded
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Deleted Items Section */}
      <Collapse in={showDeleted}>
        <Paper sx={{ mt: 3, p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
          <Typography variant="h6" component="h3" color="error.dark" gutterBottom>
            🗑️ Deleted Items
          </Typography>
          
          <Box component="form" onSubmit={handleDeletedSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search deleted items..."
              value={deletedSearchInput}
              onChange={(e) => setDeletedSearchInput(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              aria-label="Search deleted items"
            />
            <Button type="submit" variant="contained" size="small">
              Search
            </Button>
            {deletedSearch && (
              <Button 
                type="button" 
                variant="outlined" 
                size="small"
                onClick={clearDeletedSearch}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            )}
          </Box>
          
          {loadingDeleted && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {!loadingDeleted && deletedItems.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No deleted items found
            </Typography>
          )}
          
          {!loadingDeleted && deletedItems.length > 0 && (
            <>
              <Stack spacing={1}>
                {deletedItems.map((item) => (
                  <Card key={item._id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {item.imageUrl && (
                        <Box
                          component="img"
          loading="lazy"
                          src={item.imageUrl}
                          alt={item.name}
                          sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                        />
                      )}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {formatItemName(item)} - {formatPrice(item.price)}
                        </Typography>
                        <Typography variant="caption" color="error.main">
                          Deleted: {new Date(item.deletedAt!).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteForeverIcon />}
                          onClick={() => handlePermanentDelete(item._id, item.name, !!item.imageUrl)}
                          title="Permanently remove image"
                          disabled={!item.imageUrl}
                        >
                          Remove Image
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRestore(item._id, item.name)}
                        >
                          Restore
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Loading skeletons while fetching more deleted items */}
                {loadingMoreDeleted && Array.from({ length: 2 }).map((_, index) => (
                  <Card key={`deleted-skeleton-${index}`} variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                      <ItemCardSkeleton />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              
              {/* Infinite scroll trigger element */}
              <div ref={loadMoreDeletedRef} style={{ height: '20px', margin: '20px 0' }} />
              
              {/* Show message when all deleted items are loaded */}
              {!hasMoreDeleted && !loadingMoreDeleted && deletedItems.length > 0 && (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  All deleted items loaded
                </Typography>
              )}
            </>
          )}
        </Paper>
      </Collapse>

      {/* Edit Item Modal */}
      <Dialog 
        open={showEditModal && !!editingItem} 
        onClose={closeEditModal}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-item-dialog-title"
      >
        <DialogTitle id="edit-item-dialog-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Item
          <IconButton onClick={closeEditModal} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingItem && (
            <Box component="form" id="edit-item-form" onSubmit={handleEditSubmit}>
              <Stack spacing={2}>
                <TextField
                  id="editItemName"
                  label="Item Name"
                  value={editingItem.editName}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editName: e.target.value }) : null)}
                  placeholder="Enter item name"
                  fullWidth
                  required
                />
                
                <TextField
                  id="editItemPrice"
                  label="Price"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  value={editingItem.editPrice}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editPrice: e.target.value }) : null)}
                  placeholder="Enter price"
                  fullWidth
                  required
                />

                <TextField
                  id="editItemColor"
                  label="Color"
                  value={editingItem.editColor}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editColor: e.target.value }) : null)}
                  placeholder="e.g., Red, Blue, Multi-color"
                  fullWidth
                />

                <TextField
                  id="editItemFabric"
                  label="Fabric"
                  value={editingItem.editFabric}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editFabric: e.target.value }) : null)}
                  placeholder="e.g., Cotton, Silk, Polyester"
                  fullWidth
                />

                <TextField
                  id="editItemSpecialFeatures"
                  label="Special Features"
                  value={editingItem.editSpecialFeatures}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, editSpecialFeatures: e.target.value }) : null)}
                  placeholder="e.g., Handmade, Embroidered, Washable"
                  fullWidth
                />

                <Box>
                  <ImageUploadField
                    id="editItemImage"
                    imagePreview={editImagePreview}
                    imageProcessing={editImageProcessing}
                    onImageChange={handleEditImageChange}
                    onClearImage={clearEditImageWrapper}
                  />
                </Box>

                {/* Design Variants */}
                {editingItem && (
                  <Box>
                    {designsLoading ? (
                      <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <DesignManager
                        itemId={editingItem._id}
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
                
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeEditModal} color="inherit">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-item-form"
            variant="contained"
            disabled={loading || designProcessing}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ItemPanel;
