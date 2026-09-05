import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import {
  RentalOrder,
  rentalRepository,
} from '../../src/features/rental';
import {
  AppBottomSheet,
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppIconButton,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Home Tab Screen ("Trang chủ")
 * Entry point with prominent "Thuê khay" action, active tray monitoring card, and chamber environment metrics.
 */
export default function HomeScreen() {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRental, setActiveRental] = useState<RentalOrder | null>(null);

  useEffect(() => {
    rentalRepository.getActiveRental().then(setActiveRental).catch(() => {});
  }, []);

  const handleGoToRental = () => {
    router.push('/rental' as any);
  };

  const handleGoToTray = () => {
    router.push('/(tabs)/tray' as any);
  };

  const handleGoToCamera = () => {
    if (activeRental) {
      router.push(`/camera/${activeRental.trayId}` as any);
    }
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="SmartMush"
        subtitle="Hệ thống nuôi trồng & giám sát nấm thông minh"
        rightAction={
          <AppIconButton
            icon={
              <Ionicons
                name="options-outline"
                size={22}
                color={theme.colors.text.primary}
              />
            }
            onPress={() => setSheetVisible(true)}
            accessibilityLabel="Tùy chọn hệ thống"
          />
        }
      />

      <View style={styles.content}>
        {/* Prominent Hero CTA Banner: Thuê khay nuôi trồng */}
        <AppCard elevation="sm" style={styles.rentalCtaCard}>
          <View style={styles.ctaHeader}>
            <View style={styles.ctaBadge}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <AppText variant="overline" color="#FFFFFF">
                Dịch vụ nổi bật
              </AppText>
            </View>
            <AppText variant="caption" color="rgba(255, 255, 255, 0.8)">
              Giá đỡ 3 tầng × 3 khay
            </AppText>
          </View>

          <View style={styles.ctaContent}>
            <AppText variant="h2" weight="bold" color="#FFFFFF">
              Thuê khay nuôi trồng nấm
            </AppText>
            <AppText variant="bodySmall" color="rgba(255, 255, 255, 0.9)" style={styles.ctaSubtitle}>
              Trải nghiệm sở hữu khay nấm thông minh tự động điều tiết vi khí hậu và theo dõi qua camera trực tiếp 24/7.
            </AppText>
          </View>

          <View style={styles.ctaActionRow}>
            <AppButton
              title="Thuê khay ngay"
              variant="secondary"
              size="md"
              style={styles.ctaButton}
              leftIcon={
                <Ionicons
                  name="cube"
                  size={18}
                  color={theme.colors.primary[700]}
                />
              }
              onPress={handleGoToRental}
            />
          </View>
        </AppCard>

        {/* Active Tray Monitoring Quick Card (if active rental exists) */}
        {activeRental && (
          <AppCard elevation="sm" style={styles.activeMonitoringCard}>
            <View style={styles.monitoringHeader}>
              <View style={styles.activeDotRow}>
                <View style={styles.livePulseDot} />
                <AppText variant="overline" color={theme.colors.success.dark}>
                  Khay đang nuôi trồng
                </AppText>
              </View>
              <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[600]}>
                Khay {activeRental.trayId}
              </AppText>
            </View>

            <View style={styles.monitoringBody}>
              <View style={styles.mushroomIconBadge}>
                <Ionicons name="leaf" size={22} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.monitoringText}>
                <AppText variant="title" weight="bold">
                  {activeRental.mushroom.name}
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Gói {activeRental.duration.label} • Đang phát triển tốt
                </AppText>
              </View>
            </View>

            <View style={styles.monitoringActions}>
              <AppButton
                title="Xem camera"
                variant="primary"
                size="sm"
                style={styles.flexBtn}
                leftIcon={<Ionicons name="videocam" size={16} color="#FFFFFF" />}
                onPress={handleGoToCamera}
              />
              <AppButton
                title="Quản lý khay"
                variant="outline"
                size="sm"
                style={styles.flexBtn}
                onPress={handleGoToTray}
              />
            </View>
          </AppCard>
        )}

        {/* Welcome & Chamber Environment Overview Card */}
        <AppCard elevation="sm" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="hardware-chip-outline" size={24} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.heroTextGroup}>
              <AppText variant="overline" color={theme.colors.primary[500]}>
                Cảm biến IoT
              </AppText>
              <AppText variant="h3">Tổng quan buồng trồng</AppText>
            </View>
          </View>

          <AppText
            variant="bodySmall"
            color={theme.colors.text.secondary}
            style={styles.heroDescription}
          >
            Hệ thống IoT đang hoạt động ổn định. Các thông số môi trường đều đạt mức tối ưu.
          </AppText>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                24.8 °C
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                86 %
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nồng độ CO₂
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                640 ppm
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Search Input */}
        <AppInput
          placeholder="Tìm kiếm khay trồng, mẻ nấm hoặc cảnh báo..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={
            <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          }
        />

        {/* Platform Status Highlights */}
        <View style={styles.statusGrid}>
          <AppCard elevation="xs" style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.success.main }]} />
            <AppText variant="label">Hệ thống ổn định</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              IoT kết nối liên tục 24/7
            </AppText>
          </AppCard>

          <AppCard elevation="xs" style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.secondary[500] }]} />
            <AppText variant="label">Giám sát riêng tư</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Camera mã hóa an toàn
            </AppText>
          </AppCard>
        </View>
      </View>

      {/* Bottom Sheet Modal */}
      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Tùy chọn nhanh"
        subtitle="Hệ thống SmartMush MCMS"
      >
        <View style={styles.sheetBody}>
          <AppText variant="body" color={theme.colors.text.secondary}>
            Chào mừng bạn đến với hệ thống SmartMush. Bạn có thể thuê khay trồng mới hoặc kiểm tra tình trạng khay hiện tại.
          </AppText>
          <AppButton
            title="Bắt đầu thuê khay"
            variant="primary"
            size="md"
            style={styles.sheetButton}
            onPress={() => {
              setSheetVisible(false);
              handleGoToRental();
            }}
          />
          <AppButton
            title="Đóng bảng điều khiển"
            variant="outline"
            size="md"
            onPress={() => setSheetVisible(false)}
          />
        </View>
      </AppBottomSheet>
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
  rentalCtaCard: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  ctaContent: {
    gap: theme.spacing.xxs,
  },
  ctaSubtitle: {
    lineHeight: 18,
  },
  ctaActionRow: {
    flexDirection: 'row',
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
  },
  activeMonitoringCard: {
    backgroundColor: '#F0FDF4',
    borderColor: theme.colors.primary[200],
    borderWidth: 1.5,
    gap: theme.spacing.sm,
  },
  monitoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success.main,
  },
  monitoringBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mushroomIconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitoringText: {
    flex: 1,
    gap: 2,
  },
  monitoringActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxs,
  },
  flexBtn: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: theme.colors.background.paper,
    gap: theme.spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextGroup: {
    flex: 1,
  },
  heroDescription: {
    marginTop: theme.spacing.xxs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusCard: {
    flex: 1,
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.background.paper,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: theme.spacing.xxs,
  },
  sheetBody: {
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  sheetButton: {
    marginTop: theme.spacing.sm,
  },
});
