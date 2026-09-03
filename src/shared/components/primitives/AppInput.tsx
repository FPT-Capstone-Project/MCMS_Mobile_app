import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../../core/theme';
import { AppText } from './AppText';

export interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  style?: ViewStyle;
  disabled?: boolean;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  style,
  disabled = false,
  secureTextEntry,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;
  const hasError = Boolean(error);

  const getBorderColor = (): string => {
    if (hasError) return theme.colors.error.main;
    if (isFocused) return theme.colors.primary[500];
    return theme.colors.border.default;
  };

  const getBackgroundColor = (): string => {
    if (disabled) return theme.colors.neutral[100];
    return theme.colors.background.paper;
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          disabled && styles.inputDisabled,
          style,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconWrapper}>{leftIcon}</View> : null}

        <TextInput
          style={[styles.textInput, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled }}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            hitSlop={8}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.text.muted}
            />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.messageRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={theme.colors.error.main}
            style={styles.errorIcon}
          />
          <AppText variant="caption" color={theme.colors.error.main} style={styles.helperText}>
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" color={theme.colors.text.secondary} style={styles.helperText}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.heights.inputMd,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.input,
    borderCurve: 'continuous',
    paddingHorizontal: theme.spacing.md,
  },
  inputFocused: {
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: theme.colors.error.main,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  leftIconWrapper: {
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconWrapper: {
    marginLeft: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xxs,
  },
  errorIcon: {
    marginRight: theme.spacing.xxs,
  },
  helperText: {
    marginTop: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.xxs,
  },
});
