import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from '../../core/api/baseApi';
import { authReducer } from '../../features/auth/presentation/slices/authSlice';

/**
 * Root Reducer
 * Combines global client state slices with RTK Query server-state reducer.
 */
export const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
