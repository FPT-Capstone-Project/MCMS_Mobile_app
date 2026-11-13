import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppError } from '../../src/core/errors/appError';
import { theme } from '../../src/core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';
import {
  CustomerDeviceLogItem,
  CustomerFloorRack,
  CustomerGrowthHistoryItem,
  CustomerTrayCard,
  CustomerTrayDetails,
} from '../../src/features/tray';
import { trayRepository } from '../../src/features/tray/data/repositories/TrayRepository';
import { CustomerDailyReport } from '../../src/features/tray/presentation/components/CustomerDailyReport';
import { useAuth } from '../../src/features/auth';

type TrayLoadState = 'loading' | 'ready' | 'error';
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
  const labels: Record<string, string> = {
    UNKNOWN: 'Chưa cập nhật',
    SPAWN_PENDING: 'Đang chuẩn bị phôi',
    SPAWN_RESTING: 'Đang ủ phôi',
    MYCELIAL_DEVELOPMENT: 'Đang phát triển tơ nấm',
    READY_FOR_CULTIVATION: 'Sẵn sàng nuôi trồng',
    FRUITING_INITIATION: 'Bắt đầu tạo quả thể',
    PINNING: 'Ra nụ',
    YOUNG_FRUITING: 'Nấm non',
    MATURATION: 'Trưởng thành',
  };
  return labels[stage] ?? stage.replace(/_/g, ' ');
}

function getCultivationStatusLabel(status?: string): string | null {
  if (!status) return null;
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
  return labels[status] ?? status.replace(/_/g, ' ');
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

function getAverageSensorReadings(readings: CustomerTrayDetails['sensor_readings']) {
  const latestBySensor = new Map<string, CustomerTrayDetails['sensor_readings'][number]>();
  const newestFirst = [...readings].sort((left, right) => {
    const leftTime = Date.parse(left.receivedAt ?? left.measuredAt ?? '');
    const rightTime = Date.parse(right.receivedAt ?? right.measuredAt ?? '');
    return (Number.isFinite(rightTime) ? rightTime : 0) -
      (Number.isFinite(leftTime) ? leftTime : 0);
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

export default function TrayScreen() {
  const router = useRouter();
  const { canControlIot } = useAuth();
  const [racks, setRacks] = useState<CustomerFloorRack[]>([]);
  const [loadState, setLoadState] = useState<TrayLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTray, setSelectedTray] = useState<CustomerTrayCard | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('growth');
  const [details, setDetails] = useState<CustomerTrayDetails | null>(null);
  const [detailLoadState, setDetailLoadState] = useState<DetailLoadState>('loading');
  const [detailError, setDetailError] = useState<string | null>(null);
  const [sensorRefreshError, setSensorRefreshError] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  const loadRacks = useCallback(async () => {
    try {
      setErrorMessage(null);
      setRacks(await trayRepository.getCustomerFloorRacks());
      setLoadState('ready');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRacks();
    }, [loadRacks])
  );

  const handleRetry = () => {
    setLoadState('loading');
    void loadRacks();
  };

  const handleViewCamera = (cameraId: string) => {
    router.push({
      pathname: '/camera/[cameraId]',
      params: { cameraId },
    });
  };

  const handleViewDetails = async (tray: CustomerTrayCard) => {
    const requestId = ++detailRequestId.current;
    setSelectedTray(tray);
    setDetailTab('growth');
    setDetails(null);
    setDetailError(null);
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
      setSensorRefreshError(null);
      setDetailLoadState('ready');
    } catch (error: unknown) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(getErrorMessage(error, 'Không thể tải chi tiết vụ trồng.'));
      setDetailLoadState('error');
    }
  };

  const refreshSensorHistory = useCallback(async (sessionId: number, requestId: number) => {
    try {
      const readings = await trayRepository.getCustomerSensorHistory(sessionId);
      if (requestId !== detailRequestId.current) return;
      setDetails((current) =>
        current?.session_id === sessionId ? { ...current, sensor_readings: readings } : current
      );
      setSensorRefreshError(null);
    } catch (error: unknown) {
      if (requestId !== detailRequestId.current) return;
      setSensorRefreshError(getErrorMessage(error, 'Không thể làm mới dữ liệu cảm biến.'));
    }
  }, []);

  useEffect(() => {
    const sessionId = selectedTray?.sessionId;
    if (
      !sessionId ||
      detailTab !== 'devices' ||
      detailLoadState !== 'ready' ||
      details?.session_id !== sessionId
    ) {
      return;
    }

    const requestId = detailRequestId.current;
    void refreshSensorHistory(sessionId, requestId);
    const intervalId = setInterval(() => {
      void refreshSensorHistory(sessionId, requestId);
    }, 15_000);
    return () => clearInterval(intervalId);
  }, [selectedTray, detailTab, detailLoadState, details?.session_id, refreshSensorHistory]);

  const handleCloseDetails = () => {
    detailRequestId.current += 1;
    setSelectedTray(null);
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title={canControlIot ? "Phòng tầng khay" : "Khay của tôi"}
        subtitle={canControlIot ? "Sơ đồ phòng, tầng và khay tại SmartMush Farm" : "Sơ đồ khay tại SmartMush Farm"}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {canControlIot && (
              <AppButton
                title="Xếp khay"
                size="sm"
                variant="primary"
                leftIcon={<Ionicons name="grid-outline" size={14} color="#FFFFFF" />}
                onPress={() => router.push('/cultivation')}
              />
            )}
            <AppIconButton
              icon={<Ionicons name="refresh-outline" size={20} color={theme.colors.text.primary} />}
              onPress={handleRetry}
              accessibilityLabel="Tải lại sơ đồ khay"
              disabled={loadState === 'loading'}
            />
          </View>
        }
      />

      <View style={styles.content}>
        {canControlIot && (
          <AppCard elevation="xs" style={styles.staffActionCard}>
            <View style={styles.staffActionRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[800]}>
                  Quản lý & Xếp khay vào tầng
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 2 }}>
                  Phân bổ khay cho phiên trồng, sinh lưới khay và cấu hình vi khí hậu.
                </AppText>
              </View>
              <AppButton
                title="Xếp khay ngay"
                variant="primary"
                size="sm"
                leftIcon={<Ionicons name="grid-outline" size={14} color="#FFFFFF" />}
                onPress={() => router.push('/cultivation')}
              />
            </View>
          </AppCard>
        )}

        <TrayLegend isStaff={canControlIot} />

        {loadState === 'loading' ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải sơ đồ các tầng...
            </AppText>
          </View>
        ) : null}

        {loadState === 'error' ? (
          <AppCard elevation="sm" style={styles.messageCard}>
            <Ionicons name="cloud-offline-outline" size={34} color={theme.colors.error.main} />
            <AppText variant="title" weight="bold" align="center">
              Không thể tải sơ đồ khay
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              {errorMessage}
            </AppText>
            <AppButton title="Thử lại" onPress={handleRetry} />
          </AppCard>
        ) : null}

        {loadState === 'ready' && racks.length === 0 ? (
          <AppCard elevation="xs" style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={30} color={theme.colors.text.muted} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              Hiện chưa có tầng khay đang hoạt động.
            </AppText>
          </AppCard>
        ) : null}

        {loadState === 'ready'
          ? racks.map((rack) => (
            <View key={rack.id} style={styles.floorSection}>
              <View style={styles.floorHeading}>
                <AppText variant="title" weight="bold" style={styles.floorTitle}>
                  Tầng {rack.floorNumber}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {canControlIot && (
                    <AppButton
                      title="Xếp khay"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Ionicons name="grid-outline" size={14} color={theme.colors.primary[700]} />}
                      onPress={() =>
                        router.push({
                          pathname: '/cultivation',
                          params: {
                            floorId: String(rack.id || rack.floorNumber),
                            tab: 'trays',
                          },
                        } as any)
                      }
                    />
                  )}
                  {getCameraIdForFloor(rack.floorNumber) ? (
                    <AppButton
                      title="Xem camera"
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <Ionicons
                          name="videocam-outline"
                          size={16}
                          color={theme.colors.primary[500]}
                        />
                      }
                      accessibilityLabel={`Xem camera tầng ${rack.floorNumber}`}
                      onPress={() => {
                        const cameraId = getCameraIdForFloor(rack.floorNumber);
                        if (cameraId) handleViewCamera(cameraId);
                      }}
                    />
                  ) : null}
                </View>
              </View>
              {rack.trays.length > 0 ? (
                <View style={styles.trayGrid}>
                  {rack.trays.map((tray) => (
                    <TrayTile
                      key={tray.id}
                      tray={tray}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </View>
              ) : (
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Tầng này chưa có khay.
                </AppText>
              )}
            </View>
          ))
          : null}
      </View>

      <Modal
        visible={selectedTray !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDetails}
      >
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
                <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.error.main} />
                <AppText variant="bodySmall" color={theme.colors.error.main} align="center">
                  {detailError}
                </AppText>
                {canControlIot && !selectedTray?.sessionId ? (
                  <AppButton
                    title="Xếp khay cho phiên trồng"
                    variant="primary"
                    size="sm"
                    style={{ marginTop: 12 }}
                    leftIcon={<Ionicons name="grid-outline" size={16} color="#FFFFFF" />}
                    onPress={() => {
                      const fNum = selectedTray?.floorNumber;
                      handleCloseDetails();
                      router.push({
                        pathname: '/cultivation',
                        params: {
                          floorId: fNum ? String(fNum) : undefined,
                          tab: 'trays',
                        },
                      } as any);
                    }}
                  />
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
                      />
                    ) : null}
                  </>
                ) : (
                  <DeviceHistory
                    logs={details?.device_logs ?? []}
                    readings={details?.sensor_readings ?? []}
                    refreshError={sensorRefreshError}
                  />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function getCameraIdForFloor(floorNumber: number): string | null {
  switch (floorNumber) {
    case 1:
      return '3';
    case 2:
      return '2';
    default:
      return null;
  }
}

interface TrayTileProps {
  tray: CustomerTrayCard;
  onViewDetails: (tray: CustomerTrayCard) => void;
}

const TrayTile: React.FC<TrayTileProps> = ({ tray, onViewDetails }) => {
  const isMine = tray.usage === 'MY_CULTIVATION';
  const isInUse = tray.usage !== 'AVAILABLE';
  const palette =
    tray.usage === 'MY_CULTIVATION'
      ? {
        background: '#E8F5EC',
        border: '#168A4A',
        text: '#08743A',
        accent: '#16A34A',
      }
      : tray.usage === 'OTHER_CULTIVATION'
        ? {
          background: '#EAF2FB',
          border: '#2F70B7',
          text: '#275E99',
          accent: '#3478C5',
        }
        : {
          background: '#F1F4F8',
          border: '#94A3B8',
          text: '#64748B',
          accent: '#FFFFFF',
        };

  return (
    <View
      style={[
        styles.trayTile,
        { backgroundColor: palette.background, borderColor: palette.border },
        !isInUse && styles.unusedTile,
      ]}
      accessibilityLabel={`${tray.code}, ${isMine
          ? `khay của tôi, đang trồng ${tray.mushroomName ?? 'nấm'}`
          : tray.usage === 'OTHER_CULTIVATION'
            ? `đang trồng ${tray.mushroomName ?? 'nấm'}`
            : 'chưa sử dụng'
        }`}
    >
      <View style={styles.tileHeading}>
        <AppText
          variant="captionMedium"
          weight="medium"
          color={palette.text}
          numberOfLines={1}
          style={styles.tileCode}
        >
          {tray.code}
        </AppText>
        {isInUse ? (
          <Ionicons
            name="leaf-outline"
            size={18}
            color={palette.text}
            accessibilityLabel="Đang trồng"
          />
        ) : null}
      </View>

      {isMine ? (
        <View style={styles.ownedTrayContent}>
          <AppText variant="caption" weight="bold" color={palette.text} numberOfLines={1}>
            Khay của tôi
          </AppText>
          <AppText variant="caption" color={palette.text} numberOfLines={2}>
            {tray.mushroomName ?? 'Đang trồng nấm'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết khay ${tray.code}`}
            onPress={() => onViewDetails(tray)}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="document-text-outline" size={14} color="#08743A" />
            <AppText variant="caption" weight="bold" color="#08743A" numberOfLines={1}>
              Chi tiết
            </AppText>
          </Pressable>
        </View>
      ) : tray.usage === 'OTHER_CULTIVATION' ? (
        <AppText variant="caption" color={palette.text} numberOfLines={2}>
          {tray.mushroomName ?? 'Đang trồng nấm'}
        </AppText>
      ) : null}

      <View style={[styles.tileStatusLine, { backgroundColor: palette.accent }]} />
    </View>
  );
};

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
  
};

const DeviceHistory: React.FC<{
  logs: CustomerDeviceLogItem[];
  readings: CustomerTrayDetails['sensor_readings'];
  refreshError: string | null;
}> = ({ logs, readings, refreshError }) => {
  const averages = getAverageSensorReadings(readings);

  return (
    <View style={styles.historyList}>
      <View style={styles.sensorSection}>
        {refreshError ? (
          <AppText variant="caption" color={theme.colors.error.main}>
            Không thể cập nhật cảm biến: {refreshError}
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
      {logs.length === 0 ? (
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

const TrayLegend: React.FC<{ isStaff?: boolean }> = ({ isStaff }) => (
  <View style={styles.legend}>
    {!isStaff && <LegendItem color="#168A4A" label="Khay của tôi" />}
    <LegendItem color={isStaff ? "#168A4A" : "#3478C5"} label="Đang trồng" />
    <LegendItem color="#94A3B8" label="Chưa sử dụng" />
  </View>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <AppText variant="caption" color={theme.colors.text.secondary}>
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.lg,
  },
  staffActionCard: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  staffActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  messageCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
  },
  floorSection: {
    gap: theme.spacing.sm,
  },
  floorTitle: {
    color: '#18243B',
  },
  floorHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  trayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  trayTile: {
    width: '31.5%',
    minHeight: 148,
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  unusedTile: {
    borderStyle: 'dashed',
  },
  tileHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 3,
  },
  tileCode: {
    flexShrink: 1,
  },
  ownedTrayContent: {
    gap: theme.spacing.xxs,
  },
  detailsButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A8D4B5',
    backgroundColor: '#FFFFFF',
  },
  tileStatusLine: {
    height: 4,
    width: '100%',
    borderRadius: 4,
  },
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
  deviceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
