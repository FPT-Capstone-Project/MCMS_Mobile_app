import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { ShadowKey } from '../../../core/theme/shadows';
import { SpacingKey } from '../../../core/theme/spacing';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = SpacingKey;
export type CardElevation = ShadowKey;

export interface AppCardProps extends ViewProps {
  children?: ReactNode;
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'elevated',
  elevation = 'sm',
  padding = 'base',
  onPress,
  style,
  disabled = false,
  ...rest
}) => {
  const getContainerStyle = (pressed = false): ViewStyle => {
    const shadowStyle = variant === 'elevated' ? theme.shadows[elevation] : theme.shadows.none;
    const paddingValue = theme.spacing[padding] ?? theme.spacing.base;

    return StyleSheet.flatten([
      styles.base,
      variantStyles[variant],
      shadowStyle,
      { padding: paddingValue },
      pressed && !disabled ? styles.pressed : undefined,
      disabled ? styles.disabled : undefined,
      style,
    ]);
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => getContainerStyle(pressed)}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={getContainerStyle(false)} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.card,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});

const variantStyles: Record<CardVariant, ViewStyle> = {
  elevated: {
    backgroundColor: theme.colors.background.paper,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  outlined: {
    backgroundColor: theme.colors.background.paper,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  filled: {
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
};
