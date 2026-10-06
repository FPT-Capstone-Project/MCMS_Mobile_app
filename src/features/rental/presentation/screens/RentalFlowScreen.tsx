import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { RackVisualizer } from '../../../tray/presentation/components/RackVisualizer';
import { TrayStatusLegend } from '../../../tray/presentation/components/TrayStatusLegend';
import { Tray, TrayId } from '../../../tray/domain/entities/Tray';
import { trayRepository } from '../../../tray/data/repositories/TrayRepository';
import {
  MushroomVariety,
  RentalDuration,
  RentalOrder,
  RentalPriceBreakdown,
  RentalStep,
  getMinimumWeeksForMushroom,
} from '../../domain/entities/Rental';
import { rentalRepository } from '../../data/repositories/RentalRepository';
import { DurationSelector } from '../components/DurationSelector';
import { MushroomSelector } from '../components/MushroomSelector';
import { RentalStepIndicator } from '../components/RentalStepIndicator';
import { RentalSummaryCard } from '../components/RentalSummaryCard';

export const RentalFlowScreen: React.FC = () => {
  const router = useRouter();

  // Step state
  const [currentStep, setCurrentStep] = useState<RentalStep>('SELECT_TRAY');

  // Async data state
  const [trays, setTrays] = useState<Tray[]>([]);
  const [durations, setDurations] = useState<RentalDuration[]>([]);
  const [varieties, setVarieties] = useState<MushroomVariety[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selections (local React state as required)
  const [selectedTrayId, setSelectedTrayId] = useState<TrayId | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<RentalDuration | null>(null);
  const [selectedMushroom, setSelectedMushroom] = useState<MushroomVariety | null>(null);

  // Calculated pricing
  const [pricing, setPricing] = useState<RentalPriceBreakdown | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<RentalOrder | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [traysData, durationsData, varietiesData] = await Promise.all([
          trayRepository.getTrays(),
          rentalRepository.getRentalDurations(),
          rentalRepository.getMushroomVarieties(),
        ]);
        setTrays(traysData);
        setDurations(durationsData);
        setVarieties(varietiesData);
      } catch {
        Alert.alert('Lỗi', 'Không thể tải dữ liệu khay và phôi nấm.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update pricing whenever duration or mushroom changes
  useEffect(() => {
    if (selectedDuration && selectedMushroom) {
      rentalRepository
        .calculatePrice(selectedDuration, selectedMushroom)
        .then(setPricing)
        .catch(() => {});
    }
  }, [selectedDuration, selectedMushroom]);

  // Handle mushroom selection & reset duration if no longer compatible
  const handleSelectMushroom = (variety: MushroomVariety) => {
    setSelectedMushroom(variety);
    const minWeeks = getMinimumWeeksForMushroom(variety.harvestDays);
    if (selectedDuration && selectedDuration.weeks < minWeeks) {
      setSelectedDuration(null);
    }
  };

  // Handle non-available tray click
  const handleDisabledTrayPress = (tray: Tray) => {
    if (tray.status === 'MY_RENTED_TRAY') {
      Alert.alert('Khay của bạn', `Khay ${tray.id} hiện đang là khay bạn đang thuê.`);
    } else if (tray.status === 'MAINTENANCE') {
      Alert.alert(
        'Đang bảo trì',
        `Khay ${tray.id} đang được nhân viên kỹ thuật bảo dưỡng cảm biến. Vui lòng chọn khay khác.`
      );
    } else {
      Alert.alert(
        'Khay đã được thuê',
        `Khay ${tray.id} đã có khách hàng khác thuê. Vui lòng chọn khay còn trống màu xanh.`
      );
    }
  };

  // Step transitions
  const handleNextStep = () => {
    if (currentStep === 'SELECT_TRAY') {
      if (!selectedTrayId) {
        Alert.alert('Chưa chọn khay', 'Vui lòng chọn một khay còn trống trên giá đỡ.');
        return;
      }
      setCurrentStep('SELECT_MUSHROOM');
    } else if (currentStep === 'SELECT_MUSHROOM') {
      if (!selectedMushroom) {
        Alert.alert('Chưa chọn phôi nấm', 'Vui lòng chọn một loại giống phôi nấm.');
        return;
      }
      const minWeeks = getMinimumWeeksForMushroom(selectedMushroom.harvestDays);
      if (selectedDuration && selectedDuration.weeks < minWeeks) {
        setSelectedDuration(null);
      }
      setCurrentStep('SELECT_DURATION');
    } else if (currentStep === 'SELECT_DURATION') {
      if (!selectedDuration) {
        Alert.alert('Chưa chọn thời gian', 'Vui lòng chọn gói thời gian thuê khay.');
        return;
      }
      if (
        selectedMushroom &&
        selectedDuration.weeks < getMinimumWeeksForMushroom(selectedMushroom.harvestDays)
      ) {
        Alert.alert(
          'Thời gian không đủ',
          `Giống nấm ${selectedMushroom.name} cần tối thiểu ${getMinimumWeeksForMushroom(
            selectedMushroom.harvestDays
          )} tuần cho 1 đợt thu hoạch.`
        );
        return;
      }
      setCurrentStep('CONFIRM_SUMMARY');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'SELECT_MUSHROOM') {
      setCurrentStep('SELECT_TRAY');
    } else if (currentStep === 'SELECT_DURATION') {
      setCurrentStep('SELECT_MUSHROOM');
    } else if (currentStep === 'CONFIRM_SUMMARY') {
      setCurrentStep('SELECT_DURATION');
    } else {
      router.back();
    }
  };

  // Handle final confirmation
  const handleConfirmRental = async () => {
    if (!selectedTrayId || !selectedDuration || !selectedMushroom) return;

    try {
      setConfirming(true);
      const order = await rentalRepository.confirmRental({
        trayId: selectedTrayId,
        duration: selectedDuration,
        mushroom: selectedMushroom,
      });
      setConfirmedOrder(order);
      setSuccessModalVisible(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Không thể hoàn tất đơn thuê khay. Vui lòng thử lại.';
      Alert.alert('Thất bại', errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  const navigateToMyTray = () => {
    setSuccessModalVisible(false);
    router.replace('/(tabs)/tray');
  };

  const navigateToHome = () => {
    setSuccessModalVisible(false);
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Thuê khay nuôi trồng" showBack onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Đang tải dữ liệu khay và phôi nấm...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const isNextDisabled =
    (currentStep === 'SELECT_TRAY' && !selectedTrayId) ||
    (currentStep === 'SELECT_MUSHROOM' && !selectedMushroom) ||
    (currentStep === 'SELECT_DURATION' &&
      (!selectedDuration ||
        (selectedMushroom !== null &&
          selectedDuration.weeks <
            getMinimumWeeksForMushroom(selectedMushroom.harvestDays))));

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Navigation Header */}
      <AppHeader
        title="Thuê khay nuôi trồng"
        subtitle={
          currentStep === 'SELECT_TRAY'
            ? 'Bước 1: Chọn vị trí khay'
            : currentStep === 'SELECT_MUSHROOM'
            ? 'Bước 2: Chọn phôi nấm'
            : currentStep === 'SELECT_DURATION'
            ? 'Bước 3: Chọn thời gian thuê'
            : 'Bước 4: Xác nhận thông tin'
        }
        showBack
        onBack={handleBackStep}
      />

      {/* Step Tracker */}
      <RentalStepIndicator currentStep={currentStep} />

      {/* Scrollable Step Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Select Tray on 3x3 Rack */}
        {currentStep === 'SELECT_TRAY' && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <AppText variant="h3" weight="bold">
                Chọn khay nuôi trồng
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Nhấn chọn một vị trí khay còn trống (3 tầng × 3 khay) trên giàn nuôi trồng.
              </AppText>
            </View>

            {/* Visual Rack */}
            <RackVisualizer
              trays={trays}
              selectedTrayId={selectedTrayId}
              onSelectTray={(id: TrayId) => setSelectedTrayId(id)}
              onDisabledTrayPress={handleDisabledTrayPress}
            />

            {/* Selection Banner */}
            {selectedTrayId ? (
              <AppCard elevation="sm" style={styles.selectedTrayBanner}>
                <View style={styles.selectedRow}>
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
                  </View>
                  <View style={styles.selectedTextGroup}>
                    <AppText variant="overline" color={theme.colors.primary[600]}>
                      Vị trí đã chọn
                    </AppText>
                    <AppText variant="title" weight="bold">
                      Khay {selectedTrayId}
                    </AppText>
                  </View>
                  <AppText variant="captionMedium" color={theme.colors.success.dark}>
                    Sẵn sàng thuê
                  </AppText>
                </View>
              </AppCard>
            ) : null}

            {/* Legend */}
            <TrayStatusLegend />
          </View>
        )}

        {/* STEP 2: Select Mushroom Spawn */}
        {currentStep === 'SELECT_MUSHROOM' && (
          <View style={styles.stepContainer}>
            {/* Tray Context Bar */}
            <View style={styles.contextBar}>
              <Ionicons name="cube" size={18} color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Đang cấu hình cho: <AppText weight="bold">Khay {selectedTrayId}</AppText>
              </AppText>
            </View>

            <MushroomSelector
              varieties={varieties}
              selectedMushroom={selectedMushroom}
              onSelectMushroom={handleSelectMushroom}
            />
          </View>
        )}

        {/* STEP 3: Select Duration */}
        {currentStep === 'SELECT_DURATION' && (
          <View style={styles.stepContainer}>
            {/* Context Bar */}
            <View style={styles.contextBar}>
              <Ionicons name="leaf" size={18} color={theme.colors.primary[500]} />
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Khay <AppText weight="bold">{selectedTrayId}</AppText> • Giống:{' '}
                <AppText weight="bold">{selectedMushroom?.name}</AppText> (~
                {selectedMushroom?.harvestDays} ngày)
              </AppText>
            </View>

            <DurationSelector
              durations={durations}
              selectedDuration={selectedDuration}
              selectedMushroom={selectedMushroom}
              onSelectDuration={setSelectedDuration}
            />
          </View>
        )}

        {/* STEP 4: Summary & Checkout */}
        {currentStep === 'CONFIRM_SUMMARY' &&
          selectedTrayId &&
          selectedDuration &&
          selectedMushroom &&
          pricing && (
            <View style={styles.stepContainer}>
              <RentalSummaryCard
                trayId={selectedTrayId}
                duration={selectedDuration}
                mushroom={selectedMushroom}
                pricing={pricing}
              />
            </View>
          )}
      </ScrollView>

      {/* Bottom Sticky Action Footer */}
      <View style={styles.bottomBar}>
        {currentStep !== 'SELECT_TRAY' && (
          <AppButton
            title="Quay lại"
            variant="outline"
            size="md"
            style={styles.backBtn}
            onPress={handleBackStep}
          />
        )}

        {currentStep !== 'CONFIRM_SUMMARY' ? (
          <AppButton
            title="Tiếp tục"
            variant="primary"
            size="md"
            style={styles.actionBtn}
            disabled={isNextDisabled}
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            onPress={handleNextStep}
          />
        ) : (
          <AppButton
            title="Xác nhận thuê"
            variant="primary"
            size="md"
            style={styles.actionBtn}
            loading={confirming}
            leftIcon={<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />}
            onPress={handleConfirmRental}
          />
        )}
      </View>

      {/* Confirmation Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={navigateToMyTray}
      >
        <View style={styles.modalBackdrop}>
          <AppCard elevation="lg" style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-circle" size={56} color={theme.colors.success.main} />
            </View>

            <AppText variant="h2" weight="bold" align="center" style={styles.successTitle}>
              Thuê khay thành công!
            </AppText>

            <AppText
              variant="bodySmall"
              color={theme.colors.text.secondary}
              align="center"
              style={styles.successMessage}
            >
              Đơn thuê khay <AppText weight="bold">Khay {confirmedOrder?.trayId}</AppText> với giống{' '}
              <AppText weight="bold">{confirmedOrder?.mushroom.name}</AppText> đã được kích hoạt thành công.
            </AppText>

            <View style={styles.orderSummaryBox}>
              <View style={styles.summaryLine}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Mã đơn thuê:
                </AppText>
                <AppText variant="captionMedium" weight="bold">
                  {confirmedOrder?.orderNumber}
                </AppText>
              </View>
              <View style={styles.summaryLine}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Thời gian:
                </AppText>
                <AppText variant="captionMedium">
                  {confirmedOrder?.duration.label}
                </AppText>
              </View>
              <View style={styles.summaryLine}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Tổng thanh toán:
                </AppText>
                <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[600]}>
                  {confirmedOrder ? formatVND(confirmedOrder.pricing.totalAmount) : ''}
                </AppText>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <AppButton
                title="Đến khay của tôi"
                variant="primary"
                size="md"
                fullWidth
                onPress={navigateToMyTray}
              />
              <AppButton
                title="Về trang chủ"
                variant="ghost"
                size="md"
                fullWidth
                onPress={navigateToHome}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  stepContainer: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    gap: theme.spacing.xxs,
  },
  selectedTrayBanner: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[300],
    borderWidth: 1.5,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  selectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTextGroup: {
    flex: 1,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  backBtn: {
    minWidth: 100,
  },
  actionBtn: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  successCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.success.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  successTitle: {
    color: theme.colors.text.primary,
  },
  successMessage: {
    lineHeight: 20,
  },
  orderSummaryBox: {
    width: '100%',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    marginVertical: theme.spacing.xs,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalButtons: {
    width: '100%',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
});
