import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { AppButton } from '../primitives/AppButton';
import { AppText } from '../primitives/AppText';

export interface AppErrorStateProps {
  title?: string;
  message: string;
  icon?: ReactNode;
  retryTitle?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const AppErrorState: React.FC<AppErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message,
  icon,
  retryTitle = 'Thử lại',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon || (
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={theme.colors.error.main}
          />
        )}
      </View>

      <AppText variant="title" color={theme.colors.text.primary} align="center" style={styles.title}>
        {title}
      </AppText>

      <AppText
        variant="body"
        color={theme.colors.text.secondary}
        align="center"
        style={styles.message}
      >
        {message}
      </AppText>

      {onRetry ? (
        <AppButton
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.error.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  message: {
    marginBottom: theme.spacing.xl,
    maxWidth: 300,
  },
  button: {
    minWidth: 160,
  },
});
