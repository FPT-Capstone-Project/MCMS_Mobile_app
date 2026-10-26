import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { formatVND } from '../../src/core/utils/currency';
import {
  CustomerOrder,
  orderRepository,
  PaymentQrModal,
} from '../../src/features/order';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Orders Tab Screen
 * Displays real customer orders, status, cancel action, and PayOS payment flow.
 */
export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment QR modal state
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<number | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await orderRepository.getCustomerOrders();
      setOrders(data);
    } catch (err: unknown) {
      setErrorMsg(
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể tải danh sách đơn hàng.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const handleOpenPayment = (orderId: number) => {
    setActivePaymentOrderId(orderId);
    setPaymentModalVisible(true);
  };

  const loadOrderDetail = async (orderId: number) => {
    setOrderDetailLoading(true);
    setOrderDetailError(null);
    try {
      const detail = await orderRepository.getOrderDetail(orderId);
      setOrders((current) =>
        current.map((order) => order.order_id === orderId ? detail : order)
      );
    } catch (err: unknown) {
      setOrderDetailError(
        err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng.'
      );
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleToggleOrderDetails = (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    void loadOrderDetail(orderId);
  };

  const handleCancelOrder = (orderId: number) => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc chắn muốn hủy đơn hàng này không?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          setCancellingOrderId(orderId);
          try {
            await orderRepository.cancelOrder(orderId);
            Alert.alert('Thành công', 'Đơn hàng đã được hủy.');
            loadOrders();
          } catch (err: unknown) {
            Alert.alert(
              'Lỗi',
              typeof err === 'string'
                ? err
                : err instanceof Error
                ? err.message
                : 'Không thể hủy đơn hàng này.'
            );
          } finally {
            setCancellingOrderId(null);
          }
        },
      },
    ]);
  };

  const renderStatusBadge = (order: CustomerOrder) => {
    let badgeText = 'Chờ thanh toán';
    let badgeColor: string = theme.colors.warning.main;
    let badgeBg = 'rgba(234, 179, 8, 0.1)';

    if (order.order_status === 'CANCELLED') {
      badgeText = 'Đã hủy';
      badgeColor = theme.colors.neutral[500];
      badgeBg = theme.colors.neutral[100];
    } else if (order.order_status === 'COMPLETED') {
      badgeText = 'Hoàn thành';
      badgeColor = theme.colors.success.dark;
      badgeBg = 'rgba(34, 197, 94, 0.12)';
    } else if (order.order_status === 'PROCESSING') {
      badgeText = 'Đang nuôi trồng';
      badgeColor = theme.colors.primary[600];
      badgeBg = theme.colors.primary[50];
    } else if (order.order_status === 'CONFIRMED') {
      badgeText = 'Đã xác nhận';
      badgeColor = theme.colors.success.dark;
      badgeBg = 'rgba(34, 197, 94, 0.12)';
    } else if (order.order_status === 'PAID' || order.payment_status === 'PAID') {
      badgeText = 'Đã thanh toán';
      badgeColor = theme.colors.success.dark;
      badgeBg = 'rgba(34, 197, 94, 0.12)';
    } else if (order.payment_status === 'FAILED') {
      badgeText = 'Thanh toán thất bại';
      badgeColor = theme.colors.error.main;
      badgeBg = theme.colors.error.light;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <AppText variant="captionMedium" color={badgeColor} weight="bold">
          {badgeText}
        </AppText>
      </View>
    );
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Đơn hàng"
        subtitle="Lịch sử thuê khay & thanh toán"
        rightAction={
          <AppButton
            title="Đặt hàng mới"
            variant="primary"
            size="sm"
            leftIcon={<Ionicons name="cart-outline" size={16} color="#FFFFFF" />}
            onPress={() => router.push('/rental' as any)}
          />
        }
      />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
              Đang tải danh sách đơn hàng...
            </AppText>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.colors.error.main} />
            <AppText variant="body" color={theme.colors.error.main} style={styles.errorText}>
              {errorMsg}
            </AppText>
            <AppButton title="Thử lại" variant="outline" size="sm" onPress={loadOrders} />
          </View>
        ) : orders.length === 0 ? (
          <AppEmptyState
            icon={<Ionicons name="receipt-outline" size={48} color={theme.colors.text.muted} />}
            title="Chưa có đơn hàng nào"
            description="Bạn chưa tạo đơn thuê khay hoặc gói nấm nào. Bắt đầu ngay hôm nay!"
            actionTitle="Thuê khay ngay"
            onAction={() => router.push('/rental' as any)}
          />
        ) : (
          orders.map((order) => {
            const isPendingUnpaid =
              order.order_status === 'PENDING' &&
              ['UNPAID', 'PENDING', 'FAILED'].includes(order.payment_status || '');

            const items = order.items || order.order_items || [];

            return (
              <AppCard key={order.order_id} elevation="sm" style={styles.orderCard}>
                <View style={styles.cardTop}>
                  <View style={styles.orderMeta}>
                    <AppText variant="label" weight="bold">
                      Đơn hàng #{order.order_id}
                    </AppText>
                    {order.created_at ? (
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </AppText>
                    ) : null}
                  </View>
                  {renderStatusBadge(order)}
                </View>

                <AppDivider spacing="xs" />

                <View style={styles.orderItems}>
                  {items.length > 0 ? (
                    items.map((item, idx) => (
                      <View key={item.order_item_id || idx} style={styles.itemRow}>
                        <Ionicons name="cube-outline" size={18} color={theme.colors.primary[500]} />
                        <AppText variant="bodySmall" style={styles.itemText}>
                          {item.package_name || 'Gói thuê khay'}
                          {item.mushroom_name ? ` • Nấm ${item.mushroom_name}` : ''}
                        </AppText>
                      </View>
                    ))
                  ) : (
                    <View style={styles.itemRow}>
                      <Ionicons name="cube-outline" size={18} color={theme.colors.primary[500]} />
                      <AppText variant="bodySmall" style={styles.itemText}>
                        Gói dịch vụ nuôi trồng nấm SmartMush
                      </AppText>
                    </View>
                  )}

                  <View style={styles.amountRow}>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Tổng tiền:
                    </AppText>
                    <AppText variant="title" weight="bold" color={theme.colors.primary[700]}>
                      {formatVND(order.total_amount)}
                    </AppText>
                  </View>
                </View>

                <AppButton
                  title={expandedOrderId === order.order_id ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                  variant="ghost"
                  size="sm"
                  onPress={() => handleToggleOrderDetails(order.order_id)}
                />
                {expandedOrderId === order.order_id ? (
                  <View style={styles.detailContainer}>
                    {orderDetailLoading ? (
                      <ActivityIndicator color={theme.colors.primary[500]} />
                    ) : orderDetailError ? (
                      <View style={styles.detailError}>
                        <AppText variant="caption" color={theme.colors.error.main}>
                          {orderDetailError}
                        </AppText>
                        <AppButton
                          title="Thử lại"
                          variant="ghost"
                          size="sm"
                          onPress={() => loadOrderDetail(order.order_id)}
                        />
                      </View>
                    ) : (
                      <>
                        <AppText variant="caption">
                          Trạng thái thanh toán: {order.payment_status || 'Chưa xác định'}
                        </AppText>
                        {(order.items || order.order_items || []).map((item, index) => (
                          <View key={item.order_item_id || index} style={styles.detailItem}>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              {item.item_type || 'Sản phẩm'} · SL {item.quantity ?? 1}
                            </AppText>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              {formatVND(item.total_price ?? item.price ?? 0)}
                            </AppText>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ) : null}

                {isPendingUnpaid && (
                  <View style={styles.orderFooter}>
                    <AppButton
                      title="Hủy đơn"
                      variant="outline"
                      size="sm"
                      style={styles.actionBtn}
                      loading={cancellingOrderId === order.order_id}
                      disabled={cancellingOrderId === order.order_id}
                      onPress={() => handleCancelOrder(order.order_id)}
                    />
                    <AppButton
                      title="Thanh toán QR"
                      variant="primary"
                      size="sm"
                      style={styles.actionBtn}
                      leftIcon={<Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />}
                      onPress={() => handleOpenPayment(order.order_id)}
                    />
                  </View>
                )}
              </AppCard>
            );
          })
        )}
      </View>

      {/* PayOS Payment Modal */}
      {activePaymentOrderId && (
        <PaymentQrModal
          visible={paymentModalVisible}
          orderId={activePaymentOrderId}
          onClose={() => {
            setPaymentModalVisible(false);
            setActivePaymentOrderId(null);
            loadOrders();
          }}
          onPaymentSuccess={() => {
            loadOrders();
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
  },
  errorBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    textAlign: 'center',
  },
  orderCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMeta: {
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  orderItems: {
    gap: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemText: {
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  orderFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  detailContainer: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
  },
  detailError: {
    gap: theme.spacing.xs,
    alignItems: 'flex-start',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
});
