import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import {
  cultivationRepository,
  CultivationRoom,
  CultivationTray,
  CultivationTrayDetailModal,
} from '../../src/features/cultivation';
import { iotRepository } from '../../src/features/iot/data/repositories/IotRepository';
import type { FloorMapping } from '../../src/features/iot/domain/entities/Iot';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

export default function CultivationScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<CultivationRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [trays, setTrays] = useState<CultivationTray[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | 'ALL'>('ALL');

  // Tray Detail Modal State
  const [selectedTrayForDetail, setSelectedTrayForDetail] = useState<CultivationTray | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);

  const enrichTraysWithFloorCultivation = useCallback(
    async (rawTrays: CultivationTray[], currentFloors: FloorMapping[]) => {
      try {
        const floorTraysResults = await Promise.allSettled(
          currentFloors.map(async (floor) => {
            const fid = floor.floor_id ?? floor.id;
            if (!fid) return [];
            const cfg = await iotRepository.getAutoControlConfig(fid);
            return (cfg.cultivation?.trays || []).map((t) => ({ ...t, floor_id: fid }));
          })
        );

        const allFloorTrays = floorTraysResults.flatMap((r) =>
          r.status === 'fulfilled' ? r.value : []
        );

        return rawTrays.map((t) => {
          const match = allFloorTrays.find(
            (ft) => ft.tray_id === t.tray_id || ft.tray_code === t.tray_code
          );
          if (match) {
            return {
              ...t,
              floor_id: match.floor_id ?? t.floor_id,
              session_id: match.session_id ?? t.session_id,
              rental_id: match.rental_id ?? t.rental_id,
              mushroom_type_id: match.mushroom_type_id ?? t.mushroom_type_id,
              mushroom_name: match.mushroom_name ?? t.mushroom_name,
              cultivation_status: match.cultivation_status ?? t.cultivation_status,
            };
          }
          return t;
        });
      } catch {
        return rawTrays;
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      const [roomsData, floorsData] = await Promise.all([
        cultivationRepository.getRooms(),
        iotRepository.getFloors(),
      ]);
      setRooms(roomsData);
      setFloors(floorsData);

      const targetRoomId = selectedRoomId || (roomsData.length > 0 ? roomsData[0].room_id : null);
      if (targetRoomId) {
        setSelectedRoomId(targetRoomId);
        setSelectedFloorId('ALL');
        const rawTrays = await cultivationRepository.getTrays(targetRoomId);
        const roomFloors = floorsData.filter((f) => f.room_id === targetRoomId);
        const enriched = await enrichTraysWithFloorCultivation(rawTrays, roomFloors);
        setTrays(enriched);
      }
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp dữ liệu',
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, enrichTraysWithFloorCultivation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSelectRoom = async (roomId: number) => {
    setSelectedRoomId(roomId);
    setSelectedFloorId('ALL');
    try {
      const rawTrays = await cultivationRepository.getTrays(roomId);
      const roomFloors = floors.filter((f) => f.room_id === roomId);
      const enriched = await enrichTraysWithFloorCultivation(rawTrays, roomFloors);
      setTrays(enriched);
    } catch {
      // Ignore
    }
  };

  const handleSelectTrayForDetail = (tray: CultivationTray) => {
    setSelectedTrayForDetail(tray);
    setDetailModalVisible(true);
  };

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);
  const roomFloors = floors.filter((f) => f.room_id === selectedRoomId);

  // Filter trays by selected floor
  const filteredTrays = trays.filter((t) => {
    if (selectedFloorId === 'ALL') return true;
    return t.floor_id === selectedFloorId;
  });

  const countTraysForFloor = (fid: number) =>
    trays.filter((t) => t.floor_id === fid).length;

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Phòng & Khay nuôi trồng" subtitle="Quản lý buồng, tầng và khay" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải dữ liệu phòng & khay...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Phòng, Tầng & Khay"
        subtitle="Hạ tầng nuôi trồng thông minh"
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        {/* Room Selection Pills */}
        <View style={styles.sectionHeader}>
          <AppText variant="label" color={theme.colors.text.muted}>
            PHÒNG NUÔI TRỒNG
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {rooms.map((room) => {
              const isSelected = room.room_id === selectedRoomId;
              return (
                <Pressable
                  key={room.room_id}
                  onPress={() => handleSelectRoom(room.room_id)}
                  style={[styles.pill, isSelected && styles.pillActive]}
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

        {/* Room Info Card */}
        {selectedRoom && (
          <AppCard elevation="xs" style={styles.roomCard}>
            <View style={styles.roomHeaderRow}>
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
            {selectedRoom.description ? (
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                {selectedRoom.description}
              </AppText>
            ) : null}
          </AppCard>
        )}

        {/* Floors Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="label" color={theme.colors.text.muted}>
              CÁC TẦNG TRONG PHÒNG ({roomFloors.length})
            </AppText>
            {selectedFloorId !== 'ALL' && (
              <Pressable onPress={() => setSelectedFloorId('ALL')}>
                <AppText variant="caption" color={theme.colors.primary[600]} weight="bold">
                  Xem tất cả tầng
                </AppText>
              </Pressable>
            )}
          </View>

          <View style={styles.floorsGrid}>
            {roomFloors.length === 0 ? (
              <AppText variant="caption" color={theme.colors.text.muted}>
                Chưa có cấu hình tầng cho phòng này.
              </AppText>
            ) : (
              roomFloors.map((floor) => {
                const fid = floor.floor_id ?? floor.id;
                const isSelected = fid != null && selectedFloorId === fid;
                const trayCount = fid != null ? countTraysForFloor(fid) : 0;

                return (
                  <Pressable
                    key={floor.id || floor.floor_number}
                    onPress={() => {
                      if (fid != null) {
                        setSelectedFloorId(selectedFloorId === fid ? 'ALL' : fid);
                      }
                    }}
                  >
                    <AppCard
                      elevation="xs"
                      style={[
                        styles.floorCard,
                        isSelected && styles.floorCardSelected,
                      ]}
                    >
                      <View style={styles.floorHeader}>
                        <View style={styles.floorHeaderLeft}>
                          <Ionicons
                            name="layers"
                            size={18}
                            color={isSelected ? theme.colors.primary[600] : theme.colors.primary[500]}
                          />
                          <AppText
                            variant="label"
                            weight="bold"
                            color={isSelected ? theme.colors.primary[700] : undefined}
                          >
                            {floor.floor_name} (Tầng {floor.floor_number})
                          </AppText>
                        </View>

                        <View
                          style={[
                            styles.floorCountBadge,
                            isSelected && styles.floorCountBadgeSelected,
                          ]}
                        >
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={isSelected ? '#FFFFFF' : theme.colors.primary[600]}
                            style={{ fontSize: 11 }}
                          >
                            {trayCount} khay
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Master #{floor.master_id} • Node {floor.node_address} • SSR #{floor.misting_ssr_channel}
                      </AppText>
                    </AppCard>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Floor Filter Pills for Quick Switch */}
        {roomFloors.length > 1 && (
          <View style={styles.filterPillsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
              <Pressable
                onPress={() => setSelectedFloorId('ALL')}
                style={[
                  styles.filterPill,
                  selectedFloorId === 'ALL' && styles.filterPillActive,
                ]}
              >
                <AppText
                  variant="caption"
                  weight={selectedFloorId === 'ALL' ? 'bold' : 'normal'}
                  color={selectedFloorId === 'ALL' ? '#FFFFFF' : theme.colors.text.primary}
                >
                  Tất cả các tầng ({trays.length})
                </AppText>
              </Pressable>

              {roomFloors.map((floor) => {
                const fid = floor.floor_id ?? floor.id;
                const isSelected = fid != null && selectedFloorId === fid;
                const trayCount = fid != null ? countTraysForFloor(fid) : 0;

                return (
                  <Pressable
                    key={fid || floor.floor_number}
                    onPress={() => setSelectedFloorId(isSelected ? 'ALL' : (fid as number))}
                    style={[
                      styles.filterPill,
                      isSelected && styles.filterPillActive,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight={isSelected ? 'bold' : 'normal'}
                      color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                    >
                      {floor.floor_name} ({trayCount})
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Trays Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="label" color={theme.colors.text.muted}>
              DANH SÁCH KHAY NUÔI TRỒNG ({filteredTrays.length})
            </AppText>
            {selectedFloorId !== 'ALL' && (
              <AppText variant="caption" color={theme.colors.primary[600]}>
                Đang lọc theo tầng
              </AppText>
            )}
          </View>

          <View style={styles.traysGrid}>
            {filteredTrays.length === 0 ? (
              <AppCard elevation="xs" style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={32} color={theme.colors.text.muted} />
                <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 6 }}>
                  {selectedFloorId !== 'ALL'
                    ? 'Chưa có khay nào được gán vào tầng này.'
                    : 'Chưa có khay nào trong phòng này.'}
                </AppText>
                {selectedFloorId !== 'ALL' && (
                  <AppButton
                    title="Xem tất cả khay"
                    variant="ghost"
                    size="sm"
                    onPress={() => setSelectedFloorId('ALL')}
                    style={{ marginTop: 8 }}
                  />
                )}
              </AppCard>
            ) : (
              filteredTrays.map((tray) => {
                const hasActiveSession = Boolean(tray.session_id && tray.mushroom_name);
                const isOccupied = tray.status === 'OCCUPIED';
                const isAvailable = tray.status === 'AVAILABLE';
                const isMaintenance = tray.status === 'MAINTENANCE';

                let statusColor: string = theme.colors.neutral[400];
                let statusText = 'Không khả dụng';

                if (hasActiveSession) {
                  statusColor = theme.colors.success.main;
                  statusText = 'Đang trồng';
                } else if (isOccupied) {
                  statusColor = theme.colors.warning.main;
                  statusText = 'Chưa có phiên';
                } else if (isAvailable) {
                  statusColor = theme.colors.info?.main ?? '#0284C7';
                  statusText = 'Khay trống';
                } else if (isMaintenance) {
                  statusColor = theme.colors.error.main;
                  statusText = 'Bảo trì';
                }

                const trayFloor = floors.find(
                  (f) => (f.floor_id ?? f.id) === tray.floor_id
                );

                return (
                  <Pressable
                    key={tray.tray_id}
                    onPress={() => handleSelectTrayForDetail(tray)}
                    style={({ pressed }) => [
                      styles.trayPressable,
                      pressed && styles.trayPressed,
                    ]}
                  >
                    <AppCard
                      elevation="xs"
                      style={[
                        styles.trayCard,
                        hasActiveSession && styles.trayCardActiveSession,
                        isOccupied && !hasActiveSession && styles.trayCardOccupiedNoSession,
                      ]}
                    >
                      {/* Tray Header */}
                      <View style={styles.trayHeader}>
                        <View style={styles.trayHeaderLeft}>
                          <View style={[styles.trayDot, { backgroundColor: statusColor }]} />
                          <AppText variant="label" weight="bold">
                            {tray.tray_code}
                          </AppText>
                        </View>
                        {trayFloor ? (
                          <View style={styles.trayFloorBadge}>
                            <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
                              {trayFloor.floor_name}
                            </AppText>
                          </View>
                        ) : null}
                      </View>

                      {/* Tray Body depending on real session status */}
                      {hasActiveSession ? (
                        <View style={styles.traySessionBody}>
                          <View style={styles.mushroomRow}>
                            <Ionicons name="leaf" size={13} color={theme.colors.success.dark} />
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={theme.colors.text.primary}
                              numberOfLines={1}
                              style={styles.mushroomNameText}
                            >
                              {tray.mushroom_name}
                            </AppText>
                          </View>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Phiên #{tray.session_id} • Xem chi tiết →
                          </AppText>
                        </View>
                      ) : isOccupied ? (
                        <View style={styles.trayUnassignedBody}>
                          <View style={styles.mushroomRow}>
                            <Ionicons name="cube-outline" size={13} color={theme.colors.warning.dark} />
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={theme.colors.text.primary}
                              numberOfLines={1}
                              style={styles.mushroomNameText}
                            >
                              Đã xếp khay
                            </AppText>
                          </View>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Chưa có phiên • Chi tiết →
                          </AppText>
                        </View>
                      ) : isAvailable ? (
                        <View style={styles.trayAvailableBody}>
                          <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={1}>
                            {tray.tray_name || 'Khay sẵn sàng gán thuê'}
                          </AppText>
                          <AppText variant="caption" color={theme.colors.info?.main ?? '#0284C7'}>
                            Xem chi tiết →
                          </AppText>
                        </View>
                      ) : (
                        <View style={styles.trayMaintenanceBody}>
                          <AppText variant="caption" color={theme.colors.error.main}>
                            Đang bảo dưỡng
                          </AppText>
                        </View>
                      )}

                      {/* Tray Badge */}
                      <View style={[styles.trayBadge, { backgroundColor: `${statusColor}18` }]}>
                        <AppText variant="overline" color={statusColor} weight="bold">
                          {statusText}
                        </AppText>
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* Tray Cultivation Detail Modal */}
      <CultivationTrayDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        tray={selectedTrayForDetail}
        room={selectedRoom}
        floor={roomFloors.find(
          (f) => (f.floor_id ?? f.id) === selectedTrayForDetail?.floor_id
        )}
      />
    </ScreenContainer>
  );
}

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
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomStatusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  floorsGrid: {
    gap: theme.spacing.xs,
  },
  floorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  floorCardSelected: {
    borderColor: theme.colors.primary[600],
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  floorCountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  floorCountBadgeSelected: {
    backgroundColor: theme.colors.primary[600],
  },
  filterPillsContainer: {
    marginVertical: -2,
  },
  filterPillsRow: {
    gap: theme.spacing.xs,
  },
  filterPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  traysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  trayPressable: {
    width: '48%',
  },
  trayPressed: {
    opacity: 0.8,
  },
  trayCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  trayCardActiveSession: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: '#FAFCFA',
  },
  trayCardOccupiedNoSession: {
    borderColor: 'rgba(234, 179, 8, 0.35)',
    backgroundColor: '#FFFEFA',
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  trayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trayFloorBadge: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  traySessionBody: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
    marginVertical: 2,
  },
  trayUnassignedBody: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
    marginVertical: 2,
  },
  trayAvailableBody: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 2,
    marginVertical: 2,
  },
  trayMaintenanceBody: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 2,
  },
  mushroomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mushroomNameText: {
    flex: 1,
  },
  trayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  emptyCard: {
    width: '100%',
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
});
