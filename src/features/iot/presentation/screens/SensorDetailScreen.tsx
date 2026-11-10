import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  FloorMapping,
  IotMaster,
  IotSensor,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import { formatMistingBoolean, formatMistingCode } from '../../utils/mistingI18n';
import {
  analyticsRepository,
  EnvironmentHistoryData,
  FloorEnvironmentChartCard,
} from '../../../analytics';

export const SensorDetailScreen: React.FC = () => {
  const router = useRouter();

  // Hardware Masters & Sensors State
  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [sensors, setSensors] = useState<IotSensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null);
  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [loading, setLoading] = useState(true);

  // 24h Aggregated Environment History State
  const [envHistory, setEnvHistory] = useState<EnvironmentHistoryData | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envRefreshing, setEnvRefreshing] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  // Filter out floors with empty points from the card list
  const validFloors = useMemo(() => {
    return (envHistory?.floors || []).filter(
      (f) => f.points && f.points.length > 0
    );
  }, [envHistory]);

  const refreshIntervalMs =
    envHistory?.refreshAfterMs &&
    typeof envHistory.refreshAfterMs === 'number' &&
    envHistory.refreshAfterMs > 0
      ? envHistory.refreshAfterMs
      : 300000;

  // Map Node address to floor information:
  // Node 1 -> Tầng 1, Node 2 -> Tầng 2, omit Tầng 3
  const getFloorInfo = useCallback(
    (nodeId: number) => {
      const matched = floors.find((f) => f.node_address === nodeId);
      if (nodeId === 1) {
        return {
          label: 'Tầng 1',
          floorName: matched?.floor_name || 'Tầng 1',
          floorNumber: 1,
        };
      }
      if (nodeId === 2) {
        return {
          label: 'Tầng 2',
          floorName: matched?.floor_name || 'Tầng 2',
          floorNumber: 2,
        };
      }
      return {
        label: matched ? `Tầng ${matched.floor_number}` : `Tầng ${nodeId}`,
        floorName: matched?.floor_name,
        floorNumber: matched?.floor_number ?? nodeId,
      };
    },
    [floors]
  );

  // Load 24h environment history from backend analytics endpoint
  const loadEnvironmentHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setEnvLoading(true);
    } else {
      setEnvRefreshing(true);
    }
    setEnvError(null);

    try {
      const data = await analyticsRepository.getEnvironmentHistory();
      setEnvHistory(data);
    } catch (err: unknown) {
      setEnvError(
        err instanceof Error ? err.message : 'Không thể tải lịch sử vi khí hậu.'
      );
    } finally {
      setEnvLoading(false);
      setEnvRefreshing(false);
    }
  }, []);

  // Load masters, floors & hardware sensors
  const loadMasters = useCallback(async () => {
    try {
      setLoading(true);
      const [mastersData, floorsData] = await Promise.all([
        iotRepository.getMasters(),
        iotRepository.getFloors().catch(() => []),
      ]);
      setMasters(mastersData);
      setFloors(floorsData);

      if (mastersData.length > 0) {
        const firstMasterId = mastersData[0].masterId;
        setSelectedMasterId(firstMasterId);

        const sensorsData = await iotRepository.getMasterSensors(firstMasterId);
        // Only keep Tầng 1 (Node 1) and Tầng 2 (Node 2); omit Tầng 3 (Node 3)
        const filteredSensors = sensorsData.filter((s) => s.nodeId === 1 || s.nodeId === 2);
        setSensors(filteredSensors);
        if (filteredSensors.length > 0) {
          setSelectedSensor(filteredSensors[0]);
        } else {
          setSelectedSensor(null);
        }
      }
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp cảm biến',
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ IoT.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // AppState change listener: Pause when backgrounded, refresh when active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        loadEnvironmentHistory(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadEnvironmentHistory]);

  // Focus effect: trigger initial load & setup 5-minute auto-refresh interval
  useFocusEffect(
    useCallback(() => {
      loadMasters();
      loadEnvironmentHistory(false);

      const intervalId = setInterval(() => {
        if (appStateRef.current === 'active') {
          loadEnvironmentHistory(true);
        }
      }, refreshIntervalMs);

      return () => {
        clearInterval(intervalId);
      };
    }, [loadMasters, loadEnvironmentHistory, refreshIntervalMs])
  );

  // Manual pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        loadMasters(),
        loadEnvironmentHistory(true),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [loadMasters, loadEnvironmentHistory]);

  // When master selection changes
  const handleSelectMaster = async (masterId: string) => {
    setSelectedMasterId(masterId);
    try {
      const sensorsData = await iotRepository.getMasterSensors(masterId);
      // Only keep Tầng 1 (Node 1) and Tầng 2 (Node 2); omit Tầng 3 (Node 3)
      const filteredSensors = sensorsData.filter((s) => s.nodeId === 1 || s.nodeId === 2);
      setSensors(filteredSensors);
      if (filteredSensors.length > 0) {
        setSelectedSensor(filteredSensors[0]);
      } else {
        setSelectedSensor(null);
      }
    } catch {
      // Ignore
    }
  };

  const handleSelectSensor = (s: IotSensor) => {
    setSelectedSensor(s);
  };

  if (loading && !envHistory) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader
          title="Cảm biến & Biểu đồ"
          subtitle="Giám sát vi khí hậu & Lịch sử 24h theo tầng"
          showBack
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
        />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải dữ liệu cảm biến & biểu đồ vi khí hậu...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scrollable
      edges={['left', 'right']}
      refreshControl={
        <RefreshControl
          refreshing={pullRefreshing}
          onRefresh={handlePullRefresh}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      <AppHeader
        title="Cảm biến & Biểu đồ"
        subtitle="Giám sát vi khí hậu & Lịch sử 24h theo tầng"
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
      />

      <View style={styles.content}>
        {/* ================= 1. HAI BIỂU ĐỒ ĐƯỜNG VI KHÍ HẬU 24 GIỜ (HAI TRỤC Y ĐỘC LẬP) ================= */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="stats-chart" size={18} color={theme.colors.primary[600]} />
              <AppText variant="label" weight="bold">
                BIỂU ĐỒ VI KHÍ HẬU 24 GIỜ (HAI TRỤC Y ĐỘC LẬP)
              </AppText>
            </View>
            {envRefreshing && (
              <View style={styles.refreshingBadge}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <AppText variant="overline" color={theme.colors.text.muted}>
                  Đang đồng bộ...
                </AppText>
              </View>
            )}
          </View>

          {envLoading && !envHistory ? (
            <AppCard elevation="xs" style={styles.loadingCard}>
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Đang nạp dữ liệu biểu đồ từ máy chủ...
              </AppText>
            </AppCard>
          ) : envError && !envHistory ? (
            <AppCard elevation="xs" style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.error.main} />
                <AppText variant="bodySmall" weight="bold" color={theme.colors.error.main}>
                  Lỗi nạp dữ liệu vi khí hậu
                </AppText>
              </View>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                {envError}
              </AppText>
              <AppButton
                title="Thử lại"
                variant="outline"
                size="sm"
                onPress={() => loadEnvironmentHistory(false)}
                style={styles.retryButton}
              />
            </AppCard>
          ) : validFloors.length > 0 ? (
            <View style={styles.floorsListContainer}>
              {validFloors.map((floor) => (
                <FloorEnvironmentChartCard
                  key={floor.floorId}
                  floor={floor}
                  from={envHistory?.from}
                  to={envHistory?.to}
                  bucketMs={envHistory?.bucketMs}
                />
              ))}
            </View>
          ) : (
            <AppCard elevation="xs" style={styles.emptyCard}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.text.muted} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Chưa có dữ liệu tầng
              </AppText>
            </AppCard>
          )}
        </View>

        {/* ================= 2. CHI TIẾT CẢM BIẾN VẬT LÝ THEO MASTER & TẦNG ================= */}
        <View style={styles.hardwareSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.primary[600]} />
            <AppText variant="label" weight="bold">
              THÔNG SỐ CẢM BIẾN VẬT LÝ THỜI GIAN THỰC
            </AppText>
          </View>

          {/* Master Selector */}
          <View style={styles.selectorGroup}>
            <AppText variant="label" color={theme.colors.text.muted}>
              CHỌN MASTER IOT:
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {masters.map((m) => {
                const isSel = m.masterId === selectedMasterId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => handleSelectMaster(m.masterId)}
                    style={[styles.pill, isSel && styles.pillActive]}
                  >
                    <Ionicons
                      name="hardware-chip-outline"
                      size={16}
                      color={isSel ? '#FFFFFF' : theme.colors.text.secondary}
                    />
                    <AppText
                      variant="caption"
                      weight={isSel ? 'bold' : 'normal'}
                      color={isSel ? '#FFFFFF' : theme.colors.text.primary}
                    >
                      {m.masterId} ({formatMistingCode('reportedStatus', m.reportedStatus)})
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Sensors of Selected Master - Only Tầng 1 & Tầng 2 */}
          {sensors.length > 0 && (
            <View style={styles.selectorGroup}>
              <AppText variant="label" color={theme.colors.text.muted}>
                CHỌN TẦNG NUÔI TRỒNG (CẢM BIẾN VI KHÍ HẬU):
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {sensors.map((s) => {
                  const isSel =
                    selectedSensor?.nodeId === s.nodeId && selectedSensor?.sensorId === s.sensorId;
                  const floorInfo = getFloorInfo(s.nodeId);
                  return (
                    <Pressable
                      key={`${s.nodeId}_${s.sensorId}`}
                      onPress={() => handleSelectSensor(s)}
                      style={[styles.pill, isSel && styles.pillActive]}
                    >
                      <Ionicons
                        name="layers-outline"
                        size={16}
                        color={isSel ? '#FFFFFF' : theme.colors.text.secondary}
                      />
                      <AppText
                        variant="caption"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? '#FFFFFF' : theme.colors.text.primary}
                      >
                        {floorInfo.label} (Node {s.nodeId}) • Cảm biến {s.sensorId}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Current Sensor Realtime Overview Card */}
          {selectedSensor ? (
            <AppCard elevation="sm" style={styles.sensorCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <AppText variant="title" weight="bold">
                    {getFloorInfo(selectedSensor.nodeId).label} — Cảm biến {selectedSensor.sensorId}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    {getFloorInfo(selectedSensor.nodeId).floorName
                      ? `${getFloorInfo(selectedSensor.nodeId).floorName} • `
                      : ''}
                    Phần cứng: Node #{selectedSensor.nodeId} • Master: {selectedSensor.masterId}
                  </AppText>
                </View>

                <View
                  style={[
                    styles.okBadge,
                    {
                      backgroundColor: selectedSensor.ok
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={selectedSensor.ok ? theme.colors.success.dark : theme.colors.error.main}
                  >
                    {formatMistingBoolean('sensorValid', selectedSensor.ok)}
                  </AppText>
                </View>
              </View>

              <AppDivider spacing="sm" />

              {/* Metrics */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nhiệt độ hiện tại
                  </AppText>
                  <AppText variant="h2" weight="bold" color="#8B5CF6">
                    {selectedSensor.temperature != null ? `${Number(selectedSensor.temperature).toFixed(2)} °C` : '—'}
                  </AppText>
                </View>

                <AppDivider orientation="vertical" spacing="md" />

                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Độ ẩm hiện tại
                  </AppText>
                  <AppText variant="h2" weight="bold" color="#14B8A6">
                    {selectedSensor.humidity != null ? `${Number(selectedSensor.humidity).toFixed(2)} %` : '—'}
                  </AppText>
                </View>
              </View>

              <AppDivider spacing="xs" />

              {/* Timestamps */}
              <View style={styles.timestampBox}>
                <View style={styles.tsRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Thời điểm nhận backend:
                  </AppText>
                  <AppText variant="captionMedium">
                    {selectedSensor.lastReceivedAt
                      ? new Date(selectedSensor.lastReceivedAt).toLocaleTimeString('vi-VN')
                      : 'Chưa nhận'}
                  </AppText>
                </View>
                <View style={styles.tsRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Giá trị hợp lệ gần nhất:
                  </AppText>
                  <AppText variant="captionMedium">
                    {selectedSensor.lastValidAt
                      ? new Date(selectedSensor.lastValidAt).toLocaleTimeString('vi-VN')
                      : 'N/A'}
                  </AppText>
                </View>
                {selectedSensor.retained && (
                  <View style={styles.tsRow}>
                    <AppText variant="caption" color={theme.colors.warning.dark}>
                      Trạng thái bản tin:
                    </AppText>
                    <AppText variant="caption" color={theme.colors.warning.dark}>
                      Retained (Có thể đã cũ từ broker)
                    </AppText>
                  </View>
                )}
              </View>
            </AppCard>
          ) : (
            <View style={styles.emptyCard}>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Không tìm thấy cảm biến hợp lệ cho Tầng 1 hoặc Tầng 2 trên Master này.
              </AppText>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.lg,
  },
  centerLoading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
  },
  chartSection: {
    gap: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floorsListContainer: {
    gap: theme.spacing.md,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.error.light,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  hardwareSection: {
    gap: theme.spacing.sm,
  },
  selectorGroup: {
    gap: theme.spacing.xs,
  },
  pillsRow: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  pillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  sensorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  okBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
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
  timestampBox: {
    gap: 4,
    paddingTop: theme.spacing.xs,
  },
  tsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
