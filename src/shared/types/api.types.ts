/**
 * Standard API Response Structures
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  errors?: Record<string, string[] | string>;
}
