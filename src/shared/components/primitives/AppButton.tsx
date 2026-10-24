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
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends Omit<PressableProps, 'style' | 'onPress'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: (event?: any) => void;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    return {
      ...styles.base,
      ...sizeStyle,
      ...variantStyle.container,
      ...(fullWidth ? styles.fullWidth : {}),
      ...(isDisabled ? styles.disabled : {}),
      ...(pressed && !isDisabled ? styles.pressed : {}),
      ...style,
    };
  };

  const getTextColor = (): string => {
    if (isDisabled) return theme.colors.neutral[400];
    return variantStyles[variant].textColor;
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? theme.colors.neutral[0]
      : theme.colors.primary[500];

  return (
    <Pressable
      style={({ pressed }) => getContainerStyle(pressed)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <AppText
            variant={size === 'sm' ? 'buttonSm' : 'button'}
            style={[styles.label, { color: getTextColor() }, textStyle]}
          >
            {title}
          </AppText>
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
    borderRadius: theme.borderRadius.button,
    borderCurve: 'continuous',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
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
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.layout.heights.buttonSm,
  },
  md: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    minHeight: theme.layout.heights.buttonMd,
  },
  lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: theme.layout.heights.buttonLg,
  },
};

interface VariantStyleConfig {
  container: ViewStyle;
  textColor: string;
}

const variantStyles: Record<ButtonVariant, VariantStyleConfig> = {
  primary: {
    container: {
      backgroundColor: theme.colors.primary[500],
    },
    textColor: theme.colors.neutral[0],
  },
  secondary: {
    container: {
      backgroundColor: theme.colors.neutral[100],
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
