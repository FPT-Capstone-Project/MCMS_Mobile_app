import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  IotMaster,
  IotReading,
  IotSensor,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';

export const SensorDetailScreen: React.FC = () => {
  const router = useRouter();

  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [sensors, setSensors] = useState<IotSensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<IotSensor | null>(null);

  const [history, setHistory] = useState<IotReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load masters & first sensor
  const loadMasters = useCallback(async () => {
    try {
      setLoading(true);
      const mastersData = await iotRepository.getMasters();
      setMasters(mastersData);

      if (mastersData.length > 0) {
        const firstMasterId = mastersData[0].masterId;
        setSelectedMasterId(firstMasterId);

        const sensorsData = await iotRepository.getMasterSensors(firstMasterId);
        setSensors(sensorsData);
        if (sensorsData.length > 0) {
          setSelectedSensor(sensorsData[0]);
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

  useFocusEffect(
    useCallback(() => {
      loadMasters();
    }, [loadMasters])
  );

  // When master selection changes
  const handleSelectMaster = async (masterId: string) => {
    setSelectedMasterId(masterId);
    try {
      setHistoryLoading(true);
      const sensorsData = await iotRepository.getMasterSensors(masterId);
      setSensors(sensorsData);
      if (sensorsData.length > 0) {
        setSelectedSensor(sensorsData[0]);
      } else {
        setSelectedSensor(null);
        setHistory([]);
      }
    } catch {
      // Ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectSensor = (s: IotSensor) => {
    setSelectedSensor(s);
    setHistory([]);
    setHistoryLoading(true);
  };

  // Load history when selected sensor changes
  useEffect(() => {
    if (!selectedMasterId || !selectedSensor) {
      return;
    }

    let isMounted = true;
    iotRepository
      .getSensorHistory(selectedMasterId, selectedSensor.nodeId, selectedSensor.sensorId, {
        limit: 20,
      })
      .then((historyData) => {
        if (!isMounted) return;
        // Backend returns descending order (newest first).
        // Sort in ASCENDING order for chronological visualization
        const sorted = [...(historyData.readings || [])].sort((a, b) => {
          const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return timeA - timeB;
        });
        setHistory(sorted);
      })
      .catch(() => {
        if (isMounted) setHistory([]);
      })
      .finally(() => {
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMasterId, selectedSensor]);

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Cảm biến IoT" subtitle="Chi tiết & Lịch sử vi khí hậu" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải dữ liệu cảm biến IoT...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  // Calculate simple bar heights for miniature chart
  const maxTemp = Math.max(...history.map((r) => r.temperature || 0), 40);
  const maxHum = Math.max(...history.map((r) => r.humidity || 0), 100);

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Cảm biến IoT"
        subtitle="Chi tiết & Lịch sử vi khí hậu"
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.content}>
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
                    {m.masterId} ({m.reportedStatus === 'online' ? 'Trực tuyến' : m.reportedStatus === 'offline' ? 'Ngoại tuyến' : 'Sẵn sàng'})
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Sensors of Selected Master */}
        {sensors.length > 0 && (
          <View style={styles.selectorGroup}>
            <AppText variant="label" color={theme.colors.text.muted}>
              CÁC CẢM BIẾN (NODE / SENSOR):
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {sensors.map((s) => {
                const isSel =
                  selectedSensor?.nodeId === s.nodeId && selectedSensor?.sensorId === s.sensorId;
                return (
                  <Pressable
                    key={`${s.nodeId}_${s.sensorId}`}
                    onPress={() => handleSelectSensor(s)}
                    style={[styles.pill, isSel && styles.pillActive]}
                  >
                    <Ionicons
                      name="radio-outline"
                      size={16}
                      color={isSel ? '#FFFFFF' : theme.colors.text.secondary}
                    />
                    <AppText
                      variant="caption"
                      weight={isSel ? 'bold' : 'normal'}
                      color={isSel ? '#FFFFFF' : theme.colors.text.primary}
                    >
                      Node {s.nodeId} • Cảm biến {s.sensorId}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Current Sensor Overview Card */}
        {selectedSensor ? (
          <AppCard elevation="sm" style={styles.sensorCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <AppText variant="title" weight="bold">
                  Node {selectedSensor.nodeId} — Cảm biến {selectedSensor.sensorId}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Master: {selectedSensor.masterId}
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
                  {selectedSensor.ok ? 'Hoạt động tốt' : 'Lỗi cảm biến'}
                </AppText>
              </View>
            </View>

            <AppDivider spacing="sm" />

            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Nhiệt độ
                </AppText>
                <AppText variant="h2" weight="bold" color={theme.colors.text.primary}>
                  {selectedSensor.temperature != null ? `${selectedSensor.temperature.toFixed(1)} °C` : '—'}
                </AppText>
              </View>

              <AppDivider orientation="vertical" spacing="md" />

              <View style={styles.metricItem}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Độ ẩm không khí
                </AppText>
                <AppText variant="h2" weight="bold" color={theme.colors.primary[600]}>
                  {selectedSensor.humidity != null ? `${selectedSensor.humidity.toFixed(1)} %` : '—'}
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
              Không tìm thấy cảm biến nào trên Master này.
            </AppText>
          </View>
        )}

        {/* History Chart & Readings Card */}
        <AppCard elevation="sm" style={styles.historyCard}>
          <View style={styles.cardHeaderRow}>
            <AppText variant="title" weight="bold">
              Biểu đồ lịch sử đo (20 mẫu gần nhất)
            </AppText>
            {historyLoading && <ActivityIndicator size="small" color={theme.colors.primary[500]} />}
          </View>

          <AppText variant="caption" color={theme.colors.text.muted}>
            Dữ liệu sắp xếp theo thứ tự thời gian tăng dần (trái qua phải).
          </AppText>

          {history.length > 0 ? (
            <View style={styles.chartArea}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartBars}>
                {history.map((reading, idx) => {
                  const humHeight = Math.max(10, ((reading.humidity || 0) / maxHum) * 120);
                  const tempHeight = Math.max(10, ((reading.temperature || 0) / maxTemp) * 120);
                  const timeStr = reading.receivedAt
                    ? new Date(reading.receivedAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : `#${idx + 1}`;

                  return (
                    <View key={reading.id || idx} style={styles.barGroup}>
                      <View style={styles.barContainer}>
                        {/* Humidity bar */}
                        <View
                          style={[
                            styles.chartBar,
                            { height: humHeight, backgroundColor: theme.colors.primary[500] },
                          ]}
                        />
                        {/* Temperature bar */}
                        <View
                          style={[
                            styles.chartBar,
                            { height: tempHeight, backgroundColor: theme.colors.warning.main },
                          ]}
                        />
                      </View>
                      <AppText variant="overline" color={theme.colors.text.muted} style={styles.barTimeText}>
                        {timeStr}
                      </AppText>
                      <AppText variant="caption" weight="bold">
                        {reading.humidity ? `${reading.humidity}%` : ''}
                      </AppText>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Legend */}
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: theme.colors.primary[500] }]} />
                  <AppText variant="caption">Độ ẩm (%)</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: theme.colors.warning.main }]} />
                  <AppText variant="caption">Nhiệt độ (°C)</AppText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noHistory}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Chưa có dữ liệu lịch sử đo nào được ghi nhận.
              </AppText>
            </View>
          )}
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  centerLoading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
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
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  chartArea: {
    marginTop: theme.spacing.sm,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  barGroup: {
    alignItems: 'center',
    width: 60,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  chartBar: {
    width: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barTimeText: {
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  noHistory: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
});
