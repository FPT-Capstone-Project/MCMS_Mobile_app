import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppCard } from '../../../../shared/components/primitives/AppCard';

export interface AuthCardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, style }) => {
  return (
    <AppCard elevation="sm" style={{ ...styles.card, ...style }}>
      {children}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background.paper,
  },
});
