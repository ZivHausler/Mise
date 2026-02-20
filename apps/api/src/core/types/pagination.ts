export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePaginationParams(
  page?: string | number,
  limit?: string | number,
  defaultLimit = 10,
  maxLimit = 100,
): PaginationParams {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(maxLimit, Math.max(1, Number(limit) || defaultLimit));
  const offset = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, offset };
}
