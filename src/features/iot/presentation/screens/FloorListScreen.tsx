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
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AutoControlStatus,
  AutoMistingConfig,
  FloorEnvironment,
  FloorMapping,
  IotMaster,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import {
  cultivationRepository,
  CultivationRoom,
} from '../../../cultivation';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { CreateFloorModal } from '../components/CreateFloorModal';

interface FloorListScreenProps {
  onSelectFloor: (floor: FloorMapping, initialTab?: 'overview' | 'trays' | 'logs') => void;
  canManage?: boolean;
  onBack?: () => void;
}

export const FloorListScreen: React.FC<FloorListScreenProps> = ({
  onSelectFloor,
  canManage = true,
  onBack,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const [rooms, setRooms] = useState<CultivationRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [masters, setMasters] = useState<IotMaster[]>([]);

  // Cache of floor statuses, environments and configs to avoid spamming
  const [floorStatuses, setFloorStatuses] = useState<Record<number, AutoControlStatus>>({});
  const [floorEnvironments, setFloorEnvironments] = useState<Record<number, FloorEnvironment>>({});
  const [floorConfigs, setFloorConfigs] = useState<Record<number, AutoMistingConfig | null>>({});
  const [floorTrayCounts, setFloorTrayCounts] = useState<
    Record<number, { total: number; cultivating: number; availableForAssign: number }>
  >({});
  const [hydratedFloorIds, setHydratedFloorIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Floor Modal
  const [createFloorModalVisible, setCreateFloorModalVisible] = useState(false);
  const [editingFloor, setEditingFloor] = useState<FloorMapping | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Initial Rooms & Masters & Floors
  const loadInitialData = useCallback(async () => {
    try {
      const [roomsRes, mastersRes, floorsRes] = await Promise.allSettled([
        cultivationRepository.getRooms(),
        iotRepository.getMasters(),
        iotRepository.getFloors(),
      ]);

      const loadedRooms = roomsRes.status === 'fulfilled' ? roomsRes.value : [];
      setRooms(loadedRooms);

      if (mastersRes.status === 'fulfilled') {
        setMasters(mastersRes.value);
      }

      const loadedFloors = floorsRes.status === 'fulfilled' ? floorsRes.value : [];
      setFloors(loadedFloors);

      // Default select room that actually has floors, or first room
      const roomWithFloors = loadedRooms.find((r) =>
        loadedFloors.some((f) => f.room_id === r.room_id)
      );
      setSelectedRoomId((prev) => prev ?? (roomWithFloors?.room_id || loadedRooms[0]?.room_id || null));
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isMounted) {
        await loadInitialData();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadInitialData]);

  // Hydrate limited floor info for currently selected room's floors
  const activeRoomFloors = useMemo(
    () => floors.filter((f) => selectedRoomId == null || f.room_id === selectedRoomId),
    [floors, selectedRoomId]
  );

  const hydrateFloor = useCallback(async (f: FloorMapping) => {
    const fid = f.floor_id ?? f.id;
    if (!fid) return;

    try {
      const [status, cfg, availableTrays] = await Promise.all([
        iotRepository.getAutoControlStatus(fid).catch(() => null),
        iotRepository.getAutoControlConfig(fid).catch(() => null),
        iotRepository.getAvailableTraysForFloor(fid).catch(() => []),
      ]);

      if (status) {
        setFloorStatuses((prev) => ({ ...prev, [fid]: status }));
        const env = status.environment;
        if (env) {
          setFloorEnvironments((prev) => ({ ...prev, [fid]: env }));
        }
      }

      const configObj =
        (cfg as any)?.config ??
        ((cfg as any)?.humidity_min != null ? cfg : null) ??
        (status?.run?.config_snapshot as any) ??
        (status?.environment?.thresholds as any) ??
        ((status?.lastDecision as any)?.thresholds_snapshot_json as any) ??
        null;

      setFloorConfigs((prev) => ({
        ...prev,
        [fid]: configObj || prev[fid] || null,
      }));

      if (cfg?.cultivation?.trays) {
        const trays = cfg.cultivation.trays;
        const cultivating = trays.filter((t) => t.session_id && t.mushroom_name).length;
        setFloorTrayCounts((prev) => ({
          ...prev,
          [fid]: {
            total: trays.length,
            cultivating,
            availableForAssign: Array.isArray(availableTrays) ? availableTrays.length : 0,
          },
        }));
      } else if (Array.isArray(availableTrays)) {
        const total = (f.total_rows || 3) * (f.total_columns || 3);
        setFloorTrayCounts((prev) => ({
          ...prev,
          [fid]: {
            total,
            cultivating: Math.max(0, total - availableTrays.length),
            availableForAssign: availableTrays.length,
          },
        }));
      }

      setHydratedFloorIds((prev) => new Set(prev).add(fid));
    } catch {
      setHydratedFloorIds((prev) => new Set(prev).add(fid));
    }
  }, []);

  const hydrateAllFloors = useCallback((targetFloors: FloorMapping[], targetRoomId: number | null) => {
    if (targetFloors.length === 0) return;
    const active = targetFloors.filter((f) => f.room_id === targetRoomId);
    const others = targetFloors.filter((f) => f.room_id !== targetRoomId);
    active.forEach((f) => void hydrateFloor(f));
    others.forEach((f) => void hydrateFloor(f));
  }, [hydrateFloor]);

  // Re-fetch data and re-hydrate whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await loadInitialData();
      })();
    }, [loadInitialData])
  );

  // Pre-hydrate all floors across all rooms whenever floors list or room selection changes
  useEffect(() => {
    hydrateAllFloors(floors, selectedRoomId);
  }, [floors, selectedRoomId, hydrateAllFloors]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
  };

  const handleSaveFloorMapping = async (mapping: FloorMapping) => {
    setActionLoading(true);
    try {
      const fid = mapping.floor_id ?? mapping.id;
      if (fid) {
        await iotRepository.updateFloor(fid, mapping);
        Alert.alert('Thành công', 'Đã cập nhật thông tin tầng.');
      } else {
        await iotRepository.createFloor(mapping);
        Alert.alert('Thành công', 'Đã tạo tầng nuôi trồng mới.');
      }
      setCreateFloorModalVisible(false);
      setEditingFloor(null);
      await loadInitialData();
    } catch (err: any) {
      let msg = err?.message || 'Không thể lưu tầng.';
      const status = err?.statusCode || err?.response?.status || err?.status;
      if (status === 409) {
        msg = 'Kênh đã được dùng cho van, đèn hoặc quạt khác.';
      }
      Alert.alert('Lỗi lưu tầng', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader
          title="Chăm sóc & Vi khí hậu"
          subtitle="Hệ thống tự động theo tầng"
          showBack
          onBack={handleBack}
        />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
            Đang tải danh sách phòng & tầng...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <AppHeader
        title="Chăm sóc & Tự động hóa"
        subtitle="Quản lý vi khí hậu & gán khay theo tầng"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Room Picker Section */}
        <View style={styles.sectionWrap}>
          <AppText variant="label" color={theme.colors.text.muted}>
            PHÒNG NUÔI TRỒNG
          </AppText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomPillsRow}>
            {rooms.map((room) => {
              const isSelected = room.room_id === selectedRoomId;
              return (
                <Pressable
                  key={room.room_id}
                  onPress={() => setSelectedRoomId(room.room_id)}
                  style={[styles.roomPill, isSelected && styles.roomPillActive]}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={isSelected ? '#FFFFFF' : theme.colors.text.secondary}
                  />
                  <AppText
                    variant="caption"
                    weight={isSelected ? 'bold' : 'normal'}
                    color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                  >
                    {room.room_name} ({room.room_code})
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Room Information Overview */}
        {selectedRoom && (
          <AppCard elevation="xs" style={styles.roomOverviewCard}>
            <View style={styles.roomOverviewHeader}>
              <View>
                <AppText variant="title" weight="bold">
                  {selectedRoom.room_name}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Mã: {selectedRoom.room_code} • Sức chứa: {selectedRoom.capacity} khay
                </AppText>
              </View>

              <View style={styles.roomStatusBadge}>
                <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>
                  {selectedRoom.status === 'ACTIVE'
                    ? 'Đang hoạt động'
                    : selectedRoom.status === 'INACTIVE'
                    ? 'Tạm ngưng'
                    : selectedRoom.status}
                </AppText>
              </View>
            </View>
          </AppCard>
        )}

        {/* Floors Section Header */}
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={theme.colors.text.muted}>
            DANH SÁCH TẦNG ({activeRoomFloors.length})
          </AppText>

          {canManage && selectedRoomId && (
            <Pressable
              onPress={() => {
                setEditingFloor(null);
                setCreateFloorModalVisible(true);
              }}
              style={styles.addFloorBtn}
            >
              <Ionicons name="add" size={16} color={theme.colors.primary[700]} />
              <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                Thêm tầng
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Floor Cards List */}
        <View style={styles.floorsList}>
          {activeRoomFloors.length === 0 ? (
            <AppCard elevation="xs" style={styles.emptyCard}>
              <Ionicons name="layers-outline" size={36} color={theme.colors.text.muted} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center" style={{ marginTop: 6 }}>
                Phòng này chưa có tầng nào được cấu hình.
              </AppText>
              {canManage && selectedRoomId && (
                <AppButton
                  title="Tạo tầng ngay"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setEditingFloor(null);
                    setCreateFloorModalVisible(true);
                  }}
                  style={{ marginTop: 8 }}
                />
              )}
            </AppCard>
          ) : (
            activeRoomFloors.map((floor) => {
              const fid = floor.floor_id ?? floor.id ?? 0;
              const status = floorStatuses[fid];
              const env = floorEnvironments[fid];
              const counts = floorTrayCounts[fid];
              const config = floorConfigs[fid];
              const isHydrated = hydratedFloorIds.has(fid);

              const isRunning = status?.run?.status === 'RUNNING';
              const isDryRun = status?.run?.dry_run === true;
              const isFault =
                status?.run?.status === 'FAULT' ||
                (status?.mode === 'AUTO' &&
                  (status?.runtime?.control_state === 'FAULT' ||
                    status?.runtime?.control_state === 'SENSOR_FAULT' ||
                    status?.runtime?.control_state === 'DEVICE_OFFLINE'));
              const isOffPending = status?.runtime?.control_state === 'OFF_PENDING';

              // Has config check: Truly check if config exists in DB or has thresholds snapshot
              const hasConfig = Boolean(
                config &&
                  (config.profile_name ||
                    config.humidity_min != null ||
                    config.id != null ||
                    config.misting_pulse_ms != null)
              );

              return (
                <AppCard key={fid || floor.floor_number} elevation="xs" style={styles.floorCard}>
                  <Pressable onPress={() => onSelectFloor(floor, 'overview')}>
                    {/* Top Floor Header */}
                    <View style={styles.floorCardHeader}>
                      <View style={styles.floorTitleRow}>
                        <Ionicons name="layers" size={20} color={theme.colors.primary[600]} />
                        <AppText variant="title" weight="bold">
                          {floor.floor_name}
                        </AppText>
                      </View>

                      {/* Status Badges */}
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

                    {/* Hardware info */}
                    <AppText variant="caption" color={theme.colors.text.secondary} style={styles.hardwareText}>
                      Tầng {floor.floor_number} • Master #{floor.master_id} • Node {floor.node_address} • SSR #{floor.misting_ssr_channel}
                    </AppText>

                    {/* Climate Telemetry & Tray count */}
                    <View style={styles.metricsRow}>
                      {/* Climate */}
                      <View style={styles.metricSnippet}>
                        <Ionicons name="pulse" size={14} color={theme.colors.primary[600]} />
                        {env?.averageTemperature != null && env?.averageHumidity != null && env.healthy ? (
                          <AppText variant="caption" weight="semibold">
                            {Number(env.averageTemperature).toFixed(1)}°C • {Number(env.averageHumidity).toFixed(1)}%
                          </AppText>
                        ) : !isHydrated ? (
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Đang tải số đo...
                          </AppText>
                        ) : (
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Cảm biến chưa sẵn sàng
                          </AppText>
                        )}
                      </View>

                      {/* Tray counts */}
                      <View style={styles.metricSnippet}>
                        <Ionicons name="cube-outline" size={14} color={theme.colors.text.secondary} />
                        {counts ? (
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            {counts.total} khay (Đang trồng: <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>{counts.cultivating}</AppText> • Có thể gắn: <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>{counts.availableForAssign}</AppText>)
                          </AppText>
                        ) : !isHydrated ? (
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Đang nạp khay...
                          </AppText>
                        ) : (
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Chưa có khay
                          </AppText>
                        )}
                      </View>
                    </View>

                    {/* Unconfigured state notice vs Configured Profile info */}
                    {!isHydrated ? (
                      <View style={styles.syncingBanner}>
                        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                        <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 6 }}>
                          Đang đồng bộ dữ liệu tầng...
                        </AppText>
                      </View>
                    ) : !hasConfig ? (
                      <View style={styles.unconfiguredBanner}>
                        <Ionicons name="information-circle-outline" size={15} color={theme.colors.warning.dark} />
                        <AppText variant="caption" color={theme.colors.warning.dark} style={{ flex: 1 }}>
                          Chưa có cấu hình chăm sóc cho tầng này.
                        </AppText>
                        <AppButton
                          title="Thiết lập"
                          variant="ghost"
                          size="sm"
                          onPress={() => onSelectFloor(floor, 'overview')}
                        />
                      </View>
                    ) : (
                      <View style={styles.configuredBanner}>
                        <Ionicons
                          name={config?.profile_approved ? 'shield-checkmark' : 'shield-outline'}
                          size={14}
                          color={config?.profile_approved ? theme.colors.success.dark : theme.colors.warning.dark}
                        />
                        <AppText variant="caption" color={theme.colors.text.secondary} style={{ flex: 1 }} numberOfLines={1}>
                          Hồ sơ: <AppText variant="caption" weight="semibold">{config?.profile_name || 'Cấu hình tầng'}</AppText>
                          {config?.profile_approved ? ' (Đã duyệt)' : ' (Chờ duyệt)'}
                          {config?.humidity_min != null && config?.humidity_max != null
                            ? ` • Ẩm: ${config.humidity_min}–${config.humidity_max}%`
                            : ''}
                        </AppText>
                      </View>
                    )}
                  </Pressable>

                  {/* Quick Action Navigation Bar on Floor Card */}
                  <View style={styles.cardActionsBar}>
                    <Pressable
                      style={styles.cardActionBtn}
                      onPress={() => onSelectFloor(floor, 'overview')}
                    >
                      <Ionicons name="speedometer-outline" size={13} color={theme.colors.primary[700]} />
                      <AppText variant="caption" weight="semibold" color={theme.colors.primary[700]} style={{ marginLeft: 3 }}>
                        Tổng quan
                      </AppText>
                    </Pressable>

                    <Pressable
                      style={styles.cardActionBtn}
                      onPress={() => onSelectFloor(floor, 'trays')}
                    >
                      <Ionicons name="cube-outline" size={13} color={theme.colors.primary[700]} />
                      <AppText variant="caption" weight="semibold" color={theme.colors.primary[700]} style={{ marginLeft: 3 }}>
                        Khay ({counts?.total || 0})
                      </AppText>
                    </Pressable>

                    <Pressable
                      style={styles.cardActionBtn}
                      onPress={() => onSelectFloor(floor, 'logs')}
                    >
                      <Ionicons name="newspaper-outline" size={13} color={theme.colors.primary[700]} />
                      <AppText variant="caption" weight="semibold" color={theme.colors.primary[700]} style={{ marginLeft: 3 }}>
                        Nhật ký
                      </AppText>
                    </Pressable>

                    {canManage && (
                      <Pressable
                        style={styles.cardActionBtnIcon}
                        onPress={() => {
                          setEditingFloor(floor);
                          setCreateFloorModalVisible(true);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={14} color={theme.colors.text.secondary} />
                      </Pressable>
                    )}
                  </View>
                </AppCard>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Create / Edit Floor Modal */}
      {selectedRoomId && (
        <CreateFloorModal
          visible={createFloorModalVisible}
          onClose={() => {
            setCreateFloorModalVisible(false);
            setEditingFloor(null);
          }}
          roomId={selectedRoomId}
          masters={masters}
          editingFloor={editingFloor}
          onSave={handleSaveFloorMapping}
          loading={actionLoading}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centerLoading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  sectionWrap: {
    gap: theme.spacing.xs,
  },
  roomPillsRow: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  roomPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  roomOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  roomOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomStatusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addFloorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
  },
  floorsList: {
    gap: theme.spacing.sm,
  },
  floorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  floorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floorTitleRow: {
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
  hardwareText: {
    marginTop: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.neutral[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginTop: 2,
  },
  metricSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    marginTop: 4,
  },
  unconfiguredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
    gap: 4,
  },
  configuredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginTop: 4,
    gap: 6,
  },
  cardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingTop: theme.spacing.xs,
    marginTop: 4,
    gap: theme.spacing.xs,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardActionBtnIcon: {
    marginLeft: 'auto',
    padding: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
});
