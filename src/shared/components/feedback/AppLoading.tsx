import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { AppText } from '../primitives/AppText';

export interface AppLoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullscreen?: boolean;
  style?: ViewStyle;
}

export const AppLoading: React.FC<AppLoadingProps> = ({
  message,
  size = 'large',
  color = theme.colors.primary[500],
  fullscreen = false,
  style,
}) => {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen, style]}>
      <ActivityIndicator size={size} color={color} />
      {message ? (
        <AppText
          variant="bodySmallMedium"
          color={theme.colors.text.secondary}
          style={styles.message}
        >
          {message}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  message: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});
