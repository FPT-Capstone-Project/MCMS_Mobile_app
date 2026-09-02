import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from './index';
import type { RootState } from './rootReducer';

/**
 * Pre-typed Redux Hooks
 * Use throughout the app instead of plain `useDispatch` and `useSelector`.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
