import React from 'react';
import { AppButton, AppButtonProps, ButtonSize, ButtonVariant } from './AppButton';

export type ButtonProps = AppButtonProps;
export type { ButtonSize, ButtonVariant };
export const Button: React.FC<ButtonProps> = (props) => <AppButton {...props} />;
