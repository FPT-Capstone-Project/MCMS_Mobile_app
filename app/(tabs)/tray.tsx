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
 * My Tray Tab Shell
 * Placeholder screen for mushroom growing chamber and tray monitoring in Vietnamese.
 */
export default function TrayScreen() {
  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Khay của tôi"
        subtitle="Quản lý buồng trồng & khay nấm"
        rightAction={
          <AppButton
            title="Thêm khay"
            variant="ghost"
            size="sm"
            leftIcon={<Ionicons name="add-circle-outline" size={18} color={theme.colors.primary[500]} />}
          />
        }
      />

      <View style={styles.content}>
        {/* Active Tray Placeholder Card */}
        <AppCard elevation="sm" style={styles.trayCard}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeContainer}>
              <View style={styles.activeDot} />
              <AppText variant="overline" color={theme.colors.success.dark}>
                Mẻ đang trồng #01
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.text.muted}>
              Ngày 12 / 28
            </AppText>
          </View>

          <AppText variant="title" weight="bold">
            Nấm Bào Ngư (Pleurotus)
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Buồng A • Khay 04 • Giai đoạn ra quả thể tối ưu
          </AppText>

          <AppDivider spacing="sm" />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm
              </AppText>
              <AppText variant="label" color={theme.colors.text.primary}>
                85%
              </AppText>
            </View>

            <View style={styles.statBox}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ
              </AppText>
              <AppText variant="label" color={theme.colors.text.primary}>
                22.8°C
              </AppText>
            </View>

            <View style={styles.statBox}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Thông gió
              </AppText>
              <AppText variant="label" color={theme.colors.text.primary}>
                Bình thường
              </AppText>
            </View>
          </View>

          <View style={styles.actionRow}>
            <AppButton
              title="Xem giám sát"
              variant="outline"
              size="sm"
              style={styles.flexButton}
            />
            <AppButton
              title="Chỉnh thông số"
              variant="primary"
              size="sm"
              style={styles.flexButton}
            />
          </View>
        </AppCard>

        {/* Secondary Info Card */}
        <AppCard elevation="xs" variant="outlined" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info.main} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.infoText}>
              Tất cả thông số khay trồng được cập nhật trực tiếp từ cảm biến IoT theo thời gian thực.
            </AppText>
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
  trayCard: {
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success.light,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success.main,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  flexButton: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[50],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
  },
});
