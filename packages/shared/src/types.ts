/**
 * Shared types between @hexi/gallery, dashboard, and worker
 * These will be populated as the API is built out
 */

// API response envelope
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Gallery config (shared between worker and dashboard)
export interface GalleryConfig {
  layout?: 'grid' | 'masonry' | 'justified';
  columns?: number;
  gap?: number;
  rowHeight?: number;
  enableLightbox?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

// User plan
export type UserPlan = 'free' | 'pro' | 'enterprise';
