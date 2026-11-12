import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { formatVND } from '../../src/core/utils/currency';
import { useAuth } from '../../src/features/auth';
import {
  AdminOrdersScreen,
  CustomerOrder,
  CustomerCultivationStatus,
  orderRepository,
  PaymentQrModal,
} from '../../src/features/order';
import { cultivationRepository, MushroomType } from '../../src/features/cultivation';
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
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR';

  if (isStaff) {
    return <AdminOrdersScreen />;
  }

  return <CustomerOrdersContent />;
}

function getPaymentStatus(status?: string) {
  switch (status?.toUpperCase()) {
    case 'UNPAID':
      return {
        label: 'Chưa thanh toán',
        color: theme.colors.warning.dark,
        backgroundColor: theme.colors.warning.light,
      };
    case 'PENDING':
      return {
        label: 'Đang chờ thanh toán',
        color: theme.colors.warning.dark,
        backgroundColor: theme.colors.warning.light,
      };
    case 'PAID':
      return {
        label: 'Đã thanh toán',
        color: theme.colors.success.dark,
        backgroundColor: theme.colors.success.light,
      };
    case 'FAILED':
      return {
        label: 'Thanh toán thất bại',
        color: theme.colors.error.main,
        backgroundColor: theme.colors.error.light,
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        color: theme.colors.neutral[600],
        backgroundColor: theme.colors.neutral[100],
      };
    case 'EXPIRED':
      return {
        label: 'Đã hết hạn',
        color: theme.colors.neutral[600],
        backgroundColor: theme.colors.neutral[100],
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
        color: theme.colors.success.dark,
        backgroundColor: theme.colors.success.light,
      };
    default:
      return {
        label: 'Chưa xác định',
        color: theme.colors.text.secondary,
        backgroundColor: theme.colors.neutral[100],
      };
  }
}

function formatPackageLabel(packageName?: string, durationDays?: number) {
  const name = (packageName || 'Gói thuê khay').trim();
  const durationInName = name.match(/^(.*?)(?:[:\s-]*)(\d+)\s*(?:ngày|days?)$/i);
  if (durationInName) {
    const baseName = durationInName[1].trim();
    return baseName ? `${baseName} · ${durationInName[2]} ngày` : `${durationInName[2]} ngày`;
  }

  const cleanName = name.replace(/[:\s-]*(?:ngày|days?)\s*$/i, '').trim();
  return durationDays && durationDays > 0
    ? `${cleanName || 'Gói thuê khay'} · ${durationDays} ngày`
    : cleanName || 'Gói thuê khay';
}

function normalizeMushroomName(name?: string) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^nam\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function getSessionProgressLabel(status: string, harvestStatus?: string | null): string {
  if (status === 'CULTIVATING' && harvestStatus === 'HARVEST_READY') {
    return 'Sẵn sàng thu hoạch';
  }

  const labels: Record<string, string> = {
    PENDING: 'Đang chuẩn bị phôi',
    SPAWN_RESTING: 'Đang ủ phôi',
    MYCELIAL_DEVELOPMENT: 'Đang phát triển tơ nấm',
    READY_FOR_CULTIVATION: 'Sẵn sàng nuôi trồng',
    CULTIVATING: 'Đang nuôi trồng',
    HARVEST_READY: 'Sẵn sàng thu hoạch',
    HARVESTING: 'Đang thu hoạch',
    COMPLETED: 'Đã hoàn tất',
    CANCELLED: 'Đã hủy',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

type CustomerOrderFilter =
  | 'all'
  | 'unpaid'
  | 'in_progress'
  | 'handover'
  | 'completed'
  | 'cancelled';

const customerOrderFilters: { value: CustomerOrderFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unpaid', label: 'Chờ thanh toán' },
  { value: 'in_progress', label: 'Đang trong quá trình' },
  { value: 'handover', label: 'Đang giao / đến hái' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function isUnpaidOrder(order: CustomerOrder): boolean {
  return (
    order.order_status === 'PENDING' &&
    ['UNPAID', 'PENDING', 'FAILED'].includes(order.payment_status || '')
  );
}

function hasHandoverProgress(cultivation?: CustomerCultivationStatus): boolean {
  return (cultivation?.sessions ?? []).some(
    (session) =>
      session.status === 'HARVEST_READY' ||
      session.status === 'HARVESTING' ||
      session.harvest_status === 'HARVEST_READY' ||
      (Boolean(session.harvest_method) &&
        session.harvest_request_status !== 'COMPLETED')
  );
}

function matchesOrderFilter(
  order: CustomerOrder,
  filter: CustomerOrderFilter,
  cultivation?: CustomerCultivationStatus
): boolean {
  if (filter === 'all') return true;
  if (filter === 'cancelled') return order.order_status === 'CANCELLED';
  if (filter === 'completed') return order.order_status === 'COMPLETED';
  if (filter === 'unpaid') return isUnpaidOrder(order);
  if (filter === 'handover') return hasHandoverProgress(cultivation);
  return (
    order.order_status !== 'COMPLETED' &&
    order.order_status !== 'CANCELLED' &&
    !isUnpaidOrder(order) &&
    !hasHandoverProgress(cultivation)
  );
}

function CustomerOrdersContent() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<CustomerOrderFilter>('all');
  const [cultivationByOrder, setCultivationByOrder] = useState<
    Record<number, { data?: CustomerCultivationStatus; error?: string; loading?: boolean }>
  >({});
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);
  const [mushroomLoadError, setMushroomLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment QR modal state
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<number | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  const mushroomImagesById = useMemo(
    () => new Map(mushroomTypes.map((mushroom) => [mushroom.mushroom_type_id, mushroom.image_url])),
    [mushroomTypes]
  );
  const mushroomImagesByName = useMemo(
    () => new Map(mushroomTypes.map((mushroom) => [normalizeMushroomName(mushroom.name), mushroom.image_url])),
    [mushroomTypes]
  );
  const getMushroomImageUrl = useCallback(
    (name?: string, mushroomTypeId?: number) => {
      if (mushroomTypeId) {
        const byId = mushroomImagesById.get(mushroomTypeId);
        if (byId?.trim()) return byId.trim();
      }

      if (!name) return undefined;
      const rawTrimmed = name.trim();
      if (/^https?:\/\//i.test(rawTrimmed)) {
        return rawTrimmed;
      }

      const normalizedName = normalizeMushroomName(rawTrimmed);
      if (!normalizedName) return undefined;

      const exactMatch = mushroomImagesByName.get(normalizedName);
      if (exactMatch?.trim()) return exactMatch.trim();

      const partialMatch = mushroomTypes.find((mushroom) => {
        const catalogName = normalizeMushroomName(mushroom.name);
        if (!catalogName) return false;
        return (
          catalogName === normalizedName ||
          catalogName.includes(normalizedName) ||
          normalizedName.includes(catalogName)
        );
      });
      if (partialMatch?.image_url?.trim()) return partialMatch.image_url.trim();

      if (normalizedName.length >= 4) {
        const prefix = normalizedName.slice(0, 5);
        const prefixMatch = mushroomTypes.find((mushroom) => {
          const catalogName = normalizeMushroomName(mushroom.name);
          return catalogName && catalogName.startsWith(prefix);
        });
        if (prefixMatch?.image_url?.trim()) return prefixMatch.image_url.trim();
      }

      return undefined;
    },
    [mushroomImagesById, mushroomImagesByName, mushroomTypes]
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesOrderFilter(
          order,
          orderFilter,
          cultivationByOrder[order.order_id]?.data
        )
      ),
    [cultivationByOrder, orderFilter, orders]
  );

  const loadOrders = useCallback(async () => {
    try {
      setErrorMsg(null);
      const [ordersResult, mushroomsResult] = await Promise.allSettled([
        orderRepository.getCustomerOrders(),
        cultivationRepository.getMushroomTypes(),
      ]);
      if (ordersResult.status === 'rejected') throw ordersResult.reason;
      setOrders(ordersResult.value);

      const activePaidOrders = ordersResult.value.filter(
        (order) =>
          order.payment_status === 'PAID' &&
          !['COMPLETED', 'CANCELLED'].includes(order.order_status)
      );
      setCultivationByOrder(
        Object.fromEntries(activePaidOrders.map((order) => [order.order_id, { loading: true }]))
      );

      if (mushroomsResult.status === 'fulfilled') {
        setMushroomTypes(mushroomsResult.value);
        setMushroomLoadError(null);
      } else {
        setMushroomTypes([]);
        setMushroomLoadError(
          mushroomsResult.reason instanceof Error
            ? mushroomsResult.reason.message
            : 'Không thể tải hình ảnh các loại nấm.'
        );
      }
      setLoading(false);

      const sessionResults = await Promise.allSettled(
        activePaidOrders.map((order) =>
          orderRepository.getCustomerCultivationStatus(order.order_id)
        )
      );
      const nextCultivationByOrder: Record<
        number,
        { data?: CustomerCultivationStatus; error?: string; loading?: boolean }
      > = {};
      sessionResults.forEach((result, index) => {
        const orderId = activePaidOrders[index].order_id;
        nextCultivationByOrder[orderId] =
          result.status === 'fulfilled'
            ? { data: result.value }
            : {
                error:
                  result.reason instanceof Error
                    ? result.reason.message
                    : 'Không thể tải trạng thái nuôi trồng.',
              };
      });
      setCultivationByOrder(nextCultivationByOrder);
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
      const detailItems = detail.items || detail.order_items || [];
      const itemsWithImages = await Promise.all(
        detailItems.map(async (item) => {
          if (item.image_url?.trim()) {
            return { ...item, image_url: item.image_url.trim() };
          }

          const imageFromCatalog = getMushroomImageUrl(item.mushroom_name, item.mushroom_type_id);
          if (imageFromCatalog?.trim()) {
            return { ...item, image_url: imageFromCatalog.trim() };
          }

          if (!item.mushroom_type_id) return item;

          try {
            const mushroom = await cultivationRepository.getMushroomType(item.mushroom_type_id);
            return { ...item, image_url: mushroom.image_url?.trim() || undefined };
          } catch {
            return item;
          }
        })
      );
      setOrders((current) =>
        current.map((order) => (
          order.order_id === orderId ? { ...detail, items: itemsWithImages } : order
        ))
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
    } else if (order.payment_status === 'FAILED') {
      badgeText = 'Thanh toán thất bại';
      badgeColor = theme.colors.error.main;
      badgeBg = theme.colors.error.light;
    } else if (order.payment_status === 'REFUNDED') {
      badgeText = 'Đã hoàn tiền';
      badgeColor = theme.colors.success.dark;
      badgeBg = theme.colors.success.light;
    } else if (
      order.payment_status === 'PAID' &&
      !['COMPLETED', 'CANCELLED'].includes(order.order_status)
    ) {
      const cultivation = cultivationByOrder[order.order_id];
      const labels = [...new Set(
        (cultivation?.data?.sessions ?? []).map((session) =>
          getSessionProgressLabel(session.status, session.harvest_status)
        )
      )];
      badgeText = cultivation?.loading
        ? 'Đang tải tiến độ'
        : cultivation?.error
        ? 'Chưa tải được tiến độ'
        : labels.length === 1
        ? labels[0]
        : labels.length > 1
        ? 'Đang ở nhiều giai đoạn'
        : 'Đang chuẩn bị phôi';
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
        {mushroomLoadError ? (
          <AppText variant="caption" color={theme.colors.warning.dark}>
            Chưa tải được ảnh nấm: {mushroomLoadError}
          </AppText>
        ) : null}
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
          <>
            <View style={styles.orderFilters}>
              {customerOrderFilters.map((option) => {
                const selected = orderFilter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setOrderFilter(option.value)}
                    style={[
                      styles.orderFilter,
                      selected && styles.orderFilterSelected,
                    ]}
                  >
                    <AppText
                      variant="captionMedium"
                      weight="bold"
                      color={
                        selected
                          ? theme.colors.primary[700]
                          : theme.colors.text.secondary
                      }
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {filteredOrders.length === 0 ? (
              <AppEmptyState
                icon={<Ionicons name="receipt-outline" size={44} color={theme.colors.text.muted} />}
                title="Không có đơn hàng phù hợp"
                description="Thử chọn một trạng thái khác để xem đơn hàng."
              />
            ) : filteredOrders.map((order) => {
            const isPendingUnpaid = isUnpaidOrder(order);

            const items = order.items || order.order_items || [];
            const paymentStatus = getPaymentStatus(order.payment_status);
            const mushroomNames = order.mushroom_name
              ?.split(',')
              .map((name) => name.trim())
              .filter(Boolean) || [];
            const packageNames = order.package_name
              ?.split(',')
              .map((name) => name.trim())
              .filter(Boolean) || [];
            const orderImages = (order.mushroom_image_url || order.image_url)
              ?.split(',')
              .map((url) => url.trim())
              .filter(Boolean) || [];

            const products = items.length > 0
              ? items.map((item, index) => {
                  const directImg = item.image_url?.trim();
                  const catalogImg = getMushroomImageUrl(item.mushroom_name, item.mushroom_type_id);
                  return {
                    key: item.order_item_id || index,
                    name: item.mushroom_name,
                    imageUrl: directImg || catalogImg,
                    packageName: item.package_name,
                    durationDays: item.duration_days,
                    quantity: item.quantity,
                  };
                })
              : mushroomNames.length > 0
              ? mushroomNames.map((name, index) => ({
                  key: index,
                  name,
                  imageUrl: orderImages[index] || getMushroomImageUrl(name),
                  packageName: packageNames[index] ?? packageNames[0],
                  durationDays: undefined,
                  quantity: undefined,
                }))
              : [
                  {
                    key: `order-fallback-${order.order_id}`,
                    name: order.mushroom_name || '',
                    imageUrl:
                      orderImages[0] ||
                      getMushroomImageUrl(order.mushroom_name || order.package_name),
                    packageName: order.package_name || 'Gói dịch vụ nuôi trồng nấm SmartMush',
                    durationDays: undefined,
                    quantity: undefined,
                  },
                ];

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
                  {products.length > 0 ? (
                    products.map((product) => (
                      <View key={product.key} style={styles.itemRow}>
                        <View style={styles.productImageWrap}>
                          {product.imageUrl ? (
                            <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
                          ) : (
                            <Ionicons name="leaf-outline" size={22} color={theme.colors.primary[600]} />
                          )}
                        </View>
                        <View style={styles.productInfo}>
                          <AppText variant="bodySmall" weight="bold" style={styles.itemText}>
                            {product.name ? `${product.name}` : product.packageName || 'Sản phẩm'}
                          </AppText>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            {formatPackageLabel(product.packageName, product.durationDays)}
                          </AppText>
                          {product.quantity && product.quantity > 1 ? (
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              Số lượng: {product.quantity}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.itemRow}>
                      <View style={styles.productImageWrap}>
                        <Ionicons name="leaf-outline" size={22} color={theme.colors.primary[600]} />
                      </View>
                      <View style={styles.productInfo}>
                        <AppText variant="bodySmall" weight="bold" style={styles.itemText}>
                          {order.mushroom_name
                            ? `${order.mushroom_name}`
                            : order.package_name || 'Gói dịch vụ nuôi trồng nấm SmartMush'}
                        </AppText>
                        {order.package_name ? (
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            {formatPackageLabel(order.package_name)}
                          </AppText>
                        ) : null}
                      </View>
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

                {cultivationByOrder[order.order_id]?.data?.sessions.length ? (
                  <View style={styles.orderProgressList}>
                    {cultivationByOrder[order.order_id].data?.sessions.map((session) => (
                      <AppText
                        key={session.session_id}
                        variant="caption"
                        color={theme.colors.text.secondary}
                      >
                        {session.mushroom_name
                          ? `${session.mushroom_name}: `
                          : 'Tiến độ nuôi trồng: '}
                        {getSessionProgressLabel(session.status, session.harvest_status)}
                      </AppText>
                    ))}
                  </View>
                ) : null}
                {cultivationByOrder[order.order_id]?.error ? (
                  <AppText variant="caption" color={theme.colors.error.main}>
                    Không thể tải tiến độ nuôi trồng: {cultivationByOrder[order.order_id].error}
                  </AppText>
                ) : null}

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
                        <View style={styles.paymentStatusRow}>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Trạng thái thanh toán
                          </AppText>
                          <View
                            style={[
                              styles.paymentStatusBadge,
                              { backgroundColor: paymentStatus.backgroundColor },
                            ]}
                          >
                            <AppText
                              variant="captionMedium"
                              color={paymentStatus.color}
                              weight="bold"
                            >
                              {paymentStatus.label}
                            </AppText>
                          </View>
                        </View>
                        {(order.items || order.order_items || []).map((item, index) => {
                          const mushroomName = item.mushroom_name;
                          const imageUrl =
                            item.image_url?.trim() ||
                            getMushroomImageUrl(mushroomName, item.mushroom_type_id) ||
                            getMushroomImageUrl(item.package_name);
                          return (
                            <View key={item.order_item_id || index} style={styles.detailItem}>
                              <View style={styles.detailProduct}>
                                <View style={styles.detailProductImageWrap}>
                                  {imageUrl ? (
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.detailProductImage}
                                    resizeMode="cover"
                                  />
                                  ) : (
                                    <Ionicons
                                      name="leaf-outline"
                                      size={18}
                                      color={theme.colors.primary[600]}
                                    />
                                  )}
                                </View>
                                <View style={styles.detailProductInfo}>
                                  <AppText variant="captionMedium" weight="bold">
                                    {mushroomName
                                      ? `${mushroomName}`
                                      : item.package_name || 'Sản phẩm'}
                                  </AppText>
                                  <AppText variant="caption" color={theme.colors.text.secondary}>
                                    {formatPackageLabel(item.package_name, item.duration_days)}
                                  </AppText>
                                  <AppText variant="caption" color={theme.colors.text.muted}>
                                    Số lượng: {item.quantity ?? 1}
                                  </AppText>
                                </View>
                              </View>
                              <AppText variant="caption" color={theme.colors.text.secondary}>
                                {formatVND(item.total_price ?? item.price ?? 0)}
                              </AppText>
                            </View>
                          );
                        })}
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
          })}
          </>
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
  orderFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  orderFilter: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
  orderFilterSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
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
  orderProgressList: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  productImageWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    gap: 2,
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
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  paymentStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  detailError: {
    gap: theme.spacing.xs,
    alignItems: 'flex-start',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  detailProduct: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailProductImageWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailProductImage: {
    width: '100%',
    height: '100%',
  },
  detailProductInfo: {
    flex: 1,
    gap: 2,
  },
});
