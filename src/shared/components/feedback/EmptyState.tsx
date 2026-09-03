import React from 'react';
import { AppEmptyState, AppEmptyStateProps } from './AppEmptyState';

export type EmptyStateProps = AppEmptyStateProps;
export const EmptyState: React.FC<EmptyStateProps> = (props) => <AppEmptyState {...props} />;
