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

  const getTrayStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return theme.colors.success.main;
      case 'OCCUPIED':
        return theme.colors.primary[600];
      case 'MAINTENANCE':
        return theme.colors.warning.main;
      default:
        return theme.colors.neutral[400];
    }
  };

  const getTrayStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Sẵn sàng';
      case 'OCCUPIED':
        return 'Đang trồng';
      case 'MAINTENANCE':
        return 'Bảo trì';
      default:
        return 'Không khả dụng';
    }
  };

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
          <AppText variant="label" color={theme.colors.text.muted}>
            CÁC TẦNG ({roomFloors.length})
          </AppText>
          <View style={styles.floorsGrid}>
            {roomFloors.length === 0 ? (
              <AppText variant="caption" color={theme.colors.text.muted}>
                Chưa có cấu hình tầng cho phòng này.
              </AppText>
            ) : (
              roomFloors.map((floor) => (
                <AppCard key={floor.id || floor.floor_number} elevation="xs" style={styles.floorCard}>
                  <View style={styles.floorHeader}>
                    <Ionicons name="layers" size={20} color={theme.colors.primary[500]} />
                    <AppText variant="label" weight="bold">
                      {floor.floor_name} (Tầng {floor.floor_number})
                    </AppText>
                  </View>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Master #{floor.master_id} • Node {floor.node_address} • SSR #{floor.misting_ssr_channel}
                  </AppText>
                </AppCard>
              ))
            )}
          </View>
        </View>

        {/* Trays Section */}
        <View style={styles.sectionHeader}>
          <AppText variant="label" color={theme.colors.text.muted}>
            DANH SÁCH KHAY NUÔI TRỒNG ({trays.length})
          </AppText>

          <View style={styles.traysGrid}>
            {trays.length === 0 ? (
              <AppCard elevation="xs" style={styles.emptyCard}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Chưa có khay nào trong phòng này.
                </AppText>
              </AppCard>
            ) : (
              trays.map((tray) => {
                const statusColor = getTrayStatusColor(tray.status);
                const statusText = getTrayStatusText(tray.status);
                const isOccupied = tray.status === 'OCCUPIED';

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
                        isOccupied && styles.trayCardOccupied,
                      ]}
                    >
                      <View style={styles.trayHeader}>
                        <View style={styles.trayHeaderLeft}>
                          <View style={[styles.trayDot, { backgroundColor: statusColor }]} />
                          <AppText variant="label" weight="bold">
                            {tray.tray_code}
                          </AppText>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={theme.colors.text.muted}
                        />
                      </View>

                      {isOccupied ? (
                        <View style={styles.trayOccupiedBody}>
                          <View style={styles.mushroomRow}>
                            <Ionicons name="leaf" size={13} color={theme.colors.primary[600]} />
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={theme.colors.text.primary}
                              numberOfLines={1}
                              style={styles.mushroomNameText}
                            >
                              {tray.mushroom_name || 'Nấm đang trồng'}
                            </AppText>
                          </View>
                          {tray.session_id ? (
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Phiên #{tray.session_id} • Xem chi tiết →
                            </AppText>
                          ) : (
                            <AppText variant="caption" color={theme.colors.primary[600]}>
                              Xem chi tiết →
                            </AppText>
                          )}
                        </View>
                      ) : tray.tray_name ? (
                        <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={1}>
                          {tray.tray_name}
                        </AppText>
                      ) : null}

                      <View style={[styles.trayBadge, { backgroundColor: `${statusColor}15` }]}>
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
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
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
  trayCardOccupied: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: '#FAFCFA',
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
  trayOccupiedBody: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
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

