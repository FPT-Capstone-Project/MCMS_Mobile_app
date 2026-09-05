import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppCard } from '../../../../shared/components/primitives/AppCard';
import { AppDivider } from '../../../../shared/components/primitives/AppDivider';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { TrayTelemetry } from '../../domain/entities/Monitoring';

export interface TelemetryGaugeCardProps {
  telemetry: TrayTelemetry;
}

export const TelemetryGaugeCard: React.FC<TelemetryGaugeCardProps> = ({ telemetry }) => {
  return (
    <AppCard elevation="sm" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.pulseDot} />
          <AppText variant="label" weight="bold">
            Thông số vi khí hậu IoT
          </AppText>
        </View>
        <AppText variant="caption" color={theme.colors.text.muted}>
          Cập nhật tức thời
        </AppText>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {/* Temperature */}
        <View style={styles.metricBox}>
          <View style={[styles.iconBadge, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="thermometer-outline" size={20} color={theme.colors.warning.main} />
          </View>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Nhiệt độ
          </AppText>
          <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
            {telemetry.temperature}°C
          </AppText>
          <View style={styles.statusChip}>
            <AppText variant="caption" color={theme.colors.success.dark}>
              Chuẩn 24-26°C
            </AppText>
          </View>
        </View>

        <AppDivider orientation="vertical" spacing="sm" />

        {/* Humidity */}
        <View style={styles.metricBox}>
          <View style={[styles.iconBadge, { backgroundColor: '#E1F5FE' }]}>
            <Ionicons name="water-outline" size={20} color={theme.colors.info.main} />
          </View>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Độ ẩm
          </AppText>
          <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
            {telemetry.humidity}%
          </AppText>
          <View style={styles.statusChip}>
            <AppText variant="caption" color={theme.colors.success.dark}>
              Tối ưu 80-90%
            </AppText>
          </View>
        </View>

        <AppDivider orientation="vertical" spacing="sm" />

        {/* CO2 */}
        <View style={styles.metricBox}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary[50] }]}>
            <Ionicons name="leaf-outline" size={20} color={theme.colors.primary[500]} />
          </View>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Nồng độ CO₂
          </AppText>
          <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
            {telemetry.co2} ppm
          </AppText>
          <View style={styles.statusChip}>
            <AppText variant="caption" color={theme.colors.success.dark}>
              Thông thoáng
            </AppText>
          </View>
        </View>
      </View>

      <AppDivider spacing="sm" />

      {/* Stage Progress Bar */}
      <View style={styles.stageSection}>
        <View style={styles.stageHeader}>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Tiến độ nuôi trồng: <AppText weight="bold">{telemetry.cultivationStage}</AppText>
          </AppText>
          <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[600]}>
            Ngày {telemetry.daysElapsed}/{telemetry.totalDays}
          </AppText>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(
                  100,
                  Math.round((telemetry.daysElapsed / telemetry.totalDays) * 100)
                )}%`,
              },
            ]}
          />
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success.main,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statusChip: {
    backgroundColor: theme.colors.success.light,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.xs,
    marginTop: 2,
  },
  stageSection: {
    gap: theme.spacing.xs,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 3,
  },
});
