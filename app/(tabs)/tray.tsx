import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../../src/features/auth';
import {
  CultivationSessionAdmin,
  iotRepository,
  AssignSessionModal,
} from '../../src/features/iot';
import {
  DailyTrayInspectionHistoryModal,
  DailyTrayInspectionModal,
  cultivationRepository,
} from '../../src/features/cultivation';

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

function isSameDay(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (typeof dateStr === 'string' && dateStr.slice(0, 10) === todayVN) {
    return true;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const dVN = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return dVN === todayVN;
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
  const params = useLocalSearchParams<{ sessionId?: string; floorId?: string }>();
  const { canControlIot } = useAuth();

  const [racks, setRacks] = useState<CustomerFloorRack[]>([]);
  const [loadState, setLoadState] = useState<TrayLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tray Details Modal state
  const [selectedTray, setSelectedTray] = useState<CustomerTrayCard | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('growth');
  const [details, setDetails] = useState<CustomerTrayDetails | null>(null);
  const [detailLoadState, setDetailLoadState] = useState<DetailLoadState>('loading');
  const [detailError, setDetailError] = useState<string | null>(null);
  const [sensorRefreshError, setSensorRefreshError] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  // Staff Assign Trays workflow state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningSession, setAssigningSession] = useState<CultivationSessionAdmin | null>(null);
  const [selectedFloorIdForAssign, setSelectedFloorIdForAssign] = useState<number | null>(null);
  const [selectedTrayIdsForAssign, setSelectedTrayIdsForAssign] = useState<number[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Daily Inspection workflow state
  const [cultivatingSessionsMap, setCultivatingSessionsMap] = useState<Map<number, CultivationSessionAdmin>>(new Map());
  const [inspectedSessionTrayIdsToday, setInspectedSessionTrayIdsToday] = useState<Set<number>>(new Set());
  const [inspectedTrayIdsToday, setInspectedTrayIdsToday] = useState<Set<number>>(new Set());
  const [dailyReportSession, setDailyReportSession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyReportSessionTrayId, setDailyReportSessionTrayId] = useState<number | null>(null);
  const [dailyModalVisible, setDailyModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadRacks = useCallback(async () => {
    try {
      setErrorMessage(null);
      const loadedRacks = await trayRepository.getCustomerFloorRacks();
      setRacks(loadedRacks);

      if (canControlIot) {
        try {
          const [cultivatingSessions, allAdminSessions] = await Promise.all([
            iotRepository.getAdminCultivationSessions('CULTIVATING'),
            iotRepository.getAdminCultivationSessions(),
          ]);

          const cMap = new Map<number, CultivationSessionAdmin>();
          allAdminSessions.forEach((s) => {
            if (s.session_id) cMap.set(s.session_id, s);
          });
          cultivatingSessions.forEach((s) => {
            if (s.session_id) cMap.set(s.session_id, s);
          });

          // Check all sessionIds that appear on the racks
          const sessionIdsOnRacks = new Set<number>();
          loadedRacks.forEach((rack) => {
            rack.trays.forEach((tray) => {
              if (tray.sessionId) sessionIdsOnRacks.add(tray.sessionId);
            });
          });

          const sessionsToFetch = Array.from(sessionIdsOnRacks);
          const historyResults = await Promise.allSettled(
            sessionsToFetch.map((sId) => cultivationRepository.getDailyInspectionHistory(sId, 1, 30))
          );

          const reportedSessionTrays = new Set<number>();
          const reportedTrays = new Set<number>();

          historyResults.forEach((res) => {
            if (res.status === 'fulfilled' && Array.isArray(res.value?.inspections)) {
              res.value.inspections.forEach((insp) => {
                if (isSameDay(insp.inspectionDate)) {
                  if (insp.sessionTrayId) reportedSessionTrays.add(Number(insp.sessionTrayId));
                  if (insp.trayId) reportedTrays.add(Number(insp.trayId));
                }
              });
            }
          });

          setCultivatingSessionsMap(cMap);
          setInspectedSessionTrayIdsToday(reportedSessionTrays);
          setInspectedTrayIdsToday(reportedTrays);
        } catch (iotErr) {
          console.warn('Could not load cultivating sessions / inspections:', iotErr);
        }
      }

      setLoadState('ready');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setLoadState('error');
    }
  }, [canControlIot]);

  useFocusEffect(
    useCallback(() => {
      void loadRacks();
    }, [loadRacks])
  );

  // Activate Assign Session from navigation query param (e.g. from AdminOrdersScreen)
  useEffect(() => {
    if (!canControlIot || !params.sessionId) return;
    const sId = Number(params.sessionId);
    if (!sId) return;

    let isMounted = true;
    async function activateAssignSessionFromParams() {
      try {
        const readySessions = await iotRepository.getReadyCultivationSessions();
        let target = readySessions.find((s) => s.session_id === sId);
        if (!target) {
          const allSessions = await iotRepository.getAdminCultivationSessions();
          target = allSessions.find((s) => s.session_id === sId);
        }
        if (!isMounted) return;
        if (target) {
          setAssigningSession(target);
          setSelectedTrayIdsForAssign([]);
          if (params.floorId) {
            setSelectedFloorIdForAssign(Number(params.floorId));
          } else {
            setSelectedFloorIdForAssign(null);
          }
        }
      } catch (err) {
        console.warn('Error loading session from params:', err);
      }
    }

    void activateAssignSessionFromParams();
    return () => {
      isMounted = false;
    };
  }, [canControlIot, params.sessionId, params.floorId]);

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

  // Assign mode actions
  const handleStartAssignWorkflow = (floorId?: number) => {
    if (floorId != null) {
      setSelectedFloorIdForAssign(floorId);
    }
    setAssignModalVisible(true);
  };

  const handleToggleSelectTrayForAssign = (tray: CustomerTrayCard, floorId: number) => {
    if (!assigningSession) return;
    const requiredTrays = assigningSession.required_trays || assigningSession.tray_quantity || 1;

    if (selectedFloorIdForAssign !== null && selectedFloorIdForAssign !== floorId) {
      Alert.alert(
        'Khác tầng nuôi trồng',
        'Tất cả các khay của một phiên nuôi trồng phải thuộc cùng một tầng. Bạn có muốn đổi sang chọn tầng này không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đổi tầng',
            onPress: () => {
              setSelectedFloorIdForAssign(floorId);
              setSelectedTrayIdsForAssign([tray.id]);
            },
          },
        ]
      );
      return;
    }

    if (selectedTrayIdsForAssign.includes(tray.id)) {
      const next = selectedTrayIdsForAssign.filter((id) => id !== tray.id);
      setSelectedTrayIdsForAssign(next);
      if (next.length === 0) {
        setSelectedFloorIdForAssign(null);
      }
    } else {
      if (selectedTrayIdsForAssign.length >= requiredTrays) {
        Alert.alert(
          'Đã chọn đủ số lượng',
          `Phiên nuôi trồng này yêu cầu ${requiredTrays} khay. Vui lòng bỏ chọn một khay nếu muốn đổi vị trí.`
        );
        return;
      }
      setSelectedFloorIdForAssign(floorId);
      setSelectedTrayIdsForAssign([...selectedTrayIdsForAssign, tray.id]);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assigningSession || selectedFloorIdForAssign === null) return;
    const requiredTrays = assigningSession.required_trays || assigningSession.tray_quantity || 1;
    if (selectedTrayIdsForAssign.length !== requiredTrays) {
      Alert.alert(
        'Chưa đủ số khay',
        `Phiên nuôi trồng này yêu cầu chọn đủ ${requiredTrays} khay (hiện đã chọn ${selectedTrayIdsForAssign.length} khay).`
      );
      return;
    }

    const targetFloor = racks.find((r) => r.id === selectedFloorIdForAssign);
    const floorLabel = targetFloor ? `Tầng ${targetFloor.floorNumber}` : `Tầng #${selectedFloorIdForAssign}`;

    Alert.alert(
      'Xác nhận xếp khay',
      `Bạn có chắc chắn muốn xếp ${selectedTrayIdsForAssign.length} khay đã chọn vào ${floorLabel} cho Phiên #${assigningSession.session_id}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setAssignSubmitting(true);
            try {
              await iotRepository.assignTraysToSession(
                assigningSession.session_id,
                selectedFloorIdForAssign,
                selectedTrayIdsForAssign
              );
              Alert.alert(
                'Xếp khay thành công',
                `Đã phân bổ thành công ${selectedTrayIdsForAssign.length} khay cho Phiên #${assigningSession.session_id}.`
              );
              setAssigningSession(null);
              setSelectedTrayIdsForAssign([]);
              setSelectedFloorIdForAssign(null);
              router.setParams({ sessionId: undefined, floorId: undefined });
              await loadRacks();
            } catch (err: unknown) {
              Alert.alert('Không thể xếp khay', getErrorMessage(err, 'Lỗi kết nối máy chủ khi xếp khay.'));
            } finally {
              setAssignSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Daily Report actions
  const handleOpenDailyReport = (tray: CustomerTrayCard) => {
    if (!tray.sessionId) return;
    let sess = cultivatingSessionsMap.get(tray.sessionId);
    if (!sess) {
      sess = {
        session_id: tray.sessionId,
        mushroom_name: tray.mushroomName || 'Nấm giống',
        mushroom_type_id: 1,
        status: 'CULTIVATING',
        customer_name: 'Khách hàng',
        trays: [
          {
            session_tray_id: tray.sessionTrayId || tray.id,
            tray_id: tray.id,
            tray_code: tray.code,
            floor_id: tray.floorId ?? null,
            floor_number: tray.floorNumber ?? null,
            status: 'ACTIVE',
          },
        ],
      };
    } else {
      const existingTrays = sess.trays || [];
      const hasTray = existingTrays.some(
        (t) => t.session_tray_id === tray.sessionTrayId || t.tray_id === tray.id
      );
      if (!hasTray) {
        sess = {
          ...sess,
          trays: [
            ...existingTrays,
            {
              session_tray_id: tray.sessionTrayId || tray.id,
              tray_id: tray.id,
              tray_code: tray.code,
              floor_id: tray.floorId ?? null,
              floor_number: tray.floorNumber ?? null,
              status: 'ACTIVE',
            },
          ],
        };
      }
    }

    setDailyReportSession(sess);
    setDailyReportSessionTrayId(tray.sessionTrayId || tray.id);
    setDailyModalVisible(true);
  };

  const handleOpenDailyHistory = (tray: CustomerTrayCard) => {
    if (!tray.sessionId) return;
    let sess = cultivatingSessionsMap.get(tray.sessionId);
    if (!sess) {
      sess = {
        session_id: tray.sessionId,
        mushroom_name: tray.mushroomName || 'Nấm giống',
        mushroom_type_id: 1,
        status: 'CULTIVATING',
        customer_name: 'Khách hàng',
        trays: [
          {
            session_tray_id: tray.sessionTrayId || tray.id,
            tray_id: tray.id,
            tray_code: tray.code,
            floor_id: tray.floorId ?? null,
            floor_number: tray.floorNumber ?? null,
            status: 'ACTIVE',
          },
        ],
      };
    }
    setDailyReportSession(sess);
    setDailyReportSessionTrayId(tray.sessionTrayId || tray.id);
    setHistoryModalVisible(true);
  };

  // Count uninspected trays
  const uninspectedTraysCount = useMemo(() => {
    if (!canControlIot) return 0;
    let count = 0;
    for (const rack of racks) {
      for (const tray of rack.trays) {
        const isCultivating = tray.usage !== 'AVAILABLE' && Boolean(tray.sessionId);
        if (isCultivating) {
          const isInspected =
            (tray.sessionTrayId != null && inspectedSessionTrayIdsToday.has(tray.sessionTrayId)) ||
            inspectedTrayIdsToday.has(tray.id);
          if (!isInspected) {
            count += 1;
          }
        }
      }
    }
    return count;
  }, [canControlIot, racks, inspectedSessionTrayIdsToday, inspectedTrayIdsToday]);

  const requiredTraysForAssign = assigningSession
    ? assigningSession.required_trays || assigningSession.tray_quantity || 1
    : 0;

  return (
    <ScreenContainer scrollable={false} edges={['left', 'right']}>
      <AppHeader
        title={canControlIot ? 'Phòng tầng khay' : 'Khay của tôi'}
        subtitle={
          canControlIot
            ? 'Sơ đồ phòng, tầng và khay tại SmartMush Farm'
            : 'Sơ đồ khay tại SmartMush Farm'
        }
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {canControlIot && !assigningSession && (
              <AppButton
                title="Xếp khay"
                size="sm"
                variant="primary"
                leftIcon={<Ionicons name="grid-outline" size={14} color="#FFFFFF" />}
                onPress={() => handleStartAssignWorkflow()}
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

      <ScrollView
        contentContainerStyle={[
          styles.content,
          assigningSession && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Assign Mode Sticky Banner */}
        {assigningSession && (
          <AppCard elevation="sm" style={styles.assignBanner}>
            <View style={styles.assignBannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.assignIconBadge}>
                  <Ionicons name="grid" size={20} color={theme.colors.primary[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[900]}>
                    Đang xếp khay cho Phiên #{assigningSession.session_id}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.primary[800]}>
                    {assigningSession.mushroom_name || 'Nấm giống'} • {assigningSession.customer_name || 'Khách hàng'}
                  </AppText>
                </View>
              </View>
              <AppButton
                title="Hủy"
                variant="outline"
                size="sm"
                onPress={() => {
                  setAssigningSession(null);
                  setSelectedTrayIdsForAssign([]);
                  setSelectedFloorIdForAssign(null);
                  router.setParams({ sessionId: undefined, floorId: undefined });
                }}
              />
            </View>
            <View style={styles.assignBannerStats}>
              <AppText variant="caption" weight="medium" color={theme.colors.text.secondary}>
                Yêu cầu: <AppText weight="bold">{requiredTraysForAssign} khay</AppText>
                {'  |  '}
                Đã chọn:{' '}
                <AppText
                  weight="bold"
                  color={
                    selectedTrayIdsForAssign.length === requiredTraysForAssign
                      ? theme.colors.success.main
                      : theme.colors.warning.main
                  }
                >
                  {selectedTrayIdsForAssign.length}/{requiredTraysForAssign} khay
                </AppText>
                {selectedFloorIdForAssign !== null &&
                  `  |  Tầng: ${
                    racks.find((r) => r.id === selectedFloorIdForAssign)?.floorNumber ||
                    selectedFloorIdForAssign
                  }`}
              </AppText>
              <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 2 }}>
                💡 Nhấn vào các ô khay trống trên cùng một tầng để chọn vị trí.
              </AppText>
            </View>
          </AppCard>
        )}

        {/* Uninspected Today Warning Banner */}
        {!assigningSession && canControlIot && uninspectedTraysCount > 0 && (
          <AppCard elevation="xs" style={styles.uninspectedWarningCard}>
            <View style={styles.uninspectedRow}>
              <Ionicons name="alert-circle" size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="bold" color="#92400E">
                  Có {uninspectedTraysCount} khay chưa báo cáo hôm nay
                </AppText>
                <AppText variant="caption" color="#B45309" style={{ marginTop: 1 }}>
                  Nhấn nút &quot;Báo cáo ngay&quot; trên từng khay để cập nhật giai đoạn nấm và tình trạng quả thể.
                </AppText>
              </View>
            </View>
          </AppCard>
        )}

        {/* Staff Action Card when NOT in assign mode */}
        {!assigningSession && canControlIot && (
          <AppCard elevation="xs" style={styles.staffActionCard}>
            <View style={styles.staffActionRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[800]}>
                  Xếp khay vào tầng
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 2 }}>
                  Chọn phiên nuôi trồng sẵn sàng để phân bổ vào các khay trống.
                </AppText>
              </View>
              <AppButton
                title="Xếp khay ngay"
                variant="primary"
                size="sm"
                leftIcon={<Ionicons name="grid-outline" size={14} color="#FFFFFF" />}
                onPress={() => handleStartAssignWorkflow()}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="title" weight="bold" style={styles.floorTitle}>
                      Tầng {rack.floorNumber}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      ({rack.trays.length} khay)
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {canControlIot && !assigningSession && (
                      <AppButton
                        title="Xếp khay"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Ionicons name="grid-outline" size={14} color={theme.colors.primary[700]} />}
                        onPress={() => handleStartAssignWorkflow(rack.id)}
                      />
                    )}
                    {getCameraIdForFloor(rack.floorNumber) ? (
                      <AppButton
                        title="Camera"
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
                    {rack.trays.map((tray) => {
                      const isCultivating = tray.usage !== 'AVAILABLE' && Boolean(tray.sessionId);
                      const isReportedToday = isCultivating
                        ? Boolean(
                            (tray.sessionTrayId != null &&
                              inspectedSessionTrayIdsToday.has(tray.sessionTrayId)) ||
                              inspectedTrayIdsToday.has(tray.id)
                          )
                        : false;

                      const isSelectedForAssign = selectedTrayIdsForAssign.includes(tray.id);
                      const isDisabledForAssign =
                        Boolean(assigningSession) &&
                        (tray.usage !== 'AVAILABLE' ||
                          (selectedFloorIdForAssign !== null &&
                            selectedFloorIdForAssign !== rack.id));

                      return (
                        <TrayTile
                          key={tray.id}
                          tray={tray}
                          isStaff={canControlIot}
                          isAssignMode={Boolean(assigningSession)}
                          isSelectedForAssign={isSelectedForAssign}
                          isDisabledForAssign={isDisabledForAssign}
                          isReportedToday={isReportedToday}
                          onSelectForAssign={() => handleToggleSelectTrayForAssign(tray, rack.id)}
                          onViewDetails={handleViewDetails}
                          onOpenReport={handleOpenDailyReport}
                          onOpenHistory={handleOpenDailyHistory}
                          onStartAssignOnFloor={() => handleStartAssignWorkflow(rack.id)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Tầng này chưa có khay.
                  </AppText>
                )}
              </View>
            ))
          : null}
      </ScrollView>

      {/* Floating Bottom Bar for Assign Mode */}
      {assigningSession && (
        <View style={styles.floatingBottomBar}>
          <View style={styles.bottomBarInfo}>
            <AppText variant="bodySmall" weight="bold" color="#18243B">
              Đã chọn {selectedTrayIdsForAssign.length}/{requiredTraysForAssign} khay
            </AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              {selectedFloorIdForAssign !== null
                ? `Tầng ${
                    racks.find((r) => r.id === selectedFloorIdForAssign)?.floorNumber ??
                    selectedFloorIdForAssign
                  }`
                : 'Chưa chọn tầng'}
            </AppText>
          </View>
          <View style={styles.bottomBarActions}>
            <AppButton
              title="Hủy"
              variant="outline"
              size="sm"
              onPress={() => {
                setAssigningSession(null);
                setSelectedTrayIdsForAssign([]);
                setSelectedFloorIdForAssign(null);
                router.setParams({ sessionId: undefined, floorId: undefined });
              }}
            />
            <AppButton
              title="Xác nhận xếp"
              variant="primary"
              size="sm"
              disabled={
                selectedTrayIdsForAssign.length !== requiredTraysForAssign || assignSubmitting
              }
              loading={assignSubmitting}
              leftIcon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
              onPress={handleConfirmAssign}
            />
          </View>
        </View>
      )}

      {/* Assign Session Modal */}
      <AssignSessionModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        onSelectSession={(session) => {
          setAssignModalVisible(false);
          setAssigningSession(session);
          setSelectedTrayIdsForAssign([]);
        }}
      />

      {/* Daily Inspection Modal */}
      {dailyReportSession && (
        <DailyTrayInspectionModal
          visible={dailyModalVisible}
          session={dailyReportSession}
          initialSessionTrayId={dailyReportSessionTrayId}
          onClose={() => {
            setDailyModalVisible(false);
          }}
          onSuccess={() => {
            setDailyModalVisible(false);
            if (dailyReportSessionTrayId) {
              setInspectedSessionTrayIdsToday((prev) =>
                new Set(prev).add(dailyReportSessionTrayId)
              );
            }
            void loadRacks();
          }}
        />
      )}

      {/* Daily Inspection History Modal */}
      {dailyReportSession && (
        <DailyTrayInspectionHistoryModal
          visible={historyModalVisible}
          session={dailyReportSession}
          initialSessionTrayId={dailyReportSessionTrayId}
          onClose={() => setHistoryModalVisible(false)}
          onOpenCreateReport={(sessionTrayId) => {
            setHistoryModalVisible(false);
            if (sessionTrayId) {
              setDailyReportSessionTrayId(sessionTrayId);
            }
            setDailyModalVisible(true);
          }}
        />
      )}

      {/* Tray Detail Modal (Growth & Sensors) */}
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
                      const fId = selectedTray?.floorId;
                      handleCloseDetails();
                      handleStartAssignWorkflow(fId);
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
                  <GrowthHistory
                    history={details?.growth_history ?? []}
                    cultivationStatus={details?.cultivation_status}
                    harvestStatus={details?.harvest_status}
                    currentStage={details?.current_stage}
                    progressPercent={details?.progress_percent}
                  />
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
  isStaff: boolean;
  isAssignMode: boolean;
  isSelectedForAssign: boolean;
  isDisabledForAssign: boolean;
  isReportedToday: boolean;
  onSelectForAssign: () => void;
  onViewDetails: (tray: CustomerTrayCard) => void;
  onOpenReport: (tray: CustomerTrayCard) => void;
  onOpenHistory: (tray: CustomerTrayCard) => void;
  onStartAssignOnFloor: () => void;
}

const TrayTile: React.FC<TrayTileProps> = ({
  tray,
  isStaff,
  isAssignMode,
  isSelectedForAssign,
  isDisabledForAssign,
  isReportedToday,
  onSelectForAssign,
  onViewDetails,
  onOpenReport,
  onOpenHistory,
  onStartAssignOnFloor,
}) => {
  const isMine = tray.usage === 'MY_CULTIVATION';
  const isInUse = tray.usage !== 'AVAILABLE';

  // Palette based on mode and status
  let palette = {
    background: '#F8FAFC',
    border: '#CBD5E1',
    text: '#64748B',
    accent: '#94A3B8',
  };

  if (isAssignMode) {
    if (isSelectedForAssign) {
      palette = {
        background: '#ECFDF5',
        border: '#059669',
        text: '#047857',
        accent: '#10B981',
      };
    } else if (isInUse) {
      palette = {
        background: '#F1F5F9',
        border: '#E2E8F0',
        text: '#94A3B8',
        accent: '#CBD5E1',
      };
    } else {
      palette = {
        background: '#FFFFFF',
        border: '#0284C7',
        text: '#0369A1',
        accent: '#38BDF8',
      };
    }
  } else if (isMine) {
    palette = {
      background: '#E8F5EC',
      border: '#168A4A',
      text: '#08743A',
      accent: '#16A34A',
    };
  } else if (tray.usage === 'OTHER_CULTIVATION') {
    palette = {
      background: '#EAF2FB',
      border: '#2F70B7',
      text: '#275E99',
      accent: '#3478C5',
    };
  }

  // Handle tile click
  const handleTilePress = () => {
    if (isAssignMode) {
      if (!isInUse && !isDisabledForAssign) {
        onSelectForAssign();
      }
    } else if (isInUse) {
      onViewDetails(tray);
    } else if (isStaff) {
      onStartAssignOnFloor();
    }
  };

  return (
    <Pressable
      onPress={handleTilePress}
      disabled={isAssignMode && (isInUse || isDisabledForAssign)}
      style={({ pressed }) => [
        styles.trayTile,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: isSelectedForAssign ? 2 : 1,
        },
        !isInUse && !isAssignMode && styles.unusedTile,
        isDisabledForAssign && { opacity: 0.4 },
        pressed && !isDisabledForAssign && { opacity: 0.8 },
      ]}
      accessibilityLabel={`${tray.code}, ${
        isMine
          ? `khay của tôi, đang trồng ${tray.mushroomName ?? 'nấm'}`
          : isInUse
          ? `đang trồng ${tray.mushroomName ?? 'nấm'}`
          : 'chưa sử dụng'
      }`}
    >
      {/* Top Header Row */}
      <View style={styles.tileHeading}>
        <AppText
          variant="captionMedium"
          weight="bold"
          color={palette.text}
          numberOfLines={1}
          style={styles.tileCode}
        >
          {tray.code}
        </AppText>
        {isAssignMode ? (
          isSelectedForAssign ? (
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
          ) : !isInUse ? (
            <Ionicons name="add-circle-outline" size={17} color="#0284C7" />
          ) : null
        ) : isInUse ? (
          <Ionicons name="leaf-outline" size={16} color={palette.text} />
        ) : null}
      </View>

      {/* Middle Body */}
      {isAssignMode ? (
        <View style={styles.tileCenterContent}>
          {isSelectedForAssign ? (
            <View style={styles.selectedAssignBadge}>
              <AppText variant="caption" weight="bold" color="#047857" style={{ fontSize: 11 }}>
                ĐÃ CHỌN
              </AppText>
            </View>
          ) : !isInUse ? (
            <AppText variant="caption" color="#0369A1" align="center" style={{ fontSize: 11 }}>
              Chạm để chọn
            </AppText>
          ) : (
            <AppText variant="caption" color="#94A3B8" align="center" style={{ fontSize: 11 }}>
              Đang trồng
            </AppText>
          )}
        </View>
      ) : isInUse ? (
        <View style={styles.tileCenterContent}>
          <AppText variant="caption" weight="medium" color={palette.text} numberOfLines={2}>
            {tray.mushroomName ?? 'Đang trồng nấm'}
          </AppText>

          {/* Staff Daily Inspection Status Badge */}
          {isStaff && (
            <View
              style={[
                styles.inspectionBadge,
                isReportedToday ? styles.inspectionBadgeSuccess : styles.inspectionBadgeWarning,
              ]}
            >
              <Ionicons
                name={isReportedToday ? 'checkmark-circle' : 'alert-circle'}
                size={11}
                color={isReportedToday ? '#047857' : '#B45309'}
              />
              <AppText
                variant="caption"
                weight="bold"
                color={isReportedToday ? '#047857' : '#B45309'}
                style={styles.inspectionBadgeText}
                numberOfLines={1}
              >
                {isReportedToday ? 'Đã báo cáo' : 'Chưa báo cáo'}
              </AppText>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.tileCenterContent}>
          <AppText variant="caption" color="#94A3B8" align="center" style={{ fontSize: 11 }}>
            Chưa sử dụng
          </AppText>
          {isStaff && (
            <AppText variant="caption" color={theme.colors.primary[600]} style={{ fontSize: 10 }}>
              + Xếp khay
            </AppText>
          )}
        </View>
      )}

      {/* Bottom Action Area */}
      {!isAssignMode && isInUse ? (
        isStaff ? (
          <View style={styles.tileActionCol}>
            {!isReportedToday ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Báo cáo ngay cho khay ${tray.code}`}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onOpenReport(tray);
                }}
                style={({ pressed }) => [
                  styles.reportNowButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="create-outline" size={13} color="#FFFFFF" />
                <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11 }}>
                  Báo cáo ngay
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.reportedActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lịch sử báo cáo khay ${tray.code}`}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onOpenHistory(tray);
                  }}
                  style={({ pressed }) => [
                    styles.historyMiniButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="time-outline" size={11} color="#047857" />
                  <AppText variant="caption" weight="medium" color="#047857" style={{ fontSize: 10 }}>
                    Lịch sử
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết khay ${tray.code}`}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onViewDetails(tray);
                  }}
                  style={({ pressed }) => [
                    styles.detailsMiniButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={11} color="#475569" />
                  <AppText variant="caption" weight="medium" color="#475569" style={{ fontSize: 10 }}>
                    Chi tiết
                  </AppText>
                </Pressable>
              </View>
            )}
            {!isReportedToday && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onViewDetails(tray);
                }}
                style={({ pressed }) => [
                  styles.viewDetailsTextLink,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <AppText variant="caption" color="#475569" style={{ fontSize: 10 }}>
                  Xem chi tiết
                </AppText>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết khay ${tray.code}`}
            onPress={(e) => {
              e.stopPropagation?.();
              onViewDetails(tray);
            }}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="document-text-outline" size={13} color="#08743A" />
            <AppText variant="caption" weight="bold" color="#08743A" numberOfLines={1}>
              Chi tiết
            </AppText>
          </Pressable>
        )
      ) : null}

      <View style={[styles.tileStatusLine, { backgroundColor: palette.accent }]} />
    </Pressable>
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
            {typeof progressPercent === 'number' ? ` · ${progressPercent}%` : ''}
          </AppText>
        ) : null}
      </View>
      {history.length === 0 ? (
        <DetailEmptyState message="Chưa có nhật ký cập nhật giai đoạn nấm." />
      ) : null}
      {history.map((item) => (
        <View key={item.progress_id} style={styles.historyCard}>
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
    <LegendItem color={isStaff ? '#168A4A' : '#3478C5'} label="Đang trồng" />
    <LegendItem color="#94A3B8" label="Chưa sử dụng" />
    {isStaff && <LegendItem color="#059669" label="Đang chọn xếp" />}
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
    gap: theme.spacing.md,
  },
  assignBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  assignBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  assignIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBannerStats: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    paddingTop: theme.spacing.xs,
  },
  uninspectedWarningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  uninspectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
    marginTop: theme.spacing.xs,
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
    minHeight: 165,
    borderRadius: 12,
    padding: theme.spacing.xs,
    justifyContent: 'space-between',
    gap: 4,
  },
  unusedTile: {
    borderStyle: 'dashed',
  },
  tileHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
  },
  tileCode: {
    flexShrink: 1,
  },
  tileCenterContent: {
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  selectedAssignBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inspectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  inspectionBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 0.5,
    borderColor: '#10B981',
  },
  inspectionBadgeWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  inspectionBadgeText: {
    fontSize: 9.5,
  },
  tileActionCol: {
    gap: 3,
  },
  reportNowButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#059669',
  },
  reportedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  historyMiniButton: {
    flex: 1,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  detailsMiniButton: {
    flex: 1,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  viewDetailsTextLink: {
    alignItems: 'center',
    paddingVertical: 1,
  },
  detailsButton: {
    minHeight: 32,
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
    height: 3,
    width: '100%',
    borderRadius: 3,
  },
  floatingBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomBarInfo: {
    flex: 1,
    gap: 2,
  },
  bottomBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
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
