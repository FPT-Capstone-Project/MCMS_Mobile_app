import React from 'react';
import { AppErrorState, AppErrorStateProps } from './AppErrorState';

export type ErrorStateProps = AppErrorStateProps;
export const ErrorState: React.FC<ErrorStateProps> = (props) => <AppErrorState {...props} />;
