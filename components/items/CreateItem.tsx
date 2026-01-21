'use client';

import { useState, useEffect, type ChangeEvent, type FormEvent, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import AddIcon from '@mui/icons-material/Add'
import { createItem } from '@/lib/api/client'
import { useNotification } from '@/contexts/NotificationContext'
import { useItemForm } from '@/hooks'
import { useImageProcessing } from '@/hooks'
import ImageUploadField from '../common/ImageUploadField'
import MultipleDesignUpload, { type DesignImage } from './MultipleDesignUpload'
import type { Item } from '@/types'

interface CreateItemProps {
  onItemCreated: () => void
  copiedItem?: Item | null
  onCancelCopy?: () => void
}

function CreateItem({ onItemCreated, copiedItem, onCancelCopy }: CreateItemProps): ReactElement {
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState(false)
  const [designs, setDesigns] = useState<DesignImage[]>([])
  const [designProcessing, setDesignProcessing] = useState(false)

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
  } = useItemForm()

  // Set form from copied item when it changes
  useEffect(() => {
    if (copiedItem) {
      setFormFromItem(copiedItem)
    }
  }, [copiedItem, setFormFromItem])

  // Use image processing hook
  const {
    image,
    imagePreview,
    imageProcessing,
    imageError,
    handleImageChange: handleImageChangeRaw,
    clearImage,
    resetImage,
  } = useImageProcessing(showSuccess)

  const error = formError || imageError

  const setError = (err: string) => {
    setFormError(err)
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleImageChangeRaw(file)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const validation = validateForm()
    if (!validation.valid) {
      setError(validation.error || 'Validation failed')
      return
    }

    if (designs.length === 0 && !image) {
      setError('Please add at least one design variant or upload a main image')
      return
    }

    setLoading(true)
    try {
      const formData = getFormData(validation.priceNum!, image)
      const createdItem = await createItem(formData)
      
      // If designs were added, upload them
      if (designs.length > 0 && createdItem._id) {
        for (const design of designs) {
          const response = await fetch(`/api/items/${createdItem._id}/designs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              designName: design.name,
              image: design.imageData,
              isPrimary: design.isPrimary,
              displayOrder: 0
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
              message: `Upload failed with HTTP ${response.status}: ${response.statusText}` 
            }))
            throw new Error(`Failed to upload design "${design.name}": ${errorData.message}`)
          }
        }
      }
      
      const itemName = name.trim()
      resetForm()
      resetImage()
      setDesigns([])
      const fileInput = document.getElementById('itemImage') as HTMLInputElement | null
      if (fileInput) fileInput.value = ''
      onItemCreated()
      showSuccess(`Item "${itemName}" has been added successfully with ${designs.length} design${designs.length > 1 ? 's' : ''}.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create item'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCopy = () => {
    resetForm()
    resetImage()
    setDesigns([])
    const fileInput = document.getElementById('itemImage') as HTMLInputElement | null
    if (fileInput) fileInput.value = ''
    if (onCancelCopy) {
      onCancelCopy()
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Create Item
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

      <Box component="form" onSubmit={handleSubmit}>
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
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              This will be used as the fallback image. Add design variants below for better organization.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <MultipleDesignUpload
              designs={designs}
              onDesignsChange={setDesigns}
              onProcessing={setDesignProcessing}
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
          disabled={loading || designProcessing}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          sx={{ mt: 3 }}
        >
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
      </Box>
    </Paper>
  )
}

export default CreateItem
