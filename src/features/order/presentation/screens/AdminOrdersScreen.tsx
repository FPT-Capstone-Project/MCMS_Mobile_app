import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import {
  CultivationSessionAdmin,
  ProgressHistoryItem,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import { SpawnInspectionModal } from '../../../iot/presentation/components/SpawnInspectionModal';
import { SpawnInspectionHistoryModal } from '../../../iot/presentation/components/SpawnInspectionHistoryModal';
import { GrowthUpdateModal } from '../../../cultivation/presentation/components/GrowthUpdateModal';
import { HarvestReadinessModal } from '../../../cultivation/presentation/components/HarvestReadinessModal';
import { HarvestActionModal } from '../../../cultivation/presentation/components/HarvestActionModal';
import { SessionDetailModal } from '../../../cultivation/presentation/components/SessionDetailModal';
import {
  DailyTrayInspectionModal,
  DailyTrayInspectionHistoryModal,
} from '../../../cultivation';
import { CustomerOrder } from '../../domain/entities/Order';
import { orderRepository } from '../../data/repositories/OrderRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';

const StatusBadge: React.FC<{
  label: string;
  variant: 'warning' | 'success' | 'info' | 'neutral' | 'error';
}> = ({ label, variant }) => {
  let bg: string = theme.colors.neutral[100];
  let color: string = theme.colors.text.secondary;

  if (variant === 'warning') {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = theme.colors.warning.dark;
  } else if (variant === 'success') {
    bg = 'rgba(34, 197, 94, 0.15)';
    color = theme.colors.success.dark;
  } else if (variant === 'info') {
    bg = 'rgba(14, 165, 233, 0.15)';
    color = theme.colors.info.dark;
  } else if (variant === 'error') {
    bg = 'rgba(239, 68, 68, 0.15)';
    color = theme.colors.error.dark;
  }

  return (
    <View style={[styles.badgeBox, { backgroundColor: bg }]}>
      <AppText variant="caption" weight="bold" color={color}>
        {label}
      </AppText>
    </View>
  );
};

type AdminTab = 'rentals' | 'orders';

const RENTAL_STATUS_FILTERS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Chờ xử lý (PENDING)', value: 'PENDING' },
  { label: 'Ủ tơ (SPAWN_RESTING)', value: 'SPAWN_RESTING' },
  { label: 'Phát triển tơ', value: 'MYCELIAL_DEVELOPMENT' },
  { label: 'Sẵn sàng trồng', value: 'READY_FOR_CULTIVATION' },
  { label: 'Đang trồng', value: 'CULTIVATING' },
  { label: 'Sẵn sàng thu hoạch', value: 'HARVEST_READY' },
  { label: 'Hoàn thành', value: 'COMPLETED' },
];

const ORDER_STATUS_FILTERS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Chờ xử lý', value: 'PENDING' },
  { label: 'Đã thanh toán', value: 'PAID' },
  { label: 'Đang xử lý', value: 'PROCESSING' },
  { label: 'Hoàn thành', value: 'COMPLETED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];

export const AdminOrdersScreen: React.FC = () => {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('rentals');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filters
  const [rentalFilter, setRentalFilter] = useState('ALL');
  const [orderFilter, setOrderFilter] = useState('ALL');

  // Data states
  const [sessions, setSessions] = useState<CultivationSessionAdmin[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Stage Action State
  const [actionLoadingSessionId, setActionLoadingSessionId] = useState<number | null>(null);

  // Modals for Spawn Inspection
  const [inspectionSession, setInspectionSession] = useState<CultivationSessionAdmin | null>(null);
  const [inspectionModalVisible, setInspectionModalVisible] = useState(false);
  const [historySession, setHistorySession] = useState<CultivationSessionAdmin | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // New Modals for Growth, Harvest Readiness, Harvest Lifecycle, and Session Detail
  const [detailSession, setDetailSession] = useState<CultivationSessionAdmin | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [growthSession, setGrowthSession] = useState<CultivationSessionAdmin | null>(null);
  const [latestProgressForGrowth, setLatestProgressForGrowth] = useState<ProgressHistoryItem | null>(null);
  const [growthModalVisible, setGrowthModalVisible] = useState(false);

  const [readinessSession, setReadinessSession] = useState<CultivationSessionAdmin | null>(null);
  const [readinessModalVisible, setReadinessModalVisible] = useState(false);

  const [harvestSession, setHarvestSession] = useState<CultivationSessionAdmin | null>(null);
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);

  // Daily Tray Inspection Modals State
  const [dailyTraySession, setDailyTraySession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyTraySessionTrayId, setDailyTraySessionTrayId] = useState<number | null>(null);
  const [dailyTrayModalVisible, setDailyTrayModalVisible] = useState(false);

  const [dailyHistorySession, setDailyHistorySession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyHistorySessionTrayId, setDailyHistorySessionTrayId] = useState<number | null>(null);
  const [dailyHistoryModalVisible, setDailyHistoryModalVisible] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setErrorMessage(null);
    try {
      if (activeTab === 'rentals') {
        // Fetch sessions from GET /api/farm/sessions
        const sessRes = await iotRepository.getAdminCultivationSessions(
          rentalFilter === 'ALL' ? undefined : rentalFilter
        );
        setSessions(sessRes);
      } else {
        // Fetch orders: try customer orders first
        try {
          const directOrders = await orderRepository.getCustomerOrders(
            orderFilter === 'ALL' ? undefined : orderFilter
          );
          if (directOrders.length > 0) {
            setOrders(directOrders);
            return;
          }
        } catch {
          // Fall through to farm session orders
        }

        // If no personal customer orders (e.g. current user is Admin/Operator),
        // synthesize orders from the farm cultivation sessions list (orders #7, #13, etc.)
        const farmSessions = await iotRepository.getAdminCultivationSessions();
        const ordersMap = new Map<number, CustomerOrder>();

        farmSessions.forEach((sess) => {
          if (!sess.order_id) return;
          if (!ordersMap.has(sess.order_id)) {
            ordersMap.set(sess.order_id, {
              order_id: sess.order_id,
              user_id: 1,
              order_status:
                sess.status === 'COMPLETED'
                  ? 'COMPLETED'
                  : sess.status === 'CANCELLED'
                  ? 'CANCELLED'
                  : 'PROCESSING',
              payment_status: 'PAID',
              total_amount: (sess.required_trays || sess.tray_quantity || 1) * 350000,
              created_at: sess.created_at || new Date().toISOString(),
              updated_at: sess.updated_at || new Date().toISOString(),
              items: [
                {
                  order_item_id: sess.session_id,
                  mushroom_name: sess.mushroom_name || 'Nấm giống',
                  package_name: `Gói thuê khay (${sess.required_trays || sess.tray_quantity || 1} khay)`,
                  quantity: sess.required_trays || sess.tray_quantity || 1,
                  price: 350000,
                  total_price: (sess.required_trays || sess.tray_quantity || 1) * 350000,
                },
              ],
            });
          }
        });

        const derivedOrders = Array.from(ordersMap.values());
        if (orderFilter !== 'ALL') {
          setOrders(derivedOrders.filter((o) => o.order_status === orderFilter));
        } else {
          setOrders(derivedOrders);
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải danh sách dữ liệu từ máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, rentalFilter, orderFilter]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isMounted) {
        setLoading(true);
        await fetchData();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  // Automatically refresh data when screen comes back into focus (e.g. after assigning trays or updating session)
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Stage transition action handler
  const handleTransitionStage = async (
    session: CultivationSessionAdmin,
    targetStage: 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION'
  ) => {
    setActionLoadingSessionId(session.session_id);
    try {
      await iotRepository.updateSessionStage(session.session_id, targetStage);

      let msg = '';
      if (targetStage === 'SPAWN_RESTING') {
        msg = `Phiên #${session.session_id} đã bắt đầu giai đoạn Ủ TƠ / HỒI SỨC PHÔI (SPAWN_RESTING).`;
      } else if (targetStage === 'READY_FOR_CULTIVATION') {
        msg = `Phiên #${session.session_id} đã chuyển sang SẴN SÀNG TRỒNG (READY_FOR_CULTIVATION). Bạn có thể xếp khay vào tầng ngay bây giờ!`;
      }

      Alert.alert('Chuyển giai đoạn thành công', msg);
      await fetchData();
    } catch (err: any) {
      const errText = err?.message || '';
      let friendlyText = 'Không thể chuyển giai đoạn phiên.';
      if (errText.includes('Stage transition requirements') || errText.includes('409') || errText.includes('NORMAL')) {
        friendlyText =
          'Chưa đạt điều kiện: Đợt kiểm tra phôi gần nhất phải đạt chuẩn (NORMAL) và kiểm tra đủ toàn bộ số bịch phôi trước khi chuyển sang Sẵn sàng trồng.';
      } else if (errText) {
        friendlyText = errText;
      }
      Alert.alert('Lỗi chuyển giai đoạn', friendlyText);
    } finally {
      setActionLoadingSessionId(null);
    }
  };

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const matchId = String(s.session_id).includes(q) || String(s.order_id || '').includes(q);
      const matchCustomer =
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.customer_email && s.customer_email.toLowerCase().includes(q));
      const matchMushroom = s.mushroom_name && s.mushroom_name.toLowerCase().includes(q);
      return matchId || matchCustomer || matchMushroom;
    });
  }, [sessions, searchQuery]);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        String(o.order_id).includes(q) ||
        (o.items &&
          o.items.some(
            (item) =>
              (item.mushroom_name && item.mushroom_name.toLowerCase().includes(q)) ||
              (item.package_name && item.package_name.toLowerCase().includes(q))
          ))
    );
  }, [orders, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (activeTab === 'rentals') {
      const pendingCount = sessions.filter((s) => s.status === 'PENDING').length;
      const restingCount = sessions.filter(
        (s) => s.status === 'SPAWN_RESTING' || s.status === 'MYCELIAL_DEVELOPMENT'
      ).length;
      const readyCount = sessions.filter((s) => s.status === 'READY_FOR_CULTIVATION').length;
      const cultivatingCount = sessions.filter((s) => s.status === 'CULTIVATING').length;

      return {
        total: sessions.length,
        highlight1: readyCount,
        highlight1Label: 'Sẵn sàng trồng',
        highlight2: restingCount + pendingCount,
        highlight2Label: 'Đang ủ/kiểm tra',
        highlight3: cultivatingCount,
        highlight3Label: 'Đang trồng',
      };
    } else {
      const pending = orders.filter((o) => o.order_status === 'PENDING').length;
      const paid = orders.filter((o) => o.payment_status === 'PAID').length;
      return {
        total: orders.length,
        highlight1: pending,
        highlight1Label: 'Chờ xử lý',
        highlight2: paid,
        highlight2Label: 'Đã thanh toán',
        highlight3: 0,
        highlight3Label: '',
      };
    }
  }, [activeTab, sessions, orders]);

  const renderSessionBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <StatusBadge variant="warning" label="Chờ ủ tơ (PENDING)" />;
      case 'SPAWN_RESTING':
        return <StatusBadge variant="info" label="Đang ủ tơ (SPAWN_RESTING)" />;
      case 'MYCELIAL_DEVELOPMENT':
        return <StatusBadge variant="info" label="Phát triển tơ nấm" />;
      case 'READY_FOR_CULTIVATION':
        return <StatusBadge variant="warning" label="Sẵn sàng trồng (CHỜ GÁN KHAY)" />;
      case 'CULTIVATING':
        return <StatusBadge variant="success" label="Đang trồng (CULTIVATING)" />;
      case 'HARVEST_READY':
        return <StatusBadge variant="info" label="Sẵn sàng thu hoạch" />;
      case 'HARVESTING':
        return <StatusBadge variant="info" label="Đang thu hoạch" />;
      case 'COMPLETED':
        return <StatusBadge variant="neutral" label="Đã hoàn thành" />;
      case 'CANCELLED':
        return <StatusBadge variant="error" label="Đã hủy" />;
      default:
        return <StatusBadge variant="neutral" label={status} />;
    }
  };

  const renderOrderBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <StatusBadge variant="warning" label="Chờ thanh toán" />;
      case 'PAID':
        return <StatusBadge variant="success" label="Đã thanh toán" />;
      case 'PROCESSING':
        return <StatusBadge variant="info" label="Đang canh tác" />;
      case 'COMPLETED':
        return <StatusBadge variant="neutral" label="Hoàn thành" />;
      case 'CANCELLED':
        return <StatusBadge variant="error" label="Đã hủy" />;
      default:
        return <StatusBadge variant="neutral" label={status} />;
    }
  };

  return (
    <ScreenContainer scrollable={false} edges={['top', 'left', 'right']}>
      {/* Header */}
      <AppHeader
        title="Quản lý Đơn & Phiên nuôi trồng"
        subtitle="Quản lý vòng đời phôi, gán khay & đơn khách hàng"
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
      />

      {/* Main Segmented Switcher */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'rentals' && styles.segmentBtnActive]}
          onPress={() => {
            setActiveTab('rentals');
            setSearchQuery('');
          }}
        >
          <Ionicons
            name="cube-outline"
            size={18}
            color={activeTab === 'rentals' ? '#FFFFFF' : theme.colors.text.secondary}
          />
          <AppText
            variant="label"
            weight={activeTab === 'rentals' ? 'bold' : 'normal'}
            color={activeTab === 'rentals' ? '#FFFFFF' : theme.colors.text.secondary}
          >
            Đơn thuê & Phiên trồng ({sessions.length})
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeTab === 'orders' && styles.segmentBtnActive]}
          onPress={() => {
            setActiveTab('orders');
            setSearchQuery('');
          }}
        >
          <Ionicons
            name="receipt-outline"
            size={18}
            color={activeTab === 'orders' ? '#FFFFFF' : theme.colors.text.secondary}
          />
          <AppText
            variant="label"
            weight={activeTab === 'orders' ? 'bold' : 'normal'}
            color={activeTab === 'orders' ? '#FFFFFF' : theme.colors.text.secondary}
          >
            Đơn hàng nông sản ({orders.length})
          </AppText>
        </Pressable>
      </View>

      {/* Top Stats Overview */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Tổng số
          </AppText>
          <AppText variant="title" weight="bold">
            {stats.total}
          </AppText>
        </View>
        <View style={[styles.statBox, styles.statBoxHighlight1]}>
          <AppText variant="caption" color={theme.colors.warning.dark}>
            {stats.highlight1Label}
          </AppText>
          <AppText variant="title" weight="bold" color={theme.colors.warning.dark}>
            {stats.highlight1}
          </AppText>
        </View>
        <View style={[styles.statBox, styles.statBoxHighlight2]}>
          <AppText variant="caption" color={theme.colors.info.dark}>
            {stats.highlight2Label}
          </AppText>
          <AppText variant="title" weight="bold" color={theme.colors.info.dark}>
            {stats.highlight2}
          </AppText>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={theme.colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'rentals'
              ? 'Tìm theo mã phiên, mã đơn, tên khách, loại nấm...'
              : 'Tìm theo mã đơn, tên sản phẩm...'
          }
          placeholderTextColor={theme.colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
          </Pressable>
        )}
      </View>

      {/* Status Filter Chips */}
      <View style={styles.chipsScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {(activeTab === 'rentals' ? RENTAL_STATUS_FILTERS : ORDER_STATUS_FILTERS).map((filter) => {
            const isSelected =
              activeTab === 'rentals'
                ? rentalFilter === filter.value
                : orderFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  if (activeTab === 'rentals') {
                    setRentalFilter(filter.value);
                  } else {
                    setOrderFilter(filter.value);
                  }
                }}
              >
                <AppText
                  variant="caption"
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? theme.colors.primary[600] : theme.colors.text.secondary}
                >
                  {filter.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <AppDivider spacing="none" />

      {/* Main List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Error banner if network/server fails */}
        {errorMessage && (
          <AppCard elevation="xs" style={styles.errorCard}>
            <View style={styles.errorCardRow}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.error.main} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="bold" color={theme.colors.error.dark}>
                  Không thể đồng bộ dữ liệu
                </AppText>
                <AppText variant="caption" color={theme.colors.error.dark}>
                  {errorMessage}
                </AppText>
              </View>
            </View>
            <AppButton
              title="Thử lại"
              size="sm"
              variant="outline"
              onPress={fetchData}
              style={{ marginTop: 8, alignSelf: 'flex-end' }}
            />
          </AppCard>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
              Đang tải danh sách...
            </AppText>
          </View>
        ) : activeTab === 'rentals' ? (
          filteredSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={theme.colors.neutral[300]} />
              <AppText variant="body" weight="medium" color={theme.colors.text.secondary}>
                Không tìm thấy phiên nuôi trồng nào
              </AppText>
              <AppText variant="caption" color={theme.colors.text.muted} align="center">
                Vui lòng thử lại với từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
              </AppText>
            </View>
          ) : (
            filteredSessions.map((session) => {
              const reqTrays = session.required_trays || session.tray_quantity || 1;
              const expectedBags = reqTrays * 3;
              const isActionLoading = actionLoadingSessionId === session.session_id;

              return (
                <AppCard key={session.session_id} elevation="xs" style={styles.card}>
                  {/* Card Header: Session ID & Status (Pressable to open detail) */}
                  <Pressable
                    onPress={() => {
                      setDetailSession(session);
                      setDetailModalVisible(true);
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.idRow}>
                        <View style={styles.sessionIconBox}>
                          <Ionicons name="cube" size={16} color={theme.colors.primary[600]} />
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <AppText variant="body" weight="bold">
                              Phiên #{session.session_id}
                            </AppText>
                            <Ionicons name="chevron-forward" size={14} color={theme.colors.text.muted} />
                          </View>
                          {session.order_id && (
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Đơn hàng: #{session.order_id}
                            </AppText>
                          )}
                        </View>
                      </View>
                      {renderSessionBadge(session.status)}
                    </View>
                  </Pressable>

                  <AppDivider spacing="xs" />

                  {/* Customer info */}
                  <View style={styles.infoRow}>
                    <Ionicons name="person-circle-outline" size={16} color={theme.colors.text.muted} />
                    <AppText variant="bodySmall" weight="medium">
                      {session.customer_name || 'Khách hàng SmartMush'}
                    </AppText>
                    {session.customer_phone && (
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        • {session.customer_phone}
                      </AppText>
                    )}
                  </View>

                  {/* Mushroom & Trays info */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Giống nấm
                      </AppText>
                      <View style={styles.mushroomBadge}>
                        <Ionicons name="leaf" size={12} color={theme.colors.primary[600]} />
                        <AppText variant="caption" weight="bold" color={theme.colors.primary[800]}>
                          {session.mushroom_name || 'Nấm giống'}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Khay / Bịch phôi
                      </AppText>
                      <AppText variant="bodySmall" weight="bold">
                        {reqTrays} khay ({expectedBags} bịch)
                      </AppText>
                    </View>

                    <View style={styles.detailItem}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Vị trí tầng
                      </AppText>
                      {(() => {
                        const assignedFloorName =
                          session.floor_name ||
                          session.trays?.[0]?.floor_name ||
                          (session.floor_id != null ? `Tầng ${session.floor_id}` : null) ||
                          (session.trays?.[0]?.floor_id != null ? `Tầng ${session.trays[0].floor_id}` : null);
                        const assignedCount = session.trays?.length || 0;

                        return (
                          <AppText
                            variant="bodySmall"
                            weight="medium"
                            color={
                              assignedFloorName
                                ? theme.colors.text.primary
                                : theme.colors.warning.dark
                            }
                          >
                            {assignedFloorName
                              ? `${assignedFloorName}${assignedCount > 0 ? ` (${assignedCount} khay)` : ''}`
                              : 'Chưa gán tầng'}
                          </AppText>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Spawn phase badge / notice if relevant */}
                  {session.spawn_status && (
                    <View style={styles.spawnStatusNotice}>
                      <Ionicons name="git-branch-outline" size={14} color={theme.colors.info.dark} />
                      <AppText variant="caption" color={theme.colors.info.dark}>
                        Giai đoạn phôi: <AppText variant="caption" weight="bold" color={theme.colors.info.dark}>{session.spawn_status}</AppText>
                      </AppText>
                    </View>
                  )}

                  {/* Growth & Harvest status notice if relevant */}
                  {(session.growth_status || session.progress_percent != null || (session.status !== 'COMPLETED' && session.harvest_status)) && (
                    <View style={styles.growthNoticeBox}>
                      <Ionicons name="trending-up" size={14} color={theme.colors.primary[700]} />
                      <AppText variant="caption" color={theme.colors.primary[800]} style={{ flex: 1 }}>
                        Sinh trưởng:{' '}
                        <AppText variant="caption" weight="bold">
                          {session.growth_status || 'Chưa ghi nhận'}
                        </AppText>
                        {session.progress_percent != null ? ` (${session.progress_percent}%)` : ''}
                      </AppText>

                      {session.status !== 'COMPLETED' && session.harvest_status && (
                        <View
                          style={[
                            styles.harvestStatusTag,
                            session.harvest_status === 'HARVEST_READY' ? styles.tagReady : styles.tagNotReady,
                          ]}
                        >
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={session.harvest_status === 'HARVEST_READY' ? theme.colors.success.dark : theme.colors.warning.dark}
                          >
                            {session.harvest_status}
                          </AppText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Action buttons based on lifecycle status */}
                  <View style={styles.cardActions}>
                    {/* 1. PENDING: Start resting / incubation */}
                    {session.status === 'PENDING' && (
                      <View style={styles.actionCol}>
                        <AppButton
                          title={isActionLoading ? 'Đang chuyển...' : 'Bắt đầu ủ tơ / Hồi sức'}
                          variant="primary"
                          size="sm"
                          leftIcon={<Ionicons name="flask-outline" size={16} color="#FFFFFF" />}
                          disabled={isActionLoading}
                          onPress={() => handleTransitionStage(session, 'SPAWN_RESTING')}
                        />
                        <AppButton
                          title="Xem chi tiết phiên"
                          variant="outline"
                          size="sm"
                          leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                          onPress={() => {
                            setDetailSession(session);
                            setDetailModalVisible(true);
                          }}
                        />
                      </View>
                    )}

                    {/* 2. SPAWN_RESTING or MYCELIAL_DEVELOPMENT: Inspect spawn & transition */}
                    {(session.status === 'SPAWN_RESTING' || session.status === 'MYCELIAL_DEVELOPMENT') && (
                      <View style={styles.spawnWorkflowRow}>
                        <View style={styles.spawnActionsSubrow}>
                          <AppButton
                            title="Kiểm tra phôi"
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />}
                            onPress={() => {
                              setInspectionSession(session);
                              setInspectionModalVisible(true);
                            }}
                          />
                          <AppButton
                            title="Lịch sử kiểm tra"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="time-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              setHistorySession(session);
                              setHistoryModalVisible(true);
                            }}
                          />
                        </View>
                        <AppButton
                          title={isActionLoading ? 'Đang xác nhận...' : 'Xác nhận sẵn sàng trồng (READY_FOR_CULTIVATION)'}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Ionicons name="checkmark-done" size={16} color={theme.colors.success.dark} />}
                          disabled={isActionLoading}
                          onPress={() => handleTransitionStage(session, 'READY_FOR_CULTIVATION')}
                        />
                        <AppButton
                          title="Xem chi tiết phiên"
                          variant="outline"
                          size="sm"
                          leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                          onPress={() => {
                            setDetailSession(session);
                            setDetailModalVisible(true);
                          }}
                        />
                      </View>
                    )}

                    {/* 3. READY_FOR_CULTIVATION: Assign trays */}
                    {session.status === 'READY_FOR_CULTIVATION' && (
                      <View style={styles.actionCol}>
                        <AppButton
                          title="Xếp khay vào tầng"
                          variant="primary"
                          size="sm"
                          leftIcon={<Ionicons name="grid-outline" size={16} color="#FFFFFF" />}
                          onPress={() => router.push('/cultivation')}
                        />
                        <AppButton
                          title="Xem chi tiết phiên"
                          variant="outline"
                          size="sm"
                          leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                          onPress={() => {
                            setDetailSession(session);
                            setDetailModalVisible(true);
                          }}
                        />
                      </View>
                    )}

                    {/* 4. CULTIVATING: Daily Tray Report, Growth, Harvest Readiness, Harvest Actions */}
                    {session.status === 'CULTIVATING' && (
                      <View style={styles.actionCol}>
                        {/* Daily Tray Report Buttons */}
                        <View style={styles.spawnActionsSubrow}>
                          <AppButton
                            title="Báo cáo khay"
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                            disabled={!session.trays || session.trays.length === 0}
                            onPress={() => {
                              setDailyTraySession(session);
                              setDailyTraySessionTrayId(null);
                              setDailyTrayModalVisible(true);
                            }}
                          />
                          <AppButton
                            title="Lịch sử khay"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="images-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              setDailyHistorySession(session);
                              setDailyHistorySessionTrayId(null);
                              setDailyHistoryModalVisible(true);
                            }}
                          />
                        </View>

                        <View style={styles.spawnActionsSubrow}>
                          <AppButton
                            title="Cập nhật tiến độ"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="trending-up" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              setGrowthSession(session);
                              const synthProg: ProgressHistoryItem | null =
                                session.progress_percent != null || session.growth_status
                                  ? {
                                      progress_id: 0,
                                      session_id: session.session_id,
                                      current_stage: (session.current_stage ||
                                        session.growth_status ||
                                        'FRUITING_INITIATION') as string,
                                      progress_percent:
                                        session.progress_percent != null
                                          ? Number(session.progress_percent)
                                          : 0,
                                      condition: session.condition || 'NORMAL',
                                      description: '',
                                      expected_harvest_date: session.harvest_date,
                                      created_at: new Date().toISOString(),
                                    }
                                  : null;
                              setLatestProgressForGrowth(synthProg);
                              setGrowthModalVisible(true);
                            }}
                          />
                          <AppButton
                            title="Đánh giá thu hoạch"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="ribbon-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              setReadinessSession(session);
                              setReadinessModalVisible(true);
                            }}
                          />
                        </View>

                        {session.harvest_status === 'HARVEST_READY' && (
                          <AppButton
                            title="Quản lý thu hoạch (HARVEST)"
                            variant="secondary"
                            size="sm"
                            leftIcon={<Ionicons name="leaf" size={16} color={theme.colors.success.dark} />}
                            onPress={() => {
                              setHarvestSession(session);
                              setHarvestModalVisible(true);
                            }}
                          />
                        )}

                        <View style={styles.spawnActionsSubrow}>
                          <AppButton
                            title="Xem tầng & khay"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="layers-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => router.push('/cultivation')}
                          />
                          <AppButton
                            title="Xem chi tiết"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              setDetailSession(session);
                              setDetailModalVisible(true);
                            }}
                          />
                        </View>
                      </View>
                    )}

                    {/* 5. HARVESTING: Manage harvest yield & completion */}
                    {session.status === 'HARVESTING' && (
                      <View style={styles.actionCol}>
                        <AppButton
                          title="Quản lý thu hoạch & Sản lượng"
                          variant="primary"
                          size="sm"
                          leftIcon={<Ionicons name="leaf" size={16} color="#FFFFFF" />}
                          onPress={() => {
                            setHarvestSession(session);
                            setHarvestModalVisible(true);
                          }}
                        />
                        <AppButton
                          title="Xem chi tiết phiên"
                          variant="outline"
                          size="sm"
                          leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                          onPress={() => {
                            setDetailSession(session);
                            setDetailModalVisible(true);
                          }}
                        />
                      </View>
                    )}

                    {/* 6. COMPLETED or CANCELLED */}
                    {(session.status === 'COMPLETED' || session.status === 'CANCELLED') && (
                      <AppButton
                        title="Xem chi tiết & Lịch sử phiên"
                        variant="outline"
                        size="sm"
                        leftIcon={<Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />}
                        onPress={() => {
                          setDetailSession(session);
                          setDetailModalVisible(true);
                        }}
                      />
                    )}
                  </View>
                </AppCard>
              );
            })
          )
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.neutral[300]} />
            <AppText variant="body" weight="medium" color={theme.colors.text.secondary}>
              Không tìm thấy đơn hàng nào
            </AppText>
            <AppText variant="caption" color={theme.colors.text.muted} align="center">
              Chưa có đơn hàng nông sản nào phù hợp với điều kiện tìm kiếm.
            </AppText>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.order_id;
            return (
              <AppCard key={order.order_id} elevation="xs" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <AppText variant="body" weight="bold">
                      Đơn hàng #{order.order_id}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : 'Mới tạo'}
                    </AppText>
                  </View>
                  {renderOrderBadge(order.order_status)}
                </View>

                <AppDivider spacing="xs" />

                {/* Amount and summary */}
                <View style={styles.orderAmountRow}>
                  <View>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Tổng giá trị đơn
                    </AppText>
                    <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                      {formatVND(order.total_amount)}
                    </AppText>
                  </View>
                  <StatusBadge
                    variant={order.payment_status === 'PAID' ? 'success' : 'warning'}
                    label={order.payment_status === 'PAID' ? 'Đã thanh toán (PayOS)' : 'Chờ thanh toán'}
                  />
                </View>

                {/* Items preview */}
                {order.items && order.items.length > 0 && (
                  <View style={styles.orderItemsBox}>
                    {order.items.slice(0, isExpanded ? order.items.length : 2).map((item, idx) => (
                      <View key={item.order_item_id || idx} style={styles.orderItemRow}>
                        <AppText variant="caption" style={{ flex: 1 }}>
                          • {item.mushroom_name || item.package_name || 'Sản phẩm'} (x{item.quantity})
                        </AppText>
                        <AppText variant="caption" weight="medium">
                          {formatVND(item.total_price || (item.unit_price || 0) * (item.quantity || 1))}
                        </AppText>
                      </View>
                    ))}
                    {order.items.length > 2 && (
                      <Pressable
                        onPress={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
                        style={styles.expandBtn}
                      >
                        <AppText variant="caption" color={theme.colors.primary[600]} weight="bold">
                          {isExpanded ? 'Thu gọn chi tiết' : `Xem thêm ${order.items.length - 2} sản phẩm...`}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Cultivation Sessions belonging to this order */}
                {(() => {
                  const orderSessions = sessions.filter((s) => s.order_id === order.order_id);
                  if (orderSessions.length === 0) return null;

                  return (
                    <View style={styles.orderSessionsWrap}>
                      <AppDivider spacing="xs" />
                      <View style={styles.orderSessionsHeader}>
                        <Ionicons name="leaf-outline" size={14} color={theme.colors.primary[600]} />
                        <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                          Phiên nuôi trồng thuộc đơn ({orderSessions.length} phiên):
                        </AppText>
                      </View>

                      <View style={{ gap: 6, marginTop: 4 }}>
                        {orderSessions.map((s) => (
                          <View key={s.session_id} style={styles.orderSessionItem}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <AppText variant="caption" weight="bold">
                                  Phiên #{s.session_id}
                                </AppText>
                                {renderSessionBadge(s.status)}
                              </View>
                              <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={1}>
                                {s.mushroom_name || 'Nấm giống'} • {s.required_trays || 1} khay
                              </AppText>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              {(s.status === 'SPAWN_RESTING' || s.status === 'MYCELIAL_DEVELOPMENT') && (
                                <AppButton
                                  title="Phôi"
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Ionicons name="clipboard-outline" size={13} color="#FFFFFF" />}
                                  onPress={() => {
                                    setInspectionSession(s);
                                    setInspectionModalVisible(true);
                                  }}
                                />
                              )}
                              {s.status === 'CULTIVATING' && (
                                <AppButton
                                  title="Báo cáo"
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Ionicons name="camera" size={13} color="#FFFFFF" />}
                                  disabled={!s.trays || s.trays.length === 0}
                                  onPress={() => {
                                    setDailyTraySession(s);
                                    setDailyTraySessionTrayId(null);
                                    setDailyTrayModalVisible(true);
                                  }}
                                />
                              )}
                              <AppButton
                                title="Chi tiết"
                                variant="outline"
                                size="sm"
                                onPress={() => {
                                  setDetailSession(s);
                                  setDetailModalVisible(true);
                                }}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </AppCard>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Spawn Inspection Modal */}
      <SpawnInspectionModal
        visible={inspectionModalVisible}
        session={inspectionSession}
        onClose={() => {
          setInspectionModalVisible(false);
          setInspectionSession(null);
        }}
        onSuccess={() => {
          setInspectionModalVisible(false);
          setInspectionSession(null);
          fetchData();
        }}
      />

      {/* Spawn Inspection History Modal */}
      <SpawnInspectionHistoryModal
        visible={historyModalVisible}
        session={historySession}
        onClose={() => {
          setHistoryModalVisible(false);
          setHistorySession(null);
        }}
      />

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={detailModalVisible}
        session={detailSession}
        onClose={() => {
          setDetailModalVisible(false);
          setDetailSession(null);
        }}
        onRefreshParent={fetchData}
        onOpenGrowthUpdate={(sess, latestProg) => {
          setGrowthSession(sess);
          setLatestProgressForGrowth(latestProg || null);
          setGrowthModalVisible(true);
        }}
        onOpenHarvestReadiness={(sess) => {
          setReadinessSession(sess);
          setReadinessModalVisible(true);
        }}
        onOpenHarvestAction={(sess) => {
          setHarvestSession(sess);
          setHarvestModalVisible(true);
        }}
        onOpenSpawnInspection={(sess) => {
          setInspectionSession(sess);
          setInspectionModalVisible(true);
        }}
        onOpenSpawnHistory={(sess) => {
          setHistorySession(sess);
          setHistoryModalVisible(true);
        }}
        onOpenDailyTrayInspection={(sess, trayId) => {
          setDailyTraySession(sess);
          setDailyTraySessionTrayId(trayId || null);
          setDailyTrayModalVisible(true);
        }}
        onOpenDailyTrayInspectionHistory={(sess, trayId) => {
          setDailyHistorySession(sess);
          setDailyHistorySessionTrayId(trayId || null);
          setDailyHistoryModalVisible(true);
        }}
        onTransitionStage={(sess, stage) => {
          handleTransitionStage(sess, stage);
        }}
        onNavigateToAssignTrays={() => {
          router.push('/cultivation');
        }}
      />

      {/* Growth Update Modal */}
      {growthSession && (
        <GrowthUpdateModal
          visible={growthModalVisible}
          session={growthSession}
          latestProgress={latestProgressForGrowth}
          onClose={() => {
            setGrowthModalVisible(false);
            setGrowthSession(null);
            setLatestProgressForGrowth(null);
          }}
          onSuccess={async () => {
            await fetchData();
          }}
        />
      )}

      {/* Harvest Readiness Modal */}
      <HarvestReadinessModal
        visible={readinessModalVisible}
        session={readinessSession}
        onClose={() => {
          setReadinessModalVisible(false);
          setReadinessSession(null);
        }}
        onSuccess={async () => {
          await fetchData();
        }}
      />

      {/* Harvest Action Modal */}
      <HarvestActionModal
        visible={harvestModalVisible}
        session={harvestSession}
        onClose={() => {
          setHarvestModalVisible(false);
          setHarvestSession(null);
        }}
        onSuccess={async () => {
          await fetchData();
        }}
      />

      {/* Daily Tray Inspection Modal */}
      <DailyTrayInspectionModal
        visible={dailyTrayModalVisible}
        session={dailyTraySession}
        initialSessionTrayId={dailyTraySessionTrayId}
        onClose={() => {
          setDailyTrayModalVisible(false);
          setDailyTraySession(null);
          setDailyTraySessionTrayId(null);
        }}
        onSuccess={() => {
          setDailyTrayModalVisible(false);
          setDailyTraySession(null);
          setDailyTraySessionTrayId(null);
          void fetchData();
        }}
      />

      {/* Daily Tray Inspection History Modal */}
      <DailyTrayInspectionHistoryModal
        visible={dailyHistoryModalVisible}
        session={dailyHistorySession}
        initialSessionTrayId={dailyHistorySessionTrayId}
        onClose={() => {
          setDailyHistoryModalVisible(false);
          setDailyHistorySession(null);
          setDailyHistorySessionTrayId(null);
        }}
        onOpenCreateReport={(trayId) => {
          setDailyHistoryModalVisible(false);
          setDailyTraySession(dailyHistorySession);
          setDailyTraySessionTrayId(trayId || null);
          setDailyTrayModalVisible(true);
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.screenHorizontal,
    marginVertical: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.md,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary[600],
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.screenHorizontal,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  statBoxHighlight1: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(254, 243, 199, 0.3)',
  },
  statBoxHighlight2: {
    borderColor: 'rgba(14, 165, 233, 0.4)',
    backgroundColor: 'rgba(224, 242, 254, 0.3)',
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.screenHorizontal,
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    paddingVertical: 0,
  },
  chipsScrollWrapper: {
    marginVertical: theme.spacing.xs,
  },
  chipsContent: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.sm,
    gap: 10,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  errorCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  card: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[50],
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailItem: {
    gap: 2,
  },
  mushroomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spawnStatusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginTop: 2,
  },
  growthNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    marginTop: 2,
  },
  harvestStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  tagReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  tagNotReady: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  actionCol: {
    gap: 8,
  },
  cardActions: {
    marginTop: 8,
    gap: 8,
  },
  spawnWorkflowRow: {
    gap: 6,
  },
  spawnActionsSubrow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  orderItemsBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  orderSessionsWrap: {
    marginTop: 8,
  },
  orderSessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
  },
});
