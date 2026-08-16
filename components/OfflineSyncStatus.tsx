'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { getOfflineQueue, notifyOfflineQueueChanged, type OfflineOperation } from '@/lib/offline/queue';
import { queryClient } from '@/lib/queryClient';

export default function OfflineSyncStatus() {
  const [online, setOnline] = useState(true);
  const [operations, setOperations] = useState<OfflineOperation[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setOnline(navigator.onLine);
    setOperations(await getOfflineQueue().list());
  }, []);

  const retry = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await getOfflineQueue().replay();
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['items'] });
    } finally {
      setSyncing(false);
      notifyOfflineQueueChanged();
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    const update = () => void refresh();
    const reconnect = () => void retry();
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', update);
    window.addEventListener('offline-queue-changed', update);
    navigator.serviceWorker?.addEventListener('message', update);
    void refresh();
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', update);
      window.removeEventListener('offline-queue-changed', update);
      navigator.serviceWorker?.removeEventListener('message', update);
    };
  }, [refresh, retry]);

  if (online && operations.length === 0) return null;

  return (
    <Alert
      severity={online ? 'info' : 'warning'}
      icon={online ? <SyncIcon aria-hidden="true" /> : <CloudOffIcon aria-hidden="true" />}
      role="status"
      sx={{ mb: 2 }}
    >
      <Stack spacing={1}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography fontWeight={600}>
            {online ? `${operations.length} operation(s) waiting to sync` : 'You are offline'}
          </Typography>
          <Chip
            size="small"
            label={`${operations.length} pending`}
            aria-label={`${operations.length} pending offline operations`}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={retry}
            disabled={!online || syncing}
          >
            {syncing ? 'Retrying…' : 'Retry now'}
          </Button>
        </Box>
        {operations.map((operation) => (
          <Typography key={operation.id} variant="body2">
            {operation.label}: {operation.status}
            {operation.error ? ` — ${operation.error}` : ''}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}
