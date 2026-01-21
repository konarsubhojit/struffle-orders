'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import type { Item, ItemId } from '@/types';

interface ItemCardProps {
  item: Item;
  formatPrice: (price: number) => string;
  onCopy?: (item: Item) => void;
  onEdit?: (item: Item) => void;
  onDelete?: (id: ItemId, name: string) => void;
}

/**
 * Reusable item card component
 * Displays item with image, name, price, and action buttons
 */
function ItemCard({ 
  item, 
  formatPrice, 
  onCopy, 
  onEdit, 
  onDelete 
}: ItemCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {item.imageUrl ? (
        <CardMedia
          component="img"
          height="140"
          image={item.imageUrl}
          alt={item.name}
          loading="lazy"
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box 
          sx={{ 
            height: 140, 
            bgcolor: 'grey.100', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
        </Box>
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {item.name}
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom>
          {formatPrice(item.price)}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {item.color && <Chip label={item.color} size="small" variant="outlined" />}
          {item.fabric && <Chip label={item.fabric} size="small" variant="outlined" />}
        </Stack>
        {item.specialFeatures && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {item.specialFeatures}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
        {onCopy && (
          <IconButton 
            size="small" 
            onClick={() => onCopy(item)}
            title="Copy this item to create a variant"
            aria-label={`Copy ${item.name}`}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        )}
        {onEdit && (
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => onEdit(item)}
            aria-label={`View ${item.name}`}
            title="View item details"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
        {onDelete && (
          <IconButton 
            size="small" 
            color="error"
            onClick={() => onDelete(item._id, item.name)}
            aria-label={`Delete ${item.name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
}

export default ItemCard;
