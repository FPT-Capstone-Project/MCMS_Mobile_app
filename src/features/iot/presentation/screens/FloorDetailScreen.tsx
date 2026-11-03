import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
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
  AvailableTrayForSession,
  CultivationSessionAdmin,
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
import { AssignSessionModal } from '../components/AssignSessionModal';

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

  // Logs & Pagination
  const [logs, setLogs] = useState<AutoControlLogItem[]>([]);
  const [logsOffset, setLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  // Modals
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [assignSessionModalVisible, setAssignSessionModalVisible] = useState(false);
  const [confirmStartModal, setConfirmStartModal] = useState<{
    visible: boolean;
    dryRun: boolean;
  }>({ visible: false, dryRun: false });

  // Session Tray Assignment Mode State
  const [selectedSessionForAssign, setSelectedSessionForAssign] = useState<CultivationSessionAdmin | null>(null);
  const [selectedTrayIdsForAssign, setSelectedTrayIdsForAssign] = useState<number[]>([]);
  const [availableTraysForFloor, setAvailableTraysForFloor] = useState<AvailableTrayForSession[]>([]);
  const [assignConflictMessage, setAssignConflictMessage] = useState<string | null>(null);

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
      const [cfgRes, envRes, statusRes, logsRes, availRes] = await Promise.allSettled([
        iotRepository.getAutoControlConfig(floorId),
        iotRepository.getFloorEnvironment(floorId),
        iotRepository.getAutoControlStatus(floorId),
        iotRepository.getAutoControlLogs(floorId, 30, 0),
        iotRepository.getAvailableTraysForFloor(floorId),
      ]);

      if (currentFloorIdRef.current !== floorId) return;

      if (cfgRes.status === 'fulfilled') {
        setAutoConfig(cfgRes.value.config || null);
        setFloorSuggestion(cfgRes.value.floorSuggestion || null);
        setCultivationTrays(cfgRes.value.cultivation?.trays || []);
      }

      if (availRes.status === 'fulfilled') {
        setAvailableTraysForFloor(availRes.value);
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
    (statusData?.mode === 'AUTO' && statusData?.run?.status === 'FAULT') ||
    statusData?.runtime?.control_state === 'FAULT' ||
    statusData?.runtime?.control_state === 'SENSOR_FAULT';
  const isOffPending = statusData?.runtime?.control_state === 'OFF_PENDING';

  // Cooldown countdown
  const cooldownRemainingSeconds = Math.max(
    0,
    Math.ceil((statusData?.cooldownRemainingMs || 0) / 1000)
  );

  // START AUTO Handler
  const handleStartAuto = async (dryRun: boolean) => {
    if (!floorId) return;

    if (!hasActiveCultivatingSessions && !dryRun) {
      Alert.alert(
        'Không thể khởi động AUTO',
        'Tầng hiện chưa có phiên nuôi trồng nào đang hoạt động. Bạn cần gán khay cho phiên trồng trước khi bật AUTO thiết bị thật.'
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

    setConfirmStartModal({ visible: false, dryRun });
    setActionLoading(true);

    try {
      await iotRepository.startAutoControl(floorId, dryRun);
      await loadFloorData();
      Alert.alert(
        'Khởi động thành công',
        dryRun
          ? 'Hệ thống đã bắt đầu chế độ CHẠY MÔ PHỎNG (không kích hoạt rơ-le thiết bị thực).'
          : `Hệ thống đã BẮT ĐẦU ĐIỀU KHIỂN THIẾT BỊ THỰC cho ${floor.floor_name}.`
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
        'Chế độ tự động đã dừng. Hệ thống đang xác nhận ngắt van SSR an toàn.'
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
        'Cấu hình hồ sơ tầng (FLOOR) đã được lưu thành công. Hệ thống KHÔNG tự động bật thiết bị.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi lưu cấu hình', err?.message || 'Không thể lưu cấu hình tầng.');
    } finally {
      setActionLoading(false);
    }
  };

  // SESSION TRAY ASSIGNMENT WORKFLOW
  const handleStartAssignWorkflow = (session: CultivationSessionAdmin) => {
    setSelectedSessionForAssign(session);
    setSelectedTrayIdsForAssign([]);
    setAssignConflictMessage(null);
    setActiveTab('trays');

    // Load available trays on this floor strictly from backend
    iotRepository
      .getAvailableTraysForFloor(floorId)
      .then((available) => {
        setAvailableTraysForFloor(available);
      })
      .catch((err: any) => {
        Alert.alert(
          'Lỗi tải khay khả dụng',
          err?.message || 'Không thể lấy danh sách khay đủ điều kiện gán từ máy chủ.'
        );
      });
  };

  const handleToggleSelectTrayForSession = (trayId: number) => {
    const requiredCount = selectedSessionForAssign?.required_trays || 1;

    if (selectedTrayIdsForAssign.includes(trayId)) {
      setSelectedTrayIdsForAssign((prev) => prev.filter((id) => id !== trayId));
    } else {
      if (selectedTrayIdsForAssign.length >= requiredCount) {
        Alert.alert(
          'Đã chọn đủ khay',
          `Phiên #${selectedSessionForAssign?.session_id} chỉ yêu cầu đúng ${requiredCount} khay. Vui lòng bỏ chọn khay khác nếu muốn đổi.`
        );
        return;
      }
      setSelectedTrayIdsForAssign((prev) => [...prev, trayId]);
    }
  };

  const handleExecuteAssignTrays = async () => {
    if (!selectedSessionForAssign || !floorId) return;

    const requiredCount = selectedSessionForAssign.required_trays || 1;
    if (selectedTrayIdsForAssign.length !== requiredCount) {
      Alert.alert(
        'Chưa chọn đủ số khay',
        `Phiên yêu cầu đúng ${requiredCount} khay. Bạn hiện đã chọn ${selectedTrayIdsForAssign.length} khay.`
      );
      return;
    }

    setActionLoading(true);
    setAssignConflictMessage(null);

    try {
      await iotRepository.assignTraysToSession(
        selectedSessionForAssign.session_id,
        floorId,
        selectedTrayIdsForAssign
      );

      // Success
      const assignedCount = selectedTrayIdsForAssign.length;
      const assignedSessionId = selectedSessionForAssign.session_id;

      setSelectedSessionForAssign(null);
      setSelectedTrayIdsForAssign([]);
      await loadFloorData();

      Alert.alert(
        'Đã gán khay thành công',
        `Đã gán ${assignedCount} khay cho Phiên #${assignedSessionId}. Phiên bắt đầu trồng (CULTIVATING).\n\nLưu ý: Hệ thống AUTO không tự bật; người vận hành cần chủ động bấm Khởi động AUTO khi sẵn sàng.`
      );
    } catch (err: any) {
      // 409 Conflict Handling
      if (err?.status === 409 || err?.statusCode === 409 || String(err?.message).includes('409')) {
        setAssignConflictMessage(
          'Khay bạn vừa chọn đã bị nhân viên khác gán đồng thời. Danh sách khay khả dụng đã được làm mới, vui lòng chọn lại.'
        );
        // Reload available trays and drop stale selections
        const freshAvailable = await iotRepository.getAvailableTraysForFloor(floorId).catch(() => []);
        setAvailableTraysForFloor(freshAvailable);
        const validAvailableIds = freshAvailable.map((t) => t.tray_id);
        setSelectedTrayIdsForAssign((prev) => prev.filter((id) => validAvailableIds.includes(id)));
      } else {
        Alert.alert('Lỗi gán khay', err?.message || 'Không thể gán khay cho phiên trồng.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Trays (Floor rack grid generation)
  const handleGenerateTrays = async () => {
    if (!floorId || !floor.total_rows || !floor.total_columns) {
      Alert.alert(
        'Chưa cài đặt số hàng & cột',
        'Vui lòng cấu hình số hàng (total_rows) và số cột (total_columns) của tầng trước khi sinh khay tự động.'
      );
      return;
    }

    Alert.alert(
      'Sinh lưới khay tự động',
      `Tạo lưới khay vật lý ${floor.total_rows} hàng × ${floor.total_columns} cột (= ${floor.total_rows * floor.total_columns} khay) cho ${floor.floor_name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Sinh khay ngay',
          onPress: async () => {
            setActionLoading(true);
            try {
              await iotRepository.generateFloorTrays(floorId, {
                total_rows: floor.total_rows || 3,
                total_columns: floor.total_columns || 4,
              });
              await loadFloorData();
              Alert.alert('Thành công', 'Đã sinh ma trận khay tự động cho tầng.');
            } catch (err: any) {
              Alert.alert('Lỗi sinh khay', err?.message || 'Không thể sinh khay.');
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

  const availableTrayIdList = availableTraysForFloor.map((t) => t.tray_id);

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
                  <Ionicons name="flask" size={11} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    MÔ PHỎNG
                  </AppText>
                </View>
              ) : isRunning ? (
                <View style={styles.runningBadge}>
                  <Ionicons name="play" size={11} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    ĐANG CHẠY
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
                  <Ionicons name="time" size={11} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={styles.badgeTextSmall}>
                    CHỜ TẮT
                  </AppText>
                </View>
              ) : (
                <View style={styles.stoppedBadge}>
                  <AppText variant="caption" weight="semibold" color={theme.colors.text.secondary} style={styles.badgeTextSmall}>
                    THỦ CÔNG
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
          onPress={() => setActiveTab('overview')}
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
        >
          <Ionicons
            name="speedometer-outline"
            size={16}
            color={activeTab === 'overview' ? theme.colors.primary[700] : theme.colors.text.secondary}
          />
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
          onPress={() => setActiveTab('trays')}
          style={[styles.tabButton, activeTab === 'trays' && styles.tabButtonActive]}
        >
          <Ionicons
            name="cube-outline"
            size={16}
            color={activeTab === 'trays' ? theme.colors.primary[700] : theme.colors.text.secondary}
          />
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
          onPress={() => setActiveTab('logs')}
          style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]}
        >
          <Ionicons
            name="newspaper-outline"
            size={16}
            color={activeTab === 'logs' ? theme.colors.primary[700] : theme.colors.text.secondary}
          />
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
            {/* 1. Two Big Metric Boxes */}
            <View style={styles.twoGaugesRow}>
              {/* Temperature Box */}
              <AppCard elevation="xs" style={styles.gaugeCard}>
                <View style={styles.gaugeTopRow}>
                  <Ionicons name="thermometer-outline" size={20} color="#EF4444" />
                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    NHIỆT ĐỘ
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
                    style={{ fontSize: 10, marginLeft: 3 }}
                  >
                    {envData?.healthy ? 'Cảm biến đạt yêu cầu' : 'Dữ liệu chưa sẵn sàng'}
                  </AppText>
                </View>
              </AppCard>

              {/* Humidity Box */}
              <AppCard elevation="xs" style={styles.gaugeCard}>
                <View style={styles.gaugeTopRow}>
                  <Ionicons name="water-outline" size={20} color="#0EA5E9" />
                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    ĐỘ ẨM
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
                    style={{ fontSize: 10, marginLeft: 3 }}
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
                  <Ionicons name="water" size={18} color={theme.colors.primary[600]} />
                  <AppText variant="label" weight="bold">
                    CHĂM SÓC TỰ ĐỘNG
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
                    Van SSR: {formatMistingCode('ssrState', statusData?.ssr?.reported_state || 'OFF')}
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
                    <Ionicons name="timer-outline" size={13} color={theme.colors.primary[700]} />
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
                    Lý do quyết định gần nhất:
                  </AppText>
                  <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                    {statusData.lastDecision?.reason || statusData.runtime?.last_reason}
                  </AppText>
                </View>
              )}
            </AppCard>

            {/* 3. Card "Cấu hình chăm sóc" */}
            <AppCard elevation="xs" style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="options" size={18} color={theme.colors.primary[600]} />
                  <AppText variant="label" weight="bold">
                    CẤU HÌNH CHĂM SÓC
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
                {autoConfig?.profile_name || 'Chưa thiết lập hồ sơ cấu hình'}
              </AppText>

              {/* Approved Mushroom Types Chips */}
              <View style={styles.chipsRow}>
                {/* Cultivating Chips */}
                {cultivationTrays
                  .filter((t) => t.session_id && t.mushroom_name)
                  .map((t) => (
                    <View key={`cult_${t.tray_id}`} style={styles.chipCultivating}>
                      <Ionicons name="leaf" size={12} color={theme.colors.success.dark} />
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
                      <Ionicons name="checkmark-circle" size={12} color={theme.colors.primary[700]} />
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
                  Tầng chưa có cấu hình. Hãy bấm Chỉnh sửa để thiết lập profile loại nấm và ngưỡng vi khí hậu.
                </AppText>
              )}
            </AppCard>

            {/* 4. Action Area at Bottom */}
            {canManage && (
              <View style={styles.actionAreaContainer}>
                {isRunning ? (
                  <AppButton
                    title="Dừng AUTO"
                    variant="danger"
                    size="lg"
                    fullWidth
                    loading={actionLoading}
                    leftIcon={<Ionicons name="stop-circle" size={20} color="#FFFFFF" />}
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
                        title="Chạy mô phỏng"
                        variant="outline"
                        size="md"
                        disabled={actionLoading || !autoConfig || !autoConfig.profile_approved}
                        onPress={() => setConfirmStartModal({ visible: true, dryRun: true })}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppButton
                        title="Chạy thiết bị"
                        variant="primary"
                        size="md"
                        disabled={actionLoading || !autoConfig || !autoConfig.profile_approved || !hasActiveCultivatingSessions}
                        onPress={() => setConfirmStartModal({ visible: true, dryRun: false })}
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
          </View>
        )}

        {/* ================= TAB 2: KHAY ================= */}
        {activeTab === 'trays' && (
          <View style={styles.tabContentWrap}>
            {/* Active Session Assign Banner */}
            {selectedSessionForAssign ? (
              <AppCard elevation="xs" style={styles.assignBannerCard}>
                <View style={styles.assignBannerHeader}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" weight="bold" color={theme.colors.primary[800]}>
                      ĐANG GÁN KHAY CHO PHIÊN #{selectedSessionForAssign.session_id}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Giống nấm: <AppText variant="caption" weight="bold">{selectedSessionForAssign.mushroom_name}</AppText> • Cần đúng{' '}
                      <AppText variant="caption" weight="bold">{selectedSessionForAssign.required_trays || 1} khay</AppText> trên tầng này
                    </AppText>
                  </View>

                  <AppButton
                    title="Hủy gán"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setSelectedSessionForAssign(null);
                      setSelectedTrayIdsForAssign([]);
                    }}
                  />
                </View>

                {assignConflictMessage && (
                  <View style={styles.conflictMessageBox}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error.main} />
                    <AppText variant="caption" color={theme.colors.error.main} style={{ flex: 1, marginLeft: 4 }}>
                      {assignConflictMessage}
                    </AppText>
                  </View>
                )}
              </AppCard>
            ) : (
              /* Normal mode buttons */
              <View style={styles.traysToolbarRow}>
                {canManage && (
                  <AppButton
                    title="+ Gán khay cho phiên trồng"
                    variant="primary"
                    size="sm"
                    onPress={() => setAssignSessionModalVisible(true)}
                  />
                )}
                {canManage && (
                  <AppButton
                    title="Sinh lưới khay"
                    variant="ghost"
                    size="sm"
                    onPress={handleGenerateTrays}
                  />
                )}
              </View>
            )}

            {/* Rack Grid Component */}
            <FloorTraysGrid
              floor={floor}
              trays={cultivationTrays}
              isAssignMode={Boolean(selectedSessionForAssign)}
              requiredTrayCount={selectedSessionForAssign?.required_trays || 1}
              selectedTrayIds={selectedTrayIdsForAssign}
              availableTrayIds={availableTrayIdList}
              onToggleSelectTray={handleToggleSelectTrayForSession}
            />

            {/* Fixed Footer for Assign Execution */}
            {selectedSessionForAssign && (
              <View style={styles.fixedAssignFooter}>
                <View>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Tiến độ chọn:
                  </AppText>
                  <AppText variant="title" weight="bold" color={theme.colors.primary[700]}>
                    Đã chọn {selectedTrayIdsForAssign.length}/
                    {selectedSessionForAssign.required_trays || 1} khay
                  </AppText>
                </View>

                <AppButton
                  title={`Gán ${selectedSessionForAssign.required_trays || 1} khay`}
                  variant="primary"
                  size="md"
                  loading={actionLoading}
                  disabled={
                    selectedTrayIdsForAssign.length !==
                    (selectedSessionForAssign.required_trays || 1)
                  }
                  onPress={handleExecuteAssignTrays}
                />
              </View>
            )}
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

      {/* Assign Session Modal */}
      <AssignSessionModal
        visible={assignSessionModalVisible}
        onClose={() => setAssignSessionModalVisible(false)}
        onSelectSession={handleStartAssignWorkflow}
      />

      {/* Confirm Start Modal */}
      <Modal visible={confirmStartModal.visible} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <AppCard elevation="md" style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <Ionicons
                name={confirmStartModal.dryRun ? 'flask' : 'play-circle'}
                size={28}
                color={confirmStartModal.dryRun ? '#0284C7' : theme.colors.success.main}
              />
              <AppText variant="title" weight="bold" align="center">
                {confirmStartModal.dryRun
                  ? 'Xác nhận chạy Mô phỏng'
                  : 'Xác nhận chạy Thiết bị thật'}
              </AppText>
            </View>

            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              {confirmStartModal.dryRun
                ? `Hệ thống sẽ chạy thuật toán AUTO giả lập cho ${floor.floor_name} theo hồ sơ "${autoConfig?.profile_name}". Không bật rơ-le hay van phun thực.`
                : `Hệ thống sẽ ĐIỀU KHIỂN THIẾT BỊ THỰC (van phun sương rơ-le #${floor.misting_ssr_channel}) cho ${floor.floor_name} theo hồ sơ "${autoConfig?.profile_name}".`}
            </AppText>

            <View style={styles.confirmBtnRow}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Hủy"
                  variant="ghost"
                  size="md"
                  onPress={() => setConfirmStartModal({ visible: false, dryRun: false })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Bắt đầu ngay"
                  variant={confirmStartModal.dryRun ? 'secondary' : 'primary'}
                  size="md"
                  onPress={() => handleStartAuto(confirmStartModal.dryRun)}
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
    borderRadius: theme.borderRadius.full,
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
    borderRadius: theme.borderRadius.full,
  },
  runningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  faultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  offPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning.main,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  stoppedBadge: {
    backgroundColor: theme.colors.neutral[200],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
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
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cardHeaderRow: {
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
    borderRadius: theme.borderRadius.full,
  },
  ssrDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controlStateBox: {
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
    borderRadius: theme.borderRadius.full,
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
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: theme.colors.success.main,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  chipApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[300],
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  configSummaryRow: {
    marginTop: 2,
  },
  actionAreaContainer: {
    marginTop: theme.spacing.sm,
  },
  startActionRow: {
    flexDirection: 'row',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignBannerCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
    padding: theme.spacing.sm,
    gap: 4,
  },
  assignBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  fixedAssignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
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
