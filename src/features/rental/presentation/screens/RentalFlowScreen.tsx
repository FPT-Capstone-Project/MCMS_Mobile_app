import { AppAlert as Alert } from '../../../../shared/components/feedback/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppError } from '../../../../core/errors/appError';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { selectAutomaticRentalPackage } from '../../domain/automaticPackage';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { cultivationRepository, MushroomType } from '../../../cultivation';
import { orderRepository, PaymentQrModal, RentalPackage } from '../../../order';

type RentalStep = 1 | 2 | 3;

const RENTAL_DURATIONS = [15, 20];

function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    const availableQuantity = error.message.match(/Only\s+(\d+)/i)?.[1];
    if (error.code === 'INSUFFICIENT_TRAYS') {
      return availableQuantity
        ? `Hiện chỉ còn ${availableQuantity} khay có thể đáp ứng. Vui lòng giảm số lượng khay.`
        : 'Số khay trống hiện không đủ đáp ứng đơn hàng. Vui lòng giảm số lượng khay.';
    }
    if (error.code === 'INSUFFICIENT_SPAWN') {
      return availableQuantity
        ? `Hiện chỉ còn ${availableQuantity} đơn vị phôi nấm. Vui lòng giảm số lượng khay hoặc chọn giống nấm khác.`
        : 'Số lượng phôi nấm hiện không đủ đáp ứng đơn hàng. Vui lòng chọn giống khác hoặc giảm số khay.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export const RentalFlowScreen: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<RentalStep>(1);
  const [packages, setPackages] = useState<RentalPackage[]>([]);
  const [mushrooms, setMushrooms] = useState<MushroomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMushroom, setSelectedMushroom] = useState<MushroomType | null>(null);
  const [trayQuantity, setTrayQuantity] = useState(1);
  const automaticPackage = selectedMushroom
    ? selectAutomaticRentalPackage(selectedMushroom.growing_days, packages)
    : null;

  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const [rentalPackages, mushroomTypes] = await Promise.all([
        orderRepository.getRentalPackages('ACTIVE'),
        cultivationRepository.getMushroomTypes('ACTIVE'),
      ]);
      setPackages(
        rentalPackages.filter((rentalPackage) =>
          RENTAL_DURATIONS.includes(rentalPackage.duration_days)
        )
      );
      setMushrooms(mushroomTypes);
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = setTimeout(() => {
      void loadCatalog();
    }, 0);
    return () => clearTimeout(request);
  }, [loadCatalog]);

  const handleRetryCatalog = () => {
    setLoadError(null);
    setLoading(true);
    void loadCatalog();
  };

  const navigateBack = () => {
    if (step > 1) {
      setStep((currentStep) => (currentStep - 1) as RentalStep);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleCreateOrder = async () => {
    if (!automaticPackage || !selectedMushroom) return;

    try {
      setSubmitting(true);
      const order = await orderRepository.createRentalOrder({
        mushroomTypeId: selectedMushroom.mushroom_type_id,
        quantity: trayQuantity,
      });
      setCreatedOrderId(order.order_id);
      setPaymentModalVisible(true);
    } catch (error: unknown) {
      Alert.alert('Không thể tạo đơn hàng', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount =
    automaticPackage && selectedMushroom
      ? (automaticPackage.price + selectedMushroom.price) * trayQuantity
      : 0;

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Thuê khay nuôi trồng" showBack onBack={navigateBack} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Đang tải loại nấm và thông tin gói thuê...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <AppHeader
        title="Thuê khay nuôi trồng"
        subtitle="Dịch vụ trồng nấm tại SmartMush Farm"
        showBack
        onBack={navigateBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.content, step === 1 && selectedMushroom && styles.contentWithStickyAction]}
        >
          {loadError ? (
            <AppCard elevation="sm" style={styles.stateCard}>
              <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.error.main} />
              <AppText variant="title" weight="bold">
                Không tải được danh mục
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                {loadError}
              </AppText>
              <AppButton title="Thử tải lại" onPress={handleRetryCatalog} />
            </AppCard>
          ) : (
            <>
              <View style={styles.stepsBar}>
                {[
                  { number: 1 as const, label: 'Loại nấm' },
                  { number: 2 as const, label: 'Số khay' },
                  { number: 3 as const, label: 'Xác nhận' },
                ].map((item, index) => (
                  <React.Fragment key={item.number}>
                    {index > 0 ? <View style={styles.stepConnector} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: step === item.number }}
                      disabled={item.number > step}
                      onPress={() => setStep(item.number)}
                      style={styles.stepItem}
                    >
                      <View
                        style={[styles.stepCircle, step >= item.number && styles.stepCircleActive]}
                      >
                        <AppText
                          variant="caption"
                          color={step >= item.number ? '#FFFFFF' : theme.colors.text.muted}
                        >
                          {item.number}
                        </AppText>
                      </View>
                      <AppText
                        variant="caption"
                        weight={step === item.number ? 'bold' : 'normal'}
                        color={
                          step === item.number
                            ? theme.colors.primary[600]
                            : theme.colors.text.secondary
                        }
                      >
                        {item.label}
                      </AppText>
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>

              {step === 1 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <AppText variant="h3">Chọn loại nấm</AppText>
                    <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                      Chọn giống nấm bạn muốn trồng. Hệ thống tự chọn gói thuê phù hợp theo thời
                      gian sinh trưởng dự kiến.
                    </AppText>
                  </View>
                  {mushrooms.length === 0 ? (
                    <EmptyCatalog message="Hiện chưa có loại nấm nào đang mở dịch vụ." />
                  ) : (
                    mushrooms.map((mushroom) => {
                      const selected =
                        selectedMushroom?.mushroom_type_id === mushroom.mushroom_type_id;
                      return (
                        <Pressable
                          key={mushroom.mushroom_type_id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedMushroom(mushroom)}
                        >
                          <AppCard
                            elevation={selected ? 'md' : 'xs'}
                            style={[styles.selectionCard, selected && styles.cardSelected]}
                          >
                            <View style={styles.mushroomRow}>
                              {mushroom.image_url ? (
                                <Image
                                  source={{ uri: mushroom.image_url }}
                                  style={styles.mushroomImage}
                                />
                              ) : (
                                <View style={styles.iconCircle}>
                                  <Ionicons
                                    name="leaf-outline"
                                    size={22}
                                    color={theme.colors.primary[600]}
                                  />
                                </View>
                              )}
                              <View style={styles.flexContent}>
                                <AppText variant="title" weight="bold">
                                  {mushroom.name}
                                </AppText>
                                <AppText variant="caption" color={theme.colors.text.secondary}>
                                  Sinh trưởng khoảng {mushroom.growing_days} ngày
                                </AppText>
                              </View>
                              <Ionicons
                                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                                size={24}
                                color={
                                  selected ? theme.colors.primary[600] : theme.colors.neutral[400]
                                }
                              />
                            </View>
                            {mushroom.description ? (
                              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                                {mushroom.description}
                              </AppText>
                            ) : null}
                            <AppDivider spacing="xs" />
                            <View style={styles.priceRow}>
                              <AppText variant="caption" color={theme.colors.text.muted}>
                                Phôi nấm / khay
                              </AppText>
                              <AppText
                                variant="title"
                                weight="bold"
                                color={theme.colors.primary[600]}
                              >
                                {formatVND(mushroom.price)}
                              </AppText>
                            </View>
                          </AppCard>
                        </Pressable>
                      );
                    })
                  )}
                  {selectedMushroom ? (
                    automaticPackage ? (
                      <AppCard elevation="xs" style={styles.autoPackageCard}>
                        <AppText variant="label" color={theme.colors.text.muted}>
                          GÓI THUÊ DO HỆ THỐNG TỰ CHỌN
                        </AppText>
                        <SummaryRow
                          label="Gói dịch vụ"
                          value={`${automaticPackage.package_name} (${automaticPackage.duration_days} ngày)`}
                        />
                        <SummaryRow
                          label="Căn cứ lựa chọn"
                          value={`Sinh trưởng dự kiến ${selectedMushroom.growing_days} ngày`}
                        />
                        <SummaryRow
                          label="Phí gói / khay"
                          value={formatVND(automaticPackage.price)}
                        />
                      </AppCard>
                    ) : (
                      <EmptyCatalog
                        message={`Chưa có gói thuê phù hợp với thời gian sinh trưởng ${selectedMushroom.growing_days} ngày của loại nấm này.`}
                      />
                    )
                  ) : null}
                </View>
              ) : null}

              {step === 2 && automaticPackage && selectedMushroom ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <AppText variant="h3">Chọn số lượng khay</AppText>
                    <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                      {automaticPackage.package_name} ({automaticPackage.duration_days} ngày) được
                      tự chọn theo giống nấm. Mỗi khay cần 2 đơn vị phôi; hệ thống sẽ kiểm tra khay
                      và phôi trước khi giữ chỗ.
                    </AppText>
                  </View>
                  <AppCard elevation="sm" style={styles.quantityCard}>
                    <AppText variant="label" color={theme.colors.text.muted}>
                      {selectedMushroom.name} · {automaticPackage.duration_days} ngày
                    </AppText>
                    <View style={styles.quantityRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Giảm số khay"
                        accessibilityState={{ disabled: trayQuantity <= 1 }}
                        disabled={trayQuantity <= 1}
                        onPress={() => setTrayQuantity((quantity) => Math.max(1, quantity - 1))}
                        style={[
                          styles.quantityButton,
                          trayQuantity <= 1 && styles.quantityButtonDisabled,
                        ]}
                      >
                        <Ionicons name="remove" size={24} color={theme.colors.primary[700]} />
                      </Pressable>
                      <View style={styles.quantityValue}>
                        <AppText variant="h2" weight="bold">
                          {trayQuantity}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          khay
                        </AppText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Tăng số khay"
                        onPress={() => setTrayQuantity((quantity) => quantity + 1)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="add" size={24} color={theme.colors.primary[700]} />
                      </Pressable>
                    </View>
                    <AppDivider spacing="sm" />
                    <View style={styles.priceRow}>
                      <AppText variant="body">Tạm tính / khay</AppText>
                      <AppText variant="body" weight="bold">
                        {formatVND(automaticPackage.price + selectedMushroom.price)}
                      </AppText>
                    </View>
                    <View style={styles.priceRow}>
                      <AppText variant="body">Tổng cộng</AppText>
                      <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                        {formatVND(totalAmount)}
                      </AppText>
                    </View>
                  </AppCard>
                  <AppButton title="Tiếp tục xác nhận" onPress={() => setStep(3)} />
                </View>
              ) : null}

              {step === 3 && automaticPackage && selectedMushroom ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <AppText variant="h3">Xác nhận đơn trồng nấm</AppText>
                    <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                      Kiểm tra đơn hàng trước khi hệ thống kiểm tra sức chứa và giữ khay tạm thời.
                    </AppText>
                  </View>
                  <AppCard elevation="sm" style={styles.summaryCard}>
                    <AppText variant="label" color={theme.colors.text.muted}>
                      CHI TIẾT DỊCH VỤ
                    </AppText>
                    <SummaryRow label="Loại nấm" value={selectedMushroom.name} />
                    <SummaryRow
                      label="Gói dịch vụ (tự động)"
                      value={`${automaticPackage.package_name} (${automaticPackage.duration_days} ngày)`}
                    />
                    <SummaryRow label="Số lượng khay" value={`${trayQuantity} khay`} />
                    <AppDivider spacing="xs" />
                    <SummaryRow
                      label={`Gói trồng (${trayQuantity} khay)`}
                      value={formatVND(automaticPackage.price * trayQuantity)}
                    />
                    <SummaryRow
                      label={`Phôi nấm (${trayQuantity} khay)`}
                      value={formatVND(selectedMushroom.price * trayQuantity)}
                    />
                    <AppDivider spacing="xs" />
                    <View style={styles.totalRow}>
                      <AppText variant="title" weight="bold">
                        Tổng thanh toán
                      </AppText>
                      <AppText variant="h2" weight="bold" color={theme.colors.primary[600]}>
                        {formatVND(totalAmount)}
                      </AppText>
                    </View>
                    <View style={styles.holdNotice}>
                      <Ionicons name="time-outline" size={19} color={theme.colors.warning.dark} />
                      <AppText
                        variant="caption"
                        color={theme.colors.text.secondary}
                        style={styles.flexContent}
                      >
                        Khay và phôi sẽ được kiểm tra, giữ tạm 15 phút sau khi tạo đơn. Vui lòng
                        hoàn tất thanh toán trong thời gian này.
                      </AppText>
                    </View>
                    <AppButton
                      title="Kiểm tra & tạo đơn"
                      variant="primary"
                      size="lg"
                      loading={submitting}
                      disabled={submitting}
                      leftIcon={
                        <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
                      }
                      onPress={handleCreateOrder}
                      style={styles.confirmButton}
                    />
                  </AppCard>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {step === 1 && selectedMushroom ? (
        <View style={styles.stickyAction}>
          <AppButton
            title="Tiếp tục chọn khay"
            size="lg"
            disabled={!automaticPackage}
            onPress={() => automaticPackage && setStep(2)}
          />
        </View>
      ) : null}

      {createdOrderId ? (
        <PaymentQrModal
          visible={paymentModalVisible}
          orderId={createdOrderId}
          onClose={() => {
            setPaymentModalVisible(false);
            router.replace('/customer-orders' as Href);
          }}
          onPaymentSuccess={() => {
            setPaymentModalVisible(false);
            Alert.alert('Thành công', 'Thanh toán thành công! Đơn hàng đã được xác nhận.', [
              {
                text: 'Xem đơn hàng',
                onPress: () => router.replace('/customer-orders' as Href),
              },
            ]);
          }}
        />
      ) : null}
    </ScreenContainer>
  );
};

const EmptyCatalog: React.FC<{ message: string }> = ({ message }) => (
  <AppCard elevation="xs" style={styles.emptyCard}>
    <Ionicons name="information-circle-outline" size={24} color={theme.colors.text.muted} />
    <AppText variant="bodySmall" color={theme.colors.text.secondary}>
      {message}
    </AppText>
  </AppCard>
);

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <AppText variant="body" color={theme.colors.text.secondary}>
      {label}
    </AppText>
    <AppText variant="body" weight="medium" style={styles.summaryValue}>
      {value}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  contentWithStickyAction: {
    paddingBottom: 96,
  },
  stickyAction: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.paper,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  stateCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
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
  sectionHeading: {
    gap: theme.spacing.xs,
  },
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  autoPackageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  mushroomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  mushroomImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  flexContent: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  quantityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing['2xl'],
  },
  quantityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityValue: {
    minWidth: 64,
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  holdNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning.light,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  confirmButton: {
    marginTop: theme.spacing.xs,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
});
