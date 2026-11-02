import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
                Lịch sử kiểm tra phôi
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name}
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          <AppDivider spacing="sm" />

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

                return (
                  <AppCard key={item.inspection_id || item.id || index} elevation="xs" style={styles.itemCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" weight="bold">
                          Đợt kiểm tra #{inspections.length - index}
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
                  </AppCard>
                );
              })}
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
    maxHeight: 450,
  },
  itemCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  countItem: {
    alignItems: 'center',
  },
  replacementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  notesRow: {
    marginTop: 6,
    backgroundColor: theme.colors.neutral[50],
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
});
