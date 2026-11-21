import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import type { AdminHarvestRequest } from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import { AppButton, AppCard, AppEmptyState, AppHeader, AppText, ScreenContainer } from '../../../../shared/components';
import { ShipmentTrackingButton } from '../components/ShipmentTracking';
import { useGetAdminShipmentsQuery } from '../../data/shipmentApi';

type OrderFilter = 'ALL' | 'DELIVERY_IN_PROGRESS' | 'PICKUP' | 'WAITING_DELIVERY' | 'COMPLETED';
type TrackedOrder = { orderId: number; customerName: string; requests: AdminHarvestRequest[] };

const filters: { value: OrderFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DELIVERY_IN_PROGRESS', label: 'Đang vận chuyển' },
  { value: 'PICKUP', label: 'Đến hái' },
  { value: 'WAITING_DELIVERY', label: 'Chờ giao hàng' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

function isCompleted(request: AdminHarvestRequest): boolean {
  return request.harvest_request_status.toUpperCase() === 'COMPLETED' ||
    request.session_status?.toUpperCase() === 'COMPLETED';
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('vi-VN');
}

export function OperatorOrdersScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminHarvestRequest[]>([]);
  const [filter, setFilter] = useState<OrderFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const {
    data: shipments = [],
    isError: shipmentsError,
    isFetching: shipmentsFetching,
    refetch: refetchShipments,
  } = useGetAdminShipmentsQuery(undefined, { refetchOnMountOrArgChange: true });

  const loadRequests = useCallback(async () => {
    setError(null);
    if (!loaded.current) setLoading(true);
    try {
      setRequests(await iotRepository.getAdminHarvestRequests());
      loaded.current = true;
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải đơn nhận nấm.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadRequests();
  }, [loadRequests]));

  const orders = useMemo(() => {
    const grouped = new Map<number, TrackedOrder>();
    const latestShipmentByOrder = new Map<number, { shipment_id: number; status: string }>();
    for (const shipment of shipments) {
      const current = latestShipmentByOrder.get(shipment.order_id);
      if (!current || shipment.shipment_id > current.shipment_id) {
        latestShipmentByOrder.set(shipment.order_id, shipment);
      }
    }

    for (const request of requests) {
      const current = grouped.get(request.order_id);
      if (current) {
        current.requests.push(request);
      } else {
        grouped.set(request.order_id, {
          orderId: request.order_id,
          customerName: request.customer_name || 'Khách hàng',
          requests: [request],
        });
      }
    }

    return [...grouped.values()]
      .filter((order) => {
        if (filter === 'ALL') return true;
        if (filter === 'DELIVERY_IN_PROGRESS') {
          const status = latestShipmentByOrder.get(order.orderId)?.status.toUpperCase();
          return status === 'SHIPPED';
        }
        if (filter === 'PICKUP') return !order.requests.every(isCompleted) && order.requests.some((request) => request.harvest_method === 'PICKUP');
        if (filter === 'WAITING_DELIVERY') {
          return latestShipmentByOrder.get(order.orderId)?.status.toUpperCase() === 'PENDING';
        }
        return order.requests.every(isCompleted);
      })
      .sort((left, right) => right.orderId - left.orderId);
  }, [requests, shipments, filter]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRequests(), refetchShipments()]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Theo dõi đơn hàng"
        subtitle="Giao hàng và khách đến hái"
        showBack
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      />
      <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
        <FlatList
          data={orders}
          keyExtractor={(order) => String(order.orderId)}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          renderItem={({ item }) => (
            <AppCard variant="outlined" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <AppText variant="bodyMedium" weight="bold">Đơn hàng #{item.orderId}</AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>{item.customerName}</AppText>
                </View>
                <Ionicons name="receipt-outline" size={22} color={theme.colors.primary[600]} />
              </View>
              <AppText variant="captionMedium" weight="bold">Yêu cầu nhận nấm ({item.requests.length})</AppText>
              {item.requests.map((request) => (
                <View key={request.harvest_request_id} style={styles.requestRow}>
                  <AppText variant="bodySmall">
                    Phiên #{request.session_id} · {request.harvest_method === 'DELIVERY' ? 'Giao hàng' : request.harvest_method === 'PICKUP' ? 'Đến hái' : 'Chưa chọn cách nhận'}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    {isCompleted(request) ? 'Đã hoàn thành' : `Trạng thái: ${request.harvest_request_status}`}
                    {formatDate(request.scheduled_at) ? ` · ${formatDate(request.scheduled_at)}` : ''}
                  </AppText>
                </View>
              ))}
              {item.requests.some((request) => request.harvest_method === 'DELIVERY') ? (
                <ShipmentTrackingButton orderId={item.orderId} />
              ) : null}
            </AppCard>
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Lọc theo hình thức nhận nấm, trạng thái đơn hoặc trạng thái vận đơn.
              </AppText>
              <View style={styles.filters}>
                {filters.map((option) => (
                  <AppButton
                    key={option.value}
                    title={option.label}
                    variant={filter === option.value ? 'primary' : 'outline'}
                    size="sm"
                    accessibilityState={{ selected: filter === option.value }}
                    onPress={() => setFilter(option.value)}
                  />
                ))}
              </View>
              {error ? (
                <AppCard variant="outlined" style={styles.errorCard}>
                  <AppText variant="bodySmall" color={theme.colors.error.main}>{error}</AppText>
                  <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void loadRequests()} />
                </AppCard>
              ) : null}
              {filter === 'WAITING_DELIVERY' && shipmentsError ? (
                <AppCard variant="outlined" style={styles.errorCard}>
                  <AppText variant="bodySmall" color={theme.colors.error.main}>Không tải được trạng thái vận đơn.</AppText>
                  <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetchShipments()} />
                </AppCard>
              ) : null}
              {!loading && !error && !(filter === 'WAITING_DELIVERY' && shipmentsError) ? (
                <AppText variant="caption">{orders.length} đơn hàng</AppText>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading || (filter === 'WAITING_DELIVERY' && shipmentsFetching)
              ? <ActivityIndicator color={theme.colors.primary[600]} />
              : !error && !(filter === 'WAITING_DELIVERY' && shipmentsError)
                ? <AppEmptyState
                    title="Không có đơn phù hợp"
                    description={filter === 'WAITING_DELIVERY'
                      ? 'Không có vận đơn nào đang chờ giao hàng.'
                      : 'Các yêu cầu giao hàng hoặc đến hái sẽ hiển thị tại đây.'}
                  />
                : undefined
          }
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  header: { gap: theme.spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  requestRow: { gap: theme.spacing.xs, paddingVertical: theme.spacing.xs },
  errorCard: { gap: theme.spacing.sm, borderColor: theme.colors.error.light },
});
