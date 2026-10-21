import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  cultivationRepository,
  MushroomType,
} from '../../../cultivation';
import {
  orderRepository,
  PaymentQrModal,
  RentalPackage,
} from '../../../order';

export const RentalFlowScreen: React.FC = () => {
  const router = useRouter();

  // Steps: 1 = Gói thuê, 2 = Giống nấm, 3 = Xác nhận
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Real backend data
  const [packages, setPackages] = useState<RentalPackage[]>([]);
  const [mushrooms, setMushrooms] = useState<MushroomType[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedPackage, setSelectedPackage] = useState<RentalPackage | null>(null);
  const [selectedMushroom, setSelectedMushroom] = useState<MushroomType | null>(null);

  // Order submission & payment modal
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Load real rental packages and mushroom types from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pkgData, mshData] = await Promise.all([
          orderRepository.getRentalPackages('ACTIVE'),
          cultivationRepository.getMushroomTypes('ACTIVE'),
        ]);
        setPackages(pkgData);
        setMushrooms(mshData);
      } catch (err: unknown) {
        Alert.alert(
          'Lỗi tải dữ liệu',
          typeof err === 'string'
            ? err
            : err instanceof Error
            ? err.message
            : 'Không thể kết nối đến máy chủ.'
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectPackage = (pkg: RentalPackage) => {
    setSelectedPackage(pkg);
    // If selected mushroom growing days exceed the package duration, clear mushroom
    if (selectedMushroom && selectedMushroom.growing_days > pkg.duration_days) {
      setSelectedMushroom(null);
    }
    setStep(2);
  };

  const handleSelectMushroom = (mush: MushroomType) => {
    if (selectedPackage && mush.growing_days > selectedPackage.duration_days) {
      Alert.alert(
        'Thời gian không phù hợp',
        `Giống nấm "${mush.name}" cần ${mush.growing_days} ngày để sinh trưởng, vượt quá thời hạn gói thuê (${selectedPackage.duration_days} ngày). Vui lòng chọn gói thuê dài hơn hoặc giống nấm khác.`
      );
      return;
    }
    setSelectedMushroom(mush);
    setStep(3);
  };

  const handleCreateOrder = async () => {
    if (!selectedPackage || !selectedMushroom) return;

    if (selectedMushroom.growing_days > selectedPackage.duration_days) {
      Alert.alert(
        'Thời gian không hợp lệ',
        `Thời gian sinh trưởng của nấm (${selectedMushroom.growing_days} ngày) vượt quá gói thuê (${selectedPackage.duration_days} ngày).`
      );
      return;
    }

    try {
      setSubmitting(true);
      const order = await orderRepository.createRentalOrder({
        packageId: selectedPackage.package_id,
        mushroomTypeId: selectedMushroom.mushroom_type_id,
      });

      setCreatedOrderId(order.order_id);
      setPaymentModalVisible(true);
    } catch (err: unknown) {
      Alert.alert(
        'Tạo đơn không thành công',
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể tạo đơn hàng thuê khay. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Thuê khay nuôi trồng" showBack onBack={() => router.back()} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải danh mục gói thuê & phôi nấm...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const totalAmount = (selectedPackage?.price || 0) + (selectedMushroom?.price || 0);

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Thuê khay nuôi trồng"
        subtitle="Dịch vụ thông minh SmartMush"
        showBack
        onBack={step > 1 ? () => setStep((prev) => (prev - 1) as 1 | 2) : () => router.back()}
      />

      <View style={styles.content}>
        {/* Step Indicator Header */}
        <View style={styles.stepsBar}>
          <Pressable onPress={() => setStep(1)} style={[styles.stepItem, step === 1 && styles.stepItemActive]}>
            <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
              <AppText variant="caption" color={step >= 1 ? '#FFFFFF' : theme.colors.text.muted}>
                1
              </AppText>
            </View>
            <AppText variant="caption" weight={step === 1 ? 'bold' : 'normal'} color={step === 1 ? theme.colors.primary[600] : theme.colors.text.secondary}>
              Gói thuê
            </AppText>
          </Pressable>

          <View style={styles.stepConnector} />

          <Pressable
            onPress={() => selectedPackage && setStep(2)}
            style={[styles.stepItem, step === 2 && styles.stepItemActive]}
          >
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              <AppText variant="caption" color={step >= 2 ? '#FFFFFF' : theme.colors.text.muted}>
                2
              </AppText>
            </View>
            <AppText variant="caption" weight={step === 2 ? 'bold' : 'normal'} color={step === 2 ? theme.colors.primary[600] : theme.colors.text.secondary}>
              Loại nấm
            </AppText>
          </Pressable>

          <View style={styles.stepConnector} />

          <Pressable
            onPress={() => selectedPackage && selectedMushroom && setStep(3)}
            style={[styles.stepItem, step === 3 && styles.stepItemActive]}
          >
            <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
              <AppText variant="caption" color={step >= 3 ? '#FFFFFF' : theme.colors.text.muted}>
                3
              </AppText>
            </View>
            <AppText variant="caption" weight={step === 3 ? 'bold' : 'normal'} color={step === 3 ? theme.colors.primary[600] : theme.colors.text.secondary}>
              Xác nhận
            </AppText>
          </Pressable>
        </View>

        {/* ================= STEP 1: SELECT RENTAL PACKAGE ================= */}
        {step === 1 && (
          <View style={styles.section}>
            <AppText variant="h3">Chọn gói thời gian thuê</AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Các gói thời hạn nuôi trồng tối ưu vi khí hậu trong buồng kín SmartMush.
            </AppText>

            <View style={styles.grid}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.package_id === pkg.package_id;
                return (
                  <Pressable key={pkg.package_id} onPress={() => handleSelectPackage(pkg)}>
                    <AppCard
                      elevation={isSelected ? 'md' : 'xs'}
                      style={[styles.packageCard, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                          <Ionicons name="calendar-outline" size={24} color={theme.colors.primary[500]} />
                        </View>
                        <View style={styles.badgeDays}>
                          <AppText variant="captionMedium" color={theme.colors.primary[700]} weight="bold">
                            {pkg.duration_days} ngày
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="title" weight="bold">
                        {pkg.package_name}
                      </AppText>

                      {pkg.description ? (
                        <AppText variant="bodySmall" color={theme.colors.text.secondary} numberOfLines={2}>
                          {pkg.description}
                        </AppText>
                      ) : null}

                      <AppDivider spacing="xs" />

                      <View style={styles.priceRow}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Giá thuê:
                        </AppText>
                        <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                          {formatVND(pkg.price)}
                        </AppText>
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ================= STEP 2: SELECT MUSHROOM TYPE ================= */}
        {step === 2 && (
          <View style={styles.section}>
            <AppText variant="h3">Chọn loại phôi nấm</AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Gói đã chọn: <AppText variant="label">{selectedPackage?.package_name} ({selectedPackage?.duration_days} ngày)</AppText>. Hãy chọn giống nấm có chu kỳ sinh trưởng phù hợp.
            </AppText>

            <View style={styles.grid}>
              {mushrooms.map((mush) => {
                const isSelected = selectedMushroom?.mushroom_type_id === mush.mushroom_type_id;
                const exceeds = selectedPackage ? mush.growing_days > selectedPackage.duration_days : false;

                return (
                  <Pressable
                    key={mush.mushroom_type_id}
                    onPress={() => !exceeds && handleSelectMushroom(mush)}
                    disabled={exceeds}
                  >
                    <AppCard
                      elevation={isSelected ? 'md' : 'xs'}
                      style={[
                        styles.mushroomCard,
                        isSelected && styles.cardSelected,
                        exceeds && styles.cardDisabled,
                      ]}
                    >
                      <View style={styles.mushHeaderRow}>
                        {mush.image_url ? (
                          <Image source={{ uri: mush.image_url }} style={styles.mushImage} />
                        ) : (
                          <View style={styles.iconCircle}>
                            <Ionicons name="leaf" size={24} color={theme.colors.primary[500]} />
                          </View>
                        )}
                        <View style={styles.mushInfo}>
                          <AppText variant="title" weight="bold">
                            {mush.name}
                          </AppText>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Sinh trưởng: {mush.growing_days} ngày
                          </AppText>
                        </View>
                      </View>

                      {mush.description ? (
                        <AppText variant="bodySmall" color={theme.colors.text.secondary} numberOfLines={2}>
                          {mush.description}
                        </AppText>
                      ) : null}

                      {exceeds ? (
                        <View style={styles.exceedsWarning}>
                          <Ionicons name="warning-outline" size={16} color={theme.colors.error.main} />
                          <AppText variant="caption" color={theme.colors.error.main}>
                            Cần {mush.growing_days} ngày &gt; gói {selectedPackage?.duration_days} ngày
                          </AppText>
                        </View>
                      ) : null}

                      <AppDivider spacing="xs" />

                      <View style={styles.priceRow}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Giá phôi:
                        </AppText>
                        <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                          {formatVND(mush.price)}
                        </AppText>
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ================= STEP 3: CONFIRMATION & ORDER SUMMARY ================= */}
        {step === 3 && selectedPackage && selectedMushroom && (
          <View style={styles.section}>
            <AppText variant="h3">Xác nhận thông tin thuê</AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Kiểm tra chi tiết gói thuê & thanh toán trực tuyến qua PayOS VietQR.
            </AppText>

            <AppCard elevation="sm" style={styles.summaryCard}>
              <AppText variant="label" color={theme.colors.text.muted}>
                CHI TIẾT DỊCH VỤ
              </AppText>

              <View style={styles.summaryRow}>
                <AppText variant="body">Gói thuê khay:</AppText>
                <AppText variant="body" weight="bold">
                  {selectedPackage.package_name} ({selectedPackage.duration_days} ngày)
                </AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText variant="body">Đơn giá gói thuê:</AppText>
                <AppText variant="body" weight="medium">
                  {formatVND(selectedPackage.price)}
                </AppText>
              </View>

              <AppDivider spacing="xs" />

              <View style={styles.summaryRow}>
                <AppText variant="body">Giống nấm:</AppText>
                <AppText variant="body" weight="bold">
                  {selectedMushroom.name} ({selectedMushroom.growing_days} ngày sinh trưởng)
                </AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText variant="body">Đơn giá phôi nấm:</AppText>
                <AppText variant="body" weight="medium">
                  {formatVND(selectedMushroom.price)}
                </AppText>
              </View>

              <AppDivider spacing="sm" />

              <View style={styles.totalRow}>
                <AppText variant="title" weight="bold">
                  Tổng thanh toán:
                </AppText>
                <AppText variant="h2" weight="bold" color={theme.colors.primary[600]}>
                  {formatVND(totalAmount)}
                </AppText>
              </View>

              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success.main} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={styles.securityText}>
                  Tự động điều phối vi khí hậu IoT và liên kết thanh toán PayOS VietQR ngay sau khi tạo đơn.
                </AppText>
              </View>

              <AppButton
                title="Tạo đơn & Thanh toán ngay"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={submitting}
                leftIcon={<Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />}
                onPress={handleCreateOrder}
                style={styles.confirmBtn}
              />
            </AppCard>
          </View>
        )}
      </View>

      {/* PayOS Payment Modal */}
      {createdOrderId && (
        <PaymentQrModal
          visible={paymentModalVisible}
          orderId={createdOrderId}
          onClose={() => {
            setPaymentModalVisible(false);
            router.replace('/(tabs)/orders' as any);
          }}
          onPaymentSuccess={() => {
            setPaymentModalVisible(false);
            Alert.alert('Thành công', 'Thanh toán thành công! Đơn hàng của bạn đã được ghi nhận.', [
              {
                text: 'Xem đơn hàng',
                onPress: () => router.replace('/(tabs)/orders' as any),
              },
            ]);
          }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  loadingText: {
    marginTop: theme.spacing.sm,
  },
  stepsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepItemActive: {},
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary[500],
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.neutral[200],
    marginHorizontal: theme.spacing.xs,
  },
  section: {
    gap: theme.spacing.md,
  },
  grid: {
    gap: theme.spacing.md,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  cardDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.neutral[100],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDays: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mushroomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mushHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mushImage: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
  },
  mushInfo: {
    flex: 1,
  },
  exceedsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    marginVertical: theme.spacing.xs,
  },
  securityText: {
    flex: 1,
  },
  confirmBtn: {
    marginTop: theme.spacing.sm,
  },
});
