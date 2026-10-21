import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  cultivationRepository,
  CultivationRoom,
} from '../../../cultivation';
import {
  FloorMapping,
  IotMaster,
  IotSsr,
  IotSsrChannel,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';

export const ControlCenterScreen: React.FC = () => {
  const router = useRouter();
  const [rooms, setRooms] = useState<CultivationRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [ssrData, setSsrData] = useState<Record<string, IotSsr>>({});

  const [loading, setLoading] = useState(true);

  // Track command states per valve/channel: key = `${masterId}_${channel}`
  const [channelLoading, setChannelLoading] = useState<Record<string, boolean>>({});
  const [channelStatusMsg, setChannelStatusMsg] = useState<Record<string, string>>({});

  // Active polling tracking
  const activePollers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearAllPollers = () => {
    Object.values(activePollers.current).forEach(clearInterval);
    activePollers.current = {};
  };

  const loadData = useCallback(async () => {
    try {
      const [roomsData, mastersData, floorsData] = await Promise.all([
        cultivationRepository.getRooms('ACTIVE'),
        iotRepository.getMasters(),
        iotRepository.getFloors(),
      ]);

      setRooms(roomsData);
      setMasters(mastersData);
      setFloors(floorsData);

      if (roomsData.length > 0 && selectedRoomId === null) {
        setSelectedRoomId(roomsData[0].room_id);
      }

      // Load SSR states for all masters
      const ssrMap: Record<string, IotSsr> = {};
      await Promise.all(
        mastersData.map(async (m) => {
          try {
            const ssr = await iotRepository.getMasterSsr(m.masterId);
            ssrMap[m.masterId] = ssr;
          } catch {
            // Ignore single master failure
          }
        })
      );
      setSsrData(ssrMap);
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp dữ liệu',
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ IoT.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        clearAllPollers();
      };
    }, [loadData])
  );

  // Find mapping for a specific floor number in the selected room
  const getFloorForNumber = (floorNum: number): FloorMapping | undefined => {
    if (!selectedRoomId) return undefined;
    return floors.find((f) => f.room_id === selectedRoomId && f.floor_number === floorNum);
  };

  // Resolve masterId string from floor's numeric master_id
  const getMasterIdString = (numericMasterId: number): string | undefined => {
    const found = masters.find((m) => m.id === numericMasterId);
    return found?.masterId;
  };

  // Get SSR channel object
  const getChannelInfo = (masterIdString?: string, channelNum?: number): IotSsrChannel | undefined => {
    if (!masterIdString || !channelNum) return undefined;
    const masterSsr = ssrData[masterIdString];
    return masterSsr?.channels?.find((c) => c.channel === channelNum);
  };

  // Execute manual SSR Command
  const handleSendCommand = async (
    targetName: string,
    masterIdString: string,
    channelNum: number,
    action: 'ON' | 'OFF'
  ) => {
    const key = `${masterIdString}_${channelNum}`;
    if (channelLoading[key]) return;

    const actionText = action === 'ON' ? 'BẬT' : 'TẮT';
    setChannelLoading((prev) => ({ ...prev, [key]: true }));
    setChannelStatusMsg((prev) => ({ ...prev, [key]: `Đang gửi lệnh ${actionText}...` }));

    try {
      const command = await iotRepository.sendSsrCommand(masterIdString, channelNum, action);
      const brokerStatus = command.status === 'PUBLISHED' ? 'Đã xuất bản tới broker' : 'Đang xử lý';
      setChannelStatusMsg((prev) => ({
        ...prev,
        [key]: `Lệnh ${brokerStatus}. Đang kiểm tra...`,
      }));

      // Poll command status until final state
      let pollCount = 0;
      const intervalId = setInterval(async () => {
        pollCount += 1;
        try {
          const cmdStatus = await iotRepository.getCommandStatus(command.commandId);
          if (
            cmdStatus.status === 'PUBLISHED' ||
            cmdStatus.status === 'FAILED' ||
            cmdStatus.status === 'TIMED_OUT' ||
            pollCount >= 6
          ) {
            clearInterval(intervalId);
            delete activePollers.current[key];

            const statusText =
              cmdStatus.status === 'PUBLISHED'
                ? 'Đã gửi broker thành công (QoS 1)'
                : cmdStatus.status === 'FAILED'
                ? `Thất bại: ${cmdStatus.errorMessage || 'Lỗi MQTT'}`
                : 'Hết thời gian chờ phản hồi (5s)';

            setChannelStatusMsg((prev) => ({ ...prev, [key]: statusText }));
            setChannelLoading((prev) => ({ ...prev, [key]: false }));

            // Refresh SSR data
            const updatedSsr = await iotRepository.getMasterSsr(masterIdString);
            setSsrData((prev) => ({ ...prev, [masterIdString]: updatedSsr }));
          }
        } catch {
          if (pollCount >= 6) {
            clearInterval(intervalId);
            delete activePollers.current[key];
            setChannelLoading((prev) => ({ ...prev, [key]: false }));
          }
        }
      }, 1500);

      activePollers.current[key] = intervalId;
    } catch (err: unknown) {
      setChannelLoading((prev) => ({ ...prev, [key]: false }));
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Lỗi gửi lệnh điều khiển.';
      setChannelStatusMsg((prev) => ({ ...prev, [key]: `Lỗi: ${msg}` }));
      Alert.alert(`Thất bại: ${targetName}`, msg);
    }
  };

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);

  // Mappings for Floor 1 and Floor 2
  const floor1 = getFloorForNumber(1);
  const masterId1 = floor1 ? getMasterIdString(floor1.master_id) : undefined;
  const channelInfo1 = getChannelInfo(masterId1, floor1?.misting_ssr_channel);

  const floor2 = getFloorForNumber(2);
  const masterId2 = floor2 ? getMasterIdString(floor2.master_id) : undefined;
  const channelInfo2 = getChannelInfo(masterId2, floor2?.misting_ssr_channel);

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Điều khiển thiết bị" subtitle="Van phun sương & Đèn GPIO6" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải sơ đồ điều khiển thiết bị...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader title="Điều khiển thiết bị" subtitle="Van phun sương & Đèn GPIO6" />

      <View style={styles.content}>
        {/* Banner linking to Manual SSR 8-channel Control */}
        <Pressable onPress={() => router.push('/control/manual' as any)}>
          <AppCard elevation="xs" style={styles.ssrBannerCard}>
            <View style={styles.ssrBannerRow}>
              <View style={styles.ssrBannerIcon}>
                <Ionicons name="hardware-chip" size={24} color="#3B82F6" />
              </View>
              <View style={styles.ssrBannerContent}>
                <AppText variant="label" weight="bold">
                  Bảng điều khiển SSR 8 kênh thủ công
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Gửi lệnh ON/OFF trực tiếp cho master01 hoặc Master tùy chọn
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
            </View>
          </AppCard>
        </Pressable>

        {/* Room Selector Pills */}
        <View style={styles.roomSelectorSection}>
          <AppText variant="label" color={theme.colors.text.muted}>
            CHỌN PHÒNG NUÔI TRỒNG
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomPills}>
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
                    variant="captionMedium"
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

        {/* ================= CARD A: VAN TẦNG 1 ================= */}
        <AppCard elevation="sm" style={styles.controlCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.deviceIconBox, { backgroundColor: theme.colors.primary[50] }]}>
                <Ionicons name="water-outline" size={24} color={theme.colors.primary[600]} />
              </View>
              <View>
                <AppText variant="title" weight="bold">
                  Van tầng 1
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  {selectedRoom?.room_name || 'Chưa chọn phòng'} • {masterId1 ? `Master: ${masterId1}` : 'Chưa gán Master'}
                </AppText>
              </View>
            </View>

            {/* State badge */}
            <View style={styles.stateBadge}>
              <AppText
                variant="captionMedium"
                weight="bold"
                color={
                  channelInfo1?.reportedState === 'ON'
                    ? theme.colors.success.dark
                    : channelInfo1?.reportedState === 'OFF'
                    ? theme.colors.neutral[600]
                    : theme.colors.warning.dark
                }
              >
                {channelInfo1?.reportedState === 'ON'
                  ? 'Đang bật'
                  : channelInfo1?.reportedState === 'OFF'
                  ? 'Đang tắt'
                  : 'Chưa có dữ liệu'}
              </AppText>
            </View>
          </View>

          <AppDivider spacing="xs" />

          {/* Details & Mapping info */}
          <View style={styles.mappingInfoBox}>
            <AppText variant="caption" color={theme.colors.text.muted}>
              Kênh SSR điều khiển:
            </AppText>
            <AppText variant="captionMedium" weight="medium">
              {floor1?.misting_ssr_channel ? `Kênh SSR ${floor1.misting_ssr_channel}` : 'Chưa cấu hình kênh điều khiển'}
            </AppText>
          </View>

          {/* Command Status Message */}
          {channelStatusMsg[`${masterId1}_${floor1?.misting_ssr_channel}`] ? (
            <View style={styles.statusMsgRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.primary[700]} style={styles.statusMsgText}>
                {channelStatusMsg[`${masterId1}_${floor1?.misting_ssr_channel}`]}
              </AppText>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <AppButton
              title="Bật van"
              variant="primary"
              size="md"
              style={styles.actionBtn}
              loading={channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`]}
              disabled={
                !floor1 ||
                !masterId1 ||
                channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`]
              }
              onPress={() =>
                masterId1 &&
                floor1 &&
                handleSendCommand('Van tầng 1', masterId1, floor1.misting_ssr_channel, 'ON')
              }
            />
            <AppButton
              title="Tắt van"
              variant="outline"
              size="md"
              style={styles.actionBtn}
              loading={channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`]}
              disabled={
                !floor1 ||
                !masterId1 ||
                channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`]
              }
              onPress={() =>
                masterId1 &&
                floor1 &&
                handleSendCommand('Van tầng 1', masterId1, floor1.misting_ssr_channel, 'OFF')
              }
            />
          </View>
        </AppCard>

        {/* ================= CARD B: VAN TẦNG 2 ================= */}
        <AppCard elevation="sm" style={styles.controlCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.deviceIconBox, { backgroundColor: theme.colors.primary[50] }]}>
                <Ionicons name="water-outline" size={24} color={theme.colors.primary[600]} />
              </View>
              <View>
                <AppText variant="title" weight="bold">
                  Van tầng 2
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  {selectedRoom?.room_name || 'Chưa chọn phòng'} • {masterId2 ? `Master: ${masterId2}` : 'Chưa gán Master'}
                </AppText>
              </View>
            </View>

            {/* State badge */}
            <View style={styles.stateBadge}>
              <AppText
                variant="captionMedium"
                weight="bold"
                color={
                  channelInfo2?.reportedState === 'ON'
                    ? theme.colors.success.dark
                    : channelInfo2?.reportedState === 'OFF'
                    ? theme.colors.neutral[600]
                    : theme.colors.warning.dark
                }
              >
                {channelInfo2?.reportedState === 'ON'
                  ? 'Đang bật'
                  : channelInfo2?.reportedState === 'OFF'
                  ? 'Đang tắt'
                  : 'Chưa có dữ liệu'}
              </AppText>
            </View>
          </View>

          <AppDivider spacing="xs" />

          {/* Details & Mapping info */}
          <View style={styles.mappingInfoBox}>
            <AppText variant="caption" color={theme.colors.text.muted}>
              Kênh SSR điều khiển:
            </AppText>
            <AppText variant="captionMedium" weight="medium">
              {floor2?.misting_ssr_channel ? `Kênh SSR ${floor2.misting_ssr_channel}` : 'Chưa cấu hình kênh điều khiển'}
            </AppText>
          </View>

          {/* Command Status Message */}
          {channelStatusMsg[`${masterId2}_${floor2?.misting_ssr_channel}`] ? (
            <View style={styles.statusMsgRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.primary[700]} style={styles.statusMsgText}>
                {channelStatusMsg[`${masterId2}_${floor2?.misting_ssr_channel}`]}
              </AppText>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <AppButton
              title="Bật van"
              variant="primary"
              size="md"
              style={styles.actionBtn}
              loading={channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`]}
              disabled={
                !floor2 ||
                !masterId2 ||
                channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`]
              }
              onPress={() =>
                masterId2 &&
                floor2 &&
                handleSendCommand('Van tầng 2', masterId2, floor2.misting_ssr_channel, 'ON')
              }
            />
            <AppButton
              title="Tắt van"
              variant="outline"
              size="md"
              style={styles.actionBtn}
              loading={channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`]}
              disabled={
                !floor2 ||
                !masterId2 ||
                channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`]
              }
              onPress={() =>
                masterId2 &&
                floor2 &&
                handleSendCommand('Van tầng 2', masterId2, floor2.misting_ssr_channel, 'OFF')
              }
            />
          </View>
        </AppCard>

        {/* ================= CARD C: ĐÈN — GPIO6 ================= */}
        <AppCard elevation="sm" style={styles.controlCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.deviceIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                <Ionicons name="bulb-outline" size={24} color={theme.colors.warning.main} />
              </View>
              <View>
                <AppText variant="title" weight="bold">
                  Đèn — GPIO6
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Phần cứng chân GPIO6 • Chưa liên kết SSR
                </AppText>
              </View>
            </View>

            <View style={[styles.stateBadge, { backgroundColor: theme.colors.neutral[100] }]}>
              <AppText variant="captionMedium" color={theme.colors.neutral[600]} weight="bold">
                Chưa cấu hình GPIO6
              </AppText>
            </View>
          </View>

          <AppDivider spacing="xs" />

          {/* Missing Hardware Mapping Specification Notice */}
          <View style={styles.warningNoticeBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning.dark} />
            <AppText variant="caption" color={theme.colors.warning.dark} style={styles.warningNoticeText}>
              GPIO6 là chân phần cứng trên board vi điều khiển, chưa được định tuyến vào kênh SSR 1-8 hoặc API backend hiện tại. Các nút điều khiển tạm thời bị khóa để bảo đảm an toàn phần cứng.
            </AppText>
          </View>

          {/* Action Buttons (Strictly Disabled) */}
          <View style={styles.actionRow}>
            <AppButton
              title="Bật đèn"
              variant="primary"
              size="md"
              style={styles.actionBtn}
              disabled
            />
            <AppButton
              title="Tắt đèn"
              variant="outline"
              size="md"
              style={styles.actionBtn}
              disabled
            />
          </View>
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
  roomSelectorSection: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  roomPills: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  roomPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateBadge: {
    backgroundColor: theme.colors.neutral[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  mappingInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusMsgText: {
    flex: 1,
  },
  warningNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  warningNoticeText: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  ssrBannerCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  ssrBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ssrBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ssrBannerContent: {
    flex: 1,
    gap: 2,
  },
});
