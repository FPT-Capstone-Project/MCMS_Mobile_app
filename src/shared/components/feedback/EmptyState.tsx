import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text variant="title" align="center" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text
          variant="body"
          color={theme.colors.text.secondary}
          align="center"
          style={styles.description}
        >
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="outline"
          size="md"
          style={styles.button}
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
  iconContainer: {
    marginBottom: theme.spacing.base,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.lg,
    maxWidth: 280,
  },
  button: {
    marginTop: theme.spacing.xs,
  },
});
