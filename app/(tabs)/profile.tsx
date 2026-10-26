import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { useAuth } from '../../src/features/auth';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Profile Tab Screen
 * Displays authenticated customer information, Change Password with OTP flow, and connected logout.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, requestChangePasswordOtp, changePasswordOtp } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Change password modal states
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setModalError(null);
    setChangePasswordLoading(true);
    try {
      await requestChangePasswordOtp();
      setChangePasswordStep(2);
    } catch (err: unknown) {
      setModalError(
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể gửi mã OTP đổi mật khẩu.'
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleSubmitChangePassword = async () => {
    setModalError(null);
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setModalError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setModalError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setChangePasswordLoading(true);
    try {
      await changePasswordOtp({
        otp: otpCode.trim(),
        new_password: newPassword,
      });

      setChangePasswordModalVisible(false);
      setChangePasswordStep(1);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được thay đổi thành công.');
    } catch (err: unknown) {
      setModalError(
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.'
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SmartMush?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch {
            // Logout cleanup completes locally
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader title="Hồ sơ" subtitle="Tài khoản & Thiết bị" />

      <View style={styles.content}>
        {/* Customer User Info Card */}
        <AppCard elevation="sm" style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.userInfo}>
              <AppText variant="title" weight="bold">
                {user?.fullName || user?.full_name || 'Khách hàng SmartMush'}
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                {user?.email || 'user@smartmush.vn'}
              </AppText>
              {user?.phone || user?.phoneNumber ? (
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Số điện thoại: {user.phone || user.phoneNumber}
                </AppText>
              ) : null}
              {user?.address ? (
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Địa chỉ: {user.address}
                </AppText>
              ) : null}
              <View
                style={[
                  styles.badge,
                  user?.role === 'ADMIN'
                    ? styles.adminBadge
                    : user?.role === 'FARM_OPERATOR'
                    ? styles.operatorBadge
                    : null,
                ]}
              >
                <Ionicons
                  name={
                    user?.role === 'ADMIN'
                      ? 'shield-checkmark'
                      : user?.role === 'FARM_OPERATOR'
                      ? 'construct'
                      : 'person'
                  }
                  size={12}
                  color={
                    user?.role === 'ADMIN'
                      ? '#1D4ED8'
                      : user?.role === 'FARM_OPERATOR'
                      ? '#15803D'
                      : theme.colors.primary[700]
                  }
                />
                <AppText
                  variant="overline"
                  color={
                    user?.role === 'ADMIN'
                      ? '#1D4ED8'
                      : user?.role === 'FARM_OPERATOR'
                      ? '#15803D'
                      : theme.colors.primary[700]
                  }
                >
                  {user?.role === 'ADMIN'
                    ? 'Quản trị viên (ADMIN)'
                    : user?.role === 'FARM_OPERATOR'
                    ? 'Kỹ thuật viên (FARM_OPERATOR)'
                    : 'Khách hàng (CUSTOMER)'}
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Settings Options Card */}
        <AppCard elevation="xs" style={styles.settingsCard}>
          <AppText variant="label" color={theme.colors.text.muted} style={styles.sectionHeader}>
            Cài đặt & Tài khoản
          </AppText>

          {/* Change Password with OTP */}
          <Pressable
            style={styles.settingItem}
            onPress={() => {
              setChangePasswordStep(1);
              setModalError(null);
              setChangePasswordModalVisible(true);
            }}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="key-outline" size={20} color={theme.colors.primary[600]} />
              <View>
                <AppText variant="bodyMedium" weight="medium">
                  Đổi mật khẩu
                </AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Xác nhận bảo mật qua OTP email
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </Pressable>

          <AppDivider spacing="xs" />

          <Pressable style={styles.settingItem} onPress={() => router.push('/(tabs)/orders')}>
            <View style={styles.settingLeft}>
              <Ionicons name="receipt-outline" size={20} color={theme.colors.text.primary} />
              <AppText variant="bodyMedium">Đơn hàng của tôi</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </Pressable>

          <AppDivider spacing="xs" />

          <Pressable style={styles.settingItem} onPress={() => router.push('/(tabs)/notifications')}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text.primary} />
              <AppText variant="bodyMedium">Thông báo</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </Pressable>
        </AppCard>

        {/* Version Info Card */}
        <AppCard elevation="none" variant="filled" style={styles.aboutCard}>
          <AppText variant="captionMedium" color={theme.colors.text.muted} align="center">
            MCMS Mobile App • SmartMush
          </AppText>
          <AppText variant="caption" color={theme.colors.text.muted} align="center">
            Nền tảng Expo SDK 58 • Kết nối Backend
          </AppText>
        </AppCard>

        {/* Logout Button */}
        <AppButton
          title="Đăng xuất"
          variant="outline"
          size="md"
          loading={isLoggingOut}
          onPress={handleLogout}
          leftIcon={<Ionicons name="log-out-outline" size={18} color={theme.colors.primary[500]} />}
        />
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <AppCard elevation="lg" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Đổi mật khẩu</AppText>
              <Pressable onPress={() => setChangePasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <AppDivider spacing="xs" />

            {modalError && (
              <View style={styles.modalErrorBox}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                <AppText variant="caption" color={theme.colors.error.main} style={styles.errorText}>
                  {modalError}
                </AppText>
              </View>
            )}

            {changePasswordStep === 1 ? (
              <View style={styles.modalBody}>
                <Ionicons name="mail-outline" size={48} color={theme.colors.primary[500]} style={styles.centerIcon} />
                <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
                  Nhấn &quot;Gửi mã OTP&quot; để nhận mã xác thực 6 số gửi về email <AppText weight="bold">{user?.email}</AppText>.
                </AppText>
                <AppButton
                  title="Gửi mã OTP qua email"
                  variant="primary"
                  size="md"
                  loading={changePasswordLoading}
                  onPress={handleRequestOtp}
                  style={styles.modalActionBtn}
                />
              </View>
            ) : (
              <View style={styles.modalBody}>
                <AppInput
                  label="Mã OTP xác thực"
                  placeholder="Nhập 6 số"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  required
                />

                <AppInput
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  required
                />

                <AppInput
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  required
                />

                <AppButton
                  title="Xác nhận đổi mật khẩu"
                  variant="primary"
                  size="lg"
                  loading={changePasswordLoading}
                  onPress={handleSubmitChangePassword}
                  style={styles.modalActionBtn}
                />

                <AppButton
                  title="Gửi lại mã OTP"
                  variant="ghost"
                  size="sm"
                  onPress={handleRequestOtp}
                />
              </View>
            )}
          </AppCard>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  userCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#EFF6FF',
  },
  operatorBadge: {
    backgroundColor: '#F0FDF4',
  },
  settingsCard: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
  },
  sectionHeader: {
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  aboutCard: {
    backgroundColor: theme.colors.neutral[50],
    gap: 2,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  modalBody: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  centerIcon: {
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
  },
  modalActionBtn: {
    marginTop: theme.spacing.sm,
  },
});
