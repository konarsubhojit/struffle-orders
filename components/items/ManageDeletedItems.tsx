'use client';

import { useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import RestoreIcon from '@mui/icons-material/Restore'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { restoreItem, permanentlyDeleteItem } from '@/lib/api/client'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useNotification } from '@/contexts/NotificationContext'
import { useDeletedItems } from '@/hooks'
import { useInfiniteScroll } from '@/hooks'
import ItemCardSkeleton from '../common/ItemCardSkeleton'
import type { Item, ItemId } from '@/types'

interface ManageDeletedItemsProps {
  onItemsChange: () => void
}

function ManageDeletedItems({ onItemsChange }: ManageDeletedItemsProps): ReactElement {
  const { formatPrice } = useCurrency()
  const { showSuccess, showError } = useNotification()
  const [error, setError] = useState('')

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
  } = useDeletedItems(true)

  // Infinite scroll observer
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMoreDeleted,
    loading: loadingMoreDeleted,
    hasMore: hasMoreDeleted,
  })

  const handleRestore = async (id: ItemId, itemName: string) => {
    try {
      await restoreItem(id)
      onItemsChange()
      fetchDeletedItems()
      showSuccess(`Item "${itemName}" has been restored.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore item'
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  const handlePermanentDelete = async (id: ItemId, itemName: string, hasImage: boolean) => {
    const message = hasImage
      ? `Are you sure you want to permanently remove the image for "${itemName}"? This action cannot be undone. The item record will be kept for historical orders.`
      : `This item "${itemName}" has no image to remove.`

    if (!hasImage) {
      showError(message)
      return
    }

    if (!globalThis.confirm(message)) {
      return
    }

    try {
      await permanentlyDeleteItem(id)
      fetchDeletedItems()
      showSuccess(`Image for item "${itemName}" has been permanently removed.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to permanently delete item'
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  // Format item name with color and fabric
  const formatItemName = (item: Item) => {
    const details: string[] = []
    if (item.color) details.push(item.color)
    if (item.fabric) details.push(item.fabric)

    if (details.length > 0) {
      return `${item.name} (${details.join(', ')})`
    }
    return item.name
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        🗑️ Manage Deleted Items
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View and restore deleted items, or permanently remove their images.
      </Typography>

      {/* Search */}
      <Box component="form" onSubmit={handleDeletedSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
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
                      Deleted: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Unknown'}
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
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />

          {/* Show message when all deleted items are loaded */}
          {!hasMoreDeleted && !loadingMoreDeleted && deletedItems.length > 0 && (
            <Typography color="text.secondary" textAlign="center" py={2}>
              All deleted items loaded
            </Typography>
          )}
        </>
      )}
    </Paper>
  )
}

export default ManageDeletedItems
