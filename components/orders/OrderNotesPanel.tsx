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
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNotification } from '@/contexts/NotificationContext';
import {
  useOrderNotes,
  useCreateOrderNote,
  useUpdateOrderNote,
  useDeleteOrderNote,
  usePinOrderNote,
} from '@/hooks/queries/useOrderNotesQueries';
import type { OrderId, OrderNote, OrderNoteType, OrderNoteId, CreateOrderNoteData } from '@/types';

interface OrderNotesPanelProps {
  orderId: OrderId;
}

interface NoteFormData {
  noteText: string;
  noteType: OrderNoteType;
}

const NOTE_TYPE_CONFIG: Record<OrderNoteType, { label: string; color: string; icon: ReactElement }> = {
  internal: { label: 'Internal', color: '#3b82f6', icon: <BusinessIcon sx={{ fontSize: 14 }} /> },
  customer: { label: 'Customer', color: '#22c55e', icon: <PersonIcon sx={{ fontSize: 14 }} /> },
  system: { label: 'System', color: '#64748b', icon: <SettingsIcon sx={{ fontSize: 14 }} /> },
};

/**
 * Format a date to a relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Format a date to a readable datetime string
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Sort notes: pinned first, then by date descending
 */
function sortNotes(notes: OrderNote[]): OrderNote[] {
  return [...notes].sort((a, b) => {
    // Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

interface NoteItemProps {
  note: OrderNote;
  onEdit: (note: OrderNote) => void;
  onDelete: (note: OrderNote) => void;
  onTogglePin: (note: OrderNote) => void;
  isEditing: boolean;
  editFormData: NoteFormData;
  onEditFormChange: (data: NoteFormData) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isSaving: boolean;
}

function NoteItem({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  isEditing,
  editFormData,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  isSaving,
}: NoteItemProps): ReactElement {
  const typeConfig = NOTE_TYPE_CONFIG[note.noteType];
  const createdDate = new Date(note.createdAt);
  const userName = note.userName || note.userEmail || 'Unknown User';

  if (isEditing) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 2, bgcolor: 'action.hover' }}
        aria-label={`Editing note from ${userName}`}
      >
        <Stack spacing={2}>
          <TextField
            id={`edit-note-${note._id}-text`}
            label="Note"
            value={editFormData.noteText}
            onChange={(e) => onEditFormChange({ ...editFormData, noteText: e.target.value })}
            multiline
            rows={3}
            fullWidth
            required
            aria-required="true"
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id={`edit-note-${note._id}-type-label`}>Type</InputLabel>
            <Select
              labelId={`edit-note-${note._id}-type-label`}
              id={`edit-note-${note._id}-type`}
              value={editFormData.noteType}
              label="Type"
              onChange={(e) => onEditFormChange({ ...editFormData, noteType: e.target.value as OrderNoteType })}
            >
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={onCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={onSaveEdit}
              disabled={isSaving || !editFormData.noteText.trim()}
            >
              {isSaving ? <CircularProgress size={16} /> : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: note.isPinned ? 'action.selected' : 'background.paper',
        borderColor: note.isPinned ? 'primary.main' : 'divider',
      }}
      aria-label={`Note from ${userName}${note.isPinned ? ', pinned' : ''}`}
    >
      <Stack spacing={1}>
        {/* Header: Type chip, pinned indicator, actions */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={typeConfig.icon}
              label={typeConfig.label}
              size="small"
              sx={{
                bgcolor: typeConfig.color,
                color: 'white',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
            {note.isPinned && (
              <PushPinIcon
                sx={{ fontSize: 16, color: 'primary.main' }}
                aria-label="Pinned"
              />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => onTogglePin(note)}
              aria-label={note.isPinned ? `Unpin note from ${userName}` : `Pin note from ${userName}`}
              title={note.isPinned ? 'Unpin note' : 'Pin note'}
            >
              {note.isPinned ? (
                <PushPinIcon sx={{ fontSize: 18 }} color="primary" />
              ) : (
                <PushPinOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onEdit(note)}
              aria-label={`Edit note from ${userName}`}
              title="Edit note"
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete(note)}
              aria-label={`Delete note from ${userName}`}
              title="Delete note"
              color="error"
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Stack>

        {/* Note text */}
        <Typography
          variant="body2"
          sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {note.noteText}
        </Typography>

        {/* Footer: User and timestamp */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ pt: 1 }}
        >
          <Typography variant="caption" color="text.secondary">
            <PersonIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            {userName}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            title={formatDateTime(createdDate)}
          >
            {formatRelativeTime(createdDate)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function OrderNotesPanel({ orderId }: OrderNotesPanelProps): ReactElement {
  const { showSuccess, showError } = useNotification();

  // Form state for new note
  const [formData, setFormData] = useState<NoteFormData>({
    noteText: '',
    noteType: 'internal',
  });
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<OrderNoteId | null>(null);
  const [editFormData, setEditFormData] = useState<NoteFormData>({
    noteText: '',
    noteType: 'internal',
  });

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<OrderNote | null>(null);

  // Queries and mutations
  const { data: notes = [], isLoading, error } = useOrderNotes(orderId);
  const createMutation = useCreateOrderNote();
  const updateMutation = useUpdateOrderNote();
  const deleteMutation = useDeleteOrderNote();
  const pinMutation = usePinOrderNote();

  const sortedNotes = sortNotes(notes);

  // Handlers
  const handleSubmitNewNote = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.noteText.trim()) {
      showError('Note text is required');
      return;
    }

    try {
      const data: CreateOrderNoteData = {
        orderId,
        noteText: formData.noteText.trim(),
        noteType: formData.noteType,
      };

      await createMutation.mutateAsync(data);
      showSuccess('Note added successfully');
      setFormData({ noteText: '', noteType: 'internal' });
      setIsFormExpanded(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      showError(errorMessage);
    }
  }, [orderId, formData, createMutation, showSuccess, showError]);

  const handleStartEdit = useCallback((note: OrderNote) => {
    setEditingNoteId(note._id);
    setEditFormData({
      noteText: note.noteText,
      noteType: note.noteType,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditFormData({ noteText: '', noteType: 'internal' });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId || !editFormData.noteText.trim()) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        orderId,
        noteId: editingNoteId,
        data: {
          noteText: editFormData.noteText.trim(),
          noteType: editFormData.noteType,
        },
      });
      showSuccess('Note updated successfully');
      handleCancelEdit();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      showError(errorMessage);
    }
  }, [orderId, editingNoteId, editFormData, updateMutation, showSuccess, showError, handleCancelEdit]);

  const handleOpenDeleteDialog = useCallback((note: OrderNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!noteToDelete) return;

    try {
      await deleteMutation.mutateAsync({
        orderId,
        noteId: noteToDelete._id,
      });
      showSuccess('Note deleted successfully');
      handleCloseDeleteDialog();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      showError(errorMessage);
    }
  }, [orderId, noteToDelete, deleteMutation, showSuccess, showError, handleCloseDeleteDialog]);

  const handleTogglePin = useCallback(async (note: OrderNote) => {
    try {
      await pinMutation.mutateAsync({
        orderId,
        noteId: note._id,
        isPinned: !note.isPinned,
      });
      showSuccess(note.isPinned ? 'Note unpinned' : 'Note pinned');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle pin';
      showError(errorMessage);
    }
  }, [orderId, pinMutation, showSuccess, showError]);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress aria-label="Loading notes" />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load notes: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CommentIcon color="action" />
          <Typography variant="h6" component="h2">
            Notes
          </Typography>
          {notes.length > 0 && (
            <Chip
              label={notes.length}
              size="small"
              variant="outlined"
              aria-label={`${notes.length} note${notes.length !== 1 ? 's' : ''}`}
            />
          )}
        </Stack>
        {!isFormExpanded && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setIsFormExpanded(true)}
            aria-label="Add new note"
          >
            Add Note
          </Button>
        )}
      </Stack>

      {/* Add Note Form */}
      {isFormExpanded && (
        <>
          <Paper
            component="form"
            variant="outlined"
            sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}
            onSubmit={handleSubmitNewNote}
            aria-label="Add new note form"
          >
            <Stack spacing={2}>
              <TextField
                id="new-note-text"
                label="Note"
                value={formData.noteText}
                onChange={(e) => setFormData((prev) => ({ ...prev, noteText: e.target.value }))}
                multiline
                rows={3}
                fullWidth
                required
                placeholder="Enter your note here..."
                aria-required="true"
                autoFocus
              />
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="new-note-type-label">Type</InputLabel>
                  <Select
                    labelId="new-note-type-label"
                    id="new-note-type"
                    value={formData.noteType}
                    label="Type"
                    onChange={(e) => setFormData((prev) => ({ ...prev, noteType: e.target.value as OrderNoteType }))}
                  >
                    <MenuItem value="internal">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BusinessIcon sx={{ fontSize: 16, color: NOTE_TYPE_CONFIG.internal.color }} />
                        <span>Internal</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="customer">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon sx={{ fontSize: 16, color: NOTE_TYPE_CONFIG.customer.color }} />
                        <span>Customer</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="system">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <SettingsIcon sx={{ fontSize: 16, color: NOTE_TYPE_CONFIG.system.color }} />
                        <span>System</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() => {
                      setIsFormExpanded(false);
                      setFormData({ noteText: '', noteType: 'internal' });
                    }}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={createMutation.isPending || !formData.noteText.trim()}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Note'}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {/* Notes List */}
      {sortedNotes.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No notes yet. Add a note to track important information about this order.
        </Typography>
      ) : (
        <Stack spacing={2} role="list" aria-label="Order notes">
          {sortedNotes.map((note) => (
            <Box key={note._id} role="listitem">
              <NoteItem
                note={note}
                onEdit={handleStartEdit}
                onDelete={handleOpenDeleteDialog}
                onTogglePin={handleTogglePin}
                isEditing={editingNoteId === note._id}
                editFormData={editFormData}
                onEditFormChange={setEditFormData}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                isSaving={updateMutation.isPending}
              />
            </Box>
          ))}
        </Stack>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-note-dialog-title"
        aria-describedby="delete-note-dialog-description"
      >
        <DialogTitle id="delete-note-dialog-title">Delete Note</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-note-dialog-description">
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
