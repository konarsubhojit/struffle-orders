// @ts-nocheck
export interface CursorPaginationParams {
  limit?: number;
  cursor?: string | null;
  search?: string;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  page: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}
