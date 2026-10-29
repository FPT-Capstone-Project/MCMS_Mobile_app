import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
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
  IotSensor,
} from '../../src/features/iot';
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
    title: 'Van & Đèn phòng',
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
    title: 'Phòng, Tầng & Khay',
    desc: 'Hạ tầng nuôi trồng',
    icon: 'layers-outline',
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    route: '/cultivation',
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
  {
    id: 'camera',
    title: 'Camera trực tiếp',
    desc: 'Theo dõi hình ảnh buồng nuôi',
    icon: 'videocam-outline',
    iconColor: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    route: `/camera/${ENV.cameraId || '0'}`,
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
  const [activeSensors, setActiveSensors] = useState<IotSensor[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const ordersData = await orderRepository.getCustomerOrders();
      setOrders(ordersData);

      if (isStaff) {
        const mastersData = await iotRepository.getMasters();
        setMasters(mastersData);
        if (mastersData.length > 0) {
          const sensors = await iotRepository.getMasterSensors(mastersData[0].masterId);
          setActiveSensors(sensors);
        } else {
          setActiveSensors([]);
        }
      }
    } catch (error: unknown) {
      setDashboardError(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu trang chủ.'
      );
    } finally {
      setDashboardLoading(false);
    }
  }, [isStaff]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Calculate real average temperature & humidity from available sensors
  const validTempSensors = activeSensors.filter((s) => s.temperature != null);
  const validHumSensors = activeSensors.filter((s) => s.humidity != null);

  const avgTemp =
    validTempSensors.length > 0
      ? (validTempSensors.reduce((acc, s) => acc + (s.temperature || 0), 0) / validTempSensors.length).toFixed(1)
      : null;

  const avgHum =
    validHumSensors.length > 0
      ? (validHumSensors.reduce((acc, s) => acc + (s.humidity || 0), 0) / validHumSensors.length).toFixed(0)
      : null;

  const firstMaster = masters[0];
  const pendingOrders = orders.filter((o) => o.order_status === 'PENDING');

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="SmartMush"
        subtitle={isStaff ? 'Hệ thống Quản trị & Điều hành IoT' : 'Hệ thống quản lý vi khí hậu & nuôi trồng nấm'}
      />

      <View style={styles.content}>
        {/* ================= HERO CTA BANNER ================= */}
        {isStaff ? (
          /* Admin / Operator Banner */
          <AppCard elevation="sm" style={styles.adminCtaCard}>
            <View style={styles.ctaHeader}>
              <View style={[styles.ctaBadge, { backgroundColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <AppText variant="overline" color="#FFFFFF">
                  {isAdmin ? 'Quản trị viên (ADMIN)' : 'Kỹ thuật viên (OPERATOR)'}
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
                  Dịch vụ thông minh
                </AppText>
              </View>
              <AppText variant="caption" color="rgba(255, 255, 255, 0.8)">
                Buồng kín IoT chuẩn vi khí hậu
              </AppText>
            </View>

            <View style={styles.ctaContent}>
              <AppText variant="h2" weight="bold" color="#FFFFFF">
                Thuê khay nuôi trồng nấm
              </AppText>
              <AppText variant="bodySmall" color="rgba(255, 255, 255, 0.9)" style={styles.ctaSubtitle}>
                Tự động điều phối vi khí hậu, phun sương giữ ẩm chính xác và thanh toán tức thì qua PayOS VietQR.
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

        {/* Pending Order Notice Banner (Customer Only) */}
        {!isStaff && isCustomer && pendingOrders.length > 0 && (
          <Pressable onPress={() => router.push('/(tabs)/orders' as any)}>
            <AppCard elevation="xs" style={styles.pendingOrderBanner}>
              <View style={styles.pendingOrderRow}>
                <Ionicons name="alert-circle" size={24} color={theme.colors.warning.main} />
                <View style={styles.pendingOrderText}>
                  <AppText variant="label" weight="bold">
                    Bạn có {pendingOrders.length} đơn hàng chờ thanh toán
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Nhấn vào đây để thanh toán qua PayOS và hoàn tất giao dịch.
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
              </View>
            </AppCard>
          </Pressable>
        )}

        {!isStaff ? (
          <AppCard elevation="sm" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconBadge}>
                <Ionicons name="receipt-outline" size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.heroTextGroup}>
                <AppText variant="overline" color={theme.colors.primary[500]}>
                  Tổng quan tài khoản
                </AppText>
                <AppText variant="h3">Đơn hàng của bạn</AppText>
              </View>
            </View>
            {dashboardLoading ? (
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Đang tải đơn hàng...
              </AppText>
            ) : (
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>Tổng đơn</AppText>
                  <AppText variant="title" weight="bold">
                    {dashboardError ? '—' : orders.length}
                  </AppText>
                </View>
                <AppDivider orientation="vertical" spacing="sm" />
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>Chờ thanh toán</AppText>
                  <AppText variant="title" weight="bold" color={theme.colors.warning.main}>
                    {dashboardError
                      ? '—'
                      : pendingOrders.filter((order) => order.payment_status !== 'PAID').length}
                  </AppText>
                </View>
              </View>
            )}
          </AppCard>
        ) : null}

        {/* IoT telemetry is for staff only; customer-specific tray telemetry needs a
            backend ownership-scoped endpoint and must not use farm-wide readings. */}
        {isStaff ? <AppCard elevation="sm" style={styles.heroCard}>
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
          </View>

          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.heroDescription}>
            {dashboardLoading
              ? 'Đang tải dữ liệu cảm biến...'
              : `Đang ghi nhận số đo từ ${activeSensors.length} cảm biến.`}
          </AppText>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ trung bình
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                {avgTemp ? `${avgTemp} °C` : 'Chưa có dữ liệu'}
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm trung bình
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                {avgHum ? `${avgHum} %` : 'Chưa có dữ liệu'}
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Trạng thái Master
              </AppText>
              <AppText
                variant="title"
                weight="bold"
                color={firstMaster?.reportedStatus === 'online' ? theme.colors.success.main : theme.colors.warning.main}
              >
                {formatMistingCode('reportedStatus', firstMaster?.reportedStatus)}




              </AppText>
            </View>
          </View>
        </AppCard> : null}

        {/* Quick Action Navigation Grid */}
        <View style={styles.quickActionsSection}>
          <AppText variant="label" color={theme.colors.text.muted}>
            {isStaff ? 'CÔNG CỤ QUẢN TRỊ & ĐIỀU KHIỂN' : 'TRUY CẬP NHANH CHỨC NĂNG HỆ THỐNG'}
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
  pendingOrderBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pendingOrderText: {
    flex: 1,
    gap: 2,
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
