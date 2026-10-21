import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppText,
} from '../../../../shared/components';
import { orderRepository } from '../../data/repositories/OrderRepository';
import { PaymentStatusData, PayosPaymentData } from '../../domain/entities/Order';

interface PaymentQrModalProps {
  visible: boolean;
  orderId: number;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const PaymentQrModal: React.FC<PaymentQrModalProps> = ({
  visible,
  orderId,
  onClose,
  onPaymentSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PayosPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData['paymentStatus']>('PENDING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Stop polling helper
  const stopTimers = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleClose = () => {
    stopTimers();
    setPaymentData(null);
    setPaymentStatus('PENDING');
    setErrorMsg(null);
    setTimeLeft(null);
    onClose();
  };

  // Immediate payment status check
  const checkPaymentStatus = useCallback(async () => {
    if (isCheckingRef.current || !orderId) return;
    isCheckingRef.current = true;
    try {
      const statusRes = await orderRepository.getPaymentStatus(orderId);
      if (!isMountedRef.current) return;

      const isOrderPaid =
        statusRes.paymentStatus === 'PAID' || statusRes.orderStatus === 'CONFIRMED';

      if (isOrderPaid) {
        setPaymentStatus('PAID');
        stopTimers();
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else if (
        statusRes.paymentStatus === 'CANCELLED' ||
        statusRes.paymentStatus === 'FAILED'
      ) {
        setPaymentStatus(statusRes.paymentStatus);
        stopTimers();
      } else if (statusRes.paymentStatus === 'EXPIRED') {
        setPaymentStatus('EXPIRED');
        stopTimers();
      }
    } catch {
      // Ignore background transient network hiccups
    } finally {
      isCheckingRef.current = false;
    }
  }, [orderId, onPaymentSuccess]);

  const [retryKey, setRetryKey] = useState<number>(0);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg(null);
    setPaymentStatus('PENDING');
    setPaymentData(null);
    setTimeLeft(null);
    setRetryKey((prev) => prev + 1);
  };

  // Fetch or reuse PayOS payment link
  useEffect(() => {
    if (!visible || !orderId) {
      return;
    }

    let isMounted = true;
    stopTimers();

    orderRepository
      .createPayosPayment(orderId)
      .then((data) => {
        if (!isMounted) return;

        setPaymentData(data);
        setLoading(false);

        if (data.paymentStatus === 'PAID') {
          setPaymentStatus('PAID');
          onPaymentSuccess?.();
          return;
        }

        // Calculate initial countdown if expiresAt is available
        if (data.expiresAt) {
          const remaining = Math.max(0, Math.floor(data.expiresAt - Date.now() / 1000));
          setTimeLeft(remaining);

          countdownRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev === null || prev <= 1) {
                setPaymentStatus('EXPIRED');
                stopTimers();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }

        // Start polling payment status every 3.5 seconds
        pollingRef.current = setInterval(() => {
          checkPaymentStatus();
        }, 3500);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setLoading(false);
        setErrorMsg(
          typeof err === 'string'
            ? err
            : err instanceof Error
            ? err.message
            : 'Không thể tạo liên kết thanh toán PayOS. Vui lòng thử lại.'
        );
      });

    return () => {
      isMounted = false;
      stopTimers();
    };
  }, [visible, orderId, retryKey, checkPaymentStatus, onPaymentSuccess]);

  // AppState listener: re-check status as soon as user returns to the app from banking app or browser
  useEffect(() => {
    if (!visible) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && paymentStatus === 'PENDING') {
        checkPaymentStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible, paymentStatus, checkPaymentStatus]);

  // Handle open PayOS web checkout
  const handleOpenCheckoutUrl = async () => {
    if (!paymentData?.checkoutUrl) return;
    try {
      setOpeningCheckout(true);
      await Linking.openURL(paymentData.checkoutUrl);
    } catch {
      // Fallback
    } finally {
      setOpeningCheckout(false);
    }
  };

  // Format countdown mm:ss
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine QR Image Source
  const getQrSourceUri = () => {
    if (!paymentData?.qrCode) return null;
    if (paymentData.qrCode.startsWith('http')) {
      return paymentData.qrCode;
    }
    // Encode EMVCo VietQR string as standard QR code image
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      paymentData.qrCode
    )}`;
  };

  const isPaid = paymentStatus === 'PAID';
  const isExpired = paymentStatus === 'EXPIRED';
  const isFailed = paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED';
  const qrUri = getQrSourceUri();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <AppCard elevation="md" style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeRow}>
                <AppText variant="h3">Thanh toán PayOS</AppText>
                <View style={styles.payosBadge}>
                  <AppText variant="caption" color={theme.colors.primary[700]} weight="bold">
                    VietQR 24/7
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Đơn hàng #{orderId}
              </AppText>
            </View>
            <AppButton
              title=""
              variant="ghost"
              size="sm"
              leftIcon={<Ionicons name="close" size={24} color={theme.colors.text.primary} />}
              onPress={handleClose}
            />
          </View>

          <AppDivider spacing="sm" />

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <AppText
                variant="bodySmall"
                color={theme.colors.text.secondary}
                style={styles.loadingText}
              >
                Đang tạo liên kết thanh toán PayOS...
              </AppText>
            </View>
          ) : errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error.main} />
              <AppText variant="body" color={theme.colors.error.main} style={styles.centerText}>
                {errorMsg}
              </AppText>
              <View style={styles.actionRow}>
                <AppButton
                  title="Thử lại"
                  variant="primary"
                  size="md"
                  onPress={handleRetry}
                  style={styles.flexBtn}
                />
                <AppButton
                  title="Đóng"
                  variant="outline"
                  size="md"
                  onPress={handleClose}
                  style={styles.flexBtn}
                />
              </View>
            </View>
          ) : isPaid ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={40} color="#FFFFFF" />
              </View>
              <AppText
                variant="h2"
                color={theme.colors.success.dark}
                weight="bold"
                style={styles.successTitle}
              >
                Thanh toán thành công!
              </AppText>
              <AppText
                variant="bodySmall"
                color={theme.colors.text.secondary}
                style={styles.centerText}
              >
                Hệ thống PayOS đã xác nhận giao dịch. Đơn hàng #{orderId} của bạn đã sẵn sàng được xử lý.
              </AppText>
              <AppButton
                title="Hoàn tất"
                variant="primary"
                size="lg"
                onPress={handleClose}
                style={styles.actionBtn}
              />
            </View>
          ) : isExpired ? (
            <View style={styles.errorContainer}>
              <Ionicons name="time-outline" size={48} color={theme.colors.warning.main} />
              <AppText variant="title" weight="bold" style={styles.stateTitle}>
                Mã thanh toán đã hết hạn
              </AppText>
              <AppText
                variant="bodySmall"
                color={theme.colors.text.secondary}
                style={styles.centerText}
              >
                Thời gian thanh toán PayOS cho phiên này đã hết. Bạn có thể tạo lại mã mới để hoàn tất giao dịch.
              </AppText>
              <AppButton
                title="Tạo lại mã thanh toán"
                variant="primary"
                size="md"
                onPress={handleRetry}
                style={styles.actionBtn}
              />
            </View>
          ) : isFailed ? (
            <View style={styles.errorContainer}>
              <Ionicons name="close-circle-outline" size={48} color={theme.colors.error.main} />
              <AppText variant="title" weight="bold" style={styles.stateTitle}>
                Giao dịch chưa hoàn thành
              </AppText>
              <AppText
                variant="bodySmall"
                color={theme.colors.text.secondary}
                style={styles.centerText}
              >
                Thanh toán đã bị hủy hoặc không thành công. Vui lòng thử lại.
              </AppText>
              <AppButton
                title="Thử thanh toán lại"
                variant="primary"
                size="md"
                onPress={handleRetry}
                style={styles.actionBtn}
              />
            </View>
          ) : paymentData ? (
            <View style={styles.content}>
              {/* Countdown badge if timeLeft is available */}
              {timeLeft !== null && (
                <View style={styles.countdownBadge}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.warning.dark} />
                  <AppText variant="captionMedium" color={theme.colors.warning.dark} weight="bold">
                    Hết hạn sau: {formatCountdown(timeLeft)}
                  </AppText>
                </View>
              )}

              {/* QR Image Box */}
              {qrUri ? (
                <View style={styles.qrImageWrapper}>
                  <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                </View>
              ) : null}

              {/* App / Web Direct Checkout Button */}
              {paymentData.checkoutUrl ? (
                <AppButton
                  title="Mở cổng thanh toán PayOS"
                  variant="primary"
                  size="md"
                  leftIcon={<Ionicons name="open-outline" size={18} color="#FFFFFF" />}
                  onPress={handleOpenCheckoutUrl}
                  loading={openingCheckout}
                  style={styles.checkoutBtn}
                />
              ) : null}

              {/* Status Indicator */}
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <AppText
                  variant="captionMedium"
                  color={theme.colors.primary[700]}
                  style={styles.statusText}
                >
                  Đang chờ bạn quét mã thanh toán...
                </AppText>
              </View>

              {/* Payment Details */}
              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Mã đơn hàng
                  </AppText>
                  <AppText variant="label" weight="medium">
                    #{paymentData.orderId}
                  </AppText>
                </View>

                <View style={styles.detailRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Mã thanh toán PayOS
                  </AppText>
                  <AppText variant="label" weight="bold">
                    #{paymentData.orderCode}
                  </AppText>
                </View>

                <View style={styles.detailRow}>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Số tiền thanh toán
                  </AppText>
                  <AppText variant="label" weight="bold" color={theme.colors.primary[600]}>
                    {formatVND(paymentData.amount)}
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" color={theme.colors.text.muted} style={styles.noticeText}>
                Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ, hoặc nhấn nút &quot;Mở cổng thanh toán PayOS&quot; để thanh toán trực tiếp.
              </AppText>
            </View>
          ) : null}
        </AppCard>
      </View>
    </Modal>
  );
};

export const PayosPaymentModal = PaymentQrModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  payosBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  successTitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  stateTitle: {
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  qrImageWrapper: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  checkoutBtn: {
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  statusText: {
    marginLeft: theme.spacing.sm,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeText: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  centerText: {
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
    lineHeight: 20,
  },
  actionBtn: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
    marginTop: theme.spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
});
