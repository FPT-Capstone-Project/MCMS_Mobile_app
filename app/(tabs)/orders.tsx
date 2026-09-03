import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Orders Tab Shell
 * Placeholder screen for tray rental and substrate order tracking in Vietnamese.
 */
export default function OrdersScreen() {
  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Đơn hàng"
        subtitle="Lịch sử thuê khay & vật tư"
        rightAction={
          <AppButton
            title="Đặt hàng mới"
            variant="primary"
            size="sm"
            leftIcon={<Ionicons name="cart-outline" size={16} color="#FFFFFF" />}
          />
        }
      />

      <View style={styles.content}>
        {/* Sample Order Card #1 */}
        <AppCard elevation="sm" style={styles.orderCard}>
          <View style={styles.cardTop}>
            <View style={styles.orderMeta}>
              <AppText variant="label">ORD-2026-0842</AppText>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Đặt ngày 02/09/2026
              </AppText>
            </View>
            <View style={styles.statusBadge}>
              <AppText variant="captionMedium" color={theme.colors.primary[700]}>
                Đang thuê
              </AppText>
            </View>
          </View>

          <AppDivider spacing="xs" />

          <View style={styles.orderItems}>
            <View style={styles.itemRow}>
              <Ionicons name="cube-outline" size={18} color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" style={styles.itemText}>
                Buồng nuôi trồng thông minh Model X (1 bộ)
              </AppText>
            </View>
            <View style={styles.itemRow}>
              <Ionicons name="leaf-outline" size={18} color={theme.colors.secondary[500]} />
              <AppText variant="bodySmall" style={styles.itemText}>
                Phôi nấm Hương cấy sẵn (x4)
              </AppText>
            </View>
          </View>

          <View style={styles.orderFooter}>
            <AppButton
              title="Theo dõi đơn"
              variant="outline"
              size="sm"
              style={styles.actionBtn}
            />
            <AppButton
              title="Chi tiết đơn"
              variant="secondary"
              size="sm"
              style={styles.actionBtn}
            />
          </View>
        </AppCard>

        {/* Sample Order Card #2 */}
        <AppCard elevation="xs" variant="outlined" style={styles.orderCard}>
          <View style={styles.cardTop}>
            <View style={styles.orderMeta}>
              <AppText variant="label">ORD-2026-0719</AppText>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Hoàn thành 15/08/2026
              </AppText>
            </View>
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <AppText variant="captionMedium" color={theme.colors.neutral[600]}>
                Đã giao hàng
              </AppText>
            </View>
          </View>

          <AppDivider spacing="xs" />

          <View style={styles.orderItems}>
            <View style={styles.itemRow}>
              <Ionicons name="cube-outline" size={18} color={theme.colors.neutral[400]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.itemText}>
                Gói giống nấm Đùi Gà (x2)
              </AppText>
            </View>
          </View>
        </AppCard>
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
  orderCard: {
    gap: theme.spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMeta: {
    gap: 2,
  },
  statusBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  completedBadge: {
    backgroundColor: theme.colors.neutral[100],
  },
  orderItems: {
    gap: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemText: {
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
