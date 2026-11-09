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
import {
  CultivationSessionAdmin,
  SpawnInspection,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import {
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface SpawnInspectionHistoryModalProps {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  onClose: () => void;
}

export const SpawnInspectionHistoryModal: React.FC<SpawnInspectionHistoryModalProps> = ({
  visible,
  session,
  onClose,
}) => {
  if (!visible || !session) return null;

  return (
    <SpawnInspectionHistoryModalContent
      visible={visible}
      session={session}
      onClose={onClose}
    />
  );
};

const SpawnInspectionHistoryModalContent: React.FC<{
  visible: boolean;
  session: CultivationSessionAdmin;
  onClose: () => void;
}> = ({ visible, session, onClose }) => {
  const [inspections, setInspections] = useState<SpawnInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fullscreen photo viewer state
  const [fullscreenImage, setFullscreenImage] = useState<{
    visible: boolean;
    imageUrl: string;
    caption?: string | null;
    title?: string;
    date?: string;
  }>({
    visible: false,
    imageUrl: '',
    caption: null,
    title: '',
    date: '',
  });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await iotRepository.getSpawnInspections(session.session_id);
      setInspections(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải lịch sử kiểm tra phôi của phiên này.'
      );
    } finally {
      setLoading(false);
    }
  }, [session.session_id]);

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

  const renderConditionBadge = (condition: string) => {
    let bg = 'rgba(34, 197, 94, 0.15)';
    let text: string = theme.colors.success.dark;
    let label = 'ĐẠT CHUẨN (NORMAL)';

    if (condition === 'WARNING') {
      bg = 'rgba(245, 158, 11, 0.15)';
      text = theme.colors.warning.dark;
      label = 'CẢNH BÁO (WARNING)';
    } else if (condition === 'ABNORMAL') {
      bg = 'rgba(239, 68, 68, 0.15)';
      text = theme.colors.error.dark;
      label = 'BẤT THƯỜNG (ABNORMAL)';
    }

    return (
      <View style={[styles.badgeBox, { backgroundColor: bg }]}>
        <AppText variant="caption" weight="bold" color={text}>
          {label}
        </AppText>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">
                Lịch sử kiểm tra phôi theo phiên
              </AppText>
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

          {/* Clarification banner */}
          <View style={styles.scopeNotice}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.primary[600]} />
            <AppText variant="caption" color={theme.colors.primary[700]} style={{ flex: 1, marginLeft: 6 }}>
              Lịch sử kiểm tra chất lượng bịch giống chung cho cả phiên trước khi gán khay.
            </AppText>
          </View>

          <AppDivider spacing="xs" />

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                Đang tải lịch sử kiểm tra...
              </AppText>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={36} color={theme.colors.error.main} />
              <AppText variant="bodySmall" color={theme.colors.error.dark} align="center" style={{ marginTop: 6 }}>
                {errorMessage}
              </AppText>
            </View>
          ) : inspections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={40} color={theme.colors.text.muted} />
              <AppText variant="bodyMedium" weight="semibold" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                Chưa có đợt kiểm tra nào
              </AppText>
              <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 4 }}>
                Phiên này chưa ghi nhận đợt kiểm tra phôi giống nào. Vui lòng bấm &quot;Kiểm tra phôi&quot; để ghi nhận kết quả.
              </AppText>
            </View>
          ) : (
            <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
              {inspections.map((item, index) => {
                const dateStr = item.inspected_at || item.created_at;
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleString('vi-VN')
                  : 'Chưa xác định';
                const inspectionTitle = `Đợt kiểm tra #${inspections.length - index}`;

                return (
                  <AppCard key={item.inspection_id || item.id || index} elevation="xs" style={styles.itemCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" weight="bold">
                          {inspectionTitle}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Thời gian: {formattedDate}
                        </AppText>
                      </View>
                      {renderConditionBadge(item.condition)}
                    </View>

                    <AppDivider spacing="xs" />

                    <View style={styles.countsRow}>
                      <View style={styles.countItem}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Tổng kiểm
                        </AppText>
                        <AppText variant="bodyMedium" weight="bold">
                          {item.total_checked} bịch
                        </AppText>
                      </View>

                      <View style={styles.countItem}>
                        <AppText variant="caption" color={theme.colors.success.dark}>
                          Đạt chuẩn
                        </AppText>
                        <AppText variant="bodyMedium" weight="bold" color={theme.colors.success.dark}>
                          {item.normal_quantity}
                        </AppText>
                      </View>

                      <View style={styles.countItem}>
                        <AppText variant="caption" color={theme.colors.warning.dark}>
                          Cảnh báo
                        </AppText>
                        <AppText variant="bodyMedium" weight="bold" color={theme.colors.warning.dark}>
                          {item.warning_quantity}
                        </AppText>
                      </View>

                      <View style={styles.countItem}>
                        <AppText variant="caption" color={theme.colors.error.dark}>
                          Hư hỏng
                        </AppText>
                        <AppText variant="bodyMedium" weight="bold" color={theme.colors.error.dark}>
                          {item.abnormal_quantity}
                        </AppText>
                      </View>
                    </View>

                    {item.replacement_quantity != null && item.replacement_quantity > 0 && (
                      <View style={styles.replacementRow}>
                        <Ionicons name="swap-horizontal" size={14} color={theme.colors.warning.dark} />
                        <AppText variant="caption" weight="semibold" color={theme.colors.warning.dark}>
                          Đã xuất kho thay thế: {item.replacement_quantity} bịch phôi
                        </AppText>
                      </View>
                    )}

                    {item.notes ? (
                      <View style={styles.notesRow}>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          <AppText variant="caption" weight="bold">Ghi chú: </AppText>
                          {item.notes}
                        </AppText>
                      </View>
                    ) : null}

                    {item.inspector_name && (
                      <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 4 }}>
                        Người kiểm tra: {item.inspector_name}
                      </AppText>
                    )}

                    {/* Inspection Images Gallery */}
                    {item.images && item.images.length > 0 && (
                      <View style={styles.imagesGalleryWrap}>
                        <AppText variant="caption" weight="bold" color={theme.colors.text.secondary} style={{ marginBottom: 4 }}>
                          Hình ảnh kiểm tra phôi ({item.images.length} ảnh):
                        </AppText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                          {item.images.map((img, imgIdx) => (
                            <Pressable
                              key={img.image_id || imgIdx}
                              onPress={() =>
                                setFullscreenImage({
                                  visible: true,
                                  imageUrl: img.image_url,
                                  caption: img.caption,
                                  title: `${inspectionTitle} • ${session.mushroom_name || 'Nấm giống'}`,
                                  date: formattedDate,
                                })
                              }
                              style={styles.thumbnailWrap}
                            >
                              <Image source={{ uri: img.image_url }} style={styles.thumbnailImage} />
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
            </ScrollView>
          )}
        </View>
      </View>

      {/* Fullscreen Photo Viewer */}
      <Modal
        visible={fullscreenImage.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.fullscreenBackdrop}>
          <View style={styles.fullscreenTopBar}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium" weight="bold" color="#FFFFFF">
                {fullscreenImage.title}
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

          <View style={styles.fullscreenImageContainer}>
            {fullscreenImage.imageUrl ? (
              <Image
                source={{ uri: fullscreenImage.imageUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
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
  scopeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    marginBottom: 6,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listArea: {
    maxHeight: 460,
    marginTop: theme.spacing.xs,
  },
  itemCard: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    paddingVertical: 4,
  },
  countItem: {
    alignItems: 'center',
  },
  replacementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  notesRow: {
    marginTop: 6,
    backgroundColor: theme.colors.neutral[50],
    padding: 6,
    borderRadius: theme.borderRadius.sm,
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
