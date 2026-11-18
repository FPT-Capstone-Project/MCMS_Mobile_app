import { AppAlert as Alert, AppModal as Modal } from '../../../../shared/components/feedback/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AutoControlLogItem,
  AutoControlStatus,
  AutoControlSuggestions,
  AutoMistingConfig,
  CultivationTrayInfo,
  FloorEnvironment,
  FloorMapping,
  IotMaster,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { formatMistingCode } from '../../utils/mistingI18n';
import { FloorProfileConfigModal } from '../components/FloorProfileConfigModal';
import { FloorTraysGrid } from '../components/FloorTraysGrid';
import { FloorLogsTimeline } from '../components/FloorLogsTimeline';
import { FanAutoCard } from '../components/FanAutoCard';

interface FloorDetailScreenProps {
  floor: FloorMapping;
  roomName?: string;
  masters?: IotMaster[];
  initialTab?: 'overview' | 'trays' | 'logs';
  onBack: () => void;
  canManage?: boolean;
}

export const FloorDetailScreen: React.FC<FloorDetailScreenProps> = ({
  floor,
  roomName = 'Phòng nuôi trồng',
  initialTab = 'overview',
  onBack,
  canManage = true,
}) => {
  const floorId = floor.floor_id ?? floor.id ?? 0;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'trays' | 'logs'>(initialTab);

  // Core Data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [statusData, setStatusData] = useState<AutoControlStatus | null>(null);
  const [envData, setEnvData] = useState<FloorEnvironment | null>(null);
  const [autoConfig, setAutoConfig] = useState<AutoMistingConfig | null>(null);
  const [floorSuggestion, setFloorSuggestion] = useState<AutoControlSuggestions | null>(null);
  const [cultivationTrays, setCultivationTrays] = useState<CultivationTrayInfo[]>([]);

  const [availableTrayIds, setAvailableTrayIds] = useState<number[] | undefined>(undefined);

  // Logs & Pagination
  const [logs, setLogs] = useState<AutoControlLogItem[]>([]);
  const [logsOffset, setLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  // Modals
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [confirmStartVisible, setConfirmStartVisible] = useState(false);

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);

  // Polling Refs
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const currentFloorIdRef = useRef<number>(floorId);

  useEffect(() => {
    currentFloorIdRef.current = floorId;
  }, [floorId]);

  // Clean polling
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Fetch Full Floor Data
  const loadFloorData = useCallback(async () => {
    if (!floorId) return;

    try {
      const [cfgRes, envRes, statusRes, logsRes, availableRes] = await Promise.allSettled([
        iotRepository.getAutoControlConfig(floorId),
        iotRepository.getFloorEnvironment(floorId),
        iotRepository.getAutoControlStatus(floorId),
        iotRepository.getAutoControlLogs(floorId, 30, 0),
        iotRepository.getAvailableTraysForFloor(floorId),
      ]);

      if (currentFloorIdRef.current !== floorId) return;

      setAvailableTrayIds(availableRes.status === 'fulfilled'
        ? availableRes.value.map((tray) => Number(tray.tray_id))
        : undefined);

      const fallbackConfig =
        statusRes.status === 'fulfilled'
          ? statusRes.value.run?.config_snapshot || (statusRes.value.environment?.thresholds as any)
          : null;

      if (cfgRes.status === 'fulfilled') {
        setAutoConfig(cfgRes.value.config || fallbackConfig || null);
        setFloorSuggestion(cfgRes.value.floorSuggestion || null);
        setCultivationTrays(cfgRes.value.cultivation?.trays || []);
      } else if (fallbackConfig) {
        setAutoConfig(fallbackConfig);
      }

      if (envRes.status === 'fulfilled') {
        setEnvData(envRes.value);
      }

      if (statusRes.status === 'fulfilled') {
        setStatusData(statusRes.value);
        if (statusRes.value.environment) {
          setEnvData(statusRes.value.environment);
        }
      }

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.logs || []);
        setLogsOffset(logsRes.value.logs?.length || 0);
        setHasMoreLogs((logsRes.value.logs?.length || 0) >= 30);
      }

      setIsNetworkError(false);
      setLastUpdated(new Date());
    } catch {
      if (currentFloorIdRef.current === floorId) {
        setIsNetworkError(true);
      }
    } finally {
      if (currentFloorIdRef.current === floorId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [floorId]);

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isMounted) {
        await loadFloorData();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadFloorData]);

  // Polling Status (Every 3.5s)
  useEffect(() => {
    if (!floorId) return;

    const pollStatus = async () => {
      if (isPollingRef.current) return;
      if (currentFloorIdRef.current !== floorId) return;

      try {
        isPollingRef.current = true;
        const status = await iotRepository.getAutoControlStatus(floorId);
        if (currentFloorIdRef.current === floorId) {
          setStatusData(status);
          if (status.environment) {
            setEnvData(status.environment);
          }
          setIsNetworkError(false);
          setLastUpdated(new Date());
        }
      } catch {
        if (currentFloorIdRef.current === floorId) {
          setIsNetworkError(true);
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    pollingTimerRef.current = setInterval(pollStatus, 3500);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        stopPolling();
      } else {
        stopPolling();
        pollStatus();
        pollingTimerRef.current = setInterval(pollStatus, 3500);
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [floorId, stopPolling]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFloorData();
  };

  // Load More Logs
  const handleLoadMoreLogs = async () => {
    if (!floorId || loadingMoreLogs || !hasMoreLogs) return;

    try {
      setLoadingMoreLogs(true);
      const res = await iotRepository.getAutoControlLogs(floorId, 30, logsOffset);
      if (currentFloorIdRef.current === floorId) {
        const newLogs = res.logs || [];
        setLogs((prev) => [...prev, ...newLogs]);
        setLogsOffset((prev) => prev + newLogs.length);
        setHasMoreLogs(newLogs.length >= 30);
      }
    } catch {
      // Ignore
    } finally {
      if (currentFloorIdRef.current === floorId) {
        setLoadingMoreLogs(false);
      }
    }
  };

  // Derive Active Cultivating Mushrooms on this floor
  const activeCultivatingMushroomIds = useMemo(() => {
    const ids: number[] = [];
    cultivationTrays.forEach((tray) => {
      const hasActiveSession = Boolean(tray.session_id && tray.mushroom_name);
      if (hasActiveSession && tray.mushroom_type_id) {
        if (!ids.includes(tray.mushroom_type_id)) {
          ids.push(tray.mushroom_type_id);
        }
      }
    });
    return ids;
  }, [cultivationTrays]);

  // Check if floor has any active cultivating sessions
  const hasActiveCultivatingSessions = activeCultivatingMushroomIds.length > 0;

  // Running status evaluation
  const isRunning = statusData?.run?.status === 'RUNNING';
  const isDryRun = statusData?.run?.dry_run === true;
  const isFault =
    statusData?.run?.status === 'FAULT' ||
    (statusData?.mode === 'AUTO' &&
      (statusData?.runtime?.control_state === 'FAULT' ||
        statusData?.runtime?.control_state === 'SENSOR_FAULT' ||
        statusData?.runtime?.control_state === 'DEVICE_OFFLINE'));
  const isOffPending = statusData?.runtime?.control_state === 'OFF_PENDING' || (!isRunning && statusData?.fan?.state === 'OFF_PENDING');

  // Cooldown countdown
  const cooldownRemainingSeconds = Math.max(
    0,
    Math.ceil((statusData?.cooldownRemainingMs || 0) / 1000)
  );

  // START AUTO Handler
  const handleStartAuto = async () => {
    if (!floorId) return;

    if (!hasActiveCultivatingSessions) {
      Alert.alert(
        'Không thể khởi động AUTO',
        'Tầng hiện chưa có phiên nuôi trồng nào đang hoạt động. Bạn cần xếp khay cho phiên trồng ở mục Phòng tầng khay trước khi bật AUTO thiết bị thật.'
      );
      return;
    }

    if (!autoConfig?.profile_approved) {
      Alert.alert(
        'Chưa phê duyệt cấu hình',
        'Cấu hình chăm sóc của tầng chưa được người vận hành phê duyệt. Vui lòng chỉnh sửa và duyệt cấu hình trước khi khởi động.'
      );
      return;
    }

    setConfirmStartVisible(false);
    setActionLoading(true);

    try {
      await iotRepository.startAutoControl(floorId, false);
      await loadFloorData();
      Alert.alert(
        'Khởi động thành công',
        `Đã bắt đầu điều khiển tự động cho ${floor.floor_name}.`
      );
    } catch (err: any) {
      Alert.alert('Lỗi khởi động AUTO', err?.message || 'Không thể bắt đầu phiên tự động.');
    } finally {
      setActionLoading(false);
    }
  };

  // STOP AUTO Handler (direct, no complex confirmation)
  const handleStopAuto = async () => {
    if (!floorId) return;

    setActionLoading(true);
    try {
      const stoppedStatus = await iotRepository.stopAutoControl(floorId);
      if (stoppedStatus) {
        setStatusData(stoppedStatus);
      }
      await loadFloorData();
      Alert.alert(
        'Đã gửi lệnh dừng',
        'Đã dừng AUTO của tầng. Hệ thống đang xác nhận tắt van phun và quạt được bật trong cấu hình AUTO.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi dừng AUTO', err?.message || 'Không thể gửi lệnh dừng.');
    } finally {
      setActionLoading(false);
    }
  };

  // SAVE CONFIG Handler
  const handleSaveConfig = async (config: AutoMistingConfig, mushroomTypeIds: number[]) => {
    if (!floorId) return;

    setActionLoading(true);
    try {
      await iotRepository.saveAutoControlConfig(floorId, config, mushroomTypeIds);
      setConfigModalVisible(false);
      await loadFloorData();
      Alert.alert(
        'Đã lưu cấu hình',
        'Cấu hình hồ sơ tầng đã được lưu thành công. Hệ thống KHÔNG tự động bật thiết bị.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi lưu cấu hình', err?.message || 'Không thể lưu cấu hình tầng.');
    } finally {
      setActionLoading(false);
    }
  };

  const expectedTrayCount = (floor.total_rows || 0) * (floor.total_columns || 0);
  const occupiedPositions = new Set(cultivationTrays
    .filter(tray => tray.row_number != null && tray.column_number != null &&
      tray.row_number > 0 && tray.row_number <= (floor.total_rows || 0) &&
      tray.column_number > 0 && tray.column_number <= (floor.total_columns || 0))
    .map(tray => `${tray.row_number}:${tray.column_number}`)).size;
  const missingTrayCount = Math.max(0, expectedTrayCount - occupiedPositions);

  // Generate Trays (Floor rack grid generation)
  const handleGenerateTrays = async () => {
    if (!floorId || !floor.total_rows || !floor.total_columns) {
      Alert.alert(
        'Chưa cài đặt số hàng & cột',
        'Vui lòng cấu hình số hàng và số cột của tầng trước khi tạo khay.'
      );
      return;
    }

    Alert.alert(
      'Tạo khay còn thiếu',
      `Tạo bản ghi cho ${missingTrayCount} khay còn thiếu trong sơ đồ ${floor.total_rows} hàng × ${floor.total_columns} cột của ${floor.floor_name}? Khay đã có sẽ được giữ nguyên. Thao tác này không gán phiên trồng hay bật thiết bị.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tạo khay',
          onPress: async () => {
            setActionLoading(true);
            try {
              await iotRepository.generateFloorTrays(floorId, {
                total_rows: floor.total_rows || 3,
                total_columns: floor.total_columns || 4,
              });
              await loadFloorData();
              Alert.alert('Thành công', 'Đã tạo các khay còn thiếu trong sơ đồ tầng.');
            } catch (err: any) {
              Alert.alert('Không thể tạo khay', err?.message || 'Không thể tạo khay.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title={floor.floor_name || 'Chi tiết tầng'} subtitle={roomName} showBack onBack={onBack} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
            Đang tải dữ liệu tầng & vi khí hậu...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }


  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Offline / Connectivity Banner */}
      {isNetworkError && (
        <View style={styles.networkErrorBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FFFFFF" />
          <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
            Chưa cập nhật được kết nối. Dữ liệu đang hiển thị từ phiên đọc gần nhất.
          </AppText>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeftRow}>
          <Pressable
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBadgeRow}>
              <AppText variant="h3" weight="bold" numberOfLines={1}>
                {floor.floor_name}
              </AppText>
              {/* Simulation Badge */}
              {isDryRun && isRunning ? (
                <View style={styles.dryRunBadge}>

                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    Mô phỏng
                  </AppText>
                </View>
              ) : isRunning ? (
                <View style={styles.runningBadge}>

                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    Đang chạy
                  </AppText>
                </View>
              ) : isFault ? (
                <View style={styles.faultBadge}>
                  <Ionicons name="alert-circle" size={11} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    LỖI
                  </AppText>
                </View>
              ) : isOffPending ? (
                <View style={styles.offPendingBadge}>

                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    Chờ tắt
                  </AppText>
                </View>
              ) : (
                <View style={styles.stoppedBadge}>
                  <AppText variant="caption" weight="semibold" color={theme.colors.text.secondary} style={styles.badgeTextSmall}>
                    Thủ công
                  </AppText>
                </View>
              )}
            </View>

            <AppText variant="caption" color={theme.colors.text.secondary}>
              {roomName} • Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </AppText>
          </View>
        </View>
      </View>

      {/* 3 Tab Buttons */}
      <View style={styles.tabNavRow}>
        <Pressable
          accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'overview' }}
          onPress={() => setActiveTab('overview')}
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
        >

          <AppText
            variant="bodySmall"
            weight={activeTab === 'overview' ? 'bold' : 'normal'}
            color={activeTab === 'overview' ? theme.colors.primary[700] : theme.colors.text.secondary}
            style={{ marginLeft: 4 }}
          >
            Tổng quan
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'trays' }}
          onPress={() => setActiveTab('trays')}
          style={[styles.tabButton, activeTab === 'trays' && styles.tabButtonActive]}
        >

          <AppText
            variant="bodySmall"
            weight={activeTab === 'trays' ? 'bold' : 'normal'}
            color={activeTab === 'trays' ? theme.colors.primary[700] : theme.colors.text.secondary}
            style={{ marginLeft: 4 }}
          >
            Khay ({cultivationTrays.length})
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'logs' }}
          onPress={() => setActiveTab('logs')}
          style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]}
        >

          <AppText
            variant="bodySmall"
            weight={activeTab === 'logs' ? 'bold' : 'normal'}
            color={activeTab === 'logs' ? theme.colors.primary[700] : theme.colors.text.secondary}
            style={{ marginLeft: 4 }}
          >
            Nhật ký ({logs.length})
          </AppText>
        </Pressable>
      </View>

      <AppDivider spacing="xs" />

      {/* Tab Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.contentScroll}
      >
        {/* ================= TAB 1: TỔNG QUAN ================= */}
        {activeTab === 'overview' && (
          <View style={styles.tabContentWrap}>
            {canManage && <FanAutoCard status={statusData} />}
            {/* 1. Two Big Metric Boxes */}
            <View style={styles.twoGaugesRow}>
              {/* Temperature Box */}
              <AppCard elevation="xs" style={styles.gaugeCard}>
                <View style={styles.gaugeTopRow}>

                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    Nhiệt độ
                  </AppText>
                </View>

                <AppText variant="h1" weight="bold" color={theme.colors.text.primary} style={styles.gaugeBigValue}>
                  {envData?.averageTemperature != null
                    ? `${Number(envData.averageTemperature).toFixed(1)}°C`
                    : '--'}
                </AppText>

                <View style={styles.targetRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Mục tiêu:{' '}
                    {autoConfig?.temperature_min != null && autoConfig?.temperature_max != null
                      ? `${autoConfig.temperature_min}–${autoConfig.temperature_max}°C`
                      : 'Chưa đặt'}
                  </AppText>
                </View>

                <View style={styles.sensorStatusRow}>
                  <Ionicons
                    name={envData?.healthy ? 'checkmark-circle' : 'alert-circle'}
                    size={13}
                    color={envData?.healthy ? theme.colors.success.main : theme.colors.warning.main}
                  />
                  <AppText
                    variant="caption"
                    color={envData?.healthy ? theme.colors.success.dark : theme.colors.warning.dark}
                    style={{ fontSize: 12, flexShrink: 1 }}
                  >
                    {envData?.healthy ? 'Cảm biến đạt yêu cầu' : 'Dữ liệu chưa sẵn sàng'}
                  </AppText>
                </View>
              </AppCard>

              {/* Humidity Box */}
              <AppCard elevation="xs" style={styles.gaugeCard}>
                <View style={styles.gaugeTopRow}>

                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    Độ ẩm
                  </AppText>
                </View>

                <AppText variant="h1" weight="bold" color={theme.colors.text.primary} style={styles.gaugeBigValue}>
                  {envData?.averageHumidity != null
                    ? `${Number(envData.averageHumidity).toFixed(1)}%`
                    : '--'}
                </AppText>

                <View style={styles.targetRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Mục tiêu:{' '}
                    {autoConfig?.humidity_min != null && autoConfig?.humidity_max != null
                      ? `${autoConfig.humidity_min}–${autoConfig.humidity_max}%`
                      : 'Chưa đặt'}
                  </AppText>
                </View>

                <View style={styles.sensorStatusRow}>
                  <Ionicons
                    name={envData?.healthy ? 'checkmark-circle' : 'alert-circle'}
                    size={13}
                    color={envData?.healthy ? theme.colors.success.main : theme.colors.warning.main}
                  />
                  <AppText
                    variant="caption"
                    color={envData?.healthy ? theme.colors.success.dark : theme.colors.warning.dark}
                    style={{ fontSize: 12, flexShrink: 1 }}
                  >
                    {envData?.healthy ? 'Cảm biến đạt yêu cầu' : 'Dữ liệu chưa sẵn sàng'}
                  </AppText>
                </View>
              </AppCard>
            </View>

            {/* Sensor health warning if unhealthy */}
            {envData && !envData.healthy && envData.reason && (
              <View style={styles.warningAlertBox}>
                <Ionicons name="warning" size={16} color={theme.colors.warning.dark} />
                <AppText variant="caption" color={theme.colors.warning.dark} style={{ flex: 1, marginLeft: 6 }}>
                  {envData.reason}
                </AppText>
              </View>
            )}

            {/* 2. Card "Chăm sóc tự động" */}
            <AppCard elevation="xs" style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>

                  <AppText variant="label" weight="bold">
                    Điều khiển tự động
                  </AppText>
                </View>

                {/* SSR Relay indicator */}
                <View style={styles.ssrIndicator}>
                  <View
                    style={[
                      styles.ssrDot,
                      {
                        backgroundColor:
                          statusData?.ssr?.reported_state === 'ON'
                            ? theme.colors.success.main
                            : theme.colors.neutral[400],
                      },
                    ]}
                  />
                  <AppText variant="caption" weight="bold">
                    Van phun: {statusData?.ssr?.reported_state ? formatMistingCode('ssrState', statusData.ssr.reported_state) : 'Chưa có dữ liệu'}
                  </AppText>
                </View>
              </View>

              <View style={styles.controlStateBox}>
                <AppText variant="title" weight="bold" color={isFault ? theme.colors.error.main : theme.colors.primary[700]}>
                  {statusData?.runtime?.control_state
                    ? formatMistingCode('controlState', statusData.runtime.control_state)
                    : 'Chế độ tự động đã tắt'}
                </AppText>

                {cooldownRemainingSeconds > 0 && (
                  <View style={styles.cooldownPill}>

                    <AppText variant="caption" weight="bold" color={theme.colors.primary[800]} style={{ marginLeft: 3 }}>
                      Còn {cooldownRemainingSeconds} giây
                    </AppText>
                  </View>
                )}
              </View>

              {/* Latest Decision / Reason */}
              {(statusData?.lastDecision?.reason || statusData?.runtime?.last_reason) && (
                <View style={styles.reasonBox}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Hoạt động gần nhất
                  </AppText>
                  <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                    {statusData.lastDecision?.reason || statusData.runtime?.last_reason}
                  </AppText>
                </View>
              )}
            </AppCard>

            {/* 4. Action Area at Bottom */}
            {canManage && (
              <View style={styles.actionAreaContainer}>
                {isRunning ? (
                  <AppButton
                    title="Dừng tự động"
                    variant="danger"
                    size="lg"
                    fullWidth
                    loading={actionLoading}

                    onPress={handleStopAuto}
                  />
                ) : isOffPending ? (
                  <View style={styles.offPendingNotice}>
                    <ActivityIndicator size="small" color={theme.colors.warning.dark} />
                    <AppText variant="bodySmall" weight="bold" color={theme.colors.warning.dark} style={{ marginLeft: 6 }}>
                      Đang chờ thiết bị xác nhận tắt an toàn...
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.startActionRow}>
                    <View style={{ flex: 1 }}>
                      <AppButton
                        title="Chạy thiết bị"
                        variant="primary"
                        size="md"
                        disabled={actionLoading || !autoConfig || !autoConfig.profile_approved || !hasActiveCultivatingSessions}
                        onPress={() => setConfirmStartVisible(true)}
                      />
                    </View>
                  </View>
                )}

                {/* Notice explaining disabled state */}
                {!isRunning && autoConfig && !autoConfig.profile_approved && (
                  <AppText variant="caption" color={theme.colors.warning.dark} align="center" style={{ marginTop: 4 }}>
                    Hồ sơ cấu hình chưa được phê duyệt. Vui lòng bấm &quot;Chỉnh sửa cấu hình&quot; và phê duyệt trước khi bắt đầu chạy.
                  </AppText>
                )}
                {!isRunning && autoConfig?.profile_approved && !hasActiveCultivatingSessions && (
                  <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 4 }}>
                    Chạy thiết bị thật yêu cầu ít nhất 1 phiên trồng đang hoạt động trên tầng.
                  </AppText>
                )}
              </View>
            )}

            {/* 3. Card "Cấu hình chăm sóc" */}
            <AppCard elevation="xs" style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>

                  <AppText variant="label" weight="bold">
                    Cấu hình chăm sóc
                  </AppText>
                </View>

                {canManage && (
                  <AppButton
                    title="Chỉnh sửa"
                    variant="outline"
                    size="sm"
                    disabled={isRunning || isOffPending}
                    onPress={() => setConfigModalVisible(true)}
                  />
                )}
              </View>

              <AppText variant="bodyMedium" weight="bold">
                {autoConfig?.profile_name || 'Chưa có cấu hình'}
              </AppText>

              {/* Approved Mushroom Types Chips */}
              <View style={styles.chipsRow}>
                {/* Cultivating Chips */}
                {cultivationTrays
                  .filter((t, index, trays) => t.session_id && t.mushroom_name &&
                    trays.findIndex(other => other.session_id && other.mushroom_type_id === t.mushroom_type_id && other.mushroom_name === t.mushroom_name) === index)
                  .map((t) => (
                    <View key={`cult_${t.tray_id}`} style={styles.chipCultivating}>

                      <AppText variant="caption" weight="bold" color={theme.colors.success.dark} style={{ marginLeft: 3 }}>
                        {t.mushroom_name} · Đang trồng
                      </AppText>
                    </View>
                  ))}

                {/* Approved in Profile but not yet planted */}
                {autoConfig?.source_profiles
                  ?.filter((sp) => !activeCultivatingMushroomIds.includes(sp.mushroom_type_id))
                  .map((sp) => (
                    <View key={`appr_${sp.mushroom_type_id}`} style={styles.chipApproved}>

                      <AppText variant="caption" weight="semibold" color={theme.colors.primary[800]} style={{ marginLeft: 3 }}>
                        {sp.mushroom_name || `Nấm #${sp.mushroom_type_id}`} · Đã duyệt
                      </AppText>
                    </View>
                  ))}

                {(!autoConfig?.source_profiles || autoConfig.source_profiles.length === 0) &&
                  !hasActiveCultivatingSessions && (
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Chưa có loại nấm nào được gán trong cấu hình tầng.
                    </AppText>
                  )}
              </View>

              {autoConfig ? (
                <View style={styles.configSummaryRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Độ ẩm: {autoConfig.humidity_min}–{autoConfig.humidity_max}% • Phun:{' '}
                    {Math.round(autoConfig.misting_pulse_ms / 1000)}s • Nghỉ:{' '}
                    {Math.round(autoConfig.cooldown_ms / 1000)}s
                  </AppText>
                </View>
              ) : (
                <AppText variant="caption" color={theme.colors.warning.dark}>
                  Chọn Chỉnh sửa để đặt loại nấm, độ ẩm, thời gian phun và chu kỳ quạt.
                </AppText>
              )}
            </AppCard>


          </View>
        )}

        {/* ================= TAB 2: KHAY ================= */}
        {activeTab === 'trays' && (
          <View style={styles.tabContentWrap}>
            {canManage && missingTrayCount > 0 && <View style={styles.traysToolbarRow}>
              {canManage && (
                <AppButton
                  title={`Tạo ${missingTrayCount} khay còn thiếu`}
                  disabled={actionLoading || isRunning || isOffPending}
                  loading={actionLoading}
                  variant="outline"
                  size="sm"
                  onPress={handleGenerateTrays}
                />
              )}
            </View>}

            {/* Rack Grid Component */}
            <FloorTraysGrid
              floor={floor}
              trays={cultivationTrays}
              availableTrayIds={availableTrayIds}
              isAssignMode={false}
            />
          </View>
        )}

        {/* ================= TAB 3: NHẬT KÝ ================= */}
        {activeTab === 'logs' && (
          <View style={styles.tabContentWrap}>
            <FloorLogsTimeline
              logs={logs}
              loadingMore={loadingMoreLogs}
              hasMore={hasMoreLogs}
              onLoadMore={handleLoadMoreLogs}
            />
          </View>
        )}
      </ScrollView>

      {/* Profile Config Modal */}
      <FloorProfileConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        floor={floor}
        initialConfig={autoConfig || floorSuggestion?.config || null}
        suggestion={floorSuggestion}
        activeMushroomIds={activeCultivatingMushroomIds}
        onSave={handleSaveConfig}
        loading={actionLoading}
      />

      {/* Confirm Start Modal */}
      <Modal visible={confirmStartVisible} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <AppCard elevation="md" style={styles.confirmCard}>
            <View style={styles.confirmHeader}>

              <AppText variant="title" weight="bold" align="center">
                Bắt đầu chạy thiết bị?
              </AppText>
            </View>

            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              {`Van phun của ${floor.floor_name} sẽ hoạt động tự động theo cấu hình "${autoConfig?.profile_name}".`}
            </AppText>
            {autoConfig?.fan_enabled && <AppText variant="bodySmall" align="center">
              Quạt cũng chạy cùng AUTO: chạy {autoConfig.fan_run_minutes} phút, nghỉ {autoConfig.fan_rest_minutes} phút, rồi lặp lại.
            </AppText>}

            <View style={styles.confirmBtnRow}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Hủy"
                  variant="ghost"
                  size="md"
                  onPress={() => setConfirmStartVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Bắt đầu ngay"
                  variant="primary"
                  size="md"
                  onPress={handleStartAuto}
                />
              </View>
            </View>
          </AppCard>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centerLoading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[100],
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  badgeTextSmall: {
    fontSize: 10,
    marginLeft: 3,
  },
  dryRunBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  runningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  faultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  offPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  stoppedBadge: {
    backgroundColor: theme.colors.neutral[200],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  tabNavRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  contentScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['2xl'],
  },
  tabContentWrap: {
    gap: theme.spacing.sm,
  },
  twoGaugesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  gaugeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gaugeBigValue: {
    marginVertical: 2,
    fontSize: 26,
  },
  targetRow: {
    marginTop: 2,
  },
  sensorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cardHeaderRow: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  ssrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  ssrDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controlStateBox: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  cooldownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  reasonBox: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: 2,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  chipCultivating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.border.light,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  chipApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.border.light,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  configSummaryRow: {
    marginTop: 2,
  },
  actionAreaContainer: {
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  startActionRow: {
    flexDirection: 'column-reverse',
    gap: theme.spacing.sm,
  },
  offPendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  traysToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  confirmHeader: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
});
