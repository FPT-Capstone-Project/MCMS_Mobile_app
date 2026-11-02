import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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
  HarvestItem,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface HarvestActionModalProps {
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin | null;
  onSuccess: () => Promise<void> | void;
}

export const HarvestActionModal: React.FC<HarvestActionModalProps> = ({
  visible,
  onClose,
  session,
  onSuccess,
}) => {
  if (!visible || !session) return null;

  return (
    <HarvestActionModalContent
      visible={visible}
      onClose={onClose}
      session={session}
      onSuccess={onSuccess}
    />
  );
};

const HarvestActionModalContent: React.FC<{
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin;
  onSuccess: () => Promise<void> | void;
}> = ({ visible, onClose, session, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [harvest, setHarvest] = useState<HarvestItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yield inputs
  const [totalWeight, setTotalWeight] = useState('');
  const [usableWeight, setUsableWeight] = useState('');
  const [rejectedWeight, setRejectedWeight] = useState('');
  const [qualityGrade, setQualityGrade] = useState('A');
  const [yieldNotes, setYieldNotes] = useState('');

  // Fetch or find harvest record for this session
  const fetchHarvestInfo = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const harvests = await iotRepository.getAdminHarvests({
        orderId: session.order_id || undefined,
      });

      // Find harvest belonging to this session
      const found = harvests.find((h) => h.session_id === session.session_id);
      if (found) {
        // Fetch fresh detail
        try {
          const detail = await iotRepository.getHarvestDetail(found.harvest_id || (found as any).id);
          setHarvest(detail);
          if (detail.total_weight_kg != null) {
            setTotalWeight(String(detail.total_weight_kg));
          }
          if (detail.usable_weight_kg != null) {
            setUsableWeight(String(detail.usable_weight_kg));
          }
          if (detail.rejected_weight_kg != null) {
            setRejectedWeight(String(detail.rejected_weight_kg));
          }
          if (detail.quality_grade) {
            setQualityGrade(detail.quality_grade);
          }
          if (detail.notes) {
            setYieldNotes(detail.notes);
          }
        } catch {
          setHarvest(found);
        }
      } else {
        setHarvest(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải thông tin đợt thu hoạch.');
    } finally {
      setLoading(false);
    }
  }, [session.order_id, session.session_id]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        void fetchHarvestInfo();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchHarvestInfo]);

  // 1. Create Planned Harvest
  const handleCreateHarvest = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const created = await iotRepository.createHarvest(session.session_id);
      Alert.alert(
        'Đã lập kế hoạch thu hoạch',
        `Đã tạo thành công đợt thu hoạch #${created.harvest_id || (created as any).id} cho phiên #${session.session_id}.`
      );
      await fetchHarvestInfo();
      await onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Không thể tạo đợt thu hoạch.';
      setErrorMessage(msg);
      Alert.alert('Lỗi tạo thu hoạch', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Start Harvest
  const handleStartHarvest = async () => {
    if (!harvest) return;
    const harvestId = harvest.harvest_id || (harvest as any).id;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await iotRepository.startHarvest(harvestId);
      Alert.alert(
        'Bắt đầu thu hoạch',
        `Đợt thu hoạch #${harvestId} đã bắt đầu (IN_PROGRESS). Phiên nuôi trồng đã chuyển sang trạng thái ĐANG THU HOẠCH.`
      );
      await fetchHarvestInfo();
      await onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Không thể bắt đầu thu hoạch.';
      setErrorMessage(msg);
      Alert.alert('Lỗi bắt đầu thu hoạch', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Record Yield
  const handleRecordYield = async () => {
    if (!harvest) return;
    const harvestId = harvest.harvest_id || (harvest as any).id;

    const total = parseFloat(totalWeight.replace(',', '.'));
    const usable = parseFloat(usableWeight.replace(',', '.'));
    const rejected = parseFloat(rejectedWeight.replace(',', '.'));

    if (isNaN(total) || total <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập tổng khối lượng thu hoạch hợp lệ (> 0 kg).');
      return;
    }
    if (isNaN(usable) || usable < 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập khối lượng đạt chuẩn hợp lệ (>= 0 kg).');
      return;
    }
    if (isNaN(rejected) || rejected < 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập khối lượng loại bỏ hợp lệ (>= 0 kg).');
      return;
    }

    // Backend validation: usable + rejected must equal total (allowing slight float epsilon)
    if (Math.abs(usable + rejected - total) > 0.001) {
      Alert.alert(
        'Sai lệch khối lượng',
        `Tổng khối lượng (${total} kg) phải bằng chính xác: Đạt chuẩn (${usable} kg) + Loại bỏ (${rejected} kg) = ${Number((usable + rejected).toFixed(3))} kg.`
      );
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await iotRepository.recordHarvestYield(harvestId, {
        totalWeightKg: total,
        usableWeightKg: usable,
        rejectedWeightKg: rejected,
        qualityGrade: qualityGrade.trim().toUpperCase() || undefined,
        notes: yieldNotes.trim() || undefined,
      });

      Alert.alert('Thành công', 'Đã ghi nhận sản lượng thực tế thành công.');
      await fetchHarvestInfo();
      await onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Không thể ghi nhận sản lượng.';
      setErrorMessage(msg);
      Alert.alert('Lỗi ghi nhận sản lượng', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Complete Harvest
  const handleCompleteHarvest = async () => {
    if (!harvest) return;
    const harvestId = harvest.harvest_id || (harvest as any).id;

    if (!harvest.total_weight_kg && !totalWeight) {
      Alert.alert('Chưa ghi nhận sản lượng', 'Bạn cần ghi nhận sản lượng trước khi hoàn thành đợt thu hoạch.');
      return;
    }

    Alert.alert(
      'Xác nhận hoàn thành thu hoạch',
      `Bạn có chắc chắn muốn kết thúc đợt thu hoạch #${harvestId}? Sau khi hoàn thành, nhân viên sẽ tiến hành bàn giao nông sản cho khách hàng.`,
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Hoàn thành',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            setErrorMessage(null);
            try {
              await iotRepository.completeHarvest(harvestId);
              Alert.alert(
                'Hoàn thành thu hoạch',
                `Đợt thu hoạch #${harvestId} đã HOÀN THÀNH (COMPLETED). Vui lòng thực hiện thủ tục bàn giao nông sản cho khách.`
              );
              await fetchHarvestInfo();
              await onSuccess();
            } catch (err: any) {
              const msg = err?.message || 'Không thể hoàn tất đợt thu hoạch.';
              setErrorMessage(msg);
              Alert.alert('Lỗi hoàn tất thu hoạch', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const calcSum = () => {
    const u = parseFloat(usableWeight.replace(',', '.')) || 0;
    const r = parseFloat(rejectedWeight.replace(',', '.')) || 0;
    return Number((u + r).toFixed(3));
  };

  const parsedTotal = parseFloat(totalWeight.replace(',', '.')) || 0;
  const isYieldBalanced = parsedTotal > 0 && Math.abs(calcSum() - parsedTotal) <= 0.001;

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
                Quy trình Thu hoạch
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
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                  Đang tải thông tin thu hoạch...
                </AppText>
              </View>
            ) : (
              <>
                {/* Session Context Banner */}
                <AppCard elevation="none" style={styles.contextCard}>
                  <View style={styles.contextRow}>
                    <Ionicons name="leaf" size={20} color={theme.colors.primary[600]} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySmall" weight="bold">
                        Thông tin phiên trồng:
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        • Khách hàng: <AppText variant="caption" weight="bold">{session.customer_name || 'Khách hàng SmartMush'}</AppText>
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        • Trạng thái phiên: <AppText variant="caption" weight="bold">{session.status}</AppText>
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        • Đánh giá thu hoạch: <AppText variant="caption" weight="bold" color={theme.colors.success.dark}>{session.harvest_status || (session.harvest_ready ? 'HARVEST_READY' : 'NOT_READY')}</AppText>
                      </AppText>
                    </View>
                  </View>
                </AppCard>

                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                    <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1 }}>
                      {errorMessage}
                    </AppText>
                  </View>
                )}

                {/* CASE 1: No Harvest exists yet -> Button to create Planned Harvest */}
                {!harvest && (
                  <View style={styles.stepContainer}>
                    <View style={styles.stepHeader}>
                      <View style={styles.stepBadge}>
                        <AppText variant="caption" weight="bold" color="#FFFFFF">
                          BƯỚC 1
                        </AppText>
                      </View>
                      <AppText variant="bodySmall" weight="bold">
                        Lập kế hoạch thu hoạch (PLANNED)
                      </AppText>
                    </View>

                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Phiên đã được xác nhận sẵn sàng thu hoạch. Bấm nút bên dưới để tạo kế hoạch thu hoạch mới cho phiên này.
                    </AppText>

                    <AppButton
                      title={actionLoading ? 'Đang tạo kế hoạch...' : 'Tạo kế hoạch thu hoạch'}
                      variant="primary"
                      size="md"
                      onPress={handleCreateHarvest}
                      disabled={actionLoading}
                      leftIcon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
                    />
                  </View>
                )}

                {/* CASE 2: Harvest Exists */}
                {harvest && (
                  <View style={styles.harvestDetailBox}>
                    {/* Harvest status summary */}
                    <View style={styles.harvestStatusHeader}>
                      <View>
                        <AppText variant="bodySmall" weight="bold">
                          Đợt thu hoạch #{harvest.harvest_id || (harvest as any).id}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Phương thức nhận: {harvest.harvest_method === 'PICKUP' ? 'Khách tự hái tại farm (PICKUP)' : 'Giao hàng tận nơi (DELIVERY)'}
                        </AppText>
                        {harvest.scheduled_at && (
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Lịch hẹn: {new Date(harvest.scheduled_at).toLocaleString('vi-VN')}
                          </AppText>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          harvest.status === 'PLANNED'
                            ? styles.badgePlanned
                            : harvest.status === 'IN_PROGRESS'
                            ? styles.badgeInProgress
                            : styles.badgeCompleted,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={
                            harvest.status === 'PLANNED'
                              ? theme.colors.warning.dark
                              : harvest.status === 'IN_PROGRESS'
                              ? theme.colors.info.dark
                              : theme.colors.success.dark
                          }
                        >
                          {harvest.status}
                        </AppText>
                      </View>
                    </View>

                    <AppDivider spacing="sm" />

                    {/* SUB-STEP A: Start Harvest (if PLANNED) */}
                    {harvest.status === 'PLANNED' && (
                      <View style={styles.actionSection}>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          Bắt đầu quy trình thu hoạch sẽ chuyển trạng thái phiên nuôi trồng sang ĐANG THU HOẠCH (HARVESTING).
                        </AppText>
                        <AppButton
                          title={actionLoading ? 'Đang khởi động...' : 'Bắt đầu thu hoạch ngay'}
                          variant="primary"
                          size="md"
                          onPress={handleStartHarvest}
                          disabled={actionLoading}
                          leftIcon={<Ionicons name="play" size={18} color="#FFFFFF" />}
                        />
                      </View>
                    )}

                    {/* SUB-STEP B: In Progress -> Yield Recording Form & Complete */}
                    {harvest.status === 'IN_PROGRESS' && (
                      <View style={styles.yieldFormBox}>
                        <AppText variant="label" weight="bold" style={styles.sectionLabel}>
                          GHI NHẬN SẢN LƯỢNG THỰC TẾ
                        </AppText>

                        {/* Total weight */}
                        <View style={styles.inputGroup}>
                          <AppText variant="caption" weight="medium">
                            Tổng khối lượng thu hoạch (kg) *
                          </AppText>
                          <TextInput
                            style={styles.input}
                            placeholder="VD: 5.5"
                            placeholderTextColor={theme.colors.text.muted}
                            keyboardType="numeric"
                            value={totalWeight}
                            onChangeText={setTotalWeight}
                          />
                        </View>

                        <View style={styles.twoColRow}>
                          {/* Usable weight */}
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <AppText variant="caption" weight="medium">
                              Đạt chuẩn (kg) *
                            </AppText>
                            <TextInput
                              style={styles.input}
                              placeholder="VD: 5.0"
                              placeholderTextColor={theme.colors.text.muted}
                              keyboardType="numeric"
                              value={usableWeight}
                              onChangeText={setUsableWeight}
                            />
                          </View>

                          {/* Rejected weight */}
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <AppText variant="caption" weight="medium">
                              Loại bỏ (kg) *
                            </AppText>
                            <TextInput
                              style={styles.input}
                              placeholder="VD: 0.5"
                              placeholderTextColor={theme.colors.text.muted}
                              keyboardType="numeric"
                              value={rejectedWeight}
                              onChangeText={setRejectedWeight}
                            />
                          </View>
                        </View>

                        {/* Balance verification indicator */}
                        {parsedTotal > 0 && (
                          <View
                            style={[
                              styles.balanceNotice,
                              isYieldBalanced ? styles.balanceValid : styles.balanceInvalid,
                            ]}
                          >
                            <Ionicons
                              name={isYieldBalanced ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={isYieldBalanced ? theme.colors.success.dark : theme.colors.error.dark}
                            />
                            <AppText
                              variant="caption"
                              color={isYieldBalanced ? theme.colors.success.dark : theme.colors.error.dark}
                              weight="medium"
                            >
                              Đạt chuẩn ({usableWeight || 0}) + Loại bỏ ({rejectedWeight || 0}) = {calcSum()} kg / Tổng ({parsedTotal} kg)
                            </AppText>
                          </View>
                        )}

                        {/* Quality grade selector */}
                        <View style={styles.inputGroup}>
                          <AppText variant="caption" weight="medium">
                            Phân loại chất lượng
                          </AppText>
                          <View style={styles.gradesRow}>
                            {['A', 'B', 'C'].map((g) => (
                              <Pressable
                                key={g}
                                style={[
                                  styles.gradeBtn,
                                  qualityGrade === g && styles.gradeBtnActive,
                                ]}
                                onPress={() => setQualityGrade(g)}
                              >
                                <AppText
                                  variant="caption"
                                  weight="bold"
                                  color={qualityGrade === g ? '#FFFFFF' : theme.colors.text.secondary}
                                >
                                  Loại {g}
                                </AppText>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                          <AppText variant="caption" weight="medium">
                            Ghi chú sản lượng
                          </AppText>
                          <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Nhận xét chất lượng mẻ nấm..."
                            placeholderTextColor={theme.colors.text.muted}
                            multiline
                            numberOfLines={2}
                            value={yieldNotes}
                            onChangeText={setYieldNotes}
                          />
                        </View>

                        <AppButton
                          title={actionLoading ? 'Đang lưu...' : 'Lưu sản lượng'}
                          variant="secondary"
                          size="sm"
                          onPress={handleRecordYield}
                          disabled={actionLoading || !isYieldBalanced}
                          leftIcon={<Ionicons name="save-outline" size={16} color={theme.colors.primary[600]} />}
                        />

                        <AppDivider spacing="sm" />

                        {/* Complete Harvest */}
                        <View style={styles.completeBox}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Sau khi đã lưu đủ sản lượng, bấm nút bên dưới để hoàn thành đợt thu hoạch.
                          </AppText>
                          <AppButton
                            title={actionLoading ? 'Đang hoàn tất...' : 'Hoàn thành thu hoạch (COMPLETED)'}
                            variant="primary"
                            size="md"
                            onPress={handleCompleteHarvest}
                            disabled={actionLoading || (!harvest.total_weight_kg && !isYieldBalanced)}
                            leftIcon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
                          />
                        </View>
                      </View>
                    )}

                    {/* SUB-STEP C: Completed */}
                    {harvest.status === 'COMPLETED' && (
                      <View style={styles.completedSummaryBox}>
                        <View style={styles.completedHeader}>
                          <Ionicons name="ribbon" size={24} color={theme.colors.success.main} />
                          <View style={{ flex: 1 }}>
                            <AppText variant="bodySmall" weight="bold" color={theme.colors.success.dark}>
                              Đợt thu hoạch đã hoàn tất thành công!
                            </AppText>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Đã hoàn thành lúc: {harvest.completed_at ? new Date(harvest.completed_at).toLocaleString('vi-VN') : 'Gần đây'}
                            </AppText>
                          </View>
                        </View>

                        <View style={styles.yieldSummaryGrid}>
                          <View style={styles.yieldGridItem}>
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Tổng thu hoạch
                            </AppText>
                            <AppText variant="body" weight="bold">
                              {harvest.total_weight_kg ?? totalWeight} kg
                            </AppText>
                          </View>
                          <View style={styles.yieldGridItem}>
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Đạt chuẩn
                            </AppText>
                            <AppText variant="body" weight="bold" color={theme.colors.success.dark}>
                              {harvest.usable_weight_kg ?? usableWeight} kg
                            </AppText>
                          </View>
                          <View style={styles.yieldGridItem}>
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Loại bỏ
                            </AppText>
                            <AppText variant="body" weight="bold" color={theme.colors.warning.dark}>
                              {harvest.rejected_weight_kg ?? rejectedWeight} kg
                            </AppText>
                          </View>
                          <View style={styles.yieldGridItem}>
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Xếp loại
                            </AppText>
                            <AppText variant="body" weight="bold" color={theme.colors.primary[600]}>
                              Loại {harvest.quality_grade ?? qualityGrade}
                            </AppText>
                          </View>
                        </View>

                        <View style={styles.handoverNotice}>
                          <Ionicons name="cube-outline" size={16} color={theme.colors.info.dark} />
                          <AppText variant="caption" color={theme.colors.info.dark} style={{ flex: 1 }}>
                            Nông sản đã sẵn sàng để bàn giao cho khách hàng hoặc gửi qua đối tác vận chuyển.
                          </AppText>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <AppButton
              title="Đóng"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={actionLoading}
              style={{ flex: 1 }}
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
    maxHeight: 560,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: 16,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  stepContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.neutral[50],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  harvestDetailBox: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  harvestStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  badgePlanned: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeInProgress: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  actionSection: {
    gap: 10,
  },
  yieldFormBox: {
    gap: 12,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    color: theme.colors.text.secondary,
  },
  inputGroup: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.neutral[50],
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  balanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
  },
  balanceValid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  balanceInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  gradesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.neutral[50],
  },
  gradeBtnActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  completeBox: {
    gap: 8,
  },
  completedSummaryBox: {
    gap: 12,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: theme.borderRadius.md,
  },
  yieldSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yieldGridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.neutral[50],
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  handoverNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    padding: 10,
    borderRadius: theme.borderRadius.sm,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
});
