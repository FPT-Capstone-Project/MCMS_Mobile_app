import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../core/api/baseApi';
import { ENV } from '../../core/config/env';
import { rootReducer } from './rootReducer';

/**
 * Global Redux Store Configuration
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
  devTools: ENV.isDevelopment,
});

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;

export * from './hooks';
export * from './rootReducer';
