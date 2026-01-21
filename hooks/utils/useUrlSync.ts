'use client';

import { useCallback, useMemo } from 'react';

interface UrlSyncResult {
  searchParams: URLSearchParams;
  updateUrl: (params: URLSearchParams, options?: UrlSyncOptions) => void;
  getParam: (key: string, defaultValue?: string) => string;
  getIntParam: (key: string, defaultValue?: number) => number;
  getBoolParam: (key: string, defaultValue?: boolean) => boolean;
}

interface UrlSyncOptions {
  replace?: boolean;
}

const DEFAULT_URL_SYNC_OPTIONS: UrlSyncOptions = { replace: true };

/**
 * Custom hook for synchronizing component state with URL parameters
 * Uses native browser History API instead of React Router
 */
export const useUrlSync = (): UrlSyncResult => {
  // Get current URL search params
  const searchParams = useMemo(() => {
    return new URLSearchParams(globalThis.location.search);
  }, []);

  const updateUrl = useCallback((
    params: URLSearchParams, 
    options: UrlSyncOptions = DEFAULT_URL_SYNC_OPTIONS
  ): void => {
    const url = new URL(globalThis.location.href);
    url.search = params.toString();
    
    if (options.replace) {
      globalThis.history.replaceState({}, '', url.toString());
    } else {
      globalThis.history.pushState({}, '', url.toString());
    }
  }, []);

  const getParam = useCallback((key: string, defaultValue = ''): string => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get(key) ?? defaultValue;
  }, []);

  const getIntParam = useCallback((key: string, defaultValue = 0): number => {
    const params = new URLSearchParams(globalThis.location.search);
    const value = Number.parseInt(params.get(key) ?? '', 10);
    return Number.isNaN(value) ? defaultValue : value;
  }, []);

  const getBoolParam = useCallback((key: string, defaultValue = false): boolean => {
    const params = new URLSearchParams(globalThis.location.search);
    const value = params.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }, []);

  return {
    searchParams,
    updateUrl,
    getParam,
    getIntParam,
    getBoolParam,
  };
};
