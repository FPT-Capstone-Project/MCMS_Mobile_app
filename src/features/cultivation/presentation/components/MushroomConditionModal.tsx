import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppDivider,
  AppInput,
  AppText,
} from '../../../../shared/components';
import { cultivationRepository } from '../../data/repositories/CultivationRepository';
import {
  CreateMushroomConditionRequest,
  MushroomCondition,
  MushroomType,
} from '../../domain/entities/Cultivation';
import { createMushroomConditionSchema } from '../../domain/schemas/conditionSchemas';

export interface MushroomConditionModalProps {
  visible: boolean;
  onClose: () => void;
  mushroom: MushroomType | null;
  existingCondition: MushroomCondition | null;
  onSuccess: (condition: MushroomCondition) => void;
}

interface FormState {
  temperatureMin: string;
  temperatureMax: string;
  humidityMin: string;
  humidityMax: string;
}

const INITIAL_FORM: FormState = {
  temperatureMin: '',
  temperatureMax: '',
  humidityMin: '',
  humidityMax: '',
};

function getInitialForm(existingCondition: MushroomCondition | null): FormState {
  if (!existingCondition) {
    return INITIAL_FORM;
  }
  return {
    temperatureMin:
      existingCondition.temperature_min != null
        ? String(existingCondition.temperature_min)
        : '',
    temperatureMax:
      existingCondition.temperature_max != null
        ? String(existingCondition.temperature_max)
        : '',
    humidityMin:
      existingCondition.humidity_min != null
        ? String(existingCondition.humidity_min)
        : '',
    humidityMax:
      existingCondition.humidity_max != null
        ? String(existingCondition.humidity_max)
        : '',
  };
}

interface ConditionFormSheetProps {
  onClose: () => void;
  mushroom: MushroomType | null;
  existingCondition: MushroomCondition | null;
  onSuccess: (condition: MushroomCondition) => void;
}

const ConditionFormSheet: React.FC<ConditionFormSheetProps> = ({
  onClose,
  mushroom,
  existingCondition,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(() => getInitialForm(existingCondition));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isEditing = Boolean(existingCondition);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const parseNumberOrNull = (val: string): number | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  };

  const handleSubmit = async () => {
    if (!mushroom) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin loại nấm.');
      return;
    }

    setApiError(null);
    setErrors({});

    const payload: CreateMushroomConditionRequest = {
      mushroomTypeId: mushroom.mushroom_type_id,
      temperatureMin: parseNumberOrNull(form.temperatureMin),
      temperatureMax: parseNumberOrNull(form.temperatureMax),
      humidityMin: parseNumberOrNull(form.humidityMin),
      humidityMax: parseNumberOrNull(form.humidityMax),
    };

    // Validate with Zod
    const validationResult = createMushroomConditionSchema.safeParse(payload);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string') {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      let result: MushroomCondition;
      if (isEditing && existingCondition) {
        result = await cultivationRepository.updateMushroomCondition(
          existingCondition.condition_id,
          payload
        );
      } else {
        result = await cultivationRepository.createMushroomCondition(payload);
      }

      Alert.alert(
        'Thành công',
        isEditing
          ? 'Đã cập nhật điều kiện sinh trưởng thành công.'
          : 'Đã gán điều kiện sinh trưởng cho nấm thành công.'
      );
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg =
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể lưu điều kiện sinh trưởng.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTexts}>
              <AppText variant="title" weight="bold">
                {isEditing ? 'Chỉnh sửa điều kiện' : 'Thiết lập điều kiện'}
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Giống nấm: <AppText variant="caption" weight="bold">{mushroom?.name}</AppText>
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </View>

          <AppDivider spacing="sm" />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* API Error Notification */}
            {apiError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                <AppText variant="caption" color={theme.colors.error.main} style={styles.errorText}>
                  {apiError}
                </AppText>
              </View>
            )}

            {/* 1. Temperature Section */}
            <View style={styles.fieldSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="thermometer" size={16} color={theme.colors.warning.main} />
                <AppText variant="label" weight="bold">
                  Nhiệt độ môi trường (°C)
                </AppText>
              </View>
              <View style={styles.rowTwoCols}>
                <View style={styles.col}>
                  <AppInput
                    label="Tối thiểu (Min)"
                    placeholder="VD: 18"
                    keyboardType="numeric"
                    value={form.temperatureMin}
                    onChangeText={(t) => handleChange('temperatureMin', t)}
                    error={errors.temperatureMin}
                  />
                </View>
                <View style={styles.col}>
                  <AppInput
                    label="Tối đa (Max)"
                    placeholder="VD: 24"
                    keyboardType="numeric"
                    value={form.temperatureMax}
                    onChangeText={(t) => handleChange('temperatureMax', t)}
                    error={errors.temperatureMax}
                  />
                </View>
              </View>
            </View>

            {/* 2. Humidity Section (Độ ẩm không khí) */}
            <View style={styles.fieldSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="water" size={16} color={theme.colors.primary[500]} />
                <AppText variant="label" weight="bold">
                  Độ ẩm không khí (%)
                </AppText>
              </View>
              <View style={styles.rowTwoCols}>
                <View style={styles.col}>
                  <AppInput
                    label="Tối thiểu (Min)"
                    placeholder="VD: 80"
                    keyboardType="numeric"
                    value={form.humidityMin}
                    onChangeText={(t) => handleChange('humidityMin', t)}
                    error={errors.humidityMin}
                  />
                </View>
                <View style={styles.col}>
                  <AppInput
                    label="Tối đa (Max)"
                    placeholder="VD: 90"
                    keyboardType="numeric"
                    value={form.humidityMax}
                    onChangeText={(t) => handleChange('humidityMax', t)}
                    error={errors.humidityMax}
                  />
                </View>
              </View>
            </View>


            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <View style={styles.actionCol}>
                <AppButton
                  title="Hủy"
                  variant="outline"
                  onPress={onClose}
                  disabled={submitting}
                />
              </View>
              <View style={styles.actionCol}>
                <AppButton
                  title={isEditing ? 'Lưu thay đổi' : 'Gán điều kiện'}
                  variant="primary"
                  onPress={handleSubmit}
                  loading={submitting}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export const MushroomConditionModal: React.FC<MushroomConditionModalProps> = ({
  visible,
  onClose,
  mushroom,
  existingCondition,
  onSuccess,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible ? (
        <ConditionFormSheet
          key={`${existingCondition?.condition_id ?? 'create'}_${mushroom?.mushroom_type_id ?? 'none'}`}
          onClose={onClose}
          mushroom={mushroom}
          existingCondition={existingCondition}
          onSuccess={onSuccess}
        />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
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
    width: 36,
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
  closeBtn: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.full,
  },
  scrollContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  fieldSection: {
    gap: theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  col: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  actionCol: {
    flex: 1,
  },
});
