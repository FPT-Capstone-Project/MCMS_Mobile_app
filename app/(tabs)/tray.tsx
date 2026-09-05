import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { formatDateRange, formatVND } from '../../src/core/utils/currency';
import {
  monitoringRepository,
  TelemetryGaugeCard,
  TrayTelemetry,
} from '../../src/features/monitoring';
import {
  RentalOrder,
  rentalRepository,
} from '../../src/features/rental';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * My Tray Tab Screen ("Khay của tôi")
 * Displays the customer's active rented tray, telemetry sensors, and live camera portal.
 */
export default function TrayScreen() {
  const router = useRouter();
  const [activeRental, setActiveRental] = useState<RentalOrder | null>(null);
  const [telemetry, setTelemetry] = useState<TrayTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrayData = async () => {
    try {
      const rental = await rentalRepository.getActiveRental();
      setActiveRental(rental);

      if (rental) {
        const telemetryData = await monitoringRepository.getTrayTelemetry(rental.trayId);
        setTelemetry(telemetryData);
      } else {
        setTelemetry(null);
      }
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrayData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTrayData();
  };

  const handleGoToCamera = () => {
    if (activeRental) {
      router.push(`/camera/${activeRental.trayId}` as any);
    }
  };

  const handleGoToRental = () => {
    router.push('/rental' as any);
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Khay của tôi" subtitle="Quản lý buồng trồng & khay nấm" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Đang tải dữ liệu khay nấm...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <AppHeader
        title="Khay của tôi"
        subtitle="Quản lý buồng trồng & khay nấm"
        rightAction={
          <AppButton
            title="Thuê thêm"
            variant="ghost"
            size="sm"
            leftIcon={
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={theme.colors.primary[500]}
              />
            }
            onPress={handleGoToRental}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
          />
        }
      >
        {activeRental ? (
          <>
            {/* Active Rented Tray Hero Card */}
            <AppCard elevation="sm" style={styles.heroCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeContainer}>
                  <View style={styles.activeDot} />
                  <AppText variant="overline" color={theme.colors.success.dark}>
                    Đang nuôi trồng
                  </AppText>
                </View>
                <AppText variant="captionMedium" color={theme.colors.text.muted}>
                  Khay {activeRental.trayId} • Tầng 1
                </AppText>
              </View>

              <View style={styles.titleSection}>
                <AppText variant="h3" weight="bold">
                  {activeRental.mushroom.name}
                </AppText>
                {activeRental.mushroom.scientificName ? (
                  <AppText
                    variant="caption"
                    color={theme.colors.text.secondary}
                    style={styles.italic}
                  >
                    ({activeRental.mushroom.scientificName})
                  </AppText>
                ) : null}
              </View>

              <AppDivider spacing="xs" />

              {/* Rental Meta Details */}
              <View style={styles.metaDetails}>
                <View style={styles.metaRow}>
                  <Ionicons name="cube-outline" size={16} color={theme.colors.text.secondary} />
                  <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                    Khay thuê: <AppText weight="bold">{activeRental.trayId}</AppText>
                  </AppText>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
                  <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                    Thời gian:{' '}
                    <AppText weight="bold">
                      {formatDateRange(activeRental.startDate, activeRental.endDate)}
                    </AppText>
                  </AppText>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="receipt-outline" size={16} color={theme.colors.text.secondary} />
                  <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                    Gói thuê:{' '}
                    <AppText weight="bold">
                      {activeRental.duration.label} ({formatVND(activeRental.pricing.totalAmount)})
                    </AppText>
                  </AppText>
                </View>
              </View>

              {/* Quick Metrics Banner */}
              {telemetry ? (
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Nhiệt độ
                    </AppText>
                    <AppText variant="label" weight="bold" color={theme.colors.text.primary}>
                      {telemetry.temperature}°C
                    </AppText>
                  </View>

                  <AppDivider orientation="vertical" spacing="sm" />

                  <View style={styles.statBox}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Độ ẩm
                    </AppText>
                    <AppText variant="label" weight="bold" color={theme.colors.text.primary}>
                      {telemetry.humidity}%
                    </AppText>
                  </View>

                  <AppDivider orientation="vertical" spacing="sm" />

                  <View style={styles.statBox}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      CO₂
                    </AppText>
                    <AppText variant="label" weight="bold" color={theme.colors.text.primary}>
                      {telemetry.co2} ppm
                    </AppText>
                  </View>
                </View>
              ) : null}

              {/* Primary Action: Xem camera */}
              <View style={styles.actionButtons}>
                <AppButton
                  title="Xem camera trực tiếp"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={
                    <Ionicons name="videocam" size={20} color="#FFFFFF" />
                  }
                  onPress={handleGoToCamera}
                />
              </View>
            </AppCard>

            {/* IoT Telemetry Gauges Card */}
            {telemetry && <TelemetryGaugeCard telemetry={telemetry} />}

            {/* Chamber Information Card */}
            <AppCard elevation="xs" variant="outlined" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.info.main}
                />
                <View style={styles.infoTextContainer}>
                  <AppText variant="bodySmallMedium" weight="bold">
                    Cập nhật thời gian thực
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Thông số vi khí hậu được hệ thống IoT tự động điều tiết theo chu kỳ sinh trưởng của {activeRental.mushroom.name}.
                  </AppText>
                </View>
              </View>
            </AppCard>
          </>
        ) : (
          /* Empty State when no trays are rented */
          <AppCard elevation="sm" style={styles.emptyContainer}>
            <AppEmptyState
              title="Chưa có khay nuôi trồng"
              description="Bạn chưa thuê khay nuôi trồng nào. Hãy bắt đầu chọn khay và loại nấm yêu thích ngay hôm nay!"
              actionTitle="Thuê khay ngay"
              onAction={handleGoToRental}
              icon={
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={theme.colors.primary[500]}
                />
              }
            />
          </AppCard>
        )}
      </ScrollView>
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
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  heroCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.paper,
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
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.success.main,
  },
  titleSection: {
    gap: 2,
  },
  italic: {
    fontStyle: 'italic',
  },
  metaDetails: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.base,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  actionButtons: {
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[50],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background.paper,
  },
});
