import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
  GrowthStage,
  ProgressHistoryItem,
  UpdateGrowthRequest,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface GrowthUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin;
  latestProgress?: ProgressHistoryItem | null;
  onSuccess: () => Promise<void> | void;
}

const GROWTH_STAGE_OPTIONS: { stage: GrowthStage; label: string; desc: string }[] = [
  {
    stage: 'FRUITING_INITIATION',
    label: '1. Kích nụ (FRUITING_INITIATION)',
    desc: 'Bắt đầu kích thích mầm quả thể nấm phát triển',
  },
  {
    stage: 'PINNING',
    label: '2. Hình thành mũ nấm (PINNING)',
    desc: 'Đầu đinh ghim, mũ nấm non li ti bắt đầu xuất hiện',
  },
  {
    stage: 'YOUNG_FRUITING',
    label: '3. Thể quả non (YOUNG_FRUITING)',
    desc: 'Quả thể nấm tăng trưởng nhanh, cuống dài ra',
  },
  {
    stage: 'MATURATION',
    label: '4. Trưởng thành (MATURATION)',
    desc: 'Mũ nấm căng rộng, viền mỏng, sẵn sàng cho thu hoạch',
  },
];

const CONDITION_PRESETS = [
  { label: 'Bình thường (NORMAL)', value: 'NORMAL' },
  { label: 'Phát triển tốt', value: 'Phát triển đồng đều, nụ khỏe mạnh' },
  { label: 'Chậm lớn', value: 'Tốc độ phát triển chậm hơn thông thường' },
  { label: 'Cần lưu ý ẩm độ', value: 'Độ ẩm chưa tối ưu, cần theo dõi phun sương' },
];

export const GrowthUpdateModal: React.FC<GrowthUpdateModalProps> = ({
  visible,
  onClose,
  session,
  latestProgress,
  onSuccess,
}) => {
  const initialPercent =
    latestProgress?.progress_percent != null
      ? Number(latestProgress.progress_percent)
      : session.progress_percent != null
      ? Number(session.progress_percent)
      : 0;

  const initialStage = (latestProgress?.current_stage ||
    session.current_stage ||
    session.growth_status ||
    'FRUITING_INITIATION') as GrowthStage;

  const [baselinePercent, setBaselinePercent] = useState<number>(initialPercent);
  const [baselineStage, setBaselineStage] = useState<GrowthStage>(initialStage);
  const [selectedStage, setSelectedStage] = useState<GrowthStage>(initialStage);
  const [progressPercent, setProgressPercent] = useState<string>(String(initialPercent));
  const [condition, setCondition] = useState<string>(
    latestProgress?.condition || session.condition || 'NORMAL'
  );
  const [notes, setNotes] = useState<string>(latestProgress?.description || '');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState<string>(
    latestProgress?.expected_harvest_date ||
      (session.harvest_date ? session.harvest_date.slice(0, 10) : '')
  );

  const [fetchingProgress, setFetchingProgress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Fetch real current session progress from server when opened
  useEffect(() => {
    if (!visible || !session?.session_id) return;
    let isMounted = true;

    const loadLatestSessionProgress = async () => {
      setFetchingProgress(true);
      setErrorText(null);
      try {
        const prog = await iotRepository.getSessionProgress(session.session_id);
        if (!isMounted) return;

        const resolvedStage = (prog.current_stage ||
          prog.growth_status ||
          prog.latest_progress?.current_stage ||
          latestProgress?.current_stage ||
          session.current_stage ||
          session.growth_status ||
          'FRUITING_INITIATION') as GrowthStage;

        const resolvedPercent =
          prog.progress_percent != null
            ? Number(prog.progress_percent)
            : prog.latest_progress?.progress_percent != null
            ? Number(prog.latest_progress.progress_percent)
            : latestProgress?.progress_percent != null
            ? Number(latestProgress.progress_percent)
            : session.progress_percent != null
            ? Number(session.progress_percent)
            : 0;

        const resolvedCondition =
          prog.latest_progress?.condition ||
          prog.condition ||
          latestProgress?.condition ||
          session.condition ||
          'NORMAL';

        const resolvedNotes =
          prog.latest_progress?.description ||
          latestProgress?.description ||
          '';

        const resolvedHarvestDate =
          prog.expected_harvest_date ||
          prog.latest_progress?.expected_harvest_date ||
          latestProgress?.expected_harvest_date ||
          (session.harvest_date ? session.harvest_date.slice(0, 10) : '');

        setBaselinePercent(resolvedPercent);
        setBaselineStage(resolvedStage);
        setSelectedStage(resolvedStage);
        setProgressPercent(String(resolvedPercent));
        setCondition(resolvedCondition);
        setNotes(resolvedNotes);
        setExpectedHarvestDate(resolvedHarvestDate);
      } catch {
        if (!isMounted) return;
        const fallbackPercent =
          latestProgress?.progress_percent != null
            ? Number(latestProgress.progress_percent)
            : session.progress_percent != null
            ? Number(session.progress_percent)
            : 0;
        const fallbackStage = (latestProgress?.current_stage ||
          session.current_stage ||
          session.growth_status ||
          'FRUITING_INITIATION') as GrowthStage;

        setBaselinePercent(fallbackPercent);
        setBaselineStage(fallbackStage);
        setSelectedStage(fallbackStage);
        setProgressPercent(String(fallbackPercent));
        setCondition(latestProgress?.condition || session.condition || 'NORMAL');
        setNotes(latestProgress?.description || '');
        setExpectedHarvestDate(
          latestProgress?.expected_harvest_date ||
            (session.harvest_date ? session.harvest_date.slice(0, 10) : '')
        );
      } finally {
        if (isMounted) {
          setFetchingProgress(false);
        }
      }
    };

    void loadLatestSessionProgress();

    return () => {
      isMounted = false;
    };
  }, [
    visible,
    session.session_id,
    session.condition,
    session.current_stage,
    session.growth_status,
    session.harvest_date,
    session.progress_percent,
    latestProgress,
  ]);

  const handleQuickAddPercent = (delta: number) => {
    const cur = Number(progressPercent) || baselinePercent;
    const next = Math.min(100, Math.max(baselinePercent, cur + delta));
    setProgressPercent(String(next));
  };

  const handleSubmit = async () => {
    setErrorText(null);
    const nPercent = Number(progressPercent);

    if (isNaN(nPercent) || nPercent < 0 || nPercent > 100) {
      setErrorText('Tiến độ phải là số nguyên hoặc thập phân từ 0 đến 100%.');
      return;
    }

    if (nPercent < baselinePercent) {
      setErrorText(`Tiến độ không được giảm so với ghi nhận hiện tại (${baselinePercent}%).`);
      return;
    }

    // Backend rule: Cannot move backwards if already reached MATURATION
    if (baselineStage === 'MATURATION' && selectedStage !== 'MATURATION') {
      setErrorText('Phiên đã đạt giai đoạn Trưởng thành (MATURATION), không thể chuyển ngược về giai đoạn trước.');
      return;
    }

    if (!condition.trim()) {
      setErrorText('Vui lòng nhập hoặc chọn tình trạng sinh trưởng quan sát.');
      return;
    }

    if (expectedHarvestDate.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expectedHarvestDate.trim())) {
        setErrorText('Ngày dự kiến thu hoạch phải có định dạng YYYY-MM-DD (VD: 2026-11-20).');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: UpdateGrowthRequest = {
        growthStatus: selectedStage,
        progressPercent: nPercent,
        condition: condition.trim(),
        notes: notes.trim() || undefined,
        expectedHarvestDate: expectedHarvestDate.trim() || undefined,
      };

      await iotRepository.updateSessionGrowth(session.session_id, payload);

      Alert.alert(
        'Cập nhật thành công',
        'Ghi nhận sinh trưởng mới đã được lưu. Lưu ý: Hệ thống đã đặt lại trạng thái sẵn sàng thu hoạch (harvest_status = NOT_READY) và cần được đánh giá lại trước khi thu hoạch.'
      );

      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Không thể cập nhật sinh trưởng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">
                Cập nhật sinh trưởng
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name || 'Nấm'}
              </AppText>
            </View>
            <AppIconButton
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              size="sm"
              accessibilityLabel="Đóng"
              onPress={onClose}
              disabled={loading}
            />
          </View>

          <AppDivider spacing="sm" />

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Loading Banner when fetching real progress */}
            {fetchingProgress && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                <AppText variant="caption" weight="medium" color={theme.colors.primary[700]} style={{ marginLeft: 8 }}>
                  Đang tải tiến độ hiện tại của phiên từ máy chủ...
                </AppText>
              </View>
            )}

            {/* Warning banner about harvest readiness reset */}
            <AppCard elevation="xs" style={styles.noticeCard}>
              <View style={styles.noticeRow}>
                <Ionicons name="information-circle" size={20} color={theme.colors.info.main} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.info.dark}>
                    Quy tắc nghiệp vụ hệ thống
                  </AppText>
                  <AppText variant="caption" color={theme.colors.info.dark} style={{ marginTop: 2 }}>
                    Mỗi lần ghi nhận sinh trưởng mới, trạng thái sẵn sàng thu hoạch sẽ tự động đặt lại (NOT_READY) để đảm bảo chất lượng nấm được đánh giá mới nhất.
                  </AppText>
                </View>
              </View>
            </AppCard>

            {errorText && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1, marginLeft: 6 }}>
                  {errorText}
                </AppText>
              </View>
            )}

            {/* 1. Select Growth Stage */}
            <AppText variant="label" weight="bold" style={styles.sectionTitle}>
              1. Giai đoạn sinh trưởng hiện tại
            </AppText>

            <View style={styles.stagesContainer}>
              {GROWTH_STAGE_OPTIONS.map((item) => {
                const isSelected = selectedStage === item.stage;
                return (
                  <Pressable
                    key={item.stage}
                    style={[styles.stageOptionCard, isSelected && styles.stageOptionCardActive]}
                    onPress={() => setSelectedStage(item.stage)}
                    disabled={loading}
                  >
                    <View style={styles.stageRadioRow}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText
                          variant="bodySmall"
                          weight="bold"
                          color={isSelected ? theme.colors.primary[800] : theme.colors.text.primary}
                        >
                          {item.label}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          {item.desc}
                        </AppText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* 2. Progress Percent */}
            <View style={styles.sectionHeaderRow}>
              <AppText variant="label" weight="bold" style={styles.sectionTitle}>
                2. Tiến độ sinh trưởng (%)
              </AppText>
              <View style={styles.currentPercentBadge}>
                <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                  Hiện tại: {baselinePercent}%
                </AppText>
              </View>
            </View>

            {/* Quick Increment Buttons */}
            <View style={styles.quickPercentRow}>
              <Pressable
                style={styles.quickPercentBtn}
                onPress={() => setProgressPercent(String(baselinePercent))}
                disabled={loading}
              >
                <AppText variant="caption" weight="medium" color={theme.colors.text.secondary}>
                  Giữ {baselinePercent}%
                </AppText>
              </Pressable>
              {[5, 10, 20].map((delta) => (
                <Pressable
                  key={delta}
                  style={styles.quickPercentBtn}
                  onPress={() => handleQuickAddPercent(delta)}
                  disabled={loading}
                >
                  <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                    +{delta}%
                  </AppText>
                </Pressable>
              ))}
              <Pressable
                style={[styles.quickPercentBtn, styles.quickPercentBtnMax]}
                onPress={() => setProgressPercent('100')}
                disabled={loading}
              >
                <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>
                  100%
                </AppText>
              </Pressable>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={progressPercent}
                onChangeText={setProgressPercent}
                keyboardType="numeric"
                placeholder="VD: 25, 50, 100"
                placeholderTextColor={theme.colors.text.muted}
                editable={!loading}
              />
              <AppText variant="bodySmall" weight="bold" color={theme.colors.text.secondary}>
                %
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 4 }}>
              Tiến độ lần trước: {baselinePercent}%. Tiến độ chỉ tăng dần hoặc giữ nguyên, không được giảm.
            </AppText>

            {/* 3. Growth Condition */}
            <AppText variant="label" weight="bold" style={styles.sectionTitle}>
              3. Tình trạng quan sát & hình thái
            </AppText>

            <View style={styles.conditionChipsRow}>
              {CONDITION_PRESETS.map((preset) => {
                const isChosen = condition === preset.value;
                return (
                  <Pressable
                    key={preset.value}
                    style={[styles.conditionChip, isChosen && styles.conditionChipActive]}
                    onPress={() => setCondition(preset.value)}
                  >
                    <AppText
                      variant="caption"
                      weight={isChosen ? 'bold' : 'normal'}
                      color={isChosen ? theme.colors.primary[700] : theme.colors.text.secondary}
                    >
                      {preset.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={condition}
                onChangeText={setCondition}
                placeholder="Nhập tình trạng quan sát cụ thể..."
                placeholderTextColor={theme.colors.text.muted}
                editable={!loading}
              />
            </View>

            {/* 4. Expected Harvest Date */}
            <AppText variant="label" weight="bold" style={styles.sectionTitle}>
              4. Ngày dự kiến thu hoạch (YYYY-MM-DD)
            </AppText>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.text.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={expectedHarvestDate}
                onChangeText={setExpectedHarvestDate}
                placeholder="VD: 2026-11-25 (tùy chọn)"
                placeholderTextColor={theme.colors.text.muted}
                editable={!loading}
              />
            </View>

            {/* 5. Notes */}
            <AppText variant="label" weight="bold" style={styles.sectionTitle}>
              5. Ghi chú thêm
            </AppText>
            <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.textInput, { flex: 1, height: '100%', textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Ghi chú thêm về nấm non, màu sắc, mật độ..."
                placeholderTextColor={theme.colors.text.muted}
                editable={!loading}
              />
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }}>
              <AppButton title="Hủy" variant="ghost" size="md" onPress={onClose} disabled={loading} />
            </View>
            <View style={{ flex: 2 }}>
              <AppButton
                title={loading ? 'Đang lưu...' : 'Lưu ghi nhận sinh trưởng'}
                variant="primary"
                size="md"
                onPress={handleSubmit}
                disabled={loading}
                leftIcon={loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
              />
            </View>
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
    backgroundColor: '#FFFFFF',
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
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formScroll: {
    marginTop: theme.spacing.sm,
  },
  noticeCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
    borderWidth: 1,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  stagesContainer: {
    gap: 8,
  },
  stageOptionCard: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  stageOptionCardActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  stageRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: theme.colors.primary[600],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary[600],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  conditionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  conditionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  conditionChipActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[400],
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.sm,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPercentBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  quickPercentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  quickPercentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  quickPercentBtnMax: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
});
