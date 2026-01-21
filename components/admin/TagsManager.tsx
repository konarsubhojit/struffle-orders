'use client';

import { useState, useCallback, type ReactElement, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useNotification } from '@/contexts/NotificationContext';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from '@/hooks/queries/useTagsQueries';
import type { Tag, CreateTagData, TagId } from '@/types';

interface TagFormData {
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488',
  '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#475569',
];

export default function TagsManager(): ReactElement {
  const { showSuccess, showError } = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: PRESET_COLORS[0],
  });

  // Queries
  const { data: tags = [], isLoading, error } = useTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  // Filter tags by search
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateDialog = useCallback(() => {
    setEditingTag(null);
    setFormData({
      name: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || PRESET_COLORS[0],
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (tag: Tag) => {
    if (!globalThis.confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(tag._id);
      showSuccess(`Tag "${tag.name}" deleted successfully.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      showError(errorMessage);
    }
  }, [deleteMutation, showSuccess, showError]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Tag name is required');
      return;
    }

    try {
      const data: CreateTagData = {
        name: formData.name.trim(),
        color: formData.color || undefined,
      };

      if (editingTag) {
        await updateMutation.mutateAsync({
          id: editingTag._id,
          data,
        });
        showSuccess(`Tag "${formData.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(data);
        showSuccess(`Tag "${formData.name}" created successfully.`);
      }

      setDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save tag';
      showError(errorMessage);
    }
  }, [formData, editingTag, createMutation, updateMutation, showSuccess, showError]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load tags: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Tags
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add Tag
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        id="tag-search"
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {tags.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No tags yet. Create your first tag to label items.
        </Typography>
      ) : filteredTags.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No tags match your search.
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {filteredTags.map((tag) => (
            <Grid key={tag._id}>
              <Chip
                icon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>{tag.name}</span>
                    {tag.itemCount !== undefined && tag.itemCount > 0 && (
                      <Box
                        component="span"
                        sx={{
                          bgcolor: 'rgba(0,0,0,0.2)',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                        }}
                      >
                        {tag.itemCount}
                      </Box>
                    )}
                  </Stack>
                }
                sx={{
                  bgcolor: tag.color || 'primary.main',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                  pr: 0.5,
                }}
                deleteIcon={
                  <Stack direction="row" spacing={0}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.25, color: 'white' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(tag);
                      }}
                      aria-label={`Edit ${tag.name}`}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ p: 0.25, color: 'white' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tag);
                      }}
                      aria-label={`Delete ${tag.name}`}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                }
                onDelete={() => {}}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="tag-dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="tag-dialog-title">
            {editingTag ? 'Edit Tag' : 'Create Tag'}
          </DialogTitle>
          
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                id="tag-name"
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                autoFocus
                placeholder="e.g., Popular, New Arrival, Sale"
              />

              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Color
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {PRESET_COLORS.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: color,
                        cursor: 'pointer',
                        border: formData.color === color ? '3px solid' : '2px solid transparent',
                        borderColor: formData.color === color ? 'primary.main' : 'transparent',
                        '&:hover': { opacity: 0.8 },
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select color ${color}`}
                      aria-pressed={formData.color === color}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setFormData((prev) => ({ ...prev, color }));
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* Preview */}
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Preview
                </Typography>
                <Chip
                  icon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
                  label={formData.name || 'Tag Name'}
                  sx={{
                    bgcolor: formData.color || 'primary.main',
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={20} />
              ) : editingTag ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
