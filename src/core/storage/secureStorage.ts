import * as SecureStore from 'expo-secure-store';
import { IStorage } from './storage.interface';

/**
 * SecureStorageService
 * Wraps Expo SecureStore with strongly-typed serialization and robust error handling.
 */
class SecureStorageService implements IStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      throw new Error(`Failed to save secure item for key "${key}": ${String(error)}`);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore deletion failures if key is already absent
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const rawValue = await this.getItem(key);
      if (!rawValue) return null;
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Failed to serialize and save object for key "${key}": ${String(error)}`);
    }
  }
}

export const secureStorage = new SecureStorageService();
