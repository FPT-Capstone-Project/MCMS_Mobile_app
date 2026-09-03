import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { AppButton } from '../primitives/AppButton';
import { AppText } from '../primitives/AppText';

export interface AppEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  secondaryActionTitle,
  onSecondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon || (
          <Ionicons
            name="cube-outline"
            size={40}
            color={theme.colors.primary[500]}
          />
        )}
      </View>

      <AppText variant="title" align="center" style={styles.title}>
        {title}
      </AppText>

      {description ? (
        <AppText
          variant="body"
          color={theme.colors.text.secondary}
          align="center"
          style={styles.description}
        >
          {description}
        </AppText>
      ) : null}

      {actionTitle && onAction ? (
        <AppButton
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      ) : null}

      {secondaryActionTitle && onSecondaryAction ? (
        <AppButton
          title={secondaryActionTitle}
          onPress={onSecondaryAction}
          variant="ghost"
          size="sm"
          style={styles.secondaryButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  description: {
    marginBottom: theme.spacing.xl,
    maxWidth: 300,
  },
  actionButton: {
    minWidth: 160,
  },
  secondaryButton: {
    marginTop: theme.spacing.xs,
  },
});
