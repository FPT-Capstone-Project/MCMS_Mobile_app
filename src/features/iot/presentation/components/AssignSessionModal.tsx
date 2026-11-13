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
import { theme } from '../../../../core/theme';
import {
  CultivationSessionAdmin,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import {
  AppButton,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface AssignSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: CultivationSessionAdmin) => void;
}

const AssignSessionModalContent: React.FC<AssignSessionModalProps> = ({
  visible,
  onClose,
  onSelectSession,
}) => {
  const router = useRouter();
  const [sessions, setSessions] = useState<CultivationSessionAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadReadySessions() {
      try {
        // Query GET /api/farm/sessions?status=READY_FOR_CULTIVATION
        const readySessions = await iotRepository.getReadyCultivationSessions();
        if (!isMounted) return;
        setSessions(readySessions);
      } catch {
        if (isMounted) setSessions([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReadySessions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <AppText variant="title" weight="bold">
                Chọn phiên cần gán khay
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Danh sách phiên đang ở trạng thái Sẵn sàng trồng
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          <AppDivider spacing="xs" />

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 6 }}>
                Đang tìm phiên sẵn sàng...
              </AppText>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {sessions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="cube-outline" size={40} color={theme.colors.text.muted} />
                  <AppText variant="bodyMedium" weight="semibold" color={theme.colors.text.secondary} align="center" style={{ marginTop: 6 }}>
                    Chưa có phiên nào sẵn sàng gán khay
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 4, paddingHorizontal: 16 }}>
                    Phiên cần hoàn thành giai đoạn ủ tơ và kiểm tra phôi đạt chuẩn trước khi chuyển sang Sẵn sàng trồng.
                  </AppText>
                  <AppButton
                    title="Đến Quản lý phiên nuôi trồng"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      onClose();
                      router.push('/admin-orders');
                    }}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                sessions.map((session) => {
                  const requiredCount = session.required_trays || 1;
                  return (
                    <Pressable
                      key={session.session_id}
                      onPress={() => {
                        onSelectSession(session);
                        onClose();
                      }}
                      style={styles.sessionCard}
                    >
                      <View style={styles.sessionTopRow}>
                        <View style={styles.sessionIconBox}>
                          <Ionicons name="leaf" size={20} color={theme.colors.primary[600]} />
                        </View>
                        <View style={styles.sessionInfo}>
                          <View style={styles.titleRow}>
                            <AppText variant="bodyMedium" weight="bold">
                              Phiên #{session.session_id}
                            </AppText>
                            <View style={styles.needBadge}>
                              <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                                Cần {requiredCount} khay
                              </AppText>
                            </View>
                          </View>
                          <AppText variant="caption" color={theme.colors.text.primary} weight="semibold">
                            Giống nấm: {session.mushroom_name || 'Nấm giống'}
                          </AppText>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Khách hàng: {session.customer_name || 'Khách hàng'} • Trạng thái: Sẵn sàng trồng
                          </AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const AssignSessionModal: React.FC<AssignSessionModalProps> = (props) => {
  if (!props.visible) return null;
  return <AssignSessionModalContent {...props} />;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '80%',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  listScroll: {
    marginVertical: theme.spacing.xs,
  },
  centerLoading: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  needBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
});
