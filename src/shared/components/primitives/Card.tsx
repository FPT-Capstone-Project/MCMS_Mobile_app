import React from 'react';
import { AppCard, AppCardProps, CardElevation, CardPadding, CardVariant } from './AppCard';

export type CardProps = AppCardProps;
export type { CardElevation, CardPadding, CardVariant };
export const Card: React.FC<CardProps> = (props) => <AppCard {...props} />;
