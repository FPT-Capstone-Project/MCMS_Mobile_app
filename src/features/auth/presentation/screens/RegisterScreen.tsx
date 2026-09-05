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
import { RegisterFormData, registerSchema } from '../../domain/schemas/authSchemas';
import { useAuth } from '../hooks/useAuth';
import { AuthBrandingHeader } from '../components/AuthBrandingHeader';

/**
 * Polished Vietnamese Registration Screen for SmartMush Customer
 */
export const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    clearError();
    try {
      await register(data);
      router.replace('/(tabs)' as Href);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(msg);
    }
  };

  const handleNavigateLogin = () => {
    clearError();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login' as Href);
    }
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Đăng ký tài khoản"
        showBack
        onBack={handleNavigateLogin}
      />

      <View style={styles.container}>
        <AuthBrandingHeader
          title="Tạo tài khoản mới"
          subtitle="Trở thành thành viên SmartMush để trải nghiệm dịch vụ nuôi trồng nấm công nghệ cao."
        />

        <AppCard elevation="sm" style={styles.card}>
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

          {/* Họ và tên */}
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Họ và tên"
                placeholder="Nguyễn Văn An"
                value={value}
                onChangeText={(val) => {
                  if (displayError) {
                    setErrorMessage(null);
                    clearError();
                  }
                  onChange(val);
                }}
                onBlur={onBlur}
                error={errors.fullName?.message}
                autoCapitalize="words"
                leftIcon={
                  <Ionicons name="person-outline" size={20} color={theme.colors.text.muted} />
                }
              />
            )}
          />

          {/* Email */}
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

          {/* Số điện thoại */}
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Số điện thoại"
                placeholder="0912345678"
                value={value}
                onChangeText={(val) => {
                  if (displayError) {
                    setErrorMessage(null);
                    clearError();
                  }
                  onChange(val);
                }}
                onBlur={onBlur}
                error={errors.phoneNumber?.message}
                keyboardType="phone-pad"
                leftIcon={
                  <Ionicons name="call-outline" size={20} color={theme.colors.text.muted} />
                }
              />
            )}
          />

          {/* Mật khẩu */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Mật khẩu"
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
                error={errors.password?.message}
                secureTextEntry
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />
                }
              />
            )}
          />

          {/* Xác nhận mật khẩu */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu"
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

          {/* Submit Button */}
          <AppButton
            title="Đăng ký tài khoản"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading || isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />
        </AppCard>

        {/* Login Navigation Footer */}
        <View style={styles.footerRow}>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Đã có tài khoản?{' '}
          </AppText>
          <Pressable
            onPress={handleNavigateLogin}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Đăng nhập ngay"
          >
            <AppText variant="bodySmallMedium" weight="bold" color={theme.colors.primary[600]}>
              Đăng nhập
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
