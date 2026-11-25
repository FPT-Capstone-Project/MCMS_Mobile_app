import { useGetTrayEnvironmentQuery } from '../../../analytics/data/environmentHistoryApi';
import { useAuth } from '../../../auth';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppError } from '../../../../core/errors/appError';
import { theme } from '../../../../core/theme';
import { statusLabel } from '../../../cultivation/domain/sessionWorkflow';
import { AppButton, AppCard, AppText } from '../../../../shared/components';
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

function formatDate(value: string): string {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chưa ghi nhận'
    : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function getHarvestStatusLabel(cultivationStatus?: string, harvestStatus?: string | null): string {
  const resolvedStatus = cultivationStatus?.toUpperCase() === 'COMPLETED'
    ? 'COMPLETED'
    : harvestStatus || 'NOT_READY';
  const labels: Record<string, string> = {
    NOT_READY: 'Chưa sẵn sàng',
    HARVEST_READY: 'Sẵn sàng thu hoạch',
    READY: 'Sẵn sàng',
    HARVESTED: 'Đã thu hoạch',
    IN_PROGRESS: 'Đang thu hoạch',
    COMPLETED: 'Đã hoàn thành',
  };
  return labels[resolvedStatus.toUpperCase()] ?? statusLabel(resolvedStatus);
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
                  expectedHarvestDate={details?.expected_harvest_date}
                  condition={details?.condition}
                  currentStage={details?.current_stage}
                  progressPercent={details?.progress_percent}
                  mushroomName={details?.mushroom_name || selectedTray.mushroomName}
                  requiredTrays={details?.required_trays ?? details?.tray_quantity}
                  spawnQuantity={details?.spawn_quantity}
                  spawnStatus={details?.spawn_status}
                  spawnIssued={details?.spawn_issued}
                  floorName={details?.floor_name || selectedTray.floorName}
                  floorNumber={selectedTray.floorNumber}
                  rowNumber={selectedTray.rowNumber}
                  columnNumber={selectedTray.columnNumber}
                  trayCode={selectedTray.code}
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
  expectedHarvestDate?: string | null;
  condition?: string | null;
  currentStage?: string | null;
  progressPercent?: number | null;
  mushroomName?: string;
  requiredTrays?: number | null;
  spawnQuantity?: number | null;
  spawnStatus?: string | null;
  spawnIssued?: boolean;
  floorName?: string;
  floorNumber?: number;
  rowNumber?: number;
  columnNumber?: number;
  trayCode: string;
}> = ({
  history,
  cultivationStatus,
  harvestStatus,
  expectedHarvestDate,
  condition,
  currentStage,
  progressPercent,
  mushroomName,
  requiredTrays,
  spawnQuantity,
  spawnStatus,
  spawnIssued,
  floorName,
  floorNumber,
  rowNumber,
  columnNumber,
  trayCode,
}) => {
  const latestUpdate = history[history.length - 1];
  const growthStage = currentStage || latestUpdate?.current_stage || '';
  const displayedProgress = progressPercent ?? 0;
  const normalizedProgress = Math.min(100, Math.max(0, displayedProgress));
  const resolvedHarvestStatus = cultivationStatus?.toUpperCase() === 'COMPLETED'
    ? 'COMPLETED'
    : harvestStatus || 'NOT_READY';
  const harvestReady = resolvedHarvestStatus.toUpperCase() === 'HARVEST_READY';
  const trayCount = requiredTrays && requiredTrays > 0 ? requiredTrays : 1;
  const displayedSpawnQuantity = spawnQuantity && spawnQuantity > 0 ? spawnQuantity : trayCount * 2;
  const hasSpawnBeenIssued = spawnIssued ??
    ['ISSUED', 'SPAWN_ISSUED'].includes(spawnStatus?.toUpperCase() ?? '');
  const displayedSpawnStatus = spawnStatus || (spawnIssued ? 'ISSUED' : 'NOT_ISSUED');
  const displayedCondition = condition || latestUpdate?.condition;
  const location = [
    floorName || (floorNumber != null ? `Tầng ${floorNumber}` : null),
    rowNumber != null && columnNumber != null
      ? `Hàng ${rowNumber}, cột ${columnNumber}`
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.historyList}>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Giai đoạn sinh trưởng
          </AppText>
          <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[700]}>
            {statusLabel(growthStage)}
          </AppText>
          {growthStage ? (
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${normalizedProgress}%` }]} />
            </View>
          ) : null}
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Tiến độ: {displayedProgress}%
          </AppText>
          {cultivationStatus ? (
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Trạng thái phiên: {statusLabel(cultivationStatus)}
            </AppText>
          ) : null}
        </View>
        <View style={styles.metricCard}>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Trạng thái thu hoạch
          </AppText>
          <View style={styles.harvestStatus}>
            <Ionicons
              name={harvestReady ? 'checkmark-circle' : 'hourglass-outline'}
              size={16}
              color={harvestReady ? theme.colors.success.dark : theme.colors.warning.dark}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={harvestReady ? theme.colors.success.dark : theme.colors.warning.dark}
            >
              {getHarvestStatusLabel(cultivationStatus, harvestStatus)}
            </AppText>
          </View>
          {expectedHarvestDate ? (
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Dự kiến: {formatDate(expectedHarvestDate)}
            </AppText>
          ) : null}
        </View>
      </View>

      <AppCard elevation="none" style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="leaf-outline" size={18} color={theme.colors.primary[600]} />
          <AppText variant="label" weight="bold">THÔNG TIN GIỐNG NẤM & QUY MÔ</AppText>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.gridColumn}>
            <AppText variant="caption" color={theme.colors.text.muted}>Giống nấm</AppText>
            <AppText variant="bodySmall" weight="bold">{mushroomName || 'Nấm giống'}</AppText>
          </View>
          <View style={styles.gridColumn}>
            <AppText variant="caption" color={theme.colors.text.muted}>Quy mô nuôi trồng</AppText>
            <AppText variant="bodySmall" weight="bold">
              {trayCount} khay · {displayedSpawnQuantity} bịch phôi
            </AppText>
          </View>
          <View style={styles.gridColumn}>
            <AppText variant="caption" color={theme.colors.text.muted}>Khay đang xem</AppText>
            <AppText variant="bodySmall" weight="bold">{trayCode}</AppText>
          </View>
          <View style={styles.gridColumn}>
            <AppText variant="caption" color={theme.colors.text.muted}>Vị trí tầng nuôi trồng</AppText>
            <AppText
              variant="bodySmall"
              weight="bold"
              color={location ? theme.colors.text.primary : theme.colors.warning.dark}
            >
              {location || 'Chưa gán tầng'}
            </AppText>
          </View>
          <View style={styles.gridColumn}>
            <AppText variant="caption" color={theme.colors.text.muted}>Tình trạng quan sát</AppText>
            <AppText variant="bodySmall" weight="bold">
              {formatGrowthConditionText(displayedCondition)}
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard elevation="none" style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flask-outline" size={18} color="#0284C7" />
          <AppText variant="label" weight="bold" color="#0369A1">
            KIỂM TRA PHÔI THEO PHIÊN
          </AppText>
        </View>
        <AppText variant="caption" color={theme.colors.text.muted}>
          Thông tin phôi được áp dụng chung cho cả phiên nuôi trồng.
        </AppText>
        <View style={styles.spawnSummary}>
          <View style={styles.spawnSummaryRow}>
            <AppText variant="caption" color={theme.colors.text.secondary}>Tiêu chuẩn phôi phiên:</AppText>
            <AppText variant="caption" weight="bold">
              {displayedSpawnQuantity} bịch ({trayCount} khay × {Math.round(displayedSpawnQuantity / trayCount)} bịch/khay)
            </AppText>
          </View>
          <View style={styles.spawnSummaryRow}>
            <AppText variant="caption" color={theme.colors.text.secondary}>Trạng thái phôi:</AppText>
            <AppText
              variant="caption"
              weight="bold"
              color={hasSpawnBeenIssued ? theme.colors.success.dark : theme.colors.warning.dark}
            >
              {statusLabel(displayedSpawnStatus)}
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard elevation="none" style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={18} color={theme.colors.primary[600]} />
          <AppText variant="label" weight="bold">LỊCH SỬ TIẾN ĐỘ SINH TRƯỞNG</AppText>
        </View>
        {history.length > 0 ? (
          <View style={styles.timelineContainer}>
            {history.map((item, index) => {
              const isLatest = index === history.length - 1;
              return (
                <View key={`${item.progress_id}-${index}`} style={styles.timelineItem}>
                  <View style={styles.timelineDotLine}>
                    <View style={[styles.timelineDot, isLatest && styles.timelineDotLatest]} />
                    {index < history.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <AppText
                        variant="bodySmall"
                        weight="bold"
                        color={isLatest ? theme.colors.primary[700] : theme.colors.text.primary}
                      >
                        {statusLabel(item.current_stage)} ({item.progress_percent ?? 0}%)
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {formatDate(item.updated_at)}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Tình trạng: <AppText variant="caption" weight="medium">
                        {formatGrowthConditionText(item.condition)}
                      </AppText>
                    </AppText>
                    {item.description ? (
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {item.description}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <AppText variant="caption" color={theme.colors.text.muted}>
            Chưa có lịch sử cập nhật sinh trưởng nào được ghi nhận.
          </AppText>
        )}
      </AppCard>
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
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    gap: theme.spacing.xs,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[600],
  },
  harvestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sectionCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    gap: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  gridColumn: {
    flex: 1,
    minWidth: '45%',
    gap: theme.spacing.xxs,
  },
  spawnSummary: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  spawnSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timelineContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  timelineDotLine: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.neutral[300],
    marginTop: 4,
  },
  timelineDotLatest: {
    backgroundColor: theme.colors.primary[600],
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.neutral[200],
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xxs,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  historyCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 1,
    borderColor: theme.colors.border.light,
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
