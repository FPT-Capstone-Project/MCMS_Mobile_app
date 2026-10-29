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
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { iotRepository } from '../../data/repositories/IotRepository';
import { IotMaster, IotSsr, IotSsrChannel } from '../../domain/entities/Iot';
import { formatMistingCode } from '../../utils/mistingI18n';

const DEFAULT_MASTER_ID = 'master01';
const TOTAL_CHANNELS = 8;

export const ManualSsrControlScreen: React.FC = () => {
  const router = useRouter();

  // Master selection & custom input
  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string>(DEFAULT_MASTER_ID);
  const [customMasterInput, setCustomMasterInput] = useState<string>(DEFAULT_MASTER_ID);

  // SSR Data & State
  const [ssrData, setSsrData] = useState<IotSsr | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [channelLoading, setChannelLoading] = useState<Record<number, boolean>>({});
  const [channelStatusMsg, setChannelStatusMsg] = useState<Record<number, string>>({});
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  const activePollers = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const clearAllPollers = () => {
    Object.values(activePollers.current).forEach(clearInterval);
    activePollers.current = {};
  };

  // Load available masters from API
  const loadMasters = useCallback(async () => {
    try {
      const data = await iotRepository.getMasters();
      setMasters(data);
      if (data.length > 0 && selectedMasterId === DEFAULT_MASTER_ID) {
        // If master01 is in the list, keep it; otherwise pick first
        const hasMaster01 = data.some((m) => m.masterId === DEFAULT_MASTER_ID);
        if (!hasMaster01) {
          setSelectedMasterId(data[0].masterId);
          setCustomMasterInput(data[0].masterId);
        }
      }
    } catch {
      // Keep default
    }
  }, [selectedMasterId]);

  // Load SSR channels for the active master
  const loadSsrChannels = useCallback(async (masterId: string, isManualRefresh = false) => {
    if (!masterId.trim()) return;

    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      const data = await iotRepository.getMasterSsr(masterId.trim());
      setSsrData(data);
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể nạp dữ liệu SSR của Master.';
      Alert.alert('Lỗi nạp dữ liệu', `Master: ${masterId}\n${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMasters();
      if (selectedMasterId) {
        loadSsrChannels(selectedMasterId);
      }
      return () => {
        clearAllPollers();
      };
    }, [loadMasters, loadSsrChannels, selectedMasterId])
  );

  // Handle switching to another master
  const handleSelectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    setCustomMasterInput(masterId);
    setChannelStatusMsg({});
  };

  const handleApplyCustomMaster = () => {
    const trimmed = customMasterInput.trim();
    if (!trimmed) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã Master hợp lệ.');
      return;
    }
    setSelectedMasterId(trimmed);
    setChannelStatusMsg({});
  };

  // Send single channel SSR command (ON/OFF)
  const handleSendCommand = async (channel: number, action: 'ON' | 'OFF') => {
    if (channelLoading[channel]) return;

    setChannelLoading((prev) => ({ ...prev, [channel]: true }));
    const actionText = action === 'ON' ? 'BẬT' : 'TẮT';
    setChannelStatusMsg((prev) => ({
      ...prev,
      [channel]: `Đang gửi lệnh ${actionText}...`,
    }));

    try {
      const command = await iotRepository.sendSsrCommand(selectedMasterId, channel, action);

      const initStatus = formatMistingCode('iotCommandStatus', command.status);

      setChannelStatusMsg((prev) => ({
        ...prev,
        [channel]: `Lệnh ${actionText}: ${initStatus}`,
      }));

      // Poll up to 4 times (within the 5-second deadline) without retrying failures
      let pollCount = 0;
      const intervalId = setInterval(async () => {
        pollCount += 1;
        try {
          const cmdStatus = await iotRepository.getCommandStatus(command.commandId);
          if (
            cmdStatus.status === 'PUBLISHED' ||
            cmdStatus.status === 'FAILED' ||
            cmdStatus.status === 'TIMED_OUT' ||
            pollCount >= 4
          ) {
            clearInterval(intervalId);
            delete activePollers.current[channel];

            const resultText =
              cmdStatus.status === 'PUBLISHED'
                ? formatMistingCode('iotCommandStatus', 'PUBLISHED')
                : cmdStatus.status === 'FAILED'
                ? `Gửi thất bại: ${cmdStatus.errorMessage || 'Lỗi MQTT'}`
                : cmdStatus.status === 'TIMED_OUT'
                ? formatMistingCode('iotCommandStatus', 'TIMED_OUT')
                : formatMistingCode('iotCommandStatus', cmdStatus.status);

            setChannelStatusMsg((prev) => ({ ...prev, [channel]: resultText }));
            setChannelLoading((prev) => ({ ...prev, [channel]: false }));

            // Refresh SSR channel states from backend
            try {
              const updatedSsr = await iotRepository.getMasterSsr(selectedMasterId);
              setSsrData(updatedSsr);
            } catch {
              // Ignore
            }
          }
        } catch {
          if (pollCount >= 4) {
            clearInterval(intervalId);
            delete activePollers.current[channel];
            setChannelLoading((prev) => ({ ...prev, [channel]: false }));
          }
        }
      }, 1200);

      activePollers.current[channel] = intervalId;
    } catch (err: unknown) {
      setChannelLoading((prev) => ({ ...prev, [channel]: false }));
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Lỗi gửi lệnh điều khiển.';
      setChannelStatusMsg((prev) => ({ ...prev, [channel]: `Lỗi: ${msg}` }));
      Alert.alert(`Thất bại Kênh ${channel}`, msg);
    }
  };

  // Batch toggle all 8 channels
  const handleBatchToggle = (action: 'ON' | 'OFF') => {
    const actionText = action === 'ON' ? 'BẬT' : 'TẮT';
    Alert.alert(
      `Xác nhận ${actionText} tất cả`,
      `Bạn có chắc chắn muốn gửi lệnh ${actionText} cho toàn bộ 8 kênh SSR của Master ${selectedMasterId}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: `Đồng ý ${actionText}`,
          style: action === 'OFF' ? 'destructive' : 'default',
          onPress: async () => {
            setBatchLoading(true);
            try {
              for (let ch = 1; ch <= TOTAL_CHANNELS; ch += 1) {
                try {
                  await iotRepository.sendSsrCommand(selectedMasterId, ch, action);
                } catch {
                  // Continue batch
                }
              }
              Alert.alert('Thành công', `Đã phát lệnh ${actionText} cho 8 kênh SSR.`);
              loadSsrChannels(selectedMasterId, true);
            } finally {
              setBatchLoading(false);
            }
          },
        },
      ]
    );
  };

  // Helper to get channel object
  const getChannelObj = (channelNum: number): IotSsrChannel | undefined => {
    return ssrData?.channels?.find((c) => c.channel === channelNum);
  };

  // Resolve current active master info
  const currentMasterObj = masters.find((m) => m.masterId === selectedMasterId);

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Điều khiển SSR thủ công"
        subtitle="Quản lý toàn diện 8 rơ-le Master"
        showBack
        onBack={() => router.back()}
        rightAction={
          <AppButton
            title=""
            variant="ghost"
            size="sm"
            leftIcon={
              refreshing ? (
                <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              ) : (
                <Ionicons name="refresh" size={20} color={theme.colors.primary[600]} />
              )
            }
            onPress={() => loadSsrChannels(selectedMasterId, true)}
          />
        }
      />

      <View style={styles.content}>
        {/* ================= SECTION 1: MASTER SELECTION ================= */}
        <AppCard elevation="xs" style={styles.masterConfigCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.primary[600]} />
            <AppText variant="label" weight="bold">
              THIẾT BỊ MASTER IOT
            </AppText>
          </View>

          {/* Known Masters Pills */}
          {masters.length > 0 && (
            <View style={styles.mastersPillContainer}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Chọn nhanh từ danh sách Master đã đăng ký:
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {masters.map((m) => {
                  const isSel = m.masterId === selectedMasterId;
                  const isOnline = m.reportedStatus === 'online';
                  return (
                    <Pressable
                      key={m.id || m.masterId}
                      onPress={() => handleSelectMaster(m.masterId)}
                      style={[styles.masterPill, isSel && styles.masterPillActive]}
                    >
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: isOnline ? theme.colors.success.main : theme.colors.neutral[400] },
                        ]}
                      />
                      <AppText
                        variant="caption"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? '#FFFFFF' : theme.colors.text.primary}
                      >
                        {m.masterId}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Custom Master Input */}
          <View style={styles.customInputRow}>
            <View style={styles.inputFlex}>
              <AppInput
                placeholder="Nhập mã Master (ví dụ: master01)"
                value={customMasterInput}
                onChangeText={setCustomMasterInput}
                autoCapitalize="none"
              />
            </View>
            <AppButton
              title="Áp dụng"
              variant="primary"
              size="md"
              onPress={handleApplyCustomMaster}
              style={styles.applyBtn}
            />
          </View>

          {/* Active Master Status Badge */}
          <View style={styles.activeMasterInfo}>
            <View style={styles.masterIdTag}>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Đang điều khiển:
              </AppText>
              <AppText variant="label" weight="bold" color={theme.colors.primary[700]}>
                {selectedMasterId}
              </AppText>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    currentMasterObj?.reportedStatus === 'online'
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(156, 163, 175, 0.15)',
                },
              ]}
            >
              <AppText
                variant="caption"
                weight="bold"
                color={
                  currentMasterObj?.reportedStatus === 'online'
                    ? theme.colors.success.dark
                    : theme.colors.neutral[600]
                }
              >
                {formatMistingCode('reportedStatus', currentMasterObj?.reportedStatus)}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* ================= SECTION 2: BATCH CONTROLS ================= */}
        <View style={styles.batchActionsRow}>
          <AppButton
            title="Bật tất cả 8 kênh"
            variant="secondary"
            size="md"
            leftIcon={<Ionicons name="flash-outline" size={16} color={theme.colors.primary[700]} />}
            loading={batchLoading}
            disabled={batchLoading}
            onPress={() => handleBatchToggle('ON')}
            style={styles.batchBtn}
          />
          <AppButton
            title="Tắt tất cả 8 kênh"
            variant="outline"
            size="md"
            leftIcon={<Ionicons name="power-outline" size={16} color={theme.colors.error.main} />}
            loading={batchLoading}
            disabled={batchLoading}
            onPress={() => handleBatchToggle('OFF')}
            style={styles.batchBtn}
          />
        </View>

        {/* ================= SECTION 3: 8 SSR CHANNELS ================= */}
        <View style={styles.channelsSection}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="label" color={theme.colors.text.muted}>
              DANH SÁCH 8 KÊNH RƠ-LE SSR
            </AppText>
            {refreshing && <ActivityIndicator size="small" color={theme.colors.primary[500]} />}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
                Đang đọc dữ liệu trạng thái SSR từ Master {selectedMasterId}...
              </AppText>
            </View>
          ) : (
            Array.from({ length: TOTAL_CHANNELS }, (_, i) => i + 1).map((channelNum) => {
              const chObj = getChannelObj(channelNum);
              const isChLoading = channelLoading[channelNum];
              const statusMsg = channelStatusMsg[channelNum];

              const isReportedOn = chObj?.reportedState === 'ON';
              const isReportedOff = chObj?.reportedState === 'OFF';

              return (
                <AppCard key={channelNum} elevation="xs" style={styles.channelCard}>
                  {/* Channel Top Header */}
                  <View style={styles.channelCardHeader}>
                    <View style={styles.channelTitleGroup}>
                      <View
                        style={[
                          styles.channelIconBox,
                          {
                            backgroundColor: isReportedOn
                              ? 'rgba(34, 197, 94, 0.15)'
                              : theme.colors.background.secondary,
                          },
                        ]}
                      >
                        <Ionicons
                          name="radio-button-on"
                          size={18}
                          color={isReportedOn ? theme.colors.success.main : theme.colors.neutral[400]}
                        />
                      </View>
                      <View>
                        <AppText variant="label" weight="bold">
                          Kênh SSR #{channelNum}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          Rơ-le điều khiển thiết bị {channelNum}
                        </AppText>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isReportedOn
                            ? 'rgba(34, 197, 94, 0.12)'
                            : isReportedOff
                            ? 'rgba(107, 114, 128, 0.12)'
                            : 'rgba(234, 179, 8, 0.12)',
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={
                          isReportedOn
                            ? theme.colors.success.dark
                            : isReportedOff
                            ? theme.colors.neutral[600]
                            : theme.colors.warning.dark
                        }
                      >
                        {formatMistingCode('ssrState', chObj?.reportedState)}
                      </AppText>
                    </View>
                  </View>

                  {/* Channel Details Info */}
                  <View style={styles.channelDetails}>
                    <View style={styles.detailRow}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Trạng thái mong muốn:
                      </AppText>
                      <AppText variant="captionMedium">
                        {formatMistingCode('ssrState', chObj?.desiredState)}
                      </AppText>
                    </View>

                    {chObj?.lastReportedAt ? (
                      <View style={styles.detailRow}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Cập nhật gần nhất:
                        </AppText>
                        <AppText variant="captionMedium">
                          {new Date(chObj.lastReportedAt).toLocaleTimeString('vi-VN')}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  {/* Dynamic Status message from broker */}
                  {statusMsg ? (
                    <View style={styles.channelStatusMsgRow}>
                      <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="caption" color={theme.colors.primary[700]} style={styles.statusMsgText}>
                        {statusMsg}
                      </AppText>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.channelActionRow}>
                    <AppButton
                      title="Bật kênh"
                      variant="primary"
                      size="sm"
                      loading={isChLoading}
                      disabled={isChLoading}
                      leftIcon={<Ionicons name="power" size={14} color="#FFFFFF" />}
                      onPress={() => handleSendCommand(channelNum, 'ON')}
                      style={styles.chBtn}
                    />
                    <AppButton
                      title="Tắt kênh"
                      variant="outline"
                      size="sm"
                      loading={isChLoading}
                      disabled={isChLoading}
                      leftIcon={<Ionicons name="power-outline" size={14} color={theme.colors.error.main} />}
                      onPress={() => handleSendCommand(channelNum, 'OFF')}
                      style={styles.chBtn}
                    />
                  </View>
                </AppCard>
              );
            })
          )}
        </View>

        {/* ================= SECTION 4: TECHNICAL NOTICE ================= */}
        <AppCard elevation="xs" style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary[600]} />
            <AppText variant="label" weight="bold" color={theme.colors.primary[700]}>
              Cơ chế điều khiển qua MQTT Broker
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.secondary} style={styles.noticeText}>
            Lệnh điều khiển được phát tới MQTT Broker với chất lượng dịch vụ QoS 1, thời hạn tối đa 5 giây. Trạng thái &quot;Đã gửi tới Broker&quot; xác nhận broker đã tiếp nhận tin nhắn PUBACK. Thiết bị phần cứng sẽ tự động phản hồi lại trạng thái thực tế sau khi xử lý.
          </AppText>
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  masterConfigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  mastersPillContainer: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  pillsRow: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  masterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
  masterPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  inputFlex: {
    flex: 1,
  },
  applyBtn: {
    minWidth: 90,
  },
  activeMasterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
  },
  masterIdTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  batchActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  batchBtn: {
    flex: 1,
  },
  channelsSection: {
    gap: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  channelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  channelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelDetails: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelStatusMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.xs,
  },
  statusMsgText: {
    flex: 1,
  },
  channelActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  chBtn: {
    flex: 1,
  },
  noticeCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  noticeText: {
    lineHeight: 18,
  },
});
