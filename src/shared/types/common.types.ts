/**
 * Common Shared Utility Types
 */

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface BaseEntity {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
}
