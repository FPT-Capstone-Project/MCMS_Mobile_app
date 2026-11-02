import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  CultivationSessionAdmin,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface HarvestReadinessModalProps {
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin | null;
  onSuccess: () => Promise<void> | void;
}

export const HarvestReadinessModal: React.FC<HarvestReadinessModalProps> = ({
  visible,
  onClose,
  session,
  onSuccess,
}) => {
  if (!visible || !session) return null;

  return (
    <HarvestReadinessModalContent
      visible={visible}
      onClose={onClose}
      session={session}
      onSuccess={onSuccess}
    />
  );
};

const HarvestReadinessModalContent: React.FC<{
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin;
  onSuccess: () => Promise<void> | void;
}> = ({ visible, onClose, session, onSuccess }) => {
  const [harvestReady, setHarvestReady] = useState(
    () => session.harvest_status === 'HARVEST_READY' || Boolean(session.harvest_ready)
  );
  const [notes, setNotes] = useState(() => session.notes || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentStage = (session.growth_status || session.current_stage || '').toUpperCase();
  const isMaturation = currentStage === 'MATURATION';

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (harvestReady && !isMaturation) {
      Alert.alert(
        'Cảnh báo giai đoạn',
        'Backend yêu cầu phiên phải đạt giai đoạn Trưởng thành (MATURATION) để được xác nhận Sẵn sàng thu hoạch. Bạn có chắc chắn muốn gửi không?',
        [
          { text: 'Kiểm tra lại', style: 'cancel' },
          { text: 'Vẫn gửi', onPress: () => doSubmit() },
        ]
      );
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      await iotRepository.updateHarvestReadiness(session.session_id, {
        harvestReady,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Thành công',
        harvestReady
          ? `Đã xác nhận phiên #${session.session_id} SẴN SÀNG THU HOẠCH. Khách hàng đã được thông báo và có thể lên lịch thu hoạch.`
          : `Đã cập nhật trạng thái thu hoạch thành CHƯA SẴN SÀNG cho phiên #${session.session_id}.`
      );

      await onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.message ||
        'Không thể cập nhật đánh giá thu hoạch. Vui lòng kiểm tra lại điều kiện sinh trưởng.';
      setErrorMsg(msg);
      Alert.alert('Lỗi đánh giá thu hoạch', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" weight="bold">
                Đánh giá sẵn sàng thu hoạch
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name || 'Nấm giống'}
              </AppText>
            </View>
            <AppIconButton
              icon={<Ionicons name="close" size={22} color={theme.colors.text.secondary} />}
              size="sm"
              accessibilityLabel="Đóng"
              onPress={onClose}
            />
          </View>

          <AppDivider spacing="none" />

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Session Current Context */}
            <AppCard elevation="none" style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.info.main} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="bold">
                    Trạng thái hiện tại:
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    • Vòng đời: <AppText variant="caption" weight="bold">{session.status}</AppText>
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    • Giai đoạn sinh trưởng: <AppText variant="caption" weight="bold" color={isMaturation ? theme.colors.success.dark : theme.colors.warning.dark}>{currentStage || 'Chưa ghi nhận'}</AppText>
                  </AppText>
                  {session.progress_percent != null && (
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      • Tiến độ sinh trưởng: <AppText variant="caption" weight="bold">{session.progress_percent}%</AppText>
                    </AppText>
                  )}
                  {session.harvest_status && (
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      • Trạng thái thu hoạch: <AppText variant="caption" weight="bold">{session.harvest_status}</AppText>
                    </AppText>
                  )}
                </View>
              </View>
            </AppCard>

            {/* Validation Notice */}
            {!isMaturation ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color={theme.colors.warning.dark} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.warning.dark}>
                    Chưa đạt giai đoạn Trưởng thành (MATURATION)
                  </AppText>
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Hệ thống backend yêu cầu phiên phải đạt giai đoạn MATURATION mới được xác nhận đủ điều kiện thu hoạch. Nếu nấm đã sẵn sàng, hãy cập nhật tiến độ sinh trưởng lên MATURATION trước.
                  </AppText>
                </View>
              </View>
            ) : (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success.dark} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>
                    Đã đạt giai đoạn Trưởng thành (MATURATION)
                  </AppText>
                  <AppText variant="caption" color={theme.colors.success.dark}>
                    Phiên đủ điều kiện sinh trưởng để tiến hành đánh giá sẵn sàng thu hoạch.
                  </AppText>
                </View>
              </View>
            )}

            {/* Assessment Option Selection */}
            <View style={styles.section}>
              <AppText variant="label" weight="bold" style={styles.sectionLabel}>
                KẾT QUẢ ĐÁNH GIÁ THU HOẠCH
              </AppText>

              <Pressable
                style={[
                  styles.optionCard,
                  harvestReady && styles.optionCardActiveReady,
                ]}
                onPress={() => setHarvestReady(true)}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radioDot, harvestReady && styles.radioDotActiveReady]}>
                    {harvestReady && <View style={styles.radioInnerReady} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodySmall"
                      weight="bold"
                      color={harvestReady ? theme.colors.success.dark : theme.colors.text.primary}
                    >
                      SẴN SÀNG THU HOẠCH (HARVEST_READY)
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Thể quả nấm đã phát triển hoàn chỉnh, tán mũ mở rộng đều, không có dấu hiệu bệnh hại hoặc sự cố nghiêm trọng. Thông báo khách hàng chuẩn bị thu hoạch.
                    </AppText>
                  </View>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.optionCard,
                  !harvestReady && styles.optionCardActiveNotReady,
                ]}
                onPress={() => setHarvestReady(false)}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radioDot, !harvestReady && styles.radioDotActiveNotReady]}>
                    {!harvestReady && <View style={styles.radioInnerNotReady} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodySmall"
                      weight="bold"
                      color={!harvestReady ? theme.colors.warning.dark : theme.colors.text.primary}
                    >
                      CHƯA SẴN SÀNG (NOT_READY)
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Cần thêm thời gian nuôi trồng hoặc khắc phục các yếu tố môi trường trước khi thu hoạch.
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Notes Field */}
            <View style={styles.section}>
              <AppText variant="label" weight="bold" style={styles.sectionLabel}>
                GHI CHÚ ĐÁNH GIÁ (Tùy chọn)
              </AppText>
              <TextInput
                style={styles.textArea}
                placeholder="Nhập nhận xét về màu sắc, kích thước tai nấm, độ xòe mũ hoặc hướng dẫn thu hoạch..."
                placeholderTextColor={theme.colors.text.muted}
                multiline
                numberOfLines={4}
                maxLength={1000}
                value={notes}
                onChangeText={setNotes}
              />
              <AppText variant="caption" color={theme.colors.text.muted} align="right">
                {notes.length}/1000 ký tự
              </AppText>
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1 }}>
                  {errorMsg}
                </AppText>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.footer}>
            <AppButton
              title="Hủy"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <AppButton
              title={loading ? 'Đang lưu...' : 'Xác nhận đánh giá'}
              variant={harvestReady ? 'primary' : 'secondary'}
              size="md"
              onPress={handleSubmit}
              disabled={loading}
              style={{ flex: 1.5 }}
              leftIcon={
                loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                )
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  content: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: 16,
  },
  contextCard: {
    backgroundColor: theme.colors.neutral[50],
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 10,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    gap: 10,
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    gap: 10,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    color: theme.colors.text.secondary,
  },
  optionCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  optionCardActiveReady: {
    borderColor: theme.colors.success.main,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  optionCardActiveNotReady: {
    borderColor: theme.colors.warning.main,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDotActiveReady: {
    borderColor: theme.colors.success.main,
  },
  radioInnerReady: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success.main,
  },
  radioDotActiveNotReady: {
    borderColor: theme.colors.warning.main,
  },
  radioInnerNotReady: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.warning.main,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.neutral[50],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
});
