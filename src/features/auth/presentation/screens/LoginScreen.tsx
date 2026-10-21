import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
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
  const params = useLocalSearchParams<{ verifiedEmail?: string; justRegistered?: string }>();
  const { login, loading, error, clearError } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(
    params.justRegistered === 'true' ? 'Xác minh tài khoản thành công! Vui lòng đăng nhập.' : null
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: params.verifiedEmail || '',
      password: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setSuccessNotice(null);
    clearError();
    try {
      const session = await login(data);
      // Route based on authenticated user role
      if (session.user?.role === 'SHIPPER') {
        router.replace('/(shipper)' as Href);
      } else {
        router.replace('/(tabs)' as Href);
      }
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
    router.push('/(auth)/register' as Href);
  };

  const handleNavigateForgotPassword = () => {
    clearError();
    router.push('/(auth)/forgot-password' as Href);
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Branding & Welcome Header */}
        <AuthBrandingHeader
          title="Chào mừng trở lại"
          subtitle="Đăng nhập để quản lý khay nấm thông minh và theo dõi buồng IoT 24/7."
        />

        {/* Login Form Card */}
        <AppCard elevation="sm" style={styles.card}>
          {/* Success Banner if redirected from verification */}
          {successNotice ? (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.colors.success.main}
                style={styles.errorIcon}
              />
              <AppText variant="bodySmall" color={theme.colors.success.dark} style={styles.errorText}>
                {successNotice}
              </AppText>
            </View>
          ) : null}

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

          {/* Form Inputs */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Địa chỉ Email"
                  placeholder="example@smartmush.vn"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  leftIcon={
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={theme.colors.text.muted}
                    />
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Mật khẩu"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.text.muted}
                    />
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  required
                />
              )}
            />

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              <Pressable
                onPress={handleNavigateForgotPassword}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Quên mật khẩu"
              >
                <AppText
                  variant="caption"
                  color={theme.colors.primary[600]}
                  weight="medium"
                >
                  Quên mật khẩu?
                </AppText>
              </Pressable>
            </View>

            {/* Submit Button */}
            <AppButton
              title="Đăng nhập"
              variant="primary"
              size="lg"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting || loading}
              disabled={isSubmitting || loading}
              style={styles.submitBtn}
              accessibilityLabel="Đăng nhập tài khoản"
            />
          </View>

          {/* Navigation to Registration Link */}
          <View style={styles.footerLinkRow}>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Chưa có tài khoản?{' '}
            </AppText>
            <Pressable
              onPress={handleNavigateRegister}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đăng ký tài khoản mới"
            >
              <AppText
                variant="bodySmall"
                color={theme.colors.primary[600]}
                weight="bold"
              >
                Đăng ký ngay
              </AppText>
            </Pressable>
          </View>
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  card: {
    padding: theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    marginRight: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  form: {
    gap: theme.spacing.xs,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
});
