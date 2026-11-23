import { useGetTrayEnvironmentQuery } from '../../../analytics/data/environmentHistoryApi';
import { useAuth } from '../../../auth';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GROWTH_STAGE_LABELS } from '../../../../core/constants/growthStages';
import { AppError } from '../../../../core/errors/appError';
import { theme } from '../../../../core/theme';
import { AppButton, AppText } from '../../../../shared/components';
import type {
  CustomerDeviceLogItem,
  CustomerEnvironmentHistoryPoint,
  CustomerGrowthHistoryItem,
  CustomerTrayCard,
  CustomerTrayDetails,
} from '../../domain/entities/Tray';
import { trayRepository } from '../../data/repositories/TrayRepository';
import {
  CustomerEnvironmentHistoryChart,
  EnvironmentHistoryRange,
} from './CustomerEnvironmentHistoryChart';
import { CustomerDailyReport } from './CustomerDailyReport';

type DetailLoadState = 'loading' | 'ready' | 'error';
type DetailTab = 'growth' | 'devices';

function getErrorMessage(error: unknown, fallback = 'Không thể tải sơ đồ khay.'): string {
  if (error instanceof AppError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

function formatDateTime(value: string): string {
  if (!value) return 'Không rõ thời gian';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function getGrowthStageLabel(stage: string): string {
  const normalizedStage = stage.trim().toUpperCase();
  const labels: Record<string, string> = {
    UNKNOWN: 'Chưa cập nhật',
    SPAWN_PENDING: 'Đang chuẩn bị phôi',
    SPAWN_RESTING: 'Đang ủ phôi',
    MYCELIAL_DEVELOPMENT: 'Đang phát triển tơ nấm',
    READY_FOR_CULTIVATION: 'Sẵn sàng nuôi trồng',
    FRUITING_INITIATION: GROWTH_STAGE_LABELS.FRUITING_INITIATION,
    PINNING: GROWTH_STAGE_LABELS.PINNING,
    YOUNG_FRUITING: GROWTH_STAGE_LABELS.YOUNG_FRUITING,
    MATURATION: GROWTH_STAGE_LABELS.MATURATION,
    HARVEST_READY: 'Sẵn sàng thu hoạch',
  };
  return labels[normalizedStage] ?? 'Giai đoạn đang được cập nhật';
}

function getCultivationStatusLabel(status?: string): string | null {
  if (!status) return null;
  const normalizedStatus = status.trim().toUpperCase();
  const labels: Record<string, string> = {
    PENDING: 'Đang chuẩn bị phôi',
    SPAWN_RESTING: 'Đang ủ phôi',
    MYCELIAL_DEVELOPMENT: 'Đang phát triển tơ nấm',
    READY_FOR_CULTIVATION: 'Sẵn sàng nuôi trồng',
    CULTIVATING: 'Đang nuôi trồng',
    HARVEST_READY: 'Sẵn sàng thu hoạch',
    HARVESTING: 'Đang thu hoạch',
    COMPLETED: 'Đã hoàn tất',
    CANCELLED: 'Đã hủy',
  };
  return labels[normalizedStatus] ?? 'Đang được cập nhật';
}

function getHarvestStatusLabel(cultivationStatus?: string, harvestStatus?: string | null): string {
  if (cultivationStatus === 'COMPLETED') return 'Đã hoàn tất';
  if (cultivationStatus === 'CANCELLED') return 'Không áp dụng';
  if (cultivationStatus === 'HARVESTING') return 'Đang thu hoạch';
  if (harvestStatus === 'HARVEST_READY' || cultivationStatus === 'HARVEST_READY') {
    return 'Sẵn sàng thu hoạch';
  }
  if (harvestStatus === 'COMPLETED') return 'Đã hoàn tất';
  return 'Chưa sẵn sàng';
}

function formatGrowthConditionText(condition?: string | null): string {
  if (!condition) return 'Bình thường';
  const upper = condition.trim().toUpperCase();
  const map: Record<string, string> = {
    NORMAL: 'Bình thường, phát triển ổn định',
    GOOD: 'Phát triển tốt',
    OPTIMAL: 'Tối ưu',
    WARNING: 'Cần theo dõi thêm',
    ABNORMAL: 'Bất thường, cần can thiệp',
    POOR: 'Kém phát triển',
  };
  return map[upper] ?? condition;
}

function getAverageSensorReadings(readings: CustomerTrayDetails['sensor_readings']) {
  const latestBySensor = new Map<string, CustomerTrayDetails['sensor_readings'][number]>();
  const newestFirst = [...readings].sort((left, right) => {
    const leftTime = Date.parse(left.receivedAt ?? left.measuredAt ?? '');
    const rightTime = Date.parse(right.receivedAt ?? right.measuredAt ?? '');
    return (
      (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
    );
  });

  for (const reading of newestFirst) {
    const sensorKey = `${reading.floorId ?? reading.floorName}:${reading.sensorId}`;
    if (!latestBySensor.has(sensorKey) && latestBySensor.size < 3) {
      latestBySensor.set(sensorKey, reading);
    }
  }

  const latestReadings = [...latestBySensor.values()].filter((reading) => reading.ok);
  const temperatures = latestReadings
    .map((reading) => reading.temperature)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const humidities = latestReadings
    .map((reading) => reading.humidity)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    temperature:
      temperatures.length > 0
        ? temperatures.reduce((total, value) => total + value, 0) / temperatures.length
        : null,
    humidity:
      humidities.length > 0
        ? humidities.reduce((total, value) => total + value, 0) / humidities.length
        : null,
  };
}

export function CustomerTrayDetail({
  selectedTray,
  onClose,
  onAssign,
  deviceHistoryUnavailable = false,
}: {
  selectedTray: CustomerTrayCard;
  onClose: () => void;
  onAssign?: (floorId?: number) => void;
  deviceHistoryUnavailable?: boolean;
}) {
  const [detailTab, setDetailTab] = useState<DetailTab>('growth');
  const [details, setDetails] = useState<CustomerTrayDetails | null>(null);
  const [detailLoadState, setDetailLoadState] = useState<DetailLoadState>('loading');
  const [detailError, setDetailError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorRefreshError, setSensorRefreshError] = useState<string | null>(null);
  const [deviceRefreshError, setDeviceRefreshError] = useState<string | null>(null);
  const [environmentRange, setEnvironmentRange] = useState<EnvironmentHistoryRange>(1);
  const detailRequestId = useRef(0);

  useEffect(() => {
    const tray = selectedTray;
    const loadDetails = async () => {
      const requestId = ++detailRequestId.current;
      setDetailTab('growth');
      setDetails(null);
      setDetailError(null);
      setSensorRefreshError(null);
      setDeviceRefreshError(null);
      setEnvironmentRange(1);
      setDetailLoadState('loading');
      try {
        if (!tray.sessionId) {
          setDetailError('Khay này hiện đang trống, chưa có phiên nuôi trồng.');
          setDetailLoadState('error');
          return;
        }
        const result = await trayRepository.getCustomerCultivationDetails(
          tray.sessionId,
          tray.orderId || null
        );
        if (requestId !== detailRequestId.current) return;
        setDetails(result);
        setDetailLoadState('ready');
      } catch (error: unknown) {
        if (requestId !== detailRequestId.current) return;
        setDetailError(getErrorMessage(error, 'Không thể tải chi tiết vụ trồng.'));
        setDetailLoadState('error');
      }
    };
    void loadDetails();
    return () => {
      detailRequestId.current += 1;
    };
  }, [selectedTray, retryCount]);

  const [deviceLoading, setDeviceLoading] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(false);
  const deviceInFlight = useRef<number | null>(null);
  const sensorInFlight = useRef<number | null>(null);

  const refreshSensorHistory = useCallback(async (sessionId: number, requestId: number) => {
    if (sensorInFlight.current === requestId) return;
    sensorInFlight.current = requestId;
    setSensorLoading(true);
    try {
      const readings = await trayRepository.getCustomerCurrentSensorReadings(sessionId);
      if (requestId !== detailRequestId.current) return;
      setDetails((current) =>
        current?.session_id === sessionId
          ? { ...current, sensor_readings: readings }
          : current
      );
      setSensorRefreshError(null);
    } catch (error: unknown) {
      if (requestId !== detailRequestId.current) return;
      setDetails((current) =>
        current?.session_id === sessionId ? { ...current, sensor_readings: [] } : current
      );
      setSensorRefreshError(getErrorMessage(error, 'Không thể làm mới dữ liệu cảm biến.'));
    } finally {
      if (sensorInFlight.current === requestId) sensorInFlight.current = null;
      if (requestId === detailRequestId.current) setSensorLoading(false);
    }
  }, []);

  const refreshDeviceHistory = useCallback(async (sessionId: number, requestId: number) => {
    if (deviceInFlight.current === requestId) return;
    deviceInFlight.current = requestId;
    setDeviceLoading(true);
    try {
      const logs = await trayRepository.getCustomerDeviceLogs(sessionId);
      if (requestId !== detailRequestId.current) return;
      setDetails((current) =>
        current?.session_id === sessionId ? { ...current, device_logs: logs } : current
      );
      setDeviceRefreshError(null);
    } catch (error: unknown) {
      if (requestId !== detailRequestId.current) return;
      setDeviceRefreshError(getErrorMessage(error, 'Không thể làm mới nhật ký thiết bị.'));
    } finally {
      if (deviceInFlight.current === requestId) deviceInFlight.current = null;
      if (requestId === detailRequestId.current) setDeviceLoading(false);
    }
  }, []);

  useEffect(() => {
    const sessionId = selectedTray?.sessionId;
    if (
      deviceHistoryUnavailable ||
      !sessionId ||
      detailTab !== 'devices' ||
      detailLoadState !== 'ready' ||
      details?.session_id !== sessionId
    ) {
      return;
    }

    const requestId = detailRequestId.current;
    void refreshSensorHistory(sessionId, requestId);
    void refreshDeviceHistory(sessionId, requestId);
    const intervalId = setInterval(() => {
      void refreshSensorHistory(sessionId, requestId);
      void refreshDeviceHistory(sessionId, requestId);
    }, 15_000);
    return () => clearInterval(intervalId);
  }, [
    selectedTray,
    detailTab,
    detailLoadState,
    details?.session_id,
    refreshSensorHistory,
    refreshDeviceHistory,
    deviceHistoryUnavailable,
  ]);

  // Start alongside session details, so opening the device tab does not start a second wait.
  const { user } = useAuth();
  const {
    currentData: environmentPoints = [], isFetching: environmentLoading,
    error: environmentQueryError,
  } = useGetTrayEnvironmentQuery({
    accountId: user?.id || '', sessionId: selectedTray.sessionId || 0,
    rangeHours: environmentRange,
  }, {
    skip: !user || !selectedTray.sessionId || deviceHistoryUnavailable,
    refetchOnMountOrArgChange: 60,
    pollingInterval: detailTab === 'devices' ? 60_000 : 0,
  });
  const environmentError = environmentQueryError
    ? environmentQueryError.message || 'Không thể tải lịch sử môi trường.' : null;

  const handleCloseDetails = onClose;
  return (
    <View style={styles.detailBackdrop}>
      <View style={styles.detailModal}>
        <View style={styles.detailHeader}>
          <View style={styles.detailTitle}>
            <AppText variant="title" weight="bold">
              Chi tiết {selectedTray?.code}
            </AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              {selectedTray?.mushroomName ?? 'Vụ trồng nấm'}
            </AppText>
          </View>
          <Pressable
            onPress={handleCloseDetails}
            accessibilityRole="button"
            accessibilityLabel="Đóng chi tiết khay"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.detailTabs}>
          <DetailTabButton
            active={detailTab === 'growth'}
            label="Trạng thái nấm"
            icon="leaf-outline"
            onPress={() => setDetailTab('growth')}
          />
          <DetailTabButton
            active={detailTab === 'devices'}
            label="Nhật ký thiết bị"
            icon="hardware-chip-outline"
            onPress={() => setDetailTab('devices')}
          />
        </View>

        {detailLoadState === 'loading' ? (
          <View style={styles.detailState}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải chi tiết vụ trồng...
            </AppText>
          </View>
        ) : detailLoadState === 'error' ? (
          <View style={styles.detailState}>
            <Ionicons name="cube-outline" size={30} color={theme.colors.text.muted} />
            <AppText
              variant="bodySmall"
              color={theme.colors.text.secondary}
              align="center"
              style={{ marginTop: 6 }}
            >
              {detailError}
            </AppText>
            {selectedTray.sessionId ? (
              <AppButton
                title="Thử lại"
                variant="outline"
                size="sm"
                onPress={() => setRetryCount((count) => count + 1)}
              />
            ) : null}
            {onAssign && !selectedTray?.sessionId ? (
              <AppButton
                title="Xếp khay cho phiên trồng"
                variant="primary"
                size="sm"
                style={{ marginTop: 12 }}
                leftIcon={<Ionicons name="grid-outline" size={16} color="#FFFFFF" />}
                onPress={() => {
                  const fId = selectedTray?.floorId;
                  handleCloseDetails();
                  onAssign(fId);
                }}
              />
            ) : null}

            {/* Requirement 4: Show past session history if any */}
            {selectedTray?.pastSessions && selectedTray.pastSessions.length > 0 ? (
              <View style={styles.pastSessionsBox}>
                <AppText variant="captionMedium" weight="bold" color={theme.colors.text.secondary}>
                  Lịch sử phiên trồng trước đây ({selectedTray.pastSessions.length}):
                </AppText>
                {selectedTray.pastSessions.map((past) => (
                  <View key={past.sessionId} style={styles.pastSessionRow}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.text.muted} />
                    <AppText
                      variant="caption"
                      color={theme.colors.text.primary}
                      weight="medium"
                      style={{ flex: 1 }}
                    >
                      Phiên #{past.sessionId} • {past.mushroomName || 'Nấm giống'}
                    </AppText>
                    <View style={styles.releasedBadge}>
                      <AppText variant="caption" color="#059669" style={{ fontSize: 10 }}>
                        Đã giải phóng
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.detailList}
            showsVerticalScrollIndicator={false}
          >
            {detailTab === 'growth' ? (
              <>
                <GrowthHistory
                  history={details?.growth_history ?? []}
                  cultivationStatus={details?.cultivation_status}
                  harvestStatus={details?.harvest_status}
                  currentStage={details?.current_stage}
                  progressPercent={details?.progress_percent}
                />
                {selectedTray?.sessionId ? (
                  <CustomerDailyReport
                    key={`${selectedTray.sessionId}-${selectedTray.id}`}
                    sessionId={selectedTray.sessionId}
                    trayId={selectedTray.id}
                    sessionTrayId={selectedTray.sessionTrayId}
                  />
                ) : null}

                {/* Requirement 4: Show past session history if any */}
                {selectedTray?.pastSessions && selectedTray.pastSessions.length > 0 ? (
                  <View style={styles.pastSessionsBox}>
                    <AppText
                      variant="captionMedium"
                      weight="bold"
                      color={theme.colors.text.secondary}
                    >
                      Lịch sử các phiên trước đây ({selectedTray.pastSessions.length}):
                    </AppText>
                    {selectedTray.pastSessions.map((past) => (
                      <View key={past.sessionId} style={styles.pastSessionRow}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.text.muted} />
                        <AppText
                          variant="caption"
                          color={theme.colors.text.primary}
                          weight="medium"
                          style={{ flex: 1 }}
                        >
                          Phiên #{past.sessionId} • {past.mushroomName || 'Nấm giống'}
                        </AppText>
                        <View style={styles.releasedBadge}>
                          <AppText variant="caption" color="#059669" style={{ fontSize: 10 }}>
                            Đã giải phóng
                          </AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : deviceHistoryUnavailable ? (
              <DetailEmptyState message="Không thể xác định lịch sử thiết bị theo vị trí cũ vì phiên có khay đã trả." />
            ) : (
              <>
                <DeviceHistory
                  logs={details?.device_logs ?? []}
                  readings={details?.sensor_readings ?? []}
                  refreshError={sensorRefreshError}
                  deviceRefreshError={deviceRefreshError}
                  sensorLoading={sensorLoading}
                  deviceLoading={deviceLoading}
                  environmentPoints={environmentPoints}
                  environmentRange={environmentRange}
                  onEnvironmentRangeChange={setEnvironmentRange}
                  environmentLoading={environmentLoading}
                  environmentError={environmentError}
                />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const DetailTabButton: React.FC<{
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ active, label, icon, onPress }) => (
  <Pressable
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[styles.detailTab, active && styles.detailTabActive]}
  >
    <Ionicons
      name={icon}
      size={16}
      color={active ? theme.colors.primary[700] : theme.colors.text.secondary}
    />
    <AppText
      variant="captionMedium"
      weight={active ? 'bold' : 'medium'}
      color={active ? theme.colors.primary[700] : theme.colors.text.secondary}
    >
      {label}
    </AppText>
  </Pressable>
);

const GrowthHistory: React.FC<{
  history: CustomerGrowthHistoryItem[];
  cultivationStatus?: string;
  harvestStatus?: string | null;
  currentStage?: string | null;
  progressPercent?: number | null;
}> = ({ history, cultivationStatus, harvestStatus, currentStage, progressPercent }) => {
  const stages = [
    'FRUITING_INITIATION',
    'PINNING',
    'YOUNG_FRUITING',
    'MATURATION',
    'HARVEST_READY',
  ];
  const harvestReady =
    harvestStatus === 'HARVEST_READY' ||
    cultivationStatus === 'HARVEST_READY' ||
    cultivationStatus === 'HARVESTING' ||
    cultivationStatus === 'COMPLETED';
  const activeStage = harvestReady
    ? 'HARVEST_READY'
    : currentStage || history[history.length - 1]?.current_stage || 'FRUITING_INITIATION';
  const normalizedStage = activeStage.trim().toUpperCase();
  const activeStageIndex =
    cultivationStatus === 'COMPLETED'
      ? stages.length - 1
      : Math.max(0, stages.indexOf(normalizedStage));
  const latestUpdate = history[history.length - 1];

  return (
    <View style={styles.historyList}>
      <View style={styles.historyCard}>
        <AppText variant="bodyMedium" weight="bold">
          Tiến độ vụ trồng
        </AppText>
        {cultivationStatus ? (
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Trạng thái phiên: {getCultivationStatusLabel(cultivationStatus)}
          </AppText>
        ) : null}
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Trạng thái thu hoạch: {getHarvestStatusLabel(cultivationStatus, harvestStatus)}
        </AppText>
        {currentStage ? (
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Giai đoạn nấm: {getGrowthStageLabel(currentStage)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.historyCard}>
        <View style={styles.historyHeading}>
          <AppText variant="bodyMedium" weight="bold" style={styles.historyTitle}>
            {getGrowthStageLabel(activeStage)}
          </AppText>
          <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
            {progressPercent == null ? 'Chưa cập nhật' : `${progressPercent}%`}
          </AppText>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={progressPercent == null
            ? { text: 'Chưa cập nhật tiến độ' }
            : { min: 0, max: 100, now: progressPercent }}
          style={styles.progressTrack}
        >
          <View style={styles.progressRail} />
          {progressPercent != null ? (
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          ) : null}
          {stages.map((stage, index) => (
            <View
              key={stage}
              accessibilityLabel={getGrowthStageLabel(stage)}
              style={[
                styles.progressDot,
                index <= activeStageIndex ? styles.progressDotReached : styles.progressDotUpcoming,
                index === activeStageIndex && styles.progressDotCurrent,
                { left: `${(index / (stages.length - 1)) * 100}%` },
              ]}
            />
          ))}
        </View>
        <View style={styles.progressLabels}></View>
        {latestUpdate?.description ? (
          <AppText variant="caption" color={theme.colors.text.secondary}>
            {latestUpdate.description}
          </AppText>
        ) : null}
        {latestUpdate ? (
          <AppText variant="caption" color={theme.colors.text.muted}>
            Cập nhật: {formatDateTime(latestUpdate.updated_at)}
          </AppText>
        ) : null}
      </View>
      {history.length === 0 ? (
        <DetailEmptyState message="Chưa có nhật ký cập nhật giai đoạn nấm." />
      ) : null}
      {history.map((item) => (
        <View key={item.progress_id} style={styles.growthHistoryEntry}>
          <View style={styles.historyHeading}>
            <AppText variant="bodyMedium" weight="bold" style={styles.historyTitle}>
              {getGrowthStageLabel(item.current_stage)}
            </AppText>
            {typeof item.progress_percent === 'number' ? (
              <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
                {item.progress_percent}%
              </AppText>
            ) : null}
          </View>
          {item.condition ? (
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Tình trạng: {formatGrowthConditionText(item.condition)}
            </AppText>
          ) : null}
          {item.description ? (
            <AppText variant="bodySmall" color={theme.colors.text.primary}>
              {item.description}
            </AppText>
          ) : null}
          <AppText variant="caption" color={theme.colors.text.muted}>
            {formatDateTime(item.updated_at)}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const DeviceHistory: React.FC<{
  logs: CustomerDeviceLogItem[];
  readings: CustomerTrayDetails['sensor_readings'];
  refreshError: string | null;
  deviceRefreshError: string | null;
  sensorLoading: boolean;
  deviceLoading: boolean;
  environmentPoints: CustomerEnvironmentHistoryPoint[];
  environmentRange: EnvironmentHistoryRange;
  onEnvironmentRangeChange: (range: EnvironmentHistoryRange) => void;
  environmentLoading: boolean;
  environmentError: string | null;
}> = ({
  logs,
  readings,
  refreshError,
  deviceRefreshError,
  sensorLoading,
  deviceLoading,
  environmentPoints,
  environmentRange,
  onEnvironmentRangeChange,
  environmentLoading,
  environmentError,
}) => {
  const averages = getAverageSensorReadings(readings);

  return (
    <View style={styles.historyList}>
      <CustomerEnvironmentHistoryChart
        points={environmentPoints}
        range={environmentRange}
        onRangeChange={onEnvironmentRangeChange}
        loading={environmentLoading}
        error={environmentError}
      />
      <View style={styles.sensorSection}>
        {refreshError ? (
          <AppText variant="caption" color={theme.colors.error.main}>
            Không thể cập nhật cảm biến: {refreshError}
          </AppText>
        ) : !sensorLoading && averages.temperature === null && averages.humidity === null ? (
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Chưa có dữ liệu cảm biến hợp lệ trong 60 giây gần nhất.
          </AppText>
        ) : null}
        <View style={styles.sensorSummary}>
          <View style={styles.sensorMetricRow}>
            <Ionicons name="thermometer-outline" size={30} color="#F5A623" />
            <View style={styles.sensorMetricText}>
              <AppText variant="bodySmall" color="#286257">
                Nhiệt độ
              </AppText>
              <AppText variant="bodyMedium" weight="bold" color="#286257">
                {averages.temperature === null ? '--' : `${averages.temperature.toFixed(1)}°C`}
              </AppText>
            </View>
          </View>
          <View style={styles.sensorMetricDivider} />
          <View style={styles.sensorMetricRow}>
            <Ionicons name="water-outline" size={30} color="#78C7BF" />
            <View style={styles.sensorMetricText}>
              <AppText variant="bodySmall" color="#286257">
                Độ ẩm
              </AppText>
              <AppText variant="bodyMedium" weight="bold" color="#286257">
                {averages.humidity === null ? '--' : `${averages.humidity.toFixed(0)}%`}
              </AppText>
            </View>
          </View>
        </View>
      </View>
      <AppText variant="bodyMedium" weight="bold">
        Nhật ký bật/tắt thiết bị
      </AppText>
      {deviceRefreshError ? (
        <AppText variant="caption" color={theme.colors.error.main}>
          Không thể cập nhật nhật ký thiết bị: {deviceRefreshError}
        </AppText>
      ) : !deviceLoading && logs.length === 0 ? (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Chưa có lệnh bật/tắt thiết bị.
        </AppText>
      ) : null}
      {logs.map((log) => (
        <View key={log.commandId} style={styles.historyCard}>
          <View style={styles.deviceAction}>
            <Ionicons
              name={log.action === 'ON' ? 'power' : 'power-outline'}
              size={17}
              color={log.action === 'ON' ? theme.colors.success.main : theme.colors.text.secondary}
            />
            <AppText variant="bodyMedium" weight="bold">
              {log.action === 'ON' ? 'Bật' : 'Tắt'}{' '}
              {log.floors.length > 0
                ? log.floors
                    .map(
                      (floor) =>
                        `${floor.deviceType === 'MISTING' ? 'phun sương' : 'đèn'} · ${floor.floorName}`
                    )
                    .join(', ')
                : 'thiết bị'}
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.muted}>
            {formatDateTime(log.requestedAt)}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const DetailEmptyState: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.detailState}>
    <Ionicons name="time-outline" size={28} color={theme.colors.text.muted} />
    <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
      {message}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  detailBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: theme.spacing.md,
  },
  detailModal: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  detailTabs: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  detailTab: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
  },
  detailTabActive: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  detailState: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  detailList: {
    paddingBottom: theme.spacing.sm,
  },
  historyList: {
    gap: theme.spacing.sm,
  },
  historyCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  historyHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sensorSection: {
    gap: theme.spacing.sm,
  },
  sensorSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
  },
  sensorMetricRow: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sensorMetricText: {
    gap: theme.spacing.xxs,
  },
  sensorMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    backgroundColor: '#E5ECEA',
  },
  historyTitle: {
    flex: 1,
  },
  growthHistoryEntry: {
    display: 'none',
  },
  progressTrack: {
    height: 18,
    width: '100%',
    justifyContent: 'center',
    overflow: 'visible',
  },
  progressRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[200],
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
  },
  progressDot: {
    position: 'absolute',
    top: 2,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
  },
  progressDotReached: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[600],
  },
  progressDotUpcoming: {
    borderColor: theme.colors.neutral[400],
    backgroundColor: '#FFFFFF',
  },
  progressDotCurrent: {
    width: 18,
    height: 18,
    top: 0,
    marginLeft: -9,
    borderRadius: 9,
    borderColor: theme.colors.primary[700],
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pastSessionsBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: theme.spacing.xs,
    width: '100%',
  },
  pastSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  releasedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
