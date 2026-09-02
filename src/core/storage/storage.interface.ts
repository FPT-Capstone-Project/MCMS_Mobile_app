/**
 * Storage Interface Contract
 * Enables Clean Architecture by decoupling storage implementations from consumers.
 */

export interface IStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getObject<T>(key: string): Promise<T | null>;
  setObject<T>(key: string, value: T): Promise<void>;
  clear?(): Promise<void>;
}
