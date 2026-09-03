import React from 'react';
import { AppLoading, AppLoadingProps } from './AppLoading';

export type LoadingSpinnerProps = AppLoadingProps;
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = (props) => <AppLoading {...props} />;
