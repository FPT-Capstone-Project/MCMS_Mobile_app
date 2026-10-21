import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Href, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  RegisterFormData,
  registerSchema,
  VerifyOtpFormData,
  verifyOtpSchema,
} from '../../domain/schemas/authSchemas';
import { useAuth } from '../hooks/useAuth';
import { AuthBrandingHeader } from '../components/AuthBrandingHeader';

/**
 * Vietnamese Registration Screen with Email OTP Flow for SmartMush Customer
 * Flow: Fill Information -> Receive Email OTP -> Verify OTP -> Login
 */
export const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { registerOtp, verifyRegistrationOtp, loading, error, clearError } = useAuth();

  // Step state: 1 = Form, 2 = OTP Verification
  const [step, setStep] = useState<1 | 2>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // In-memory registration data for resend (cleared on unmount or success)
  const [inMemoryRegData, setInMemoryRegData] = useState<RegisterFormData | null>(null);

  // Cooldown timer for resend OTP (seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Form for Step 1
  const {
    control: regControl,
    handleSubmit: handleRegSubmit,
    formState: { errors: regErrors, isSubmitting: isRegSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Form for Step 2 (OTP)
  const {
    control: otpControl,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors, isSubmitting: isOtpSubmitting },
    setValue: setOtpValue,
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: '',
      otp: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Step 1: Submit Registration Form to get OTP
  const onRegisterFormSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    clearError();
    try {
      await registerOtp({
        name: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phoneNumber || undefined,
        address: data.address || undefined,
      });

      // Keep registration data in memory for resending if needed
      setInMemoryRegData(data);
      setOtpValue('email', data.email);
      setStep(2);
      setResendCooldown(60);
      setSuccessInfo(`Mã OTP đã được gửi đến email ${data.email}. Vui lòng kiểm tra hộp thư.`);
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

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !inMemoryRegData) return;
    setErrorMessage(null);
    setSuccessInfo(null);
    clearError();

    try {
      await registerOtp({
        name: inMemoryRegData.fullName,
        email: inMemoryRegData.email,
        password: inMemoryRegData.password,
        phone: inMemoryRegData.phoneNumber || undefined,
        address: inMemoryRegData.address || undefined,
      });
      setResendCooldown(60);
      setSuccessInfo('Mã OTP mới đã được gửi lại vào email của bạn.');
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    }
  };

  // Step 2: Submit OTP Verification
  const onOtpVerificationSubmit = async (data: VerifyOtpFormData) => {
    setErrorMessage(null);
    clearError();

    try {
      await verifyRegistrationOtp({
        email: data.email,
        otp: String(data.otp).trim(),
      });

      // Clear memory
      setInMemoryRegData(null);

      // Navigate to login with verified email
      router.replace({
        pathname: '/(auth)/login',
        params: {
          verifiedEmail: data.email,
          justRegistered: 'true',
        },
      } as Href);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Xác thực OTP không thành công. Vui lòng thử lại.';
      setErrorMessage(msg);
    }
  };

  const handleNavigateLogin = () => {
    setInMemoryRegData(null);
    clearError();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login' as Href);
    }
  };

  const displayError = errorMessage || error;

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title={step === 1 ? 'Đăng ký tài khoản' : 'Xác thực Email'}
        showBack
        onBack={step === 2 ? () => setStep(1) : handleNavigateLogin}
      />

      <View style={styles.container}>
        <AuthBrandingHeader
          title={step === 1 ? 'Tạo tài khoản mới' : 'Nhập mã xác thực'}
          subtitle={
            step === 1
              ? 'Trở thành thành viên SmartMush để trải nghiệm dịch vụ nuôi trồng nấm công nghệ cao.'
              : `Mã xác nhận 6 số đã được gửi tới email ${inMemoryRegData?.email || ''}.`
          }
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

          {successInfo && !displayError ? (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.colors.success.main}
                style={styles.errorIcon}
              />
              <AppText variant="bodySmall" color={theme.colors.success.dark} style={styles.errorText}>
                {successInfo}
              </AppText>
            </View>
          ) : null}

          {step === 1 ? (
            // ================= STEP 1: REGISTRATION FORM =================
            <View style={styles.form}>
              <Controller
                control={regControl}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Họ và tên"
                    placeholder="Nguyễn Văn A"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.fullName?.message}
                    leftIcon={<Ionicons name="person-outline" size={20} color={theme.colors.text.muted} />}
                    autoCapitalize="words"
                    autoComplete="name"
                    required
                  />
                )}
              />

              <Controller
                control={regControl}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Địa chỉ Email"
                    placeholder="example@smartmush.vn"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.email?.message}
                    leftIcon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.muted} />}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    required
                  />
                )}
              />

              <Controller
                control={regControl}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Số điện thoại (tùy chọn)"
                    placeholder="0912345678"
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.phoneNumber?.message}
                    leftIcon={<Ionicons name="call-outline" size={20} color={theme.colors.text.muted} />}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                )}
              />

              <Controller
                control={regControl}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Địa chỉ (tùy chọn)"
                    placeholder="Quận/Huyện, Tỉnh/TP"
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.address?.message}
                    leftIcon={<Ionicons name="location-outline" size={20} color={theme.colors.text.muted} />}
                    autoCapitalize="sentences"
                  />
                )}
              />

              <Controller
                control={regControl}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Mật khẩu"
                    placeholder="Tối thiểu 6 ký tự"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.password?.message}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />}
                    secureTextEntry
                    autoCapitalize="none"
                    required
                  />
                )}
              />

              <Controller
                control={regControl}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Xác nhận mật khẩu"
                    placeholder="Nhập lại mật khẩu"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={regErrors.confirmPassword?.message}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />}
                    secureTextEntry
                    autoCapitalize="none"
                    required
                  />
                )}
              />

              <AppButton
                title="Tiếp tục nhận OTP"
                variant="primary"
                size="lg"
                onPress={handleRegSubmit(onRegisterFormSubmit)}
                loading={isRegSubmitting || loading}
                disabled={isRegSubmitting || loading}
                style={styles.submitBtn}
                accessibilityLabel="Tiếp tục nhận OTP"
              />
            </View>
          ) : (
            // ================= STEP 2: OTP VERIFICATION =================
            <View style={styles.form}>
              <View style={styles.otpNoticeBox}>
                <Ionicons name="mail-unread-outline" size={32} color={theme.colors.primary[600]} />
                <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.otpNoticeText}>
                  Vui lòng kiểm tra email <AppText variant="label">{inMemoryRegData?.email}</AppText> và nhập mã OTP 6 số để kích hoạt tài khoản.
                </AppText>
              </View>

              <Controller
                control={otpControl}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Mã OTP xác thực"
                    placeholder="Nhập 6 chữ số"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={otpErrors.otp?.message}
                    leftIcon={<Ionicons name="key-outline" size={20} color={theme.colors.text.muted} />}
                    keyboardType="number-pad"
                    maxLength={6}
                    required
                  />
                )}
              />

              <AppButton
                title="Xác thực & Kích hoạt"
                variant="primary"
                size="lg"
                onPress={handleOtpSubmit(onOtpVerificationSubmit)}
                loading={isOtpSubmitting || loading}
                disabled={isOtpSubmitting || loading}
                style={styles.submitBtn}
                accessibilityLabel="Xác thực và kích hoạt tài khoản"
              />

              {/* Resend OTP button */}
              <View style={styles.resendRow}>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Không nhận được mã?{' '}
                </AppText>
                <Pressable
                  onPress={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  hitSlop={8}
                >
                  <AppText
                    variant="caption"
                    color={resendCooldown > 0 ? theme.colors.text.muted : theme.colors.primary[600]}
                    weight="bold"
                  >
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã OTP'}
                  </AppText>
                </Pressable>
              </View>

              <AppButton
                title="Sửa thông tin đăng ký"
                variant="ghost"
                size="sm"
                onPress={() => setStep(1)}
                style={styles.backBtn}
              />
            </View>
          )}

          <View style={styles.footerLinkRow}>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đã có tài khoản?{' '}
            </AppText>
            <Pressable onPress={handleNavigateLogin} hitSlop={8}>
              <AppText variant="bodySmall" color={theme.colors.primary[600]} weight="bold">
                Đăng nhập ngay
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
  errorIcon: {
    marginRight: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  form: {
    gap: theme.spacing.xs,
  },
  otpNoticeBox: {
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  otpNoticeText: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  backBtn: {
    marginTop: theme.spacing.xs,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
});
