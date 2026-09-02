import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from '../../core/api/baseApi';

/**
 * Root Reducer
 * Combines global client state slices with RTK Query server-state reducer.
 */
export const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  // Future global client slices (e.g. auth, settings, globalUI) will be registered here.
});

export type RootState = ReturnType<typeof rootReducer>;
