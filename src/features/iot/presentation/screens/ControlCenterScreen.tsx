import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAuth } from '../../../auth';
import { cultivationRepository } from '../../../cultivation/data/repositories/CultivationRepository';
import type { CultivationRoom } from '../../../cultivation/domain/entities/Cultivation';
import {
  FloorMapping,
  IotMaster,
  IotSsr,
  IotSsrChannel,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import { formatMistingCode } from '../../utils/mistingI18n';

export const ControlCenterScreen: React.FC = () => {
  const router = useRouter();
  const { canControlIot } = useAuth();

  const [rooms, setRooms] = useState<CultivationRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const currentRoomIdRef = useRef<number | null>(null);

  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [ssrData, setSsrData] = useState<Record<string, IotSsr>>({});

  const [loading, setLoading] = useState(true);

  // Track command states per valve/channel: key = `${masterId}_${channel}`
  const [channelLoading, setChannelLoading] = useState<Record<string, boolean>>({});
  const [channelStatusMsg, setChannelStatusMsg] = useState<Record<string, string>>({});

  // Active polling tracking
  const activePollers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Light Configuration Modal State
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [selectedConfigMaster, setSelectedConfigMaster] = useState<IotMaster | null>(null);
  const [selectedConfigChannel, setSelectedConfigChannel] = useState<number | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

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

      if (roomsData.length > 0 && currentRoomIdRef.current === null) {
        setSelectedRoomId(roomsData[0].room_id);
        currentRoomIdRef.current = roomsData[0].room_id;
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        clearAllPollers();
      };
    }, [loadData])
  );

  const handleSelectRoom = (roomId: number) => {
    if (selectedRoomId === roomId) return;
    setSelectedRoomId(roomId);
    currentRoomIdRef.current = roomId;
  };

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

  // Execute manual SSR Command (for Valve or Light)
  const handleSendCommand = async (
    targetName: string,
    masterIdString: string,
    channelNum: number,
    action: 'ON' | 'OFF'
  ) => {
    const key = `${masterIdString}_${channelNum}`;
    if (channelLoading[key]) return; // Block duplicate taps while executing

    const actionText = action === 'ON' ? 'BẬT' : 'TẮT';
    setChannelLoading((prev) => ({ ...prev, [key]: true }));
    setChannelStatusMsg((prev) => ({ ...prev, [key]: `Đang gửi lệnh ${actionText}...` }));

    try {
      const command = await iotRepository.sendSsrCommand(masterIdString, channelNum, action);
      const brokerStatus = formatMistingCode('iotCommandStatus', command.status);
      setChannelStatusMsg((prev) => ({
        ...prev,
        [key]: `Lệnh: ${brokerStatus}. Đang kiểm tra phản hồi từ thiết bị...`,
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
                ? formatMistingCode('iotCommandStatus', 'PUBLISHED')
                : cmdStatus.status === 'FAILED'
                ? `Gửi thất bại: ${cmdStatus.errorMessage || 'Lỗi MQTT'}`
                : cmdStatus.status === 'TIMED_OUT'
                ? formatMistingCode('iotCommandStatus', 'TIMED_OUT')
                : formatMistingCode('iotCommandStatus', cmdStatus.status);

            setChannelStatusMsg((prev) => ({ ...prev, [key]: statusText }));
            setChannelLoading((prev) => ({ ...prev, [key]: false }));

            // Refresh SSR data to verify reportedState
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

  // Light configuration handlers
  const handleOpenConfigModal = (master?: IotMaster) => {
    const target = master || roomMasters[0] || null;
    setSelectedConfigMaster(target);
    setSelectedConfigChannel(target?.light_ssr_channel ?? null);
    setIsConfigModalVisible(true);
  };

  const handleSelectModalMaster = (m: IotMaster) => {
    setSelectedConfigMaster(m);
    setSelectedConfigChannel(m.light_ssr_channel ?? null);
  };

  const handleSaveLightConfig = async (masterId: string, channel: number | null) => {
    try {
      setConfigSaving(true);
      await iotRepository.updateMasterLight(masterId, channel);

      const actionDesc =
        channel != null
          ? `Đã cấu hình Đèn phòng cho Master ${masterId} ở Kênh SSR ${channel}.`
          : `Đã bỏ gán kênh đèn của Master ${masterId}.`;
      Alert.alert('Thành công', actionDesc);

      // Reload masters
      const freshMasters = await iotRepository.getMasters();
      setMasters(freshMasters);

      // If channel assigned, refresh SSR state for this master
      if (channel != null) {
        const ssr = await iotRepository.getMasterSsr(masterId);
        setSsrData((prev) => ({ ...prev, [masterId]: ssr }));
      }

      setIsConfigModalVisible(false);
    } catch (err: unknown) {
      let msg = 'Không thể cập nhật cấu hình đèn.';
      if (err && typeof err === 'object') {
        const errorObj = err as any;
        const status = errorObj.statusCode || errorObj.response?.status || errorObj.status;
        if (status === 403) {
          msg = 'Bạn không có quyền cấu hình đèn (yêu cầu quyền iot.automation.manage).';
        } else if (status === 409) {
          msg = 'Xung đột kênh: Kênh SSR đã được dùng cho van hoặc Master chưa thuộc phòng.';
        } else if (status === 404) {
          msg = 'Không tìm thấy thiết bị Master trên hệ thống.';
        } else if (status === 400) {
          msg = 'Dữ liệu không hợp lệ. Kênh SSR phải từ 1 đến 8 hoặc null.';
        } else if (errorObj.message) {
          msg = errorObj.message;
        }
      }
      Alert.alert('Cấu hình thất bại', msg);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleUnassignLight = () => {
    if (!selectedConfigMaster) return;
    Alert.alert(
      'Xác nhận bỏ gán',
      `Bạn có chắc chắn muốn bỏ gán kênh đèn của Master ${selectedConfigMaster.masterId}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý bỏ gán',
          style: 'destructive',
          onPress: () => handleSaveLightConfig(selectedConfigMaster.masterId, null),
        },
      ]
    );
  };

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId);

  // Mappings for Floor 1 and Floor 2
  const floor1 = getFloorForNumber(1);
  const masterId1 = floor1 ? getMasterIdString(floor1.master_id) : undefined;
  const channelInfo1 = getChannelInfo(masterId1, floor1?.misting_ssr_channel);

  const floor2 = getFloorForNumber(2);
  const masterId2 = floor2 ? getMasterIdString(floor2.master_id) : undefined;
  const channelInfo2 = getChannelInfo(masterId2, floor2?.misting_ssr_channel);

  // Masters belonging strictly to this cultivation room
  const roomMasters = masters.filter((m) => m.cultivationRoomId === selectedRoomId);

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader
          title="Điều khiển thiết bị"
          subtitle="Van phun sương & Đèn phòng • Admin & Farm Operator"
          showBack
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        />
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
      <AppHeader
        title="Điều khiển thiết bị"
        subtitle="Van phun sương & Đèn phòng • Admin & Farm Operator"
        showBack
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />

      <View style={styles.content}>
        {/* Role Access Indicator */}
        <View style={styles.roleAccessBanner}>
          <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary[700]} />
          <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
            Quyền vận hành thiết bị: Quản trị viên & Kỹ thuật viên (Admin & Farm Operator)
          </AppText>
        </View>

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
                  onPress={() => handleSelectRoom(room.room_id)}
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

        {/* ================= SECTION: VAN PHUN SƯƠNG ================= */}
        <AppText variant="label" color={theme.colors.text.muted}>
          VAN PHUN SƯƠNG THEO TẦNG
        </AppText>

        {/* ================= CARD A: VAN TẦNG 1 ================= */}
        <AppCard elevation="sm" style={styles.controlCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.deviceIconBox, { backgroundColor: theme.colors.primary[50] }]}>
                <Ionicons name="water-outline" size={24} color={theme.colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
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
                {formatMistingCode('ssrState', channelInfo1?.reportedState)}
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
                channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`] ||
                !canControlIot
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
                channelLoading[`${masterId1}_${floor1?.misting_ssr_channel}`] ||
                !canControlIot
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
              <View style={{ flex: 1 }}>
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
                {formatMistingCode('ssrState', channelInfo2?.reportedState)}
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
                channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`] ||
                !canControlIot
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
                channelLoading[`${masterId2}_${floor2?.misting_ssr_channel}`] ||
                !canControlIot
              }
              onPress={() =>
                masterId2 &&
                floor2 &&
                handleSendCommand('Van tầng 2', masterId2, floor2.misting_ssr_channel, 'OFF')
              }
            />
          </View>
        </AppCard>

        {/* ================= SECTION: ĐÈN PHÒNG ================= */}
        <View style={styles.sectionHeaderRow}>
          <AppText variant="label" color={theme.colors.text.muted}>
            ĐÈN CHIẾU SÁNG PHÒNG
          </AppText>
          {canControlIot && roomMasters.length > 0 && (
            <AppButton
              title="Cấu hình đèn"
              variant="outline"
              size="sm"
              leftIcon={<Ionicons name="settings-outline" size={14} color={theme.colors.primary[600]} />}
              onPress={() => handleOpenConfigModal()}
            />
          )}
        </View>

        {roomMasters.length === 0 ? (
          <AppCard elevation="sm" style={styles.controlCard}>
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                <View style={[styles.deviceIconBox, { backgroundColor: theme.colors.neutral[100] }]}>
                  <Ionicons name="bulb-outline" size={24} color={theme.colors.text.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" weight="bold">
                    Đèn phòng
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    {selectedRoom?.room_name || 'Chưa chọn phòng'} • Chưa có Master
                  </AppText>
                </View>
              </View>

              <View style={[styles.stateBadge, { backgroundColor: theme.colors.neutral[100] }]}>
                <AppText variant="captionMedium" color={theme.colors.neutral[600]} weight="bold">
                  Chưa có Master
                </AppText>
              </View>
            </View>

            <AppDivider spacing="xs" />

            <View style={styles.warningNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning.dark} />
              <AppText variant="caption" color={theme.colors.warning.dark} style={styles.warningNoticeText}>
                Phòng nuôi trồng này hiện chưa có thiết bị Master nào. Vui lòng gán Master cho phòng trước khi cấu hình đèn.
              </AppText>
            </View>
          </AppCard>
        ) : (
          roomMasters.map((master) => {
            const lightChannel = master.light_ssr_channel;
            const isConfigured = lightChannel != null;
            const channelKey = isConfigured ? `${master.masterId}_${lightChannel}` : '';
            const channelInfo = getChannelInfo(master.masterId, lightChannel ?? undefined);
            const isChLoading = channelKey ? Boolean(channelLoading[channelKey]) : false;
            const isReportedOn = channelInfo?.reportedState === 'ON';
            const isReportedOff = channelInfo?.reportedState === 'OFF';

            return (
              <AppCard key={master.id} elevation="sm" style={styles.controlCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleWithIcon}>
                    <View
                      style={[
                        styles.deviceIconBox,
                        {
                          backgroundColor: isReportedOn
                            ? 'rgba(234, 179, 8, 0.15)'
                            : theme.colors.neutral[100],
                        },
                      ]}
                    >
                      <Ionicons
                        name={isReportedOn ? 'bulb' : 'bulb-outline'}
                        size={24}
                        color={isReportedOn ? '#EAB308' : theme.colors.text.secondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="title" weight="bold">
                        {roomMasters.length > 1 ? `Đèn phòng (${master.masterId})` : 'Đèn phòng'}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        {isConfigured
                          ? `${master.masterId} · Kênh ${lightChannel}`
                          : `${master.masterId} · Chưa cấu hình`}
                      </AppText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.stateBadge,
                      {
                        backgroundColor: !isConfigured
                          ? theme.colors.neutral[100]
                          : isChLoading
                          ? 'rgba(234, 179, 8, 0.12)'
                          : isReportedOn
                          ? 'rgba(34, 197, 94, 0.12)'
                          : isReportedOff
                          ? theme.colors.neutral[100]
                          : 'rgba(234, 179, 8, 0.12)',
                      },
                    ]}
                  >
                    <AppText
                      variant="captionMedium"
                      weight="bold"
                      color={
                        !isConfigured
                          ? theme.colors.neutral[600]
                          : isChLoading
                          ? theme.colors.warning.dark
                          : isReportedOn
                          ? theme.colors.success.dark
                          : isReportedOff
                          ? theme.colors.neutral[600]
                          : theme.colors.warning.dark
                      }
                    >
                      {!isConfigured
                        ? 'Chưa cấu hình'
                        : isChLoading
                        ? 'Chờ phản hồi'
                        : formatMistingCode('ssrState', channelInfo?.reportedState)}
                    </AppText>
                  </View>
                </View>

                <AppDivider spacing="xs" />

                <View style={styles.mappingInfoBox}>
                  <View>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Kênh SSR điều khiển:
                    </AppText>
                    <AppText variant="captionMedium" weight="medium">
                      {isConfigured ? `Kênh SSR ${lightChannel}` : 'Chưa cấu hình kênh điều khiển'}
                    </AppText>
                  </View>
                  {canControlIot && (
                    <AppButton
                      title={isConfigured ? 'Đổi kênh' : 'Cấu hình'}
                      variant="ghost"
                      size="sm"
                      onPress={() => handleOpenConfigModal(master)}
                    />
                  )}
                </View>

                {channelKey && channelStatusMsg[channelKey] ? (
                  <View style={styles.statusMsgRow}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />
                    <AppText variant="caption" color={theme.colors.primary[700]} style={styles.statusMsgText}>
                      {channelStatusMsg[channelKey]}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <AppButton
                    title="Bật đèn"
                    variant="primary"
                    size="md"
                    style={styles.actionBtn}
                    loading={isChLoading}
                    disabled={!isConfigured || isChLoading || !canControlIot}
                    onPress={() =>
                      isConfigured &&
                      handleSendCommand('Đèn phòng', master.masterId, lightChannel, 'ON')
                    }
                  />
                  <AppButton
                    title="Tắt đèn"
                    variant="outline"
                    size="md"
                    style={styles.actionBtn}
                    loading={isChLoading}
                    disabled={!isConfigured || isChLoading || !canControlIot}
                    onPress={() =>
                      isConfigured &&
                      handleSendCommand('Đèn phòng', master.masterId, lightChannel, 'OFF')
                    }
                  />
                </View>
              </AppCard>
            );
          })
        )}
      </View>

      {/* ================= MODAL: CẤU HÌNH ĐÈN PHÒNG ================= */}
      <Modal
        visible={isConfigModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!configSaving) setIsConfigModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="h3" weight="bold">
                  Cấu hình Đèn phòng
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Phòng {selectedRoom?.room_name || ''} ({selectedRoom?.room_code || ''})
                </AppText>
              </View>
              <Pressable
                disabled={configSaving}
                onPress={() => setIsConfigModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            {/* Master selection if room has multiple masters */}
            {roomMasters.length > 1 ? (
              <View style={styles.modalMasterSelectSection}>
                <AppText variant="label" weight="medium" color={theme.colors.text.primary}>
                  Chọn thiết bị Master:
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalMasterPills}>
                  {roomMasters.map((m) => {
                    const isMasterSelected = selectedConfigMaster?.id === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        disabled={configSaving}
                        onPress={() => handleSelectModalMaster(m)}
                        style={[
                          styles.modalMasterPill,
                          isMasterSelected && styles.modalMasterPillActive,
                        ]}
                      >
                        <Ionicons
                          name="hardware-chip-outline"
                          size={16}
                          color={isMasterSelected ? '#FFFFFF' : theme.colors.text.secondary}
                        />
                        <AppText
                          variant="captionMedium"
                          weight={isMasterSelected ? 'bold' : 'normal'}
                          color={isMasterSelected ? '#FFFFFF' : theme.colors.text.primary}
                        >
                          {m.masterId} (ID #{m.id})
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : selectedConfigMaster ? (
              <View style={styles.singleMasterInfo}>
                <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.primary[600]} />
                <AppText variant="captionMedium" color={theme.colors.text.secondary}>
                  Thiết bị điều khiển:{' '}
                  <AppText variant="captionMedium" weight="bold">
                    {selectedConfigMaster.masterId} (ID #{selectedConfigMaster.id})
                  </AppText>
                </AppText>
              </View>
            ) : null}

            {/* Channel Selection List (Channels 1 to 8) */}
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="label" weight="medium" color={theme.colors.text.primary}>
                Chọn kênh SSR điều khiển đèn (1 - 8):
              </AppText>
              <ScrollView style={styles.channelList} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((ch) => {
                  const valveOnCh = floors.find(
                    (f) => f.master_id === selectedConfigMaster?.id && f.misting_ssr_channel === ch
                  );
                  const isCurrentAssigned = selectedConfigMaster?.light_ssr_channel === ch;
                  const isSelected = selectedConfigChannel === ch;
                  const isBlocked = Boolean(valveOnCh);

                  return (
                    <Pressable
                      key={ch}
                      disabled={isBlocked || configSaving}
                      onPress={() => setSelectedConfigChannel(ch)}
                      style={[
                        styles.channelItem,
                        isSelected && styles.channelItemSelected,
                        isBlocked && styles.channelItemDisabled,
                      ]}
                    >
                      <View style={styles.channelItemLeft}>
                        <View
                          style={[
                            styles.channelRadio,
                            isSelected && styles.channelRadioSelected,
                            isBlocked && { borderColor: theme.colors.neutral[300] },
                          ]}
                        >
                          {isSelected ? <View style={styles.channelRadioInner} /> : null}
                        </View>
                        <View>
                          <AppText
                            variant="bodySmall"
                            weight={isSelected ? 'bold' : 'medium'}
                            color={isBlocked ? theme.colors.text.muted : theme.colors.text.primary}
                          >
                            Kênh SSR #{ch}
                          </AppText>
                        </View>
                      </View>

                      {/* Status badges */}
                      {isBlocked ? (
                        <View style={styles.channelBlockedBadge}>
                          <AppText variant="caption" color={theme.colors.error.main} weight="bold">
                            Đã dùng: Van {valveOnCh?.floor_name || `Tầng ${valveOnCh?.floor_number}`}
                          </AppText>
                        </View>
                      ) : isCurrentAssigned ? (
                        <View style={styles.channelCurrentBadge}>
                          <AppText variant="caption" color={theme.colors.primary[700]} weight="bold">
                            Đang gán hiện tại
                          </AppText>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Action Buttons in Modal */}
            <View style={styles.modalActionButtons}>
              {selectedConfigMaster?.light_ssr_channel != null && (
                <AppButton
                  title="Bỏ gán đèn"
                  variant="outline"
                  size="md"
                  textStyle={{ color: theme.colors.error.main }}
                  style={{ borderColor: theme.colors.error.light }}
                  loading={configSaving}
                  disabled={configSaving}
                  onPress={handleUnassignLight}
                />
              )}
              <AppButton
                title="Lưu cấu hình"
                variant="primary"
                size="md"
                style={styles.modalSaveBtn}
                loading={configSaving}
                disabled={
                  configSaving ||
                  selectedConfigChannel === null ||
                  selectedConfigChannel === selectedConfigMaster?.light_ssr_channel
                }
                onPress={() =>
                  selectedConfigMaster &&
                  handleSaveLightConfig(selectedConfigMaster.masterId, selectedConfigChannel)
                }
              />
            </View>
          </View>
        </View>
      </Modal>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    padding: theme.spacing.xs,
  },
  modalMasterSelectSection: {
    gap: theme.spacing.xs,
  },
  modalMasterPills: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  modalMasterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: theme.colors.neutral[50],
  },
  modalMasterPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  singleMasterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  channelList: {
    gap: theme.spacing.xs,
    maxHeight: 260,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  channelItemSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  channelItemDisabled: {
    opacity: 0.55,
    backgroundColor: theme.colors.neutral[100],
    borderColor: theme.colors.border.light,
  },
  channelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  channelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelRadioSelected: {
    borderColor: theme.colors.primary[600],
  },
  channelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary[600],
  },
  channelBlockedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  channelCurrentBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  modalSaveBtn: {
    flex: 1,
  },
  roleAccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
});
