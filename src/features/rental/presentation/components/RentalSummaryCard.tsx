import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppCard } from '../../../../shared/components/primitives/AppCard';
import { AppDivider } from '../../../../shared/components/primitives/AppDivider';
import { AppText } from '../../../../shared/components/primitives/AppText';
import {
  MushroomVariety,
  RentalDuration,
  RentalPriceBreakdown,
} from '../../domain/entities/Rental';
import { TrayId } from '../../../tray/domain/entities/Tray';

export interface RentalSummaryCardProps {
  trayId: TrayId;
  duration: RentalDuration;
  mushroom: MushroomVariety;
  pricing: RentalPriceBreakdown;
}

export const RentalSummaryCard: React.FC<RentalSummaryCardProps> = ({
  trayId,
  duration,
  mushroom,
  pricing,
}) => {
  return (
    <View style={styles.container}>
      <AppCard elevation="sm" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary[500]} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="overline" color={theme.colors.primary[500]}>
              Chi tiết giao dịch
            </AppText>
            <AppText variant="title" weight="bold">
              Thông tin thuê khay
            </AppText>
          </View>
        </View>

        <AppDivider spacing="sm" />

        {/* Selected Package Items */}
        <View style={styles.section}>
          <View style={styles.itemRow}>
            <View style={styles.labelWithIcon}>
              <Ionicons name="cube-outline" size={16} color={theme.colors.text.secondary} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Khay thuê:
              </AppText>
            </View>
            <View style={styles.badgeTray}>
              <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
                {trayId}
              </AppText>
            </View>
          </View>

          <View style={styles.itemRow}>
            <View style={styles.labelWithIcon}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Thời gian thuê:
              </AppText>
            </View>
            <AppText variant="bodySmallMedium" weight="bold">
              {duration.label}
            </AppText>
          </View>

          <View style={styles.itemRow}>
            <View style={styles.labelWithIcon}>
              <Ionicons name="leaf-outline" size={16} color={theme.colors.text.secondary} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Phôi nấm cấy sẵn:
              </AppText>
            </View>
            <AppText variant="bodySmallMedium" weight="bold">
              {mushroom.name}
            </AppText>
          </View>
        </View>

        <AppDivider spacing="sm" />

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Tiền thuê khay ({duration.label}):
            </AppText>
            <AppText variant="bodySmallMedium">
              {formatVND(pricing.rentalFee)}
            </AppText>
          </View>

          <View style={styles.priceRow}>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Tiền phôi nấm (đợt 1):
            </AppText>
            <AppText variant="bodySmallMedium">
              {formatVND(pricing.mushroomFee)}
            </AppText>
          </View>

          <View style={styles.priceRow}>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Phí dịch vụ chăm sóc & IoT:
            </AppText>
            <AppText variant="bodySmallMedium">
              {formatVND(pricing.serviceFee)}
            </AppText>
          </View>
        </View>

        <AppDivider spacing="sm" />

        {/* Total Price Row */}
        <View style={styles.totalRow}>
          <View>
            <AppText variant="title" weight="bold">
              Tổng cộng
            </AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>
              (Đã bao gồm VAT & dịch vụ IoT)
            </AppText>
          </View>
          <AppText variant="h2" weight="heavy" color={theme.colors.primary[600]}>
            {formatVND(pricing.totalAmount)}
          </AppText>
        </View>
      </AppCard>

      {/* Security & Guarantee Note */}
      <View style={styles.guaranteeNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success.main} />
        <AppText variant="caption" color={theme.colors.text.secondary} style={styles.guaranteeText}>
          Cam kết phôi nấm đạt chuẩn chất lượng và được giám sát vi khí hậu 24/7 qua hệ thống IoT thông minh.
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background.paper,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxs,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  section: {
    gap: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  badgeTray: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xxs,
  },
  guaranteeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  guaranteeText: {
    flex: 1,
    lineHeight: 18,
  },
});
