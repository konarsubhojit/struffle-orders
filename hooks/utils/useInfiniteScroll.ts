'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /**
   * Callback to load more items
   */
  onLoadMore: () => void;
  /**
   * Whether currently loading
   */
  loading: boolean;
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  /**
   * Root margin for intersection observer (default: '100px')
   */
  rootMargin?: string;
  /**
   * Threshold for intersection observer (default: 0.1)
   */
  threshold?: number;
}

/**
 * Hook for implementing infinite scroll with Intersection Observer
 * 
 * @example
 * const loadMoreRef = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   loading: isLoading,
 *   hasMore: hasNextPage
 * });
 * 
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={loadMoreRef} />
 *   </div>
 * );
 */
export const useInfiniteScroll = ({
  onLoadMore,
  loading,
  hasMore,
  rootMargin = '100px',
  threshold = 0.1,
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && !loading && hasMore) {
        onLoadMore();
      }
    },
    [onLoadMore, loading, hasMore]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver, rootMargin, threshold]);

  return observerTarget;
};
