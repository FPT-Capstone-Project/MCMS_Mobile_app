import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import {
  CustomerOrder,
  orderRepository,
} from '../../src/features/order';
import { useAuth } from '../../src/features/auth';
import {
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

/**
 * Home Tab Screen ("Trang chủ")
 * Comprehensive dashboard connecting real IoT telemetry, Quick Actions, and Active Orders.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { isAdmin, isFarmOperator, isCustomer } = useAuth();
  const isStaff = isAdmin || isFarmOperator;

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [activeSensors, setActiveSensors] = useState<IotSensor[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [ordersData, mastersData] = await Promise.all([
        orderRepository.getCustomerOrders().catch(() => []),
        iotRepository.getMasters().catch(() => []),
      ]);

      setOrders(ordersData);
      setMasters(mastersData);

      if (mastersData.length > 0) {
        const sensors = await iotRepository.getMasterSensors(mastersData[0].masterId).catch(() => []);
        setActiveSensors(sensors);
      }
    } catch {
      // Graceful fallback
    }
  }, []);

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
      : '25.0';

  const avgHum =
    validHumSensors.length > 0
      ? (validHumSensors.reduce((acc, s) => acc + (s.humidity || 0), 0) / validHumSensors.length).toFixed(0)
      : '85';

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

        {/* Real IoT Chamber Telemetry Card */}
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
          </View>

          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.heroDescription}>
            Hệ thống IoT kết nối trực tiếp đến backend Render. Đang ghi nhận số đo từ {activeSensors.length} cảm biến.
          </AppText>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ trung bình
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                {avgTemp} °C
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm trung bình
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                {avgHum} %
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
                {firstMaster?.reportedStatus === 'online'
                  ? 'Trực tuyến'
                  : firstMaster?.reportedStatus === 'offline'
                  ? 'Ngoại tuyến'
                  : 'Sẵn sàng'}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Quick Action Navigation Grid */}
        <View style={styles.quickActionsSection}>
          <AppText variant="label" color={theme.colors.text.muted}>
            {isStaff ? 'CÔNG CỤ QUẢN TRỊ & ĐIỀU KHIỂN' : 'TRUY CẬP NHANH CHỨC NĂNG HỆ THỐNG'}
          </AppText>

          <View style={styles.actionGrid}>
            {isStaff ? (
              /* Admin & Operator Actions */
              <>
                {/* 1. Điều khiển SSR thủ công (Tất cả 8 kênh) */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/control/manual' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <Ionicons name="hardware-chip-outline" size={24} color="#3B82F6" />
                      </View>
                    </View>
                    <AppText variant="label" weight="bold">
                      SSR 8 kênh thủ công
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Điều khiển rơ-le Master
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 2. Điều khiển van & đèn theo phòng */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/control' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="options-outline" size={24} color="#10B981" />
                      </View>
                    </View>
                    <AppText variant="label" weight="bold">
                      Van & Đèn phòng
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Điều khiển theo sơ đồ tầng
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 3. Phun sương tự động */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/automatic' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                        <Ionicons name="water-outline" size={24} color="#0EA5E9" />
                      </View>
                    </View>
                    <AppText variant="label" weight="bold">
                      Tự động hóa
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Cấu hình vi khí hậu tự động
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 4. Cảm biến & Biểu đồ */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/sensors' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <Ionicons name="stats-chart-outline" size={24} color="#F59E0B" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Cảm biến & Biểu đồ
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Lịch sử đo vi khí hậu
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 5. Phòng, Tầng & Khay */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/cultivation' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                      <Ionicons name="layers-outline" size={24} color="#8B5CF6" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Phòng, Tầng & Khay
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Hạ tầng nuôi trồng
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 6. Danh mục nấm */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/mushrooms' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                      <Ionicons name="leaf-outline" size={24} color="#EC4899" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Danh mục nấm
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Catalog & Điều kiện tối ưu
                    </AppText>
                  </AppCard>
                </Pressable>
              </>
            ) : (
              /* Customer Actions */
              <>
                {/* 1. Thuê khay mới */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/rental' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                      <Ionicons name="cube-outline" size={24} color={theme.colors.primary[600]} />
                    </View>
                    <AppText variant="label" weight="bold">
                      Thuê khay mới
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Đăng ký gói nuôi trồng
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 2. Khay của tôi */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/(tabs)/tray' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="leaf-outline" size={24} color="#3B82F6" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Khay của tôi
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Theo dõi quá trình nấm lớn
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 3. Đơn hàng & Thanh toán */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/(tabs)/orders' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(20, 184, 166, 0.1)' }]}>
                      <Ionicons name="receipt-outline" size={24} color="#14B8A6" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Đơn hàng & QR
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      PayOS VietQR thanh toán
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 4. Cảm biến vi khí hậu */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/sensors' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <Ionicons name="stats-chart-outline" size={24} color="#F59E0B" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Cảm biến vi khí hậu
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Nhiệt độ & Độ ẩm buồng
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 5. Danh mục nấm */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/mushrooms' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                      <Ionicons name="flower-outline" size={24} color="#EC4899" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Danh mục nấm
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Các giống nấm phổ biến
                    </AppText>
                  </AppCard>
                </Pressable>

                {/* 6. Buồng & Phòng trồng */}
                <Pressable style={styles.actionCardWrapper} onPress={() => router.push('/cultivation' as any)}>
                  <AppCard elevation="xs" style={styles.quickActionCard}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                      <Ionicons name="layers-outline" size={24} color="#8B5CF6" />
                    </View>
                    <AppText variant="label" weight="bold">
                      Phòng nuôi trồng
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Không gian & Điều kiện phòng
                    </AppText>
                  </AppCard>
                </Pressable>
              </>
            )}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionCardWrapper: {
    width: '48%',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 4,
    minHeight: 110,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.warning.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
