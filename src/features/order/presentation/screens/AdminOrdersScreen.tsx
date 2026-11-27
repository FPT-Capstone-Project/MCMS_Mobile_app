import { AppAlert as Alert } from '../../../../shared/components/feedback/AppDialog';
import { ShipmentTrackingButton } from '../components/ShipmentTracking';
import { canTrackSessionShipment } from '../../domain/shipment';
import { SESSION_FILTERS, GROWTH_FILTERS, HARVEST_SESSION_GROUPS, isHarvestSession, sessionGroup, growthStage, compareSessions, statusLabel } from '../../../cultivation/domain/sessionWorkflow';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  CultivationSessionAdmin,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import { SpawnInspectionModal } from '../../../iot/presentation/components/SpawnInspectionModal';
import { SpawnInspectionHistoryModal } from '../../../iot/presentation/components/SpawnInspectionHistoryModal';
import { HarvestReadinessModal } from '../../../cultivation/presentation/components/HarvestReadinessModal';
import { HarvestActionModal } from '../../../cultivation/presentation/components/HarvestActionModal';
import { SessionDetailModal } from '../../../cultivation/presentation/components/SessionDetailModal';
import {
  DailyTrayInspectionModal,
  DailyTrayInspectionHistoryModal,
} from '../../../cultivation';
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


export const AdminOrdersScreen: React.FC<{
  workflow?: 'cultivation' | 'harvest';
  headerAccessory?: React.ReactNode;
}> = ({ workflow = 'cultivation', headerAccessory }) => {
  const router = useRouter();
  const isHarvestWorkflow = workflow === 'harvest';
  const rentalStatusFilters = SESSION_FILTERS.filter((filter) =>
    filter.value === 'ALL' || HARVEST_SESSION_GROUPS.includes(filter.value) === isHarvestWorkflow,
  );

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filters
  const [rentalFilter, setRentalFilter] = useState('ALL');
  const [growthFilter, setGrowthFilter] = useState('ALL');

  // Data states
  const [allSessions, setSessions] = useState<CultivationSessionAdmin[]>([]);
  const sessions = useMemo(() => allSessions.filter((session) =>
    isHarvestSession(session) === isHarvestWorkflow,
  ), [allSessions, isHarvestWorkflow]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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


  const [readinessSession, setReadinessSession] = useState<CultivationSessionAdmin | null>(null);
  const [readinessModalVisible, setReadinessModalVisible] = useState(false);

  const [harvestSession, setHarvestSession] = useState<CultivationSessionAdmin | null>(null);
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);

  // Daily Tray Inspection Modals State
  const [dailyTraySession, setDailyTraySession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyTraySessionTrayId, setDailyTraySessionTrayId] = useState<number | null>(null);
  const [qrOrigin, setQrOrigin] = useState<'detail' | 'history' | null>(null);
  const [initialQrAction, setInitialQrAction] = useState<'issue' | 'growth'>();
  function openGrowthUpdate(target: CultivationSessionAdmin) {
    setInitialQrAction('growth');
    setDailyTraySession(target);
    setDailyTraySessionTrayId(null);
    setDailyTrayModalVisible(true);
  }

  const [dailyTrayModalVisible, setDailyTrayModalVisible] = useState(false);

  const [dailyHistorySession, setDailyHistorySession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyHistorySessionTrayId, setDailyHistorySessionTrayId] = useState<number | null>(null);
  const [dailyHistoryModalVisible, setDailyHistoryModalVisible] = useState(false);

  const hasLoaded = useRef(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(!hasLoaded.current);
    setErrorMessage(null);
    try {
      const sessions = await iotRepository.getAdminCultivationSessions();
      setSessions(sessions);
      hasLoaded.current = true;
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải danh sách dữ liệu từ máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
        msg = `Phiên #${session.session_id} đã bắt đầu giai đoạn ủ tơ / hồi sức phôi.`;
      } else if (targetStage === 'READY_FOR_CULTIVATION') {
        msg = `Phiên #${session.session_id} đã chuyển sang Sẵn sàng trồng. Bạn có thể xếp khay vào tầng ngay bây giờ!`;
      }

      Alert.alert('Chuyển giai đoạn thành công', msg);
      await fetchData();
    } catch (err: any) {
      const errText = err?.message || '';
      let friendlyText = 'Không thể chuyển giai đoạn phiên.';
      if (errText.includes('Stage transition requirements') || errText.includes('409') || errText.includes('NORMAL')) {
        friendlyText =
          'Chưa đạt điều kiện: Đợt kiểm tra phôi gần nhất phải đạt chuẩn và kiểm tra đủ toàn bộ số bịch phôi trước khi chuyển sang Sẵn sàng trồng.';
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
    return sessions.filter((s) => {
      if (rentalFilter !== 'ALL' && sessionGroup(s) !== rentalFilter) return false;
      if (rentalFilter === 'CULTIVATING' && growthFilter !== 'ALL' && growthStage(s) !== growthFilter) return false;
      if (!q) return true;
      const matchId = String(s.session_id).includes(q) || String(s.order_id || '').includes(q);
      const matchCustomer =
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.customer_email && s.customer_email.toLowerCase().includes(q));
      const matchMushroom = s.mushroom_name && s.mushroom_name.toLowerCase().includes(q);
      return matchId || matchCustomer || matchMushroom;
    }).sort(compareSessions);
  }, [sessions, searchQuery, rentalFilter, growthFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
      const cultivatingCount = sessions.filter((s) => sessionGroup(s) === 'CULTIVATING').length;

      return {
        total: sessions.length,
        highlight1: sessions.filter(s => sessionGroup(s) === (isHarvestWorkflow ? 'HARVEST_READY' : 'READY_FOR_CULTIVATION')).length,
        highlight1Label: isHarvestWorkflow ? 'Sẵn sàng thu hoạch' : 'Chờ gán khay',
        highlight2: isHarvestWorkflow ? sessions.filter(s => sessionGroup(s) === 'HARVESTING').length : cultivatingCount,
        highlight2Label: isHarvestWorkflow ? 'Đang thu hoạch' : 'Đang trồng',
        highlight3: cultivatingCount,
        highlight3Label: 'Đang trồng',
      };
  }, [sessions, isHarvestWorkflow]);

  const formatGrowthStatus = statusLabel;
  const formatHarvestStatus = statusLabel;

  const renderSessionBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <StatusBadge variant="warning" label="Chưa ủ tơ" />;
      case 'INCUBATING':
      case 'SPAWN_RESTING':
        return <StatusBadge variant="info" label="Đang ủ tơ" />;
      case 'MYCELIAL_DEVELOPMENT':
        return <StatusBadge variant="info" label="Phát triển tơ nấm" />;
      case 'READY_FOR_CULTIVATION':
        return <StatusBadge variant="warning" label="Chờ gán khay" />;
      case 'CULTIVATING':
        return <StatusBadge variant="success" label="Đang trồng" />;
      case 'HARVEST_READY':
        return <StatusBadge variant="info" label="Sẵn sàng thu hoạch" />;
      case 'HARVESTING':
        return <StatusBadge variant="info" label="Đang thu hoạch" />;
      case 'COMPLETED':
        return <StatusBadge variant="neutral" label="Đã hoàn thành" />;
      case 'CANCELLED':
        return <StatusBadge variant="error" label="Đã hủy" />;
      default:
        return <StatusBadge variant="neutral" label={statusLabel(status)} />;
    }
  };

  return (
    <ScreenContainer scrollable={false} edges={['top', 'left', 'right']}>
      {/* Header */}
      <AppHeader
        title={isHarvestWorkflow ? 'Thu hoạch và giao hàng' : 'Quản lý phiên nuôi trồng'}
        subtitle={isHarvestWorkflow ? 'Từ sẵn sàng thu hoạch đến hoàn thành' : 'Theo dõi phôi, xếp khay và chăm sóc'}
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
      />

      {headerAccessory}
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
          placeholder="Tìm theo mã phiên, mã đơn, tên khách, loại nấm..."
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
          {rentalStatusFilters.map((filter) => {
            const isSelected = rentalFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  setRentalFilter(filter.value);
                  setGrowthFilter('ALL');
                }}
              >
                <AppText
                  variant="caption"
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? theme.colors.primary[600] : theme.colors.text.secondary}
                >
                  {filter.label} ({filter.value === 'ALL' ? sessions.length : sessions.filter(s => sessionGroup(s) === filter.value).length})
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {rentalFilter === 'CULTIVATING' && (
        <View style={styles.chipsScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {GROWTH_FILTERS.map(filter => (
              <Pressable key={filter.value} accessibilityRole="button"
                accessibilityState={{ selected: growthFilter === filter.value }}
                style={[styles.filterChip, growthFilter === filter.value && styles.filterChipActive]}
                onPress={() => setGrowthFilter(filter.value)}>
                <AppText variant="caption">{filter.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

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
        ) : (
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
            filteredSessions.map((session, index) => {
              const reqTrays = session.required_trays || session.tray_quantity || 1;
              const expectedBags =
                session.spawn_quantity != null && session.spawn_quantity > 0
                  ? session.spawn_quantity
                  : reqTrays * 2;
              const isActionLoading = actionLoadingSessionId === session.session_id;

              return (
                <React.Fragment key={session.session_id}>
                {rentalFilter === 'ALL' && (index === 0 || sessionGroup(filteredSessions[index - 1]) !== sessionGroup(session)) && (
                  <AppText variant="bodySmall" weight="bold" style={{ marginTop: 8 }}>
                    {statusLabel(sessionGroup(session))} · {filteredSessions.filter(s => sessionGroup(s) === sessionGroup(session)).length}
                  </AppText>
                )}
                <AppCard elevation="xs" style={styles.card}>
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
                      {renderSessionBadge(sessionGroup(session))}
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

                    {session.status !== 'COMPLETED' && (
                      <View style={styles.detailItem}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Vị trí tầng
                        </AppText>
                        {(() => {
                          const activeAssignedTrays = (session.trays || []).filter((t) => {
                            const st = String(t.assignment_status || t.status || '').trim().toUpperCase();
                            return st === 'ACTIVE';
                          });
                          const assignedCount = activeAssignedTrays.length;
                          const assignedFloorName =
                            assignedCount > 0
                              ? session.floor_name ||
                                activeAssignedTrays[0]?.floor_name ||
                                (session.floor_id != null ? `Tầng ${session.floor_id}` : null) ||
                                (activeAssignedTrays[0]?.floor_id != null ? `Tầng ${activeAssignedTrays[0].floor_id}` : null)
                              : null;

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
                    )}
                  </View>

                  {/* Spawn phase badge / notice if relevant */}
                  {session.spawn_status && (
                    <View style={styles.spawnStatusNotice}>
                      <Ionicons name="git-branch-outline" size={14} color={theme.colors.info.dark} />
                      <AppText variant="caption" color={theme.colors.info.dark}>
                        Giai đoạn phôi: <AppText variant="caption" weight="bold" color={theme.colors.info.dark}>{formatGrowthStatus(session.spawn_status)}</AppText>
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
                          {formatGrowthStatus(session.growth_status)}
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
                            {formatHarvestStatus(session.harvest_status)}
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
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
                            title="Kiểm tra phôi"
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />}
                            onPress={() => {
                              setInspectionSession(session);
                              setInspectionModalVisible(true);
                            }}
                          />
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
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
                          title={isActionLoading ? 'Đang xác nhận...' : 'Xác nhận sẵn sàng trồng'}
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
                          onPress={() =>
                            router.push({
                              pathname: '/(tabs)/tray',
                              params: {
                                sessionId: String(session.session_id),
                              },
                            } as any)
                          }
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
                    {sessionGroup(session) === 'CULTIVATING' && (
                      <View style={styles.actionCol}>
                        {/* Daily Tray Report Buttons */}
                        <View style={styles.spawnActionsSubrow}>
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
                            title="Báo cáo sự cố"
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                            disabled={!session.trays || session.trays.length === 0}
                            onPress={() => {
                              setInitialQrAction('issue');
                              setDailyTraySession(session);
                              setDailyTraySessionTrayId(null);
                              setDailyTrayModalVisible(true);
                            }}
                          />
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
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
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
                            title="Cập nhật tiến độ"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="trending-up" size={16} color={theme.colors.primary[600]} />}
                            onPress={() => {
                              openGrowthUpdate(session);
                            }}
                          />
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
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

                        <View style={styles.spawnActionsSubrow}>
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
                            title="Xem tầng & khay"
                            variant="outline"
                            size="sm"
                            leftIcon={<Ionicons name="layers-outline" size={16} color={theme.colors.primary[600]} />}
                            onPress={() =>
                              router.push({
                                pathname: '/(tabs)/tray',
                                params: {
                                  floorId: session.floor_id ? String(session.floor_id) : undefined,
                                },
                              } as any)
                            }
                          />
                          <AppButton style={styles.pairedAction} textStyle={{ flexShrink: 1 }}
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
                    {(sessionGroup(session) === 'HARVEST_READY' || session.status === 'HARVESTING') && (
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
                  {!!session.order_id && canTrackSessionShipment(session) && <ShipmentTrackingButton cultivationOrder orderId={session.order_id} />}
                </AppCard>
                </React.Fragment>
              );
            })
          )
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
        onOpenGrowthUpdate={(target) => {
          setQrOrigin('detail');
          openGrowthUpdate(target);
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
          setQrOrigin('detail');
          setInitialQrAction('issue');
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
          if (detailSession) {
            router.push({
              pathname: '/(tabs)/tray',
              params: {
                sessionId: String(detailSession.session_id),
              },
            } as any);
          } else {
            router.push('/(tabs)/tray');
          }
        }}
      />

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
      <DailyTrayInspectionModal initialAction={initialQrAction}
        visible={dailyTrayModalVisible}
        session={dailyTraySession}
        initialSessionTrayId={dailyTraySessionTrayId}
        onClose={() => {
          setDailyTrayModalVisible(false);
          if (qrOrigin === 'detail' && dailyTraySession) {
            setDetailSession(dailyTraySession);
            setDetailModalVisible(true);
          } else if (qrOrigin === 'history') {
            setDailyHistoryModalVisible(true);
          }
          setQrOrigin(null);
          setInitialQrAction(undefined);
          setDailyTraySession(null);
          setDailyTraySessionTrayId(null);
        }}
        onSuccess={() => {
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
        onOpenCreateReport={(trayId, action) => {
          setQrOrigin('history');
            setInitialQrAction(action ?? 'growth');
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
  pairedAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  chipsScrollWrapper: {
    flexShrink: 0,
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
});
