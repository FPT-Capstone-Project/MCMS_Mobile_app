import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../../core/theme';
import { ENV } from '../../../../core/config';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import type { FloorMapping } from '../../../iot/domain/entities/Iot';
import { cultivationRepository } from '../../data/repositories/CultivationRepository';
import {
  CultivationRoom,
  CultivationTray,
  MushroomCondition,
  MushroomType,
} from '../../domain/entities/Cultivation';

export interface CultivationTrayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  tray: CultivationTray | null;
  room?: CultivationRoom | null;
  floor?: FloorMapping | null;
  onAssignRental?: (tray: CultivationTray) => void;
}

interface EnrichedCultivationData {
  sessionId?: number | null;
  rentalId?: number | null;
  mushroomName?: string | null;
  mushroomType?: MushroomType | null;
  condition?: MushroomCondition | null;
  startDate?: string | null;
  endDate?: string | null;
  daysElapsed?: number;
  totalDays?: number;
  temperature?: number | null;
  humidity?: number | null;
  floorMapping?: FloorMapping | null;
  customerName?: string | null;
  cultivationStatus?: string | null;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '--/--/----';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return typeof d === 'string' ? d : '--';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export const CultivationTrayDetailModal: React.FC<CultivationTrayDetailModalProps> = ({
  visible,
  onClose,
  tray,
  room,
  floor,
  onAssignRental,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnrichedCultivationData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCultivationDetails() {
      if (!visible || !tray) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const enriched: EnrichedCultivationData = {
          sessionId: tray.session_id,
          rentalId: tray.rental_id,
          mushroomName: tray.mushroom_name,
          startDate: tray.start_date,
          endDate: tray.end_date,
          cultivationStatus: tray.cultivation_status,
          floorMapping: floor || null,
        };

        // 1. If floor wasn't passed directly, attempt to discover matching floor in room
        let activeFloor = floor;
        if (!activeFloor && room?.room_id) {
          try {
            const allFloors = await iotRepository.getFloors();
            const matchingFloors = allFloors.filter((f) => f.room_id === room.room_id);
            if (tray.floor_id) {
              activeFloor = matchingFloors.find((f) => (f.floor_id ?? f.id) === tray.floor_id);
            }
            if (!activeFloor && matchingFloors.length > 0) {
              activeFloor = matchingFloors[0];
            }
            enriched.floorMapping = activeFloor;
          } catch {
            // Ignore background error
          }
        }

        // 2. Fetch Floor Environment (Temperature & Humidity) if floor is identified
        const activeFloorId = activeFloor?.floor_id ?? activeFloor?.id;
        if (activeFloorId) {
          try {
            const env = await iotRepository.getFloorEnvironment(activeFloorId);
            enriched.temperature = env.averageTemperature;
            enriched.humidity = env.averageHumidity;
          } catch {
            // Ignore environment fetch error
          }

          // Also check floor's active auto-control trays config for session details
          try {
            const autoConfig = await iotRepository.getAutoControlConfig(activeFloorId);
            const foundTray = autoConfig.cultivation?.trays?.find(
              (t) => t.tray_id === tray.tray_id || t.tray_code === tray.tray_code
            );
            if (foundTray) {
              enriched.sessionId = foundTray.session_id ?? enriched.sessionId;
              enriched.rentalId = foundTray.rental_id ?? enriched.rentalId;
              enriched.mushroomName = foundTray.mushroom_name ?? enriched.mushroomName;
              enriched.cultivationStatus = foundTray.cultivation_status ?? enriched.cultivationStatus;
            }
          } catch {
            // Ignore config error
          }
        }

        // 3. Fetch Mushroom details and optimal conditions
        try {
          const mushroomTypes = await cultivationRepository.getMushroomTypes();
          let targetMushroom: MushroomType | undefined;

          if (tray.mushroom_type_id) {
            targetMushroom = mushroomTypes.find(
              (m) => m.mushroom_type_id === tray.mushroom_type_id
            );
          }
          if (!targetMushroom && enriched.mushroomName) {
            targetMushroom = mushroomTypes.find(
              (m) => m.name.toLowerCase() === enriched.mushroomName?.toLowerCase()
            );
          }

          if (targetMushroom) {
            enriched.mushroomType = targetMushroom;
            enriched.mushroomName = targetMushroom.name;
            enriched.totalDays = targetMushroom.growing_days;

            const conditions = await cultivationRepository.getMushroomConditions(
              targetMushroom.mushroom_type_id
            );
            if (conditions.length > 0) {
              enriched.condition = conditions[0];
            }
          }
        } catch {
          // Ignore mushroom lookup error
        }

        // 4. Set enriched data without fabricating mock session data
        if (isMounted) {
          setData(enriched);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCultivationDetails();

    return () => {
      isMounted = false;
    };
  }, [visible, tray, room, floor]);

  if (!visible || !tray) {
    return null;
  }

  const hasActiveSession = Boolean(
    (data?.sessionId ?? tray.session_id) && (data?.mushroomName ?? tray.mushroom_name)
  );
  const isOccupied = tray.status === 'OCCUPIED';
  const isAvailable = tray.status === 'AVAILABLE';
  const isMaintenance = tray.status === 'MAINTENANCE';

  let statusColor: string = theme.colors.neutral[500];
  let statusLabel = 'Không khả dụng';

  if (hasActiveSession) {
    statusColor = theme.colors.success.main;
    statusLabel = 'Đang nuôi trồng';
  } else if (isOccupied) {
    statusColor = theme.colors.warning.main;
    statusLabel = 'Đã xếp khay (Chưa có phiên)';
  } else if (isAvailable) {
    statusColor = theme.colors.info?.main ?? '#0284C7';
    statusLabel = 'Khay trống sẵn sàng';
  } else if (isMaintenance) {
    statusColor = theme.colors.error.main;
    statusLabel = 'Đang bảo trì';
  }

  // Calculate timeline progress percentage if valid data exists
  const totalDays = data?.totalDays;
  const daysElapsed = data?.daysElapsed;
  const progressPercent =
    totalDays && daysElapsed != null
      ? Math.min(100, Math.round((daysElapsed / totalDays) * 100))
      : null;

  // Range evaluation helpers
  const tempIdeal =
    data?.condition?.temperature_min != null && data?.condition?.temperature_max != null
      ? `${data.condition.temperature_min}° - ${data.condition.temperature_max}°C`
      : 'Theo chuẩn giống nấm';

  const humIdeal =
    data?.condition?.humidity_min != null && data?.condition?.humidity_max != null
      ? `${data.condition.humidity_min}% - ${data.condition.humidity_max}%`
      : 'Theo chuẩn giống nấm';

  const handleGoToCamera = () => {
    onClose();
    router.push(`/camera/${ENV.cameraId || '0'}` as any);
  };

  const handleGoToSensors = () => {
    onClose();
    router.push('/sensors' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng chi tiết khay"
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.base) },
          ]}
        >
          {/* Top Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTexts}>
              <View style={styles.titleWithBadge}>
                <AppText variant="h3" weight="bold">
                  Khay {tray.tray_code}
                </AppText>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColor}18` },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <AppText variant="overline" color={statusColor} weight="bold">
                    {statusLabel}
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phòng {room?.room_name || 'Nuôi trồng'} •{' '}
                {data?.floorMapping?.floor_name ||
                  (floor?.floor_number ? `Tầng ${floor.floor_number}` : 'Khu nuôi trồng')}
                {tray.tray_name ? ` • ${tray.tray_name}` : ''}
              </AppText>
            </View>

            <AppIconButton
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              accessibilityLabel="Đóng"
              size="sm"
            />
          </View>

          <AppDivider spacing="xs" />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Đang nạp dữ liệu nuôi trồng & vi khí hậu...
              </AppText>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {hasActiveSession ? (
                <>
                  {/* Mushroom Variety Hero Card */}
                  <AppCard elevation="xs" style={styles.mushroomHeroCard}>
                    <View style={styles.mushroomTopRow}>
                      <View style={styles.mushroomIconBox}>
                        <Ionicons name="leaf" size={24} color={theme.colors.primary[600]} />
                      </View>
                      <View style={styles.mushroomTexts}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          GIỐNG NẤM ĐANG TRỒNG
                        </AppText>
                        <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                          {data?.mushroomName || 'Nấm nuôi trồng'}
                        </AppText>
                        {data?.mushroomType?.description ? (
                          <AppText
                            variant="caption"
                            color={theme.colors.text.secondary}
                            numberOfLines={2}
                          >
                            {data.mushroomType.description}
                          </AppText>
                        ) : null}
                      </View>
                    </View>

                    {/* Metadata tags */}
                    <View style={styles.tagsRow}>
                      {data?.sessionId ? (
                        <View style={styles.metaTag}>
                          <Ionicons name="git-commit-outline" size={13} color={theme.colors.text.secondary} />
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Phiên #{data.sessionId}
                          </AppText>
                        </View>
                      ) : null}
                      {data?.rentalId ? (
                        <View style={styles.metaTag}>
                          <Ionicons name="receipt-outline" size={13} color={theme.colors.text.secondary} />
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Đơn #{data.rentalId}
                          </AppText>
                        </View>
                      ) : null}
                      {totalDays ? (
                        <View style={styles.metaTag}>
                          <Ionicons name="hourglass-outline" size={13} color={theme.colors.text.secondary} />
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Chu kỳ: {totalDays} ngày
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </AppCard>

                  {/* Cultivation Timeline & Progress */}
                  <AppCard elevation="xs" style={styles.timelineCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="label" weight="bold">
                        Tiến độ chu kỳ sinh trưởng
                      </AppText>
                      <View style={styles.spacer} />
                      {progressPercent != null && totalDays != null ? (
                        <AppText variant="caption" weight="bold" color={theme.colors.primary[600]}>
                          Ngày {daysElapsed ?? 0}/{totalDays} ({progressPercent}%)
                        </AppText>
                      ) : (
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          Đang cập nhật
                        </AppText>
                      )}
                    </View>

                    {/* Progress Bar */}
                    {progressPercent != null && (
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                      </View>
                    )}

                    <View style={styles.datesRow}>
                      <View>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Cấy phôi
                        </AppText>
                        <AppText variant="caption" weight="bold">
                          {data?.startDate ? formatDate(data.startDate) : 'Chưa cập nhật'}
                        </AppText>
                      </View>

                      <View style={styles.alignRight}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Dự kiến thu hoạch
                        </AppText>
                        <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>
                          {data?.endDate ? formatDate(data.endDate) : 'Chưa cập nhật'}
                        </AppText>
                      </View>
                    </View>
                  </AppCard>

                  {/* Real-time Environment Telemetry vs Optimal Bounds */}
                  <View style={styles.metricsSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="pulse" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="label" weight="bold">
                        Vi khí hậu buồng trồng hiện tại
                      </AppText>
                    </View>

                    <View style={styles.metricsGrid}>
                      {/* Temperature */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricTop}>
                          <Ionicons name="thermometer-outline" size={18} color="#EF4444" />
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Nhiệt độ
                          </AppText>
                        </View>
                        <AppText variant="h3" weight="bold" color={theme.colors.text.primary}>
                          {data?.temperature != null ? `${Number(data.temperature).toFixed(2)}°C` : '--'}
                        </AppText>
                        <View style={styles.idealBadge}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Chuẩn: <AppText variant="caption" weight="semibold">{tempIdeal}</AppText>
                          </AppText>
                        </View>
                      </View>

                      {/* Humidity */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricTop}>
                          <Ionicons name="water-outline" size={18} color="#0EA5E9" />
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Độ ẩm
                          </AppText>
                        </View>
                        <AppText variant="h3" weight="bold" color={theme.colors.text.primary}>
                          {data?.humidity != null ? `${Number(data.humidity).toFixed(2)}%` : '--'}
                        </AppText>
                        <View style={styles.idealBadge}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Chuẩn: <AppText variant="caption" weight="semibold">{humIdeal}</AppText>
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Chamber Hardware Setup */}
                  {data?.floorMapping && (
                    <AppCard elevation="xs" variant="outlined" style={styles.hardwareCard}>
                      <View style={styles.hardwareHeader}>
                        <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.text.secondary} />
                        <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
                          THÔNG TIN PHẦN CỨNG BUỒNG NUÔI TRỒNG
                        </AppText>
                      </View>
                      <View style={styles.hardwareGrid}>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Master Gateway:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            {data.floorMapping.master_id}
                          </AppText>
                        </View>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Địa chỉ Node:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            Node #{data.floorMapping.node_address}
                          </AppText>
                        </View>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Van SSR phun ẩm:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            Kênh {data.floorMapping.misting_ssr_channel}
                          </AppText>
                        </View>
                      </View>
                    </AppCard>
                  )}
                </>
              ) : isOccupied ? (
                /* Occupied Tray without Active Session */
                <>
                  <AppCard elevation="xs" style={styles.unassignedSessionCard}>
                    <View style={styles.unassignedIconBox}>
                      <Ionicons name="cube" size={32} color={theme.colors.warning.dark} />
                    </View>
                    <AppText variant="title" weight="bold" style={styles.textCenter}>
                      Khay đã xếp vị trí • Chưa có phiên trồng
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color={theme.colors.text.secondary}
                      style={styles.textCenter}
                    >
                      Khay {tray.tray_code} đã được xếp vào tầng{' '}
                      {data?.floorMapping?.floor_name ||
                        (floor?.floor_number ? `Tầng ${floor.floor_number}` : 'nuôi trồng')}
                      . Hiện chưa có phiên nuôi trồng nào đang hoạt động. Sẵn sàng gán lượt thuê để bắt đầu canh tác.
                    </AppText>

                    {onAssignRental ? (
                      <AppButton
                        title="Gán lượt thuê để bắt đầu phiên trồng"
                        variant="primary"
                        size="md"
                        leftIcon={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
                        onPress={() => {
                          onClose();
                          onAssignRental(tray);
                        }}
                        style={styles.actionBtnFull}
                      />
                    ) : null}
                  </AppCard>

                  {/* Real-time Environment Telemetry for the floor */}
                  <View style={styles.metricsSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="pulse" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="label" weight="bold">
                        Vi khí hậu buồng trồng hiện tại
                      </AppText>
                    </View>

                    <View style={styles.metricsGrid}>
                      {/* Temperature */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricTop}>
                          <Ionicons name="thermometer-outline" size={18} color="#EF4444" />
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Nhiệt độ đo
                          </AppText>
                        </View>
                        <AppText variant="h3" weight="bold" color={theme.colors.text.primary}>
                          {data?.temperature != null ? `${Number(data.temperature).toFixed(2)}°C` : '--'}
                        </AppText>
                        <View style={styles.idealBadge}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            {data?.floorMapping?.floor_name || (floor?.floor_number ? `Tầng ${floor.floor_number}` : 'Cảm biến buồng')}
                          </AppText>
                        </View>
                      </View>

                      {/* Humidity */}
                      <View style={styles.metricCard}>
                        <View style={styles.metricTop}>
                          <Ionicons name="water-outline" size={18} color="#0EA5E9" />
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Độ ẩm đo
                          </AppText>
                        </View>
                        <AppText variant="h3" weight="bold" color={theme.colors.text.primary}>
                          {data?.humidity != null ? `${Number(data.humidity).toFixed(2)}%` : '--'}
                        </AppText>
                        <View style={styles.idealBadge}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            {data?.floorMapping?.floor_name || (floor?.floor_number ? `Tầng ${floor.floor_number}` : 'Cảm biến buồng')}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Chamber Hardware Setup */}
                  {data?.floorMapping && (
                    <AppCard elevation="xs" variant="outlined" style={styles.hardwareCard}>
                      <View style={styles.hardwareHeader}>
                        <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.text.secondary} />
                        <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
                          THÔNG TIN PHẦN CỨNG BUỒNG NUÔI TRỒNG
                        </AppText>
                      </View>
                      <View style={styles.hardwareGrid}>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Master Gateway:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            {data.floorMapping.master_id}
                          </AppText>
                        </View>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Địa chỉ Node:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            Node #{data.floorMapping.node_address}
                          </AppText>
                        </View>
                        <View style={styles.hardwareCol}>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Van SSR phun ẩm:
                          </AppText>
                          <AppText variant="caption" weight="semibold">
                            Kênh {data.floorMapping.misting_ssr_channel}
                          </AppText>
                        </View>
                      </View>
                    </AppCard>
                  )}
                </>
              ) : isAvailable ? (
                /* Available State */
                <AppCard elevation="xs" style={styles.emptyStateCard}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="cube-outline" size={36} color={theme.colors.success.main} />
                  </View>
                  <AppText variant="title" weight="bold" style={styles.textCenter}>
                    Khay nuôi trồng sẵn sàng
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color={theme.colors.text.secondary}
                    style={styles.textCenter}
                  >
                    Khay này hiện đang trống và đã được vệ sinh khử khuẩn. Sẵn sàng để gán gói thuê mới hoặc cấy phôi nấm tiếp theo.
                  </AppText>

                  {onAssignRental ? (
                    <AppButton
                      title="Gán lượt thuê mới cho khay này"
                      variant="primary"
                      size="md"
                      leftIcon={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
                      onPress={() => {
                        onClose();
                        onAssignRental(tray);
                      }}
                      style={styles.actionBtnFull}
                    />
                  ) : null}
                </AppCard>
              ) : (
                /* Maintenance State */
                <AppCard elevation="xs" style={styles.emptyStateCard}>
                  <View style={[styles.emptyIconBox, { backgroundColor: theme.colors.warning.light }]}>
                    <Ionicons name="construct-outline" size={36} color={theme.colors.warning.main} />
                  </View>
                  <AppText variant="title" weight="bold" style={styles.textCenter}>
                    Khay đang bảo trì
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color={theme.colors.text.secondary}
                    style={styles.textCenter}
                  >
                    Khay này đang trong chu trình bảo dưỡng cảm biến hoặc vệ sinh định kỳ buồng trồng.
                  </AppText>
                </AppCard>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtonsCol}>
                {hasActiveSession && (
                  <AppButton
                    title="Xem camera buồng trồng trực tiếp"
                    variant="primary"
                    size="md"
                    leftIcon={<Ionicons name="videocam" size={18} color="#FFFFFF" />}
                    onPress={handleGoToCamera}
                    fullWidth
                  />
                )}

                <AppButton
                  title="Xem lịch sử & đồ thị cảm biến"
                  variant="outline"
                  size="md"
                  leftIcon={<Ionicons name="stats-chart" size={18} color={theme.colors.primary[600]} />}
                  onPress={handleGoToSensors}
                  fullWidth
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loadingBox: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  scrollContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  mushroomHeroCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  mushroomTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  mushroomIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mushroomTexts: {
    flex: 1,
    gap: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    paddingTop: 4,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  timelineCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 4,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  metricsSection: {
    gap: theme.spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    gap: 4,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idealBadge: {
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  hardwareCard: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  hardwareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hardwareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  hardwareCol: {
    flex: 1,
  },
  unassignedSessionCard: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    borderColor: 'rgba(234, 179, 8, 0.25)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
  },
  unassignedIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  textCenter: {
    textAlign: 'center',
  },
  actionBtnFull: {
    marginTop: theme.spacing.sm,
    width: '100%',
  },
  actionButtonsCol: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
