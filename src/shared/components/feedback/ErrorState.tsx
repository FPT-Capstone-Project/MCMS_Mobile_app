import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';

export interface ErrorStateProps {
  title?: string;
  message: string;
  icon?: ReactNode;
  retryTitle?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  icon,
  retryTitle = 'Try Again',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text variant="title" color={theme.colors.error.main} align="center" style={styles.title}>
        {title}
      </Text>
      <Text
        variant="body"
        color={theme.colors.text.secondary}
        align="center"
        style={styles.message}
      >
        {message}
      </Text>
      {onRetry ? (
        <Button
          title={retryTitle}
          onPress={onRetry}
          variant="primary"
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
  message: {
    marginBottom: theme.spacing.lg,
    maxWidth: 300,
  },
  button: {
    marginTop: theme.spacing.xs,
  },
});
