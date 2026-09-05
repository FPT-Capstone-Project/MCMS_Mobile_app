import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import { useAuth } from '../../src/features/auth';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Profile Tab Screen
 * Displays authenticated customer information, settings options, and connected logout.
 */
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản SmartMush?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch {
            // Logout cleanup completes locally regardless of network
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Hồ sơ"
        subtitle="Tài khoản & Thiết bị"
      />

      <View style={styles.content}>
        {/* Customer User Info Card */}
        <AppCard elevation="sm" style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.userInfo}>
              <AppText variant="title" weight="bold">
                {user?.fullName || 'Khách hàng'}
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                {user?.email || 'khachhang@smartmush.vn'}
              </AppText>
              <View style={styles.badge}>
                <AppText variant="overline" color={theme.colors.primary[700]}>
                  {user?.role === 'CUSTOMER' ? 'Khách hàng' : 'Đã xác thực'}
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Settings Options Card */}
        <AppCard elevation="xs" style={styles.settingsCard}>
          <AppText variant="label" color={theme.colors.text.muted} style={styles.sectionHeader}>
            Cài đặt & Tùy chọn
          </AppText>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.text.primary} />
              <AppText variant="bodyMedium">Ghép nối buồng IoT</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </View>

          <AppDivider spacing="xs" />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text.primary} />
              <AppText variant="bodyMedium">Cài đặt thông báo</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </View>

          <AppDivider spacing="xs" />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text.primary} />
              <AppText variant="bodyMedium">Bảo mật & Quyền riêng tư</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
          </View>
        </AppCard>

        {/* Design System & Version Info */}
        <AppCard elevation="none" variant="filled" style={styles.aboutCard}>
          <AppText variant="captionMedium" color={theme.colors.text.muted} align="center">
            MCMS Mobile App • SmartMush
          </AppText>
          <AppText variant="caption" color={theme.colors.text.muted} align="center">
            Nền tảng Expo SDK 57 • Kiến trúc Clean Architecture
          </AppText>
        </AppCard>

        <AppButton
          title="Đăng xuất"
          variant="outline"
          size="md"
          loading={isLoggingOut}
          onPress={handleLogout}
          leftIcon={<Ionicons name="log-out-outline" size={18} color={theme.colors.primary[500]} />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  userCard: {
    gap: theme.spacing.sm,
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
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  settingsCard: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
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
  },
  aboutCard: {
    backgroundColor: theme.colors.neutral[50],
    gap: 2,
    padding: theme.spacing.md,
  },
});
