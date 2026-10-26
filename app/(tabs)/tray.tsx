import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

export default function TrayScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Khay của tôi"
        subtitle="Thông tin nuôi trồng theo tài khoản"
      />
      <View style={styles.content}>
        <AppCard elevation="sm" style={styles.statusCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="cube-outline" size={30} color={theme.colors.primary[600]} />
          </View>
          <AppText variant="h3" weight="bold" align="center">
            Chưa thể tải khay thuê
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
            Backend hiện chưa cung cấp API để lấy các khay và chu kỳ nuôi trồng thuộc tài khoản
            của bạn. Màn hình không hiển thị dữ liệu mẫu để tránh nhầm lẫn về khay đang thuê.
          </AppText>
          <AppButton
            title="Xem đơn hàng"
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<Ionicons name="receipt-outline" size={18} color="#FFFFFF" />}
            onPress={() => router.push('/(tabs)/orders')}
          />
          <AppButton
            title="Tìm gói thuê"
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<Ionicons name="add-circle-outline" size={18} color={theme.colors.primary[600]} />}
            onPress={() => router.push('/rental')}
          />
        </AppCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.xl,
  },
  statusCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
  },
});
