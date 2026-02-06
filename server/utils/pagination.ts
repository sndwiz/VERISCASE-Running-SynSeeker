export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export function hasPagination(query: any): boolean {
  return query.limit !== undefined || query.offset !== undefined;
}

export function parsePagination(query: any): PaginationParams {
  const limit = Math.min(Math.max(1, parseInt(query.limit as string) || 100), 500);
  const offset = Math.max(0, parseInt(query.offset as string) || 0);
  return { limit, offset };
}

export function paginateResults<T>(items: T[], params: PaginationParams): PaginatedResponse<T> {
  return {
    data: items.slice(params.offset, params.offset + params.limit),
    total: items.length,
    limit: params.limit,
    offset: params.offset,
  };
}

export function maybePageinate<T>(items: T[], query: any): T[] | PaginatedResponse<T> {
  if (hasPagination(query)) {
    return paginateResults(items, parsePagination(query));
  }
  return items;
}
