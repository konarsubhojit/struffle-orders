'use client';

import { useState, useCallback, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { deleteItem } from '@/lib/api/client'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useNotification } from '@/contexts/NotificationContext'
import { useItemsData } from '@/hooks'
import { useInfiniteScroll } from '@/hooks'
import ItemCard from '../common/ItemCard'
import ItemCardSkeleton from '../common/ItemCardSkeleton'
import type { Item, ItemId } from '@/types'

interface BrowseItemsProps {
  onItemsChange: () => void
  onCopyItem?: (item: Item) => void
}

function BrowseItems({ onItemsChange, onCopyItem }: BrowseItemsProps): ReactElement {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { showSuccess, showError } = useNotification()
  const [error, setError] = useState('')

  // Use items data hook with infinite scroll
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    search,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    loadMore,
    fetchItems,
  } = useItemsData()

  // Infinite scroll observer
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMore,
    loading: loadingMore,
    hasMore,
  })

  const handleDelete = useCallback(async (id: ItemId, itemName: string) => {
    if (!globalThis.confirm(`Are you sure you want to delete "${itemName}"? This item can be restored later.`)) {
      return
    }
    try {
      await deleteItem(id)
      onItemsChange()
      fetchItems()
      showSuccess(`Item "${itemName}" has been deleted.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item'
      setError(errorMessage)
      showError(errorMessage)
    }
  }, [onItemsChange, fetchItems, showSuccess, showError])

  const handleCopy = useCallback((item: Item) => {
    if (onCopyItem) {
      onCopyItem(item)
    }
  }, [onCopyItem])

  const handleEdit = useCallback((item: Item) => {
    // Navigate to dedicated item details/edit page
    router.push(`/items/${item._id}`)
  }, [router])

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Browse Items
      </Typography>

      {/* Search */}
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search by name, color, fabric..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
        {search && (
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={clearSearch}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No items found
        </Typography>
      )}

      {!loading && items.length > 0 && (
        <>
          <Grid container spacing={2}>
            {items.map((item) => (
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
            {loadingMore && Array.from({ length: 3 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`skeleton-${index}`}>
                <ItemCardSkeleton />
              </Grid>
            ))}
          </Grid>

          {/* Infinite scroll trigger element */}
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />

          {/* Show message when all items are loaded */}
          {!hasMore && !loadingMore && items.length > 0 && (
            <Typography color="text.secondary" textAlign="center" py={2}>
              All items loaded
            </Typography>
          )}
        </>
      )}
    </Paper>
  )
}

export default BrowseItems
