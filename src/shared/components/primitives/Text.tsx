import React from 'react';
import { AppText, AppTextProps } from './AppText';

export type TextProps = AppTextProps;
export const Text: React.FC<TextProps> = (props) => <AppText {...props} />;
