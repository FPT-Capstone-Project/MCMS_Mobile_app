import { AppAlert as Alert } from '../../../../shared/components/feedback/AppDialog';
import { Ionicons } from '@expo/vector-icons';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { orderRepository } from '../../data/repositories/OrderRepository';
import { PaymentQrModal } from '../components/PaymentQrModal';
import type { CustomerOrder } from '../../domain/entities/Order';
import { MushroomImage } from '../../../../shared/components/MushroomImage';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';

interface PaymentStatusPresentation {
  label: string;
  color: string;
  backgroundColor: string;
}

function getPaymentStatus(status?: string): PaymentStatusPresentation {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return {
        label: 'Đã thanh toán',
        color: theme.colors.success.dark,
        backgroundColor: theme.colors.success.light,
      };
    case 'PENDING':
    case 'UNPAID':
      return {
        label: 'Chưa thanh toán',
        color: theme.colors.warning.dark,
        backgroundColor: theme.colors.warning.light,
      };
    case 'FAILED':
      return {
        label: 'Thanh toán thất bại',
        color: theme.colors.error.main,
        backgroundColor: theme.colors.error.light,
      };
    case 'REFUND_PENDING':
      return {
        label: 'Đang chờ hoàn tiền',
        color: theme.colors.warning.dark,
        backgroundColor: theme.colors.warning.light,
      };
    case 'REFUNDED':
      return {
        label: 'Đã hoàn tiền',
        color: theme.colors.neutral[600],
        backgroundColor: theme.colors.neutral[100],
      };
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        label: 'Chưa thanh toán',
        color: theme.colors.neutral[600],
        backgroundColor: theme.colors.neutral[100],
      };
    default:
      return {
        label: 'Chưa xác định',
        color: theme.colors.text.secondary,
        backgroundColor: theme.colors.neutral[100],
      };
  }
}

function isUnpaidOrder(order: CustomerOrder): boolean {
  return order.order_status === 'PENDING' &&
    ['UNPAID', 'PENDING', 'FAILED'].includes(order.payment_status?.toUpperCase() ?? '');
}

function splitValues(value?: string | null): string[] {
  return value?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
}

function orderMushroomItems(order: CustomerOrder) {
  const items = order.items ?? order.order_items ?? [];
  const mushroomItems = items.filter((item) =>
    item.item_type?.toUpperCase() === 'MUSHROOM' || Boolean(item.mushroom_name?.trim()),
  );
  if (mushroomItems.length > 0) {
    return mushroomItems.map((item, index) => ({
      key: item.order_item_id ?? index,
      name: item.mushroom_name?.trim() || item.package_name?.trim() || 'Nấm',
      imageUri: item.image_url?.trim() || undefined,
      quantity: item.quantity,
    }));
  }

  const names = splitValues(order.mushroom_name);
  const images = splitValues(order.mushroom_image_url || order.image_url);
  if (names.length > 0) {
    return names.map((name, index) => ({
      key: `${order.order_id}-${index}`,
      name,
      imageUri: images[index] || images[0],
      quantity: undefined,
    }));
  }
  return [{
    key: order.order_id,
    name: order.package_name?.trim() || 'Gói nuôi trồng nấm',
    imageUri: images[0],
    quantity: undefined,
  }];
}

export function CustomerPaymentOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    setErrorMessage(null);
    try {
      setOrders(await orderRepository.getCustomerOrders());
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  const cancelOrder = (orderId: number) => {
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
            await loadOrders();
          } catch (error: unknown) {
            Alert.alert(
              'Lỗi',
              error instanceof Error ? error.message : 'Không thể hủy đơn hàng này.',
            );
          } finally {
            setCancellingOrderId(null);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Đơn hàng"
        subtitle="Trạng thái thanh toán"
        showBack
        rightAction={
          <AppButton
            title="Đặt hàng mới"
            variant="primary"
            size="sm"
            leftIcon={<Ionicons name="cart-outline" size={16} color="#FFFFFF" />}
            onPress={() => router.push('/rental' as Href)}
          />
        }
      />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        ) : errorMessage ? (
          <View style={styles.state}>
            <AppText variant="bodySmall" color={theme.colors.error.main}>{errorMessage}</AppText>
            <AppButton title="Thử tải lại" variant="outline" onPress={() => void loadOrders()} />
          </View>
        ) : orders.length === 0 ? (
          <AppEmptyState
            icon={<Ionicons name="receipt-outline" size={48} color={theme.colors.text.muted} />}
            title="Chưa có đơn hàng nào"
            description="Các đơn hàng và trạng thái thanh toán sẽ hiển thị tại đây."
            actionTitle="Thuê khay ngay"
            onAction={() => router.push('/rental' as Href)}
          />
        ) : (
          orders.map((order) => {
            const paymentStatus = getPaymentStatus(order.payment_status);
            const canPay = isUnpaidOrder(order);
            const products = orderMushroomItems(order);
            return (
              <AppCard key={order.order_id} elevation="sm" style={styles.orderCard}>
                <View style={styles.orderHeading}>
                  <View style={styles.orderIdentity}>
                    <AppText variant="bodyMedium" weight="bold">Đơn hàng #{order.order_id}</AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString('vi-VN')
                        : 'Ngày tạo chưa ghi nhận'}
                    </AppText>
                  </View>
                  <View style={[styles.paymentBadge, { backgroundColor: paymentStatus.backgroundColor }]}>
                    <AppText variant="captionMedium" color={paymentStatus.color} weight="bold">
                      {paymentStatus.label}
                    </AppText>
                  </View>
                </View>
                <View style={styles.products}>
                  {products.map((product) => (
                    <View key={product.key} style={styles.productRow}>
                      <MushroomImage uri={product.imageUri} name={product.name} compact />
                      <View style={styles.productInfo}>
                        <AppText variant="bodySmall" weight="bold">{product.name}</AppText>
                        {product.quantity && product.quantity > 1 ? (
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Số lượng: {product.quantity}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
                <AppText variant="title" weight="bold" color={theme.colors.primary[700]}>
                  {formatVND(order.total_amount)}
                </AppText>

                {canPay ? (
                  <View style={styles.actions}>
                    <AppButton
                      title="Hủy đơn"
                      variant="outline"
                      size="sm"
                      style={styles.actionButton}
                      loading={cancellingOrderId === order.order_id}
                      disabled={cancellingOrderId !== null}
                      onPress={() => cancelOrder(order.order_id)}
                    />
                    <AppButton
                      title="Thanh toán QR"
                      variant="primary"
                      size="sm"
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />}
                      onPress={() => setActivePaymentOrderId(order.order_id)}
                    />
                  </View>
                ) : order.payment_status?.toUpperCase() === 'PAID' ? (
                  <AppButton
                    title="Theo dõi tại Phiên của tôi"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(tabs)/orders' as Href)}
                  />
                ) : null}
              </AppCard>
            );
          })
        )}
      </View>

      {activePaymentOrderId !== null ? (
        <PaymentQrModal
          visible
          orderId={activePaymentOrderId}
          onClose={() => {
            setActivePaymentOrderId(null);
            void loadOrders();
          }}
          onPaymentSuccess={() => { void loadOrders(); }}
        />
      ) : null}
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
  state: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  orderCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
  },
  products: { gap: theme.spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  productInfo: { flex: 1, gap: theme.spacing.xs },
  orderHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  orderIdentity: { flex: 1, gap: theme.spacing.xs },
  paymentBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  actionButton: { flex: 1 },
});
