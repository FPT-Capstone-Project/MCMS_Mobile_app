import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../core/theme';
import { AppButton } from '../primitives/AppButton';
import { AppCard } from '../primitives/AppCard';
import { AppDivider } from '../primitives/AppDivider';
import { AppHeader } from '../layout/AppHeader';
import { AppText } from '../primitives/AppText';
import { ScreenContainer } from '../layout/ScreenContainer';

export interface AccessDeniedScreenProps {
  featureName: string;
  currentRole?: string;
  requiredRoles?: string[];
}

/**
 * Access Denied Screen (403 Forbidden)
 * Displays friendly, clear role-based access denial for non-operator users (e.g. CUSTOMER).
 */
export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  featureName,
  currentRole = 'CUSTOMER',
  requiredRoles = ['ADMIN', 'FARM_OPERATOR'],
}) => {
  const router = useRouter();

  const roleLabelMap: Record<string, string> = {
    CUSTOMER: 'Khách hàng (CUSTOMER)',
    SHIPPER: 'Nhân viên giao hàng (SHIPPER)',
    FARM_OPERATOR: 'Kỹ thuật viên nông trại (FARM_OPERATOR)',
    ADMIN: 'Quản trị viên (ADMIN)',
  };

  const currentRoleDisplay = roleLabelMap[currentRole] || currentRole;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <AppHeader
        title="Quyền truy cập"
        subtitle="Giới hạn phân quyền người dùng"
        showBack
        onBack={() => router.replace('/(tabs)' as any)}
      />

      <View style={styles.container}>
        <AppCard elevation="sm" style={styles.card}>
          {/* Shield Lock Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-half-outline" size={56} color={theme.colors.warning.main} />
          </View>

          <AppText variant="h3" align="center" style={styles.title}>
            Quyền truy cập bị giới hạn
          </AppText>

          <View style={styles.badge}>
            <Ionicons name="lock-closed" size={14} color={theme.colors.warning.dark} />
            <AppText variant="captionMedium" color={theme.colors.warning.dark} weight="bold">
              Yêu cầu quyền Vận hành IoT
            </AppText>
          </View>

          <AppDivider spacing="sm" />

          {/* Detailed explanation */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Chức năng:
              </AppText>
              <AppText variant="captionMedium" weight="bold">
                {featureName}
              </AppText>
            </View>

            <View style={styles.infoRow}>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Tài khoản của bạn:
              </AppText>
              <AppText variant="captionMedium" color={theme.colors.error.main} weight="bold">
                {currentRoleDisplay}
              </AppText>
            </View>

            <View style={styles.infoRow}>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Quyền yêu cầu:
              </AppText>
              <AppText variant="captionMedium" color={theme.colors.primary[700]} weight="bold">
                {requiredRoles.join(' hoặc ')}
              </AppText>
            </View>
          </View>

          <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center" style={styles.description}>
            Tính năng điều khiển van tưới, đèn và thiết lập kịch bản phun sương tự động có tác động trực tiếp đến phần cứng thực tế. Do đó chỉ có tài khoản Quản trị viên và Kỹ thuật viên vận hành mới được phép truy cập.
          </AppText>

          {/* Action buttons */}
          <View style={styles.actions}>
            <AppButton
              title="Quay về Trang chủ"
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Ionicons name="home-outline" size={18} color="#FFFFFF" />}
              onPress={() => router.replace('/(tabs)' as any)}
            />
          </View>
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenHorizontal,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.warning.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.warning.light,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  infoBox: {
    width: '100%',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  actions: {
    width: '100%',
    marginTop: theme.spacing.sm,
  },
});
