export interface OffsetPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CursorPaginationMeta {
  hasNextPage: boolean;
  nextCursor: string | null;
  limit: number;
}

export interface PaginatedResponse<T, Meta> {
  data: T[];
  meta: Meta;
}
