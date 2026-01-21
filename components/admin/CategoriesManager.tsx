'use client';

import { useState, useCallback, type ReactElement, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNotification } from '@/contexts/NotificationContext';
import {
  useCategoriesTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/queries/useCategoriesQueries';
import type { Category, CreateCategoryData, CategoryId } from '@/types';

interface CategoryFormData {
  name: string;
  description: string;
  parentId: CategoryId | null;
  color: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
];

interface CategoryTreeItemProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  expandedIds: Set<CategoryId>;
  toggleExpand: (id: CategoryId) => void;
}

function CategoryTreeItem({
  category,
  level,
  onEdit,
  onDelete,
  expandedIds,
  toggleExpand,
}: CategoryTreeItemProps): ReactElement {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category._id);

  return (
    <>
      <ListItem
        sx={{
          pl: 2 + level * 3,
          borderLeft: level > 0 ? '2px solid' : 'none',
          borderColor: 'divider',
          ml: level > 0 ? 2 : 0,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <IconButton
          size="small"
          onClick={() => hasChildren && toggleExpand(category._id)}
          sx={{ mr: 1, visibility: hasChildren ? 'visible' : 'hidden' }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        
        {isExpanded ? (
          <FolderOpenIcon sx={{ mr: 1, color: category.color || 'primary.main' }} />
        ) : (
          <FolderIcon sx={{ mr: 1, color: category.color || 'primary.main' }} />
        )}
        
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" component="span">
                {category.name}
              </Typography>
              {category.itemCount !== undefined && category.itemCount > 0 && (
                <Chip
                  label={category.itemCount}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              )}
            </Stack>
          }
          secondary={category.description}
        />
        
        <ListItemSecondaryAction>
          <IconButton
            size="small"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
      
      {hasChildren && (
        <Collapse in={isExpanded}>
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child._id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </Collapse>
      )}
    </>
  );
}

export default function CategoriesManager(): ReactElement {
  const { showSuccess, showError } = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<CategoryId>>(new Set());
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parentId: null,
    color: PRESET_COLORS[0],
  });

  // Queries
  const { data: categories = [], isLoading, error } = useCategoriesTree();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Flatten categories for parent selection
  const flattenCategories = useCallback((cats: Category[], level = 0): Array<Category & { level: number }> => {
    const result: Array<Category & { level: number }> = [];
    for (const cat of cats) {
      result.push({ ...cat, level });
      if (cat.children) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  }, []);

  const flatCategories = flattenCategories(categories);

  const toggleExpand = useCallback((id: CategoryId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      parentId: null,
      color: PRESET_COLORS[0],
    });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || null,
      color: category.color || PRESET_COLORS[0],
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (category: Category) => {
    const hasChildren = category.children && category.children.length > 0;
    const message = hasChildren
      ? `Are you sure you want to delete "${category.name}" and all its subcategories?`
      : `Are you sure you want to delete "${category.name}"?`;

    if (!globalThis.confirm(message)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(category._id);
      showSuccess(`Category "${category.name}" deleted successfully.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      showError(errorMessage);
    }
  }, [deleteMutation, showSuccess, showError]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Category name is required');
      return;
    }

    try {
      const data: CreateCategoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parentId: formData.parentId || undefined,
        color: formData.color || undefined,
      };

      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory._id,
          data,
        });
        showSuccess(`Category "${formData.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(data);
        showSuccess(`Category "${formData.name}" created successfully.`);
      }

      setDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save category';
      showError(errorMessage);
    }
  }, [formData, editingCategory, createMutation, updateMutation, showSuccess, showError]);

  const handleParentChange = useCallback((e: SelectChangeEvent<string>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      parentId: value ? (Number(value) as CategoryId) : null,
    }));
  }, []);

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
        Failed to load categories: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Categories
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add Category
        </Button>
      </Stack>

      {categories.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No categories yet. Create your first category to organize items.
        </Typography>
      ) : (
        <List disablePadding>
          {categories.map((category) => (
            <CategoryTreeItem
              key={category._id}
              category={category}
              level={0}
              onEdit={openEditDialog}
              onDelete={handleDelete}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </List>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="category-dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="category-dialog-title">
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                id="category-name"
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
                autoFocus
              />

              <TextField
                id="category-description"
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />

              <FormControl fullWidth>
                <InputLabel id="category-parent-label">Parent Category</InputLabel>
                <Select
                  labelId="category-parent-label"
                  id="category-parent"
                  value={formData.parentId?.toString() || ''}
                  onChange={handleParentChange}
                  label="Parent Category"
                >
                  <MenuItem value="">
                    <em>None (Top Level)</em>
                  </MenuItem>
                  {flatCategories
                    .filter((cat) => cat._id !== editingCategory?._id)
                    .map((cat) => (
                      <MenuItem key={cat._id} value={cat._id.toString()}>
                        {'—'.repeat(cat.level)} {cat.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

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
              ) : editingCategory ? (
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
