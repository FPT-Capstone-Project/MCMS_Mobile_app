import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { CultivationSessionAdmin, GrowthStage } from '../../../iot/domain/entities/Iot';
import {
  DailyTrayInspection,
  DailyTrayInspectionImage,
} from '../../domain/entities/Cultivation';
import { cultivationRepository } from '../../data/repositories/CultivationRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface DailyTrayInspectionHistoryModalProps {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  initialSessionTrayId?: number | null;
  onClose: () => void;
  onOpenCreateReport?: (sessionTrayId?: number | null) => void;
}

const STAGE_LABELS: Record<GrowthStage, { label: string; color: string; bg: string }> = {
  FRUITING_INITIATION: {
    label: 'Bật mầm',
    color: '#0284C7',
    bg: 'rgba(2, 132, 199, 0.12)',
  },
  PINNING: {
    label: 'Ghim nụ',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
  },
  YOUNG_FRUITING: {
    label: 'Nấm non',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
  },
  MATURATION: {
    label: 'Trưởng thành',
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.12)',
  },
};

function formatConditionText(text?: string | null): string {
  if (!text) return 'Bình thường';
  const upper = text.trim().toUpperCase();
  const map: Record<string, string> = {
    NORMAL: 'Đạt tiêu chuẩn, ổn định',
    GOOD: 'Phát triển tốt, tối ưu',
    OPTIMAL: 'Tối ưu',
    WARNING: 'Cần theo dõi thêm',
    ABNORMAL: 'Bất thường, cần can thiệp',
    POOR: 'Kém phát triển',
  };
  return map[upper] ?? text;
}

export const DailyTrayInspectionHistoryModal: React.FC<DailyTrayInspectionHistoryModalProps> = ({
  visible,
  session,
  initialSessionTrayId,
  onClose,
  onOpenCreateReport,
}) => {
  if (!visible || !session) return null;

  return (
    <DailyTrayInspectionHistoryModalContent
      visible={visible}
      session={session}
      initialSessionTrayId={initialSessionTrayId}
      onClose={onClose}
      onOpenCreateReport={onOpenCreateReport}
    />
  );
};

const DailyTrayInspectionHistoryModalContent: React.FC<{
  visible: boolean;
  session: CultivationSessionAdmin;
  initialSessionTrayId?: number | null;
  onClose: () => void;
  onOpenCreateReport?: (sessionTrayId?: number | null) => void;
}> = ({ visible, session, initialSessionTrayId, onClose, onOpenCreateReport }) => {
  const trays = session.trays || [];

  // Tab filter: null = All trays, number = specific sessionTrayId
  const [selectedTrayId, setSelectedTrayId] = useState<number | null>(
    initialSessionTrayId || null
  );

  const [inspections, setInspections] = useState<DailyTrayInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fullscreen photo viewer state
  const [fullscreenImage, setFullscreenImage] = useState<{
    visible: boolean;
    imageUrl: string;
    caption?: string | null;
    trayCode?: string;
    date?: string;
  }>({
    visible: false,
    imageUrl: '',
    caption: null,
    trayCode: '',
    date: '',
  });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (selectedTrayId) {
        const res = await cultivationRepository.getTrayDailyInspectionHistory(
          session.session_id,
          selectedTrayId,
          1,
          50
        );
        setInspections(res.inspections || []);
      } else {
        const res = await cultivationRepository.getDailyInspectionHistory(
          session.session_id,
          1,
          50
        );
        setInspections(res.inspections || []);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải lịch sử báo cáo khay.');
    } finally {
      setLoading(false);
    }
  }, [session.session_id, selectedTrayId]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        void loadHistory();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadHistory]);

  const handleOpenFullscreenImage = (
    img: DailyTrayInspectionImage,
    item: DailyTrayInspection
  ) => {
    const dateFormatted = item.inspectionDate
      ? new Date(item.inspectionDate).toLocaleString('vi-VN')
      : '';
    setFullscreenImage({
      visible: true,
      imageUrl: img.imageUrl,
      caption: img.caption,
      trayCode: item.trayCode || `Khay #${item.sessionTrayId}`,
      date: dateFormatted,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Ionicons name="images-outline" size={20} color={theme.colors.primary[600]} />
                <AppText variant="title" weight="bold" style={{ marginLeft: 6 }}>
                  Lịch sử báo cáo khay
                </AppText>
              </View>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name || 'Nấm giống'}
              </AppText>
            </View>

            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.info.dark} />
            <AppText variant="caption" color={theme.colors.info.dark} style={{ flex: 1, marginLeft: 4 }}>
              Nhật ký ảnh & tiến độ sinh trưởng từng khay riêng biệt qua các ngày nuôi trồng.
            </AppText>
          </View>

          {/* Tray Filter Tabs */}
          {trays.length > 0 && (
            <View style={styles.filterTabsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
                <Pressable
                  onPress={() => setSelectedTrayId(null)}
                  style={[styles.filterPill, selectedTrayId === null && styles.filterPillActive]}
                >
                  <AppText
                    variant="caption"
                    weight={selectedTrayId === null ? 'bold' : 'normal'}
                    color={selectedTrayId === null ? '#FFFFFF' : theme.colors.text.primary}
                  >
                    Tất cả các khay ({trays.length})
                  </AppText>
                </Pressable>

                {trays.map((t) => {
                  const isSelected = selectedTrayId === t.session_tray_id;
                  return (
                    <Pressable
                      key={t.session_tray_id}
                      onPress={() => setSelectedTrayId(t.session_tray_id)}
                      style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    >
                      <Ionicons
                        name="cube"
                        size={12}
                        color={isSelected ? '#FFFFFF' : theme.colors.primary[600]}
                      />
                      <AppText
                        variant="caption"
                        weight={isSelected ? 'bold' : 'normal'}
                        color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                        style={{ marginLeft: 4 }}
                      >
                        {t.tray_code}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <AppDivider spacing="xs" />

          {/* Main Inspection List */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                Đang nạp báo cáo hằng ngày...
              </AppText>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={36} color={theme.colors.error.main} />
              <AppText variant="bodySmall" color={theme.colors.error.dark} align="center" style={{ marginTop: 6 }}>
                {errorMessage}
              </AppText>
              <AppButton
                title="Tải lại"
                variant="outline"
                size="sm"
                onPress={() => void loadHistory()}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : inspections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={44} color={theme.colors.text.muted} />
              <AppText variant="bodyMedium" weight="bold" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                Chưa có báo cáo khay nào
              </AppText>
              <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 4, paddingHorizontal: 16 }}>
                {selectedTrayId
                  ? 'Khay này chưa có báo cáo ảnh sinh trưởng nào.'
                  : 'Chưa có khay nào trong phiên được tạo báo cáo hằng ngày.'}
              </AppText>
              {onOpenCreateReport && (
                <AppButton
                  title="Tạo báo cáo khay ngay"
                  variant="primary"
                  size="sm"
                  leftIcon={<Ionicons name="add-circle" size={16} color="#FFFFFF" />}
                  onPress={() => {
                    onClose();
                    onOpenCreateReport(selectedTrayId);
                  }}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          ) : (
            <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
              {inspections.map((item, index) => {
                const stageConfig = STAGE_LABELS[item.growthStage] || {
                  label: item.growthStage,
                  color: theme.colors.text.secondary,
                  bg: theme.colors.neutral[100],
                };
                const dateFormatted = item.inspectionDate
                  ? new Date(item.inspectionDate).toLocaleString('vi-VN')
                  : 'Chưa rõ';

                return (
                  <AppCard key={item.inspectionId || index} elevation="xs" style={styles.itemCard}>
                    {/* Top Row: Tray Code & Date & Stage Badge */}
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.trayCodeRow}>
                          <Ionicons name="cube" size={14} color={theme.colors.primary[600]} />
                          <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                            {item.trayCode || item.trayName || `Khay #${item.sessionTrayId}`}
                          </AppText>
                        </View>
                        <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 2 }}>
                          {dateFormatted}
                        </AppText>
                      </View>

                      <View style={[styles.stageBadge, { backgroundColor: stageConfig.bg }]}>
                        <AppText variant="caption" weight="bold" color={stageConfig.color}>
                          {stageConfig.label}
                        </AppText>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBg}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(100, Math.max(0, item.growthProgress))}%`,
                              backgroundColor: stageConfig.color,
                            },
                          ]}
                        />
                      </View>
                      <AppText variant="caption" weight="bold" color={stageConfig.color} style={{ marginLeft: 8 }}>
                        {item.growthProgress}%
                      </AppText>
                    </View>

                    <AppDivider spacing="xs" />

                    {/* Conditions */}
                    <View style={styles.conditionsBox}>
                      <View style={styles.conditionLine}>
                        <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.text.secondary} />
                        <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 4, flex: 1 }}>
                          Tình trạng khay: <AppText variant="caption" weight="semibold">{formatConditionText(item.trayCondition)}</AppText>
                        </AppText>
                      </View>
                      <View style={[styles.conditionLine, { marginTop: 3 }]}>
                        <Ionicons name="leaf-outline" size={13} color={theme.colors.success.dark} />
                        <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 4, flex: 1 }}>
                          Tình trạng nấm: <AppText variant="caption" weight="semibold">{formatConditionText(item.mushroomCondition)}</AppText>
                        </AppText>
                      </View>
                    </View>

                    {/* Notes */}
                    {item.notes ? (
                      <View style={styles.notesBox}>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          <AppText variant="caption" weight="bold">Ghi chú: </AppText>
                          {item.notes}
                        </AppText>
                      </View>
                    ) : null}

                    {/* Inspector info */}
                    {item.inspectedByName ? (
                      <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 4 }}>
                        Người báo cáo: {item.inspectedByName}
                      </AppText>
                    ) : null}

                    {/* Image Thumbnails Gallery */}
                    {item.images && item.images.length > 0 && (
                      <View style={styles.imagesGalleryWrap}>
                        <AppText variant="caption" weight="bold" color={theme.colors.text.secondary} style={{ marginBottom: 4 }}>
                          Hình ảnh chụp thực tế ({item.images.length} ảnh):
                        </AppText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                          {item.images.map((img) => (
                            <Pressable
                              key={img.imageId}
                              onPress={() => handleOpenFullscreenImage(img, item)}
                              style={styles.thumbnailWrap}
                            >
                              <Image source={{ uri: img.imageUrl }} style={styles.thumbnailImage} />
                              <View style={styles.zoomPill}>
                                <Ionicons name="expand" size={11} color="#FFFFFF" />
                              </View>
                              {img.caption ? (
                                <View style={styles.thumbnailCaptionBg}>
                                  <AppText variant="caption" numberOfLines={1} color="#FFFFFF" style={styles.captionText}>
                                    {img.caption}
                                  </AppText>
                                </View>
                              ) : null}
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </AppCard>
                );
              })}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* Footer Action */}
          {onOpenCreateReport && (
            <View style={styles.footerRow}>
              <AppButton
                title="Tạo báo cáo khay mới"
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="camera" size={18} color="#FFFFFF" />}
                onPress={() => {
                  onClose();
                  onOpenCreateReport(selectedTrayId);
                }}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </View>

      {/* Fullscreen Photo Viewer Modal */}
      <Modal
        visible={fullscreenImage.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.fullscreenBackdrop}>
          {/* Top Bar */}
          <View style={styles.fullscreenTopBar}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium" weight="bold" color="#FFFFFF">
                {fullscreenImage.trayCode}
              </AppText>
              <AppText variant="caption" color="rgba(255, 255, 255, 0.7)">
                {fullscreenImage.date}
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng ảnh"
              icon={<Ionicons name="close" size={24} color="#FFFFFF" />}
              onPress={() => setFullscreenImage((prev) => ({ ...prev, visible: false }))}
              size="sm"
            />
          </View>

          {/* Fullscreen Image */}
          <View style={styles.fullscreenImageContainer}>
            {fullscreenImage.imageUrl ? (
              <Image
                source={{ uri: fullscreenImage.imageUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Caption Bottom Bar */}
          {fullscreenImage.caption ? (
            <View style={styles.fullscreenBottomBar}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <AppText variant="bodySmall" color="#FFFFFF" style={{ marginLeft: 8, flex: 1 }}>
                {fullscreenImage.caption}
              </AppText>
            </View>
          ) : null}
        </View>
      </Modal>
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
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
    maxHeight: '90%',
    minHeight: '60%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    marginBottom: 6,
  },
  filterTabsWrap: {
    marginBottom: 6,
  },
  filterTabsScroll: {
    paddingVertical: 4,
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary[600],
  },
  centerLoading: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listArea: {
    flex: 1,
    marginTop: 6,
  },
  itemCard: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trayCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  conditionsBox: {
    marginTop: 4,
  },
  conditionLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBox: {
    backgroundColor: theme.colors.neutral[50],
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  imagesGalleryWrap: {
    marginTop: 8,
  },
  galleryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbnailWrap: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 3,
    borderRadius: theme.borderRadius.full,
  },
  thumbnailCaptionBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  captionText: {
    fontSize: 9,
  },
  footerRow: {
    paddingTop: theme.spacing.sm,
  },
  // Fullscreen Viewer Styles
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 48,
    paddingBottom: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});
