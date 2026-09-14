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
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  ResetPasswordFormData,
  resetPasswordSchema,
} from '../../domain/schemas/authSchemas';
import { useAuth } from '../hooks/useAuth';
import { AuthBrandingHeader } from '../components/AuthBrandingHeader';

/**
 * Polished Vietnamese Reset Password Screen with OTP for SmartMush Customer
 */
export const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPassword, loading, error, clearError } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.email || '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMessage(null);
    clearError();
    try {
      await resetPassword(data);
      setIsResetSuccess(true);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã OTP.';
      setErrorMessage(msg);
    }
  };

  const handleNavigateLogin = () => {
    clearError();
    router.replace('/login' as Href);
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Đặt lại mật khẩu"
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else handleNavigateLogin();
        }}
      />

      <View style={styles.container}>
        <AuthBrandingHeader
          title="Tạo mật khẩu mới"
          subtitle="Nhập mã OTP 6 số đã được gửi qua email và thiết lập mật khẩu mới an toàn."
        />

        {isResetSuccess ? (
          /* Success View */
          <AppCard elevation="sm" style={styles.card}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-done-circle" size={56} color={theme.colors.success.main} />
            </View>

            <AppText variant="title" weight="bold" align="center" style={styles.successTitle}>
              Đặt lại mật khẩu thành công!
            </AppText>

            <AppText
              variant="bodySmall"
              color={theme.colors.text.secondary}
              align="center"
              style={styles.successDesc}
            >
              Mật khẩu tài khoản của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới để đăng nhập vào SmartMush.
            </AppText>

            <AppButton
              title="Đăng nhập ngay"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleNavigateLogin}
              style={styles.submitBtn}
            />
          </AppCard>
        ) : (
          /* Reset Form */
          <AppCard elevation="sm" style={styles.card}>
            {displayError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={theme.colors.error.main}
                  style={styles.errorIcon}
                />
                <AppText
                  variant="bodySmall"
                  color={theme.colors.error.main}
                  style={styles.errorText}
                >
                  {displayError}
                </AppText>
              </View>
            ) : null}

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Email tài khoản"
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

            {/* Mã OTP */}
            <Controller
              control={control}
              name="otp"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Mã xác thực OTP (6 chữ số)"
                  placeholder="123456"
                  value={value}
                  onChangeText={(val) => {
                    if (displayError) {
                      setErrorMessage(null);
                      clearError();
                    }
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  error={errors.otp?.message}
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon={
                    <Ionicons name="key-outline" size={20} color={theme.colors.text.muted} />
                  }
                />
              )}
            />

            {/* Mật khẩu mới */}
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 6 ký tự"
                  value={value}
                  onChangeText={(val) => {
                    if (displayError) {
                      setErrorMessage(null);
                      clearError();
                    }
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  error={errors.newPassword?.message}
                  secureTextEntry
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />
                  }
                />
              )}
            />

            {/* Xác nhận mật khẩu mới */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  value={value}
                  onChangeText={(val) => {
                    if (displayError) {
                      setErrorMessage(null);
                      clearError();
                    }
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  secureTextEntry
                  leftIcon={
                    <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text.muted} />
                  }
                />
              )}
            />

            <AppButton
              title="Đặt lại mật khẩu"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading || isSubmitting}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitBtn}
            />
          </AppCard>
        )}

        {/* Return to Login */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={handleNavigateLogin}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Quay lại đăng nhập"
          >
            <AppText variant="bodySmallMedium" weight="bold" color={theme.colors.primary[600]}>
              Quay lại Đăng nhập
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
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
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
  successIconWrapper: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  successTitle: {
    marginBottom: theme.spacing.xs,
  },
  successDesc: {
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
});
