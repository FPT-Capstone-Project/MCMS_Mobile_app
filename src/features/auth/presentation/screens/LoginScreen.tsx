import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { LoginFormData, loginSchema } from '../../domain/schemas/authSchemas';
import { useAuth } from '../hooks/useAuth';
import { AuthBrandingHeader } from '../components/AuthBrandingHeader';

/**
 * Polished Vietnamese Login Screen for SmartMush Customer
 */
export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    clearError();
    try {
      await login(data);
      // On success, RootLayout/Navigation guard will transition to /(tabs)
      router.replace('/(tabs)' as Href);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại email hoặc mật khẩu.';
      setErrorMessage(msg);
    }
  };

  const handleNavigateRegister = () => {
    clearError();
    router.push('/register' as Href);
  };

  const handleNavigateForgotPassword = () => {
    clearError();
    router.push('/forgot-password' as Href);
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        {/* Branding & Welcome Header */}
        <AuthBrandingHeader
          title="Chào mừng trở lại"
          subtitle="Đăng nhập để quản lý khay nấm thông minh và theo dõi buồng IoT 24/7."
        />

        {/* Login Form Card */}
        <AppCard elevation="sm" style={styles.card}>
          {/* Error Feedback Banner */}
          {displayError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={20}
                color={theme.colors.error.main}
                style={styles.errorIcon}
              />
              <AppText variant="bodySmall" color={theme.colors.error.main} style={styles.errorText}>
                {displayError}
              </AppText>
            </View>
          ) : null}

          {/* Email Input */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email"
                placeholder="nhap.email@smartmush.vn"
                value={value}
                onChangeText={(val) => {
                  if (displayError) {
                    setErrorMessage(null);
                    clearError();
                  }
                  onChange(val);
                }}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={theme.colors.text.muted} />
                }
              />
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Mật khẩu"
                placeholder="Nhập mật khẩu của bạn"
                value={value}
                onChangeText={(val) => {
                  if (displayError) {
                    setErrorMessage(null);
                    clearError();
                  }
                  onChange(val);
                }}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />
                }
              />
            )}
          />

          {/* Forgot Password Link */}
          <View style={styles.forgotRow}>
            <Pressable
              onPress={handleNavigateForgotPassword}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Quên mật khẩu"
            >
              <AppText variant="bodySmallMedium" color={theme.colors.primary[600]}>
                Quên mật khẩu?
              </AppText>
            </Pressable>
          </View>

          {/* Submit Button */}
          <AppButton
            title="Đăng nhập"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading || isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />
        </AppCard>

        {/* Register Navigation Footer */}
        <View style={styles.footerRow}>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Chưa có tài khoản?{' '}
          </AppText>
          <Pressable
            onPress={handleNavigateRegister}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Đăng ký tài khoản mới"
          >
            <AppText variant="bodySmallMedium" weight="bold" color={theme.colors.primary[600]}>
              Đăng ký ngay
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'center',
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background.paper,
    gap: theme.spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.light,
    borderWidth: 1,
    borderColor: theme.colors.error.main,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorIcon: {
    marginRight: theme.spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -theme.spacing.xxs,
    marginBottom: theme.spacing.sm,
  },
  submitBtn: {
    marginTop: theme.spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
});
