'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, type ReactElement } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Slide, { type SlideProps } from '@mui/material/Slide';
import type { NotificationSeverity } from '@/types';

interface NotificationContextType {
  showNotification: (message: string, severity?: NotificationSeverity, title?: string, autoHideDuration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function SlideTransition(props: Readonly<SlideProps>): ReactElement {
  return <Slide {...props} direction="up" />;
}

interface NotificationState {
  open: boolean;
  message: string;
  title: string;
  severity: NotificationSeverity;
  autoHideDuration: number;
}

interface NotificationProviderProps {
  readonly children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps): ReactElement {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    title: '',
    severity: 'info',
    autoHideDuration: 6000,
  });

  const showNotification = useCallback((
    message: string, 
    severity: NotificationSeverity = 'info', 
    title = '', 
    autoHideDuration = 6000
  ): void => {
    setNotification({
      open: true,
      message,
      title,
      severity,
      autoHideDuration,
    });
  }, []);

  const showSuccess = useCallback((message: string, title = 'Success'): void => {
    showNotification(message, 'success', title);
  }, [showNotification]);

  const showError = useCallback((message: string, title = 'Error'): void => {
    showNotification(message, 'error', title, 8000);
  }, [showNotification]);

  const showWarning = useCallback((message: string, title = 'Warning'): void => {
    showNotification(message, 'warning', title);
  }, [showNotification]);

  const showInfo = useCallback((message: string, title = ''): void => {
    showNotification(message, 'info', title);
  }, [showNotification]);

  const handleClose = useCallback((_event: React.SyntheticEvent | Event, reason?: string): void => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo((): NotificationContextType => ({
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }), [showNotification, showSuccess, showError, showWarning, showInfo]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ 
          '& .MuiAlert-root': { 
            minWidth: '300px',
            maxWidth: '500px',
          }
        }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
          role="alert"
          aria-live="polite"
        >
          {notification.title && <AlertTitle>{notification.title}</AlertTitle>}
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
