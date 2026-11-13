import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { ENV } from '../../src/core/config';
import {
  CustomerOrder,
  orderRepository,
} from '../../src/features/order';
import { useAuth } from '../../src/features/auth';

import {
  formatMistingCode,
  IotMaster,
  iotRepository,
} from '../../src/features/iot';
import {
  analyticsRepository,
  EnvironmentHistoryData,
} from '../../src/features/analytics';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

interface QuickActionItem {
  id: string;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: string;
}

const staffActions: QuickActionItem[] = [
  {
    id: 'admin-orders',
    title: 'Đơn của khách',
    desc: 'Đơn thuê khay & Đơn nông sản',
    icon: 'receipt-outline',
    iconColor: '#059669',
    iconBg: 'rgba(5, 150, 105, 0.1)',
    route: '/admin-orders',
  },
  {
    id: 'ssr',
    title: 'SSR 8 kênh thủ công',
    desc: 'Điều khiển rơ-le Master',
    icon: 'hardware-chip-outline',
    iconColor: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.1)',
    route: '/control/manual',
  },
  {
    id: 'control',
    title: 'Van, Quạt & Đèn phòng',
    desc: 'Điều khiển theo sơ đồ tầng',
    icon: 'options-outline',
    iconColor: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.1)',
    route: '/control',
  },
  {
    id: 'auto',
    title: 'Tự động hóa',
    desc: 'Cấu hình vi khí hậu tự động',
    icon: 'water-outline',
    iconColor: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    route: '/automatic',
  },
  {
    id: 'sensors',
    title: 'Cảm biến & Biểu đồ',
    desc: 'Lịch sử đo vi khí hậu',
    icon: 'stats-chart-outline',
    iconColor: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    route: '/sensors',
  },
  {
    id: 'cultivation',
    title: 'Phòng tầng khay',
    desc: 'Sơ đồ phòng, tầng & khay',
    icon: 'layers-outline',
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    route: '/(tabs)/tray',
  },
  {
    id: 'mushrooms',
    title: 'Danh mục nấm',
    desc: 'Catalog & Điều kiện tối ưu',
    icon: 'leaf-outline',
    iconColor: '#EC4899',
    iconBg: 'rgba(236, 72, 153, 0.1)',
    route: '/mushrooms',
  },
  {
    id: 'camera',
    title: 'Camera buồng nuôi',
    desc: 'Giám sát hình ảnh trực tiếp',
    icon: 'videocam-outline',
    iconColor: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    route: `/camera/${ENV.cameraId || '3'}`,
  },
];

const customerActions: QuickActionItem[] = [
  {
    id: 'rental',
    title: 'Thuê khay mới',
    desc: 'Đăng ký gói nuôi trồng',
    icon: 'cube-outline',
    iconColor: theme.colors.primary[600],
    iconBg: 'rgba(34, 197, 94, 0.1)',
    route: '/rental',
  },
  {
    id: 'my-tray',
    title: 'Khay của tôi',
    desc: 'Theo dõi quá trình nấm lớn',
    icon: 'leaf-outline',
    iconColor: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.1)',
    route: '/(tabs)/tray',
  },
  {
    id: 'orders',
    title: 'Đơn hàng & QR',
    desc: 'PayOS VietQR thanh toán',
    icon: 'receipt-outline',
    iconColor: '#14B8A6',
    iconBg: 'rgba(20, 184, 166, 0.1)',
    route: '/(tabs)/orders',
  },
  {
    id: 'mushrooms',
    title: 'Danh mục nấm',
    desc: 'Các giống nấm phổ biến',
    icon: 'flower-outline',
    iconColor: '#EC4899',
    iconBg: 'rgba(236, 72, 153, 0.1)',
    route: '/mushrooms',
  },
  {
    id: 'notifications',
    title: 'Thông báo',
    desc: 'Cập nhật từ SmartMush',
    icon: 'notifications-outline',
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    route: '/(tabs)/notifications',
  },
];

/**
 * Home Tab Screen ("Trang chủ")
 * Comprehensive dashboard connecting real IoT telemetry, Quick Actions, and Active Orders.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { isAdmin, isFarmOperator, isCustomer } = useAuth();
  const isStaff = isAdmin || isFarmOperator;

  const displayedActions = isStaff ? staffActions : customerActions;
  const actionRows: QuickActionItem[][] = [];
  for (let i = 0; i < displayedActions.length; i += 2) {
    actionRows.push(displayedActions.slice(i, i + 2));
  }

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Environment History Server State (GET /api/analytics/dashboard/environment-history)
  const [envHistory, setEnvHistory] = useState<EnvironmentHistoryData | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const ordersData = await orderRepository.getCustomerOrders();
      setOrders(ordersData);

      if (isStaff) {
        const mastersData = await iotRepository.getMasters();
        setMasters(mastersData);
      }
    } catch (error: unknown) {
      setDashboardError(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu trang chủ.'
      );
    } finally {
      setDashboardLoading(false);
    }
  }, [isStaff]);

  const loadEnvironmentHistory = useCallback(async () => {
    // Strictly restricted to Staff (Admin & Farm Operator); NEVER call for Customer
    if (!isStaff) return;

    try {
      const data = await analyticsRepository.getEnvironmentHistory();
      setEnvHistory(data);
    } catch {
      // Retain existing data
    }
  }, [isStaff]);

  // Auto-refresh interval from API or fallback 5 minutes (300,000 ms)
  const refreshIntervalMs = useMemo(() => {
    if (
      envHistory?.refreshAfterMs &&
      typeof envHistory.refreshAfterMs === 'number' &&
      envHistory.refreshAfterMs > 0
    ) {
      return envHistory.refreshAfterMs;
    }
    return 300000;
  }, [envHistory?.refreshAfterMs]);

  // AppState change listener: Pause when backgrounded, refresh when returning to active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active' && isStaff) {
        loadEnvironmentHistory();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isStaff, loadEnvironmentHistory]);

  // Screen Focus Lifecycle: triggers initial load and sets interval while screen is in focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();

      if (isStaff) {
        loadEnvironmentHistory();

        const intervalId = setInterval(() => {
          if (appStateRef.current === 'active') {
            loadEnvironmentHistory();
          }
        }, refreshIntervalMs);

        return () => {
          clearInterval(intervalId);
        };
      }
    }, [loadDashboardData, loadEnvironmentHistory, isStaff, refreshIntervalMs])
  );

  // Manual pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        loadDashboardData(),
        isStaff ? loadEnvironmentHistory() : Promise.resolve(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [loadDashboardData, loadEnvironmentHistory, isStaff]);

  const firstMaster = masters[0];
  const unpaidOrderCount = orders.filter(
    (order) =>
      !['CANCELLED', 'COMPLETED'].includes(order.order_status) &&
      !['PAID', 'REFUND_PENDING', 'REFUNDED'].includes(order.payment_status || '')
  ).length;

  // Compute latest temperature and humidity across floors for high-level dashboard glance
  const { latestDashboardTemp, latestDashboardHum } = useMemo<{
    latestDashboardTemp: number | null;
    latestDashboardHum: number | null;
  }>(() => {
    let t: number | null = null;
    let h: number | null = null;
    const floorList = envHistory?.floors || [];
    for (const f of floorList) {
      const pts = f.points || [];
      for (let i = pts.length - 1; i >= 0; i--) {
        const pt = pts[i];
        if (t === null && pt.temperature !== null) {
          t = pt.temperature;
        }
        if (h === null && pt.humidity !== null) {
          h = pt.humidity;
        }
        if (t !== null && h !== null) break;
      }
      if (t !== null && h !== null) break;
    }
    return { latestDashboardTemp: t, latestDashboardHum: h };
  }, [envHistory]);

  return (
    <ScreenContainer
      scrollable
      edges={['left', 'right']}
      refreshControl={
        <RefreshControl
          refreshing={pullRefreshing}
          onRefresh={handlePullRefresh}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      <AppHeader
        title="SmartMush"
        subtitle={isStaff ? 'Hệ thống Điều hành & Vận hành IoT (Admin & Farm Operator)' : 'Hệ thống quản lý vi khí hậu & nuôi trồng nấm'}
        rightAction={
          isCustomer && !isStaff ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                dashboardError
                  ? 'Mở đơn hàng, không tải được số đơn chưa thanh toán'
                  : dashboardLoading
                  ? 'Mở đơn hàng, đang tải số đơn chưa thanh toán'
                  : `Mở đơn hàng, ${unpaidOrderCount} đơn chưa thanh toán`
              }
              onPress={() => router.push('/(tabs)/orders' as any)}
              style={styles.orderHeaderAction}
            >
              <Ionicons name="receipt-outline" size={22} color={theme.colors.primary[600]} />
              <AppText
                variant="caption"
                color={
                  unpaidOrderCount > 0
                    ? theme.colors.warning.dark
                    : theme.colors.text.muted
                }
                numberOfLines={1}
                style={styles.orderHeaderCount}
              >
                {dashboardError
                  ? '—'
                  : dashboardLoading
                  ? '…'
                  : unpaidOrderCount}
              </AppText>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.content}>
        {/* ================= HERO CTA BANNER ================= */}
        {isStaff ? (
          /* Admin & Farm Operator Banner */
          <AppCard elevation="sm" style={styles.adminCtaCard}>
            <View style={styles.ctaHeader}>
              <View style={[styles.ctaBadge, { backgroundColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <AppText variant="overline" color="#FFFFFF">
                  {isAdmin ? 'Quản trị viên' : 'Kỹ thuật viên vận hành'}
                </AppText>
              </View>
              <AppText variant="caption" color="rgba(255, 255, 255, 0.85)">
                Bảng điều khiển trung tâm
              </AppText>
            </View>

            <View style={styles.ctaContent}>
              <AppText variant="h2" weight="bold" color="#FFFFFF">
                Điều hành IoT & Hạ tầng
              </AppText>
              <AppText variant="bodySmall" color="rgba(255, 255, 255, 0.9)" style={styles.ctaSubtitle}>
                Điều khiển rơ-le 8 kênh SSR cho master01 hoặc các Master khác, giám sát cảm biến và cấu hình tự động.
              </AppText>
            </View>

            <View style={styles.ctaActionRow}>
              <AppButton
                title="Điều khiển SSR thủ công"
                variant="secondary"
                size="md"
                style={styles.ctaButton}
                leftIcon={<Ionicons name="hardware-chip" size={18} color={theme.colors.primary[700]} />}
                onPress={() => router.push('/control/manual' as any)}
              />
              <AppButton
                title="Tự động hóa"
                variant="outline"
                size="md"
                style={styles.ctaOutlineButton}
                textStyle={{ color: '#FFFFFF' }}
                leftIcon={<Ionicons name="water-outline" size={18} color="#FFFFFF" />}
                onPress={() => router.push('/automatic' as any)}
              />
            </View>
          </AppCard>
        ) : (
          /* Customer Rental Banner */
          <AppCard elevation="sm" style={styles.rentalCtaCard}>
            <View style={styles.ctaHeader}>
              <View style={styles.ctaBadge}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <AppText variant="overline" color="#FFFFFF">
                  Trang trại nấm thông minh
                </AppText>
              </View>
              
            </View>

            <View style={styles.ctaContent}>
              <AppText variant="h2" weight="bold" color="#FFFFFF">
                Nuôi trồng chuẩn xác, theo dõi từng khay.
              </AppText>
              <AppText variant="bodySmall" color="rgba(255, 255, 255, 0.9)" style={styles.ctaSubtitle}>
                Nền tảng giám sát IoT chuyên sâu: tự động hoá vi khí hậu buồng nuôi, quản lý giống nấm và gói thuê khay trong một hệ thống duy nhất.
              </AppText>
            </View>

            <View style={styles.ctaActionRow}>
              <AppButton
                title="Thuê khay ngay"
                variant="secondary"
                size="md"
                style={styles.ctaButton}
                leftIcon={<Ionicons name="cube" size={18} color={theme.colors.primary[700]} />}
                onPress={() => router.push('/rental' as any)}
              />
            </View>
          </AppCard>
        )}

        {dashboardError ? (
          <AppCard elevation="xs" style={styles.dashboardError}>
            <AppText variant="bodySmall" color={theme.colors.error.main}>
              {dashboardError}
            </AppText>
            <AppButton
              title="Tải lại"
              variant="outline"
              size="sm"
              loading={dashboardLoading}
              onPress={loadDashboardData}
            />
          </AppCard>
        ) : null}

        {/* IoT Telemetry Summary (Staff only) */}
        {isStaff && (
          <AppCard elevation="sm" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconBadge}>
                <Ionicons name="hardware-chip-outline" size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.heroTextGroup}>
                <AppText variant="overline" color={theme.colors.primary[500]}>
                  Cảm biến IoT thực tế
                </AppText>
                <AppText variant="h3">
                  {firstMaster ? `Master ${firstMaster.masterId}` : 'Tổng quan buồng trồng'}
                </AppText>
              </View>
              {firstMaster && (
                <View
                  style={[
                    styles.masterBadge,
                    {
                      backgroundColor:
                        firstMaster.reportedStatus === 'online'
                          ? 'rgba(46, 125, 50, 0.12)'
                          : 'rgba(237, 108, 2, 0.12)',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={
                      firstMaster.reportedStatus === 'online'
                        ? theme.colors.success.main
                        : theme.colors.warning.main
                    }
                  >
                    {formatMistingCode('reportedStatus', firstMaster.reportedStatus)}
                  </AppText>
                </View>
              )}
            </View>

            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.heroDescription}>
              Giám sát vi khí hậu buồng trồng và các tầng nuôi. Nhấn nút bên dưới để mở toàn bộ 2 biểu đồ đường 24 giờ.
            </AppText>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Nhiệt độ gần nhất
                </AppText>
                <AppText variant="title" weight="bold" color="#c2413b">
                  {latestDashboardTemp != null ? `${latestDashboardTemp.toFixed(1)} °C` : '—'}
                </AppText>
              </View>

              <AppDivider orientation="vertical" spacing="sm" />

              <View style={styles.metricItem}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Độ ẩm gần nhất
                </AppText>
                <AppText variant="title" weight="bold" color="#2563eb">
                  {latestDashboardHum != null ? `${latestDashboardHum.toFixed(1)} %RH` : '—'}
                </AppText>
              </View>

              <AppDivider orientation="vertical" spacing="sm" />

              <View style={styles.metricItem}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Số tầng giám sát
                </AppText>
                <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                  {envHistory?.floors ? `${envHistory.floors.length} tầng` : '2 tầng'}
                </AppText>
              </View>
            </View>

            <AppButton
              title="Mở 2 biểu đồ vi khí hậu (Tầng 1 & Tầng 2)"
              variant="secondary"
              size="md"
              leftIcon={<Ionicons name="stats-chart" size={18} color={theme.colors.primary[700]} />}
              onPress={() => router.push('/sensors' as any)}
            />
          </AppCard>
        )}

        {/* Quick Action Navigation Grid */}
        <View style={styles.quickActionsSection}>
          <AppText variant="label" color={theme.colors.text.muted}>
            {isStaff ? 'CÔNG CỤ ĐIỀU KHIỂN & VẬN HÀNH (ADMIN & FARM OPERATOR)' : 'TRUY CẬP NHANH CHỨC NĂNG HỆ THỐNG'}
          </AppText>

          <View style={styles.actionGrid}>
            {actionRows.map((row, rowIndex) => (
              <View key={`action-row-${rowIndex}`} style={styles.actionRow}>
                {row.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.actionCardWrapper}
                    onPress={() => router.push(item.route as any)}
                  >
                    <AppCard elevation="xs" style={styles.quickActionCard}>
                      <View style={styles.actionIconContainer}>
                        <View style={[styles.actionIconCircle, { backgroundColor: item.iconBg }]}>
                          <Ionicons name={item.icon} size={24} color={item.iconColor} />
                        </View>
                      </View>
                      <View style={styles.actionTitleContainer}>
                        <AppText variant="label" weight="bold" numberOfLines={2}>
                          {item.title}
                        </AppText>
                      </View>
                      <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={2}>
                        {item.desc}
                      </AppText>
                    </AppCard>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  adminCtaCard: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  rentalCtaCard: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  ctaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  ctaContent: {
    gap: 4,
  },
  ctaSubtitle: {
    lineHeight: 18,
  },
  ctaActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  ctaButton: {
    alignSelf: 'flex-start',
  },
  ctaOutlineButton: {
    alignSelf: 'flex-start',
    borderColor: '#FFFFFF',
  },
  orderHeaderAction: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  orderHeaderCount: {
    width: 44,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  dashboardError: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error.light,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextGroup: {
    flex: 1,
  },
  heroDescription: {
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionsSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  environmentSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floorsListContainer: {
    gap: theme.spacing.md,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.error.light,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  masterStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  masterStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  masterBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  actionGrid: {
    gap: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionCardWrapper: {
    flex: 1,
  },
  quickActionCard: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 4,
    minHeight: 136,
    justifyContent: 'flex-start',
  },
  actionIconContainer: {
    marginBottom: 4,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitleContainer: {
    minHeight: 40,
    justifyContent: 'center',
  },
});