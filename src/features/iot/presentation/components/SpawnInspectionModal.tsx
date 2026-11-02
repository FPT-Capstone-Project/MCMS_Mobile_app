import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
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
  RecordSpawnInspectionRequest,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface SpawnInspectionModalProps {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SpawnInspectionModal: React.FC<SpawnInspectionModalProps> = ({
  visible,
  session,
  onClose,
  onSuccess,
}) => {
  if (!visible || !session) return null;

  return (
    <SpawnInspectionModalContent
      visible={visible}
      session={session}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

const SpawnInspectionModalContent: React.FC<{
  visible: boolean;
  session: CultivationSessionAdmin;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, session, onClose, onSuccess }) => {
  const requiredTrays = session.required_trays || session.tray_count || 1;
  const expectedSpawnBags = requiredTrays * 3;

  const [totalChecked, setTotalChecked] = useState(String(expectedSpawnBags));
  const [normalQuantity, setNormalQuantity] = useState(String(expectedSpawnBags));
  const [warningQuantity, setWarningQuantity] = useState('0');
  const [abnormalQuantity, setAbnormalQuantity] = useState('0');
  const [condition, setCondition] = useState<'NORMAL' | 'WARNING' | 'ABNORMAL'>('NORMAL');
  const [replacementQuantity, setReplacementQuantity] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto update condition when quantities change
  const handleNormalChange = (val: string) => {
    setNormalQuantity(val);
    const n = parseInt(val, 10) || 0;
    const w = parseInt(warningQuantity, 10) || 0;
    const a = parseInt(abnormalQuantity, 10) || 0;
    if (a > 0) setCondition('ABNORMAL');
    else if (w > 0) setCondition('WARNING');
    else if (n > 0) setCondition('NORMAL');
  };

  const handleWarningChange = (val: string) => {
    setWarningQuantity(val);
    const w = parseInt(val, 10) || 0;
    const a = parseInt(abnormalQuantity, 10) || 0;
    if (a > 0) setCondition('ABNORMAL');
    else if (w > 0) setCondition('WARNING');
    else setCondition('NORMAL');
  };

  const handleAbnormalChange = (val: string) => {
    setAbnormalQuantity(val);
    const a = parseInt(val, 10) || 0;
    const w = parseInt(warningQuantity, 10) || 0;
    if (a > 0) {
      setCondition('ABNORMAL');
      setReplacementQuantity(String(a));
    } else if (w > 0) {
      setCondition('WARNING');
    } else {
      setCondition('NORMAL');
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const total = parseInt(totalChecked, 10);
    const normal = parseInt(normalQuantity, 10) || 0;
    const warning = parseInt(warningQuantity, 10) || 0;
    const abnormal = parseInt(abnormalQuantity, 10) || 0;
    const replacement = parseInt(replacementQuantity, 10) || 0;

    if (isNaN(total) || total < 1) {
      setErrorMessage('Số lượng phôi kiểm tra phải lớn hơn hoặc bằng 1.');
      return;
    }

    if (normal + warning + abnormal !== total) {
      setErrorMessage(
        `Tổng số bịch (${normal + warning + abnormal}) không khớp với số đã kiểm tra (${total}).`
      );
      return;
    }

    setLoading(true);
    try {
      const payload: RecordSpawnInspectionRequest = {
        totalChecked: total,
        normalQuantity: normal,
        warningQuantity: warning,
        abnormalQuantity: abnormal,
        condition,
        replacementQuantity: replacement > 0 ? replacement : undefined,
        notes: notes.trim() || undefined,
      };

      await iotRepository.recordSpawnInspection(session.session_id, payload);

      Alert.alert(
        'Đã lưu kết quả kiểm tra',
        condition === 'NORMAL' && total >= expectedSpawnBags
          ? 'Đợt kiểm tra đạt chuẩn (NORMAL) và đủ số lượng bịch phôi. Phiên đã đủ điều kiện để chuyển sang SẴN SÀNG TRỒNG (READY_FOR_CULTIVATION).'
          : 'Kết quả kiểm tra phôi đã được lưu thành công vào lịch sử.',
        [{ text: 'Đóng', onPress: onSuccess }]
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể lưu kết quả kiểm tra phôi. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">
                Kiểm tra phôi nấm
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

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Standards Info Banner */}
            <AppCard elevation="xs" style={styles.infoBanner}>
              <View style={styles.infoBannerRow}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary[600]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.primary[800]}>
                    Quy chuẩn phôi giống SmartMush:
                  </AppText>
                  <AppText variant="caption" color={theme.colors.primary[700]}>
                    Mỗi khay tiêu chuẩn cần đúng 3 bịch phôi. Phiên này cần {requiredTrays} khay ({expectedSpawnBags} bịch phôi). Đợt kiểm tra phải đạt chuẩn NORMAL và kiểm tra đủ {expectedSpawnBags} bịch để được chuyển sang Sẵn sàng trồng.
                  </AppText>
                </View>
              </View>
            </AppCard>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error.dark} />
                <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1 }}>
                  {errorMessage}
                </AppText>
              </View>
            )}

            {/* Total checked */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Tổng số bịch phôi kiểm tra:
              </AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={totalChecked}
                onChangeText={setTotalChecked}
                placeholder={`Mặc định: ${expectedSpawnBags}`}
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>

            {/* Quantity Breakdown Grid */}
            <View style={styles.breakdownGrid}>
              {/* Normal */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.success.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.success.dark}>
                    Đạt chuẩn (Normal)
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputNormal]}
                  keyboardType="numeric"
                  value={normalQuantity}
                  onChangeText={handleNormalChange}
                  placeholder="0"
                />
              </View>

              {/* Warning */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.warning.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.warning.dark}>
                    Cảnh báo (Warning)
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputWarning]}
                  keyboardType="numeric"
                  value={warningQuantity}
                  onChangeText={handleWarningChange}
                  placeholder="0"
                />
              </View>

              {/* Abnormal */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.error.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.error.dark}>
                    Lỗi / Hư (Abnormal)
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputAbnormal]}
                  keyboardType="numeric"
                  value={abnormalQuantity}
                  onChangeText={handleAbnormalChange}
                  placeholder="0"
                />
              </View>
            </View>

            {/* Condition Picker */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Đánh giá tổng thể đợt kiểm tra:
              </AppText>
              <View style={styles.conditionRow}>
                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'NORMAL' && styles.conditionBtnNormalActive,
                  ]}
                  onPress={() => setCondition('NORMAL')}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={condition === 'NORMAL' ? '#FFFFFF' : theme.colors.success.main}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'NORMAL' ? '#FFFFFF' : theme.colors.success.dark}
                  >
                    Đạt chuẩn
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'WARNING' && styles.conditionBtnWarningActive,
                  ]}
                  onPress={() => setCondition('WARNING')}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={condition === 'WARNING' ? '#FFFFFF' : theme.colors.warning.dark}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'WARNING' ? '#FFFFFF' : theme.colors.warning.dark}
                  >
                    Cảnh báo
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'ABNORMAL' && styles.conditionBtnAbnormalActive,
                  ]}
                  onPress={() => setCondition('ABNORMAL')}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={condition === 'ABNORMAL' ? '#FFFFFF' : theme.colors.error.dark}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'ABNORMAL' ? '#FFFFFF' : theme.colors.error.dark}
                  >
                    Bất thường
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Replacement Quantity */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Số lượng bịch phôi thay thế từ kho (nếu có):
              </AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={replacementQuantity}
                onChangeText={setReplacementQuantity}
                placeholder="0"
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Ghi chú kiểm tra (tình trạng tơ nấm, màu sắc, ẩm độ):
              </AppText>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ví dụ: Tơ nấm ăn kín 90%, trắng đều, không có dấu hiệu mốc xanh hay vi khuẩn."
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footerRow}>
            <AppButton
              title="Hủy"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <AppButton
              title={loading ? 'Đang lưu...' : 'Lưu kết quả'}
              variant="primary"
              size="md"
              onPress={handleSubmit}
              disabled={loading}
              style={{ flex: 1 }}
            />
          </View>
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
    maxHeight: '90%',
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
  scrollArea: {
    maxHeight: 460,
  },
  infoBanner: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  infoBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  breakdownCol: {
    flex: 1,
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputNormal: {
    borderColor: theme.colors.success.main,
  },
  inputWarning: {
    borderColor: theme.colors.warning.main,
  },
  inputAbnormal: {
    borderColor: theme.colors.error.main,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  conditionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[50],
  },
  conditionBtnNormalActive: {
    backgroundColor: theme.colors.success.main,
    borderColor: theme.colors.success.dark,
  },
  conditionBtnWarningActive: {
    backgroundColor: theme.colors.warning.main,
    borderColor: theme.colors.warning.dark,
  },
  conditionBtnAbnormalActive: {
    backgroundColor: theme.colors.error.main,
    borderColor: theme.colors.error.dark,
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.md,
  },
});
