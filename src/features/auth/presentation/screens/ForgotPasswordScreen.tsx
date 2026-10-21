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
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from '../../domain/schemas/authSchemas';
import { useAuth } from '../hooks/useAuth';
import { AuthBrandingHeader } from '../components/AuthBrandingHeader';

/**
 * Polished Vietnamese Forgot Password Screen for SmartMush Customer
 */
export const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { forgotPassword, loading, error, clearError } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage(null);
    clearError();
    try {
      await forgotPassword(data);
      setSubmittedEmail(data.email);
      setIsSubmittedSuccess(true);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    }
  };

  const handleNavigateLogin = () => {
    clearError();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login' as Href);
    }
  };

  const handleGoToReset = () => {
    clearError();
    router.push({
      pathname: '/(auth)/reset-password',
      params: { email: submittedEmail },
    } as unknown as Href);
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Quên mật khẩu"
        showBack
        onBack={handleNavigateLogin}
      />

      <View style={styles.container}>
        <AuthBrandingHeader
          title="Khôi phục mật khẩu"
          subtitle="Nhập email của bạn để nhận mã xác thực đặt lại mật khẩu tài khoản."
        />

        {isSubmittedSuccess ? (
          /* Success Feedback View */
          <AppCard elevation="sm" style={styles.card}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={56} color={theme.colors.success.main} />
            </View>

            <AppText variant="title" weight="bold" align="center" style={styles.successTitle}>
              Đã gửi yêu cầu thành công
            </AppText>

            <AppText
              variant="bodySmall"
              color={theme.colors.text.secondary}
              align="center"
              style={styles.successDesc}
            >
              Mã xác thực OTP đã được gửi đến địa chỉ email{' '}
              <AppText variant="bodySmall" weight="bold" color={theme.colors.text.primary}>
                {submittedEmail}
              </AppText>
              . Vui lòng kiểm tra hộp thư đến hoặc mục thư rác.
            </AppText>

            <AppButton
              title="Nhập mã OTP & Đặt lại mật khẩu"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleGoToReset}
              style={styles.submitBtn}
            />

            <AppButton
              title="Quay lại Đăng nhập"
              variant="outline"
              size="md"
              fullWidth
              onPress={handleNavigateLogin}
              style={styles.backBtn}
            />
          </AppCard>
        ) : (
          /* Request Form */
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

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Email đã đăng ký"
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

            <AppButton
              title="Gửi yêu cầu"
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
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Nhớ lại mật khẩu?{' '}
          </AppText>
          <Pressable
            onPress={handleNavigateLogin}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Quay lại đăng nhập"
          >
            <AppText variant="bodySmallMedium" weight="bold" color={theme.colors.primary[600]}>
              Đăng nhập ngay
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
  backBtn: {
    marginTop: theme.spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
});
