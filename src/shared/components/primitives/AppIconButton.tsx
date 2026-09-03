import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../../core/theme';

export type IconButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface AppIconButtonProps extends Omit<PressableProps, 'style'> {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

export const AppIconButton: React.FC<AppIconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  onPress,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const sizeDimension = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    return {
      ...styles.base,
      width: sizeDimension,
      height: sizeDimension,
      borderRadius: sizeDimension / 2,
      ...variantStyle,
      ...(isDisabled ? styles.disabled : {}),
      ...(pressed && !isDisabled ? styles.pressed : {}),
      ...style,
    };
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? theme.colors.neutral[0]
      : theme.colors.primary[500];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => getContainerStyle(pressed)}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.45,
  },
});

const sizeStyles: Record<IconButtonSize, number> = {
  sm: theme.layout.heights.iconButtonSm,
  md: theme.layout.heights.iconButtonMd,
  lg: theme.layout.heights.iconButtonLg,
};

const variantStyles: Record<IconButtonVariant, ViewStyle> = {
  default: {
    backgroundColor: theme.colors.neutral[100],
  },
  primary: {
    backgroundColor: theme.colors.primary[500],
  },
  secondary: {
    backgroundColor: theme.colors.secondary[500],
  },
  ghost: {
    backgroundColor: theme.colors.transparent,
  },
  outline: {
    backgroundColor: theme.colors.transparent,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  danger: {
    backgroundColor: theme.colors.error.main,
  },
};
