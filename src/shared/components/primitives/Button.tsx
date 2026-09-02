import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../../core/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    return {
      ...sizeStyle,
      ...variantStyle.container,
      ...(isDisabled ? styles.disabled : {}),
      ...style,
    };
  };

  const getTextColor = (): string => {
    if (isDisabled) return theme.colors.neutral[400];
    return variantStyles[variant].textColor;
  };

  const spinnerColor = variant === 'primary' || variant === 'danger'
    ? theme.colors.neutral[0]
    : theme.colors.primary[500];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        getContainerStyle(),
        pressed && !isDisabled && styles.pressed,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            variant={size === 'sm' ? 'captionMedium' : 'button'}
            style={[styles.label, { color: getTextColor() }, textStyle]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.base,
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: 34,
  },
  md: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    minHeight: 44,
  },
  lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 52,
  },
};

interface VariantStyle {
  container: ViewStyle;
  textColor: string;
}

const variantStyles: Record<ButtonVariant, VariantStyle> = {
  primary: {
    container: {
      backgroundColor: theme.colors.primary[500],
    },
    textColor: theme.colors.neutral[0],
  },
  secondary: {
    container: {
      backgroundColor: theme.colors.secondary[500],
    },
    textColor: theme.colors.neutral[900],
  },
  outline: {
    container: {
      backgroundColor: theme.colors.transparent,
      borderWidth: 1.5,
      borderColor: theme.colors.primary[500],
    },
    textColor: theme.colors.primary[500],
  },
  ghost: {
    container: {
      backgroundColor: theme.colors.transparent,
    },
    textColor: theme.colors.primary[500],
  },
  danger: {
    container: {
      backgroundColor: theme.colors.error.main,
    },
    textColor: theme.colors.neutral[0],
  },
};
