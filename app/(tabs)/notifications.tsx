import { Ionicons } from '@expo/vector-icons';
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

/**
 * Notifications Tab Shell
 * Placeholder screen for IoT sensor alerts and system notifications in Vietnamese.
 */
export default function NotificationsScreen() {
  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Thông báo"
        subtitle="Cảnh báo & thông báo hệ thống"
        rightAction={
          <AppButton
            title="Đã đọc tất cả"
            variant="ghost"
            size="sm"
          />
        }
      />

      <View style={styles.content}>
        {/* Notification Item #1 */}
        <AppCard elevation="xs" style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons name="water-outline" size={22} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <AppText variant="label">Độ ẩm đã tối ưu</AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  10 phút trước
                </AppText>
              </View>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Chu kỳ phun sương Buồng A đã hoàn tất. Độ ẩm đạt mức 88%.
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Notification Item #2 */}
        <AppCard elevation="xs" style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.secondary[50] }]}>
              <Ionicons name="sparkles-outline" size={22} color={theme.colors.secondary[600]} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <AppText variant="label">Gợi ý thu hoạch</AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  2 giờ trước
                </AppText>
              </View>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Mũ nấm Bào Ngư Khay #01 đã đạt đường kính 5cm. Sẵn sàng để thu hoạch đợt 1.
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Notification Item #3 */}
        <AppCard elevation="xs" variant="filled" style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.colors.neutral[200] }]}>
              <Ionicons name="information-outline" size={22} color={theme.colors.neutral[600]} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <AppText variant="label">Cập nhật hệ thống</AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  1 ngày trước
                </AppText>
              </View>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Bộ điều khiển buồng trồng đã cập nhật phiên bản firmware v2.4.1 thành công.
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
    gap: theme.spacing.sm,
  },
  alertCard: {
    padding: theme.spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
