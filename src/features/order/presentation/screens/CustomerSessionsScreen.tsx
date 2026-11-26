import { Ionicons } from '@expo/vector-icons';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollViewInstance, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { GROWTH_STAGE_LABELS } from '../../../../core/constants/growthStages';
import { AppButton, AppCard, AppEmptyState, AppHeader, AppText, ScreenContainer, ScrollToTopButton } from '../../../../shared/components';
import { AppAlert, AppModal } from '../../../../shared/components/feedback/AppDialog';
import { MushroomImage } from '../../../../shared/components/MushroomImage';
import { useAuth } from '../../../auth';
import { ABOUT_US_INFO } from '../../../profile/data/policiesData';
import { lifecycleStatusLabel } from '../../../cultivation/domain/sessionWorkflow';
import type { CustomerTrayCard } from '../../../tray/domain/entities/Tray';
import { CustomerTrayDetail } from '../../../tray/presentation/components/CustomerTrayDetail';
import { useGetMyComplaintsQuery, type OrderComplaint } from '../../data/complaintApi';
import { useGetAllCustomerSessionsQuery } from '../../data/customerSessionApi';
import { orderRepository } from '../../data/repositories/OrderRepository';
import { useConfirmDeliveryReceiptMutation, useGetOrderShipmentsQuery } from '../../data/shipmentApi';
import { CompletedOrderReportModal } from '../components/CompletedOrderReportModal';
import { HarvestReceivingModal } from '../components/HarvestReceivingModal';
import { OrderComplaintHistory } from '../components/OrderComplaintHistory';
import { OrderDeliveryActions } from '../components/OrderDeliveryActions';
import { canCustomerUpdateHarvestMethod } from '../../domain/harvestSchedule';
import {
  canCustomerConfirmDeliveryReceipt,
  canTrackSessionShipment,
  latestShipment,
  shipmentLabel,
} from '../../domain/shipment';
import {
  customerSessionDeviceHistoryAvailable,
  customerCanChooseHarvestMethod,
  customerSessionMatchesFilter,
  customerSessionTrayLabel,
  customerSessionTrayDetail,
  customerTrayAssignmentLabel,
  customerTrayLocation,
  customerTrayStatusLabel,
} from '../../domain/customerSessions';
import type {
  CustomerCultivationStatus,
  CustomerOrder,
  CustomerSessionFilter,
  CustomerSession,
  CustomerSessionTray,
} from '../../domain/entities/Order';

type CultivationSession = CustomerCultivationStatus['sessions'][number];
type SessionTimelineFilter = CustomerSessionFilter | 'RECEIVING_METHOD';
type CultivationLoadState = {
  data?: CustomerCultivationStatus;
  error?: string;
  loading?: boolean;
};

const sessionFilters: { value: SessionTimelineFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'GROWING', label: 'Đang nuôi' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'RECEIVING_METHOD', label: 'Cần chọn cách nhận' },
];

function normalizeMushroomName(name?: string | null): string {
  return name?.replace(/[đĐ]/g, 'd').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

function sessionMushroomImage(order: CustomerOrder, session: CultivationSession): string | undefined {
  if (session.mushroom_image_url?.trim()) return session.mushroom_image_url.trim();
  const items = order.items ?? order.order_items ?? [];
  const itemIndex = items.findIndex((item) =>
    (session.mushroom_type_id != null && item.mushroom_type_id === session.mushroom_type_id) ||
    normalizeMushroomName(item.mushroom_name) === normalizeMushroomName(session.mushroom_name),
  );
  const item = itemIndex >= 0 ? items[itemIndex] : undefined;
  if (item?.image_url?.trim()) return item.image_url.trim();
  const imageUrls = (order.mushroom_image_url || order.image_url || '')
    .split(',').map((url) => url.trim()).filter(Boolean);
  return imageUrls[itemIndex >= 0 ? itemIndex : 0] || imageUrls[0];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chưa ghi nhận'
    : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function isHarvestReady(session: CultivationSession): boolean {
  return session.status.toUpperCase() === 'HARVEST_READY' ||
    session.harvest_status?.toUpperCase() === 'HARVEST_READY';
}

function sessionProgressLabel(session: CultivationSession): string {
  if (!['HARVESTING', 'COMPLETED', 'CANCELLED'].includes(session.status) && isHarvestReady(session)) {
    return 'Sẵn sàng thu hoạch';
  }
  const stage = session.current_stage?.trim().toUpperCase();
  if (session.status === 'CULTIVATING' && stage && stage in GROWTH_STAGE_LABELS) {
    return GROWTH_STAGE_LABELS[stage as keyof typeof GROWTH_STAGE_LABELS];
  }
  return lifecycleStatusLabel(session.status);
}

function SessionHandoverDetails({
  session,
  shipment,
  isFetching,
  isError,
  canConfirmReceipt,
  confirmingReceipt,
  onConfirmReceipt,
}: {
  session: CultivationSession;
  shipment: ReturnType<typeof latestShipment>;
  isFetching: boolean;
  isError: boolean;
  canConfirmReceipt: boolean;
  confirmingReceipt: boolean;
  onConfirmReceipt: () => void;
}) {
  if (!session.harvest_method) {
    return (
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Chưa chọn phương thức nhận nấm.
      </AppText>
    );
  }

  if (session.harvest_method === 'PICKUP') {
    return (
      <View style={styles.handoverDetails}>
        <AppText variant="captionMedium" weight="bold">Đến trang trại nhận nấm</AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Lịch hẹn: {formatDateTime(session.scheduled_at)}
        </AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Địa chỉ: {ABOUT_US_INFO.contact.address}
        </AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Liên hệ: {ABOUT_US_INFO.contact.phone}
        </AppText>
      </View>
    );
  }

  if (isFetching && !shipment) {
    return <AppText variant="caption" color={theme.colors.text.secondary}>Đang tải thông tin vận chuyển...</AppText>;
  }
  if (isError) {
    return <AppText variant="caption" color={theme.colors.error.main}>Không tải được thông tin vận chuyển.</AppText>;
  }
  if (!shipment) {
    return <AppText variant="caption" color={theme.colors.text.secondary}>Trang trại đang chuẩn bị thông tin vận đơn.</AppText>;
  }

  return (
    <View style={styles.handoverDetails}>
      <AppText variant="captionMedium" weight="bold">Thông tin vận chuyển</AppText>
      <AppText variant="caption" color={theme.colors.text.secondary}>Trạng thái: {shipmentLabel(shipment.status)}</AppText>
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Người nhận: {shipment.recipient_name} · {shipment.recipient_phone}
      </AppText>
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Địa chỉ: {shipment.address || session.delivery_address || 'Chưa cập nhật'}
      </AppText>
      {shipment.shipped_at ? (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Bàn giao vận chuyển: {formatDateTime(shipment.shipped_at)}
        </AppText>
      ) : null}
      {shipment.delivered_at ? (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Giao hàng lúc: {formatDateTime(shipment.delivered_at)}
        </AppText>
      ) : null}
      {canConfirmReceipt ? (
        <AppButton
          title="Xác nhận đã nhận nấm"
          size="sm"
          loading={confirmingReceipt}
          disabled={confirmingReceipt}
          leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.text.inverse} />}
          onPress={onConfirmReceipt}
        />
      ) : null}
    </View>
  );
}

function SessionTimelineCard({
  orderId,
  session,
  imageUri,
  sessionDetail,
  accountId,
  onReceiptConfirmed,
  onOpen,
  onChooseReceiving,
}: {
  orderId: number;
  session: CultivationSession;
  imageUri?: string;
  sessionDetail?: CustomerSession;
  accountId: string;
  onReceiptConfirmed: () => void;
  onOpen: () => void;
  onChooseReceiving: () => void;
}) {
  const isDelivery = session.harvest_method === 'DELIVERY';
  const shipmentQuery = useGetOrderShipmentsQuery(
    { orderId, accountId },
    { skip: !isDelivery || !accountId, refetchOnMountOrArgChange: true },
  );
  const latestOrderShipment = latestShipment(shipmentQuery.currentData ?? []);
  const [confirmReceipt, confirmReceiptState] = useConfirmDeliveryReceiptMutation();
  const canConfirmReceipt = canCustomerConfirmDeliveryReceipt(
    session,
    shipmentQuery.currentData ?? [],
  );
  const canUpdateMethod = session.harvest_request_status !== 'COMPLETED' &&
    !['COMPLETED', 'CANCELLED'].includes(session.status) &&
    Boolean(session.harvest_method) &&
    canCustomerUpdateHarvestMethod(session.harvest_ready_at) &&
    (!isDelivery || (
      !shipmentQuery.isFetching &&
      !shipmentQuery.isError &&
      latestOrderShipment?.status === 'PENDING'
    ));
  const confirmReceived = () => {
    const requestId = session.harvest_request_id;
    if (!requestId || !canConfirmReceipt || confirmReceiptState.isLoading) return;
    AppAlert.alert(
      'Xác nhận đã nhận nấm',
      `Bạn xác nhận đã nhận đầy đủ nấm của phiên #${session.session_id}? Hành động này sẽ hoàn tất bàn giao phiên.`,
      [
        { text: 'Chưa nhận', style: 'cancel' },
        {
          text: 'Đã nhận nấm',
          onPress: async () => {
            try {
              await confirmReceipt({
                orderId,
                requestId,
              }).unwrap();
              onReceiptConfirmed();
              AppAlert.alert('Đã xác nhận', 'Phiên đã được cập nhật thành đã nhận nấm.');
            } catch (error) {
              const message = typeof error === 'object' && error !== null && 'message' in error
                ? String(error.message)
                : 'Không thể xác nhận nhận nấm. Vui lòng thử lại.';
              AppAlert.alert('Chưa xác nhận được', message);
            }
          },
        },
      ],
    );
  };

  return (
    <AppCard variant="outlined" style={styles.sessionCard}>
      <View style={styles.cardHeading}>
        <MushroomImage uri={imageUri} name={session.mushroom_name} compact />
        <View style={styles.cardTitle}>
          <AppText variant="bodyMedium" weight="bold">{session.mushroom_name}</AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Phiên #{session.session_id} · {sessionProgressLabel(session)}
          </AppText>
        </View>
        <Ionicons name="leaf-outline" size={22} color={theme.colors.primary[600]} />
      </View>
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Bắt đầu: {formatDate(session.start_at)} · Kết thúc: {formatDate(session.end_at)}
        {' · '}{session.tray_quantity ?? session.assigned_trays.length} khay
      </AppText>
      {isHarvestReady(session) &&
      !['COMPLETED', 'CANCELLED'].includes(session.status) &&
      session.harvest_request_status !== 'COMPLETED' ? (
        <View style={styles.harvestNotice}>
          <AppText variant="captionMedium" weight="bold" color={theme.colors.success.dark}>
            Đã sẵn sàng thu hoạch
          </AppText>
          {customerCanChooseHarvestMethod(session) ? (
            <AppButton title="Chọn cách nhận nấm" variant="outline" size="sm" onPress={onChooseReceiving} />
          ) : null}
          {canUpdateMethod ? (
            <AppButton title="Cập nhật phương thức nhận" variant="outline" size="sm" onPress={onChooseReceiving} />
          ) : null}
        </View>
      ) : null}
      <SessionHandoverDetails
        session={session}
        shipment={latestOrderShipment}
        isFetching={shipmentQuery.isFetching}
        isError={shipmentQuery.isError}
        canConfirmReceipt={canConfirmReceipt}
        confirmingReceipt={confirmReceiptState.isLoading}
        onConfirmReceipt={confirmReceived}
      />
      {sessionDetail ? (
        <AppButton title="Xem chi tiết phiên và khay" variant="outline" size="sm" onPress={onOpen} />
      ) : (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Chi tiết khay chưa tải được.
        </AppText>
      )}
    </AppCard>
  );
}

function OrderTimelineCard({
  order,
  cultivation,
  sessionDetails,
  sessionFilter,
  complaints,
  complaintsReady,
  accountId,
  onRetryCultivation,
  onReceiptConfirmed,
  onOpenSession,
  onChooseReceiving,
  onOpenReport,
}: {
  order: CustomerOrder;
  cultivation: CultivationLoadState | undefined;
  sessionDetails: Map<number, CustomerSession>;
  sessionFilter: SessionTimelineFilter;
  complaints: OrderComplaint[];
  complaintsReady: boolean;
  accountId: string;
  onRetryCultivation: () => void;
  onReceiptConfirmed: (orderId: number) => void;
  onOpenSession: (session: CustomerSession) => void;
  onChooseReceiving: (session: CultivationSession) => void;
  onOpenReport: () => void;
}) {
  const sessions = cultivation?.data?.sessions ?? [];
  const visibleSessions = sessions.filter((session) => customerSessionMatchesFilter(session, sessionFilter));
  const deliverySelected = sessions.some((session) =>
    session.harvest_method === 'DELIVERY' && canTrackSessionShipment(session)
  );
  const completed = order.order_status === 'COMPLETED' &&
    sessions.some((session) => session.status === 'COMPLETED');

  return (
    <AppCard elevation="sm" style={styles.orderCard}>
      <View style={styles.orderHeading}>
        <View style={styles.cardTitle}>
          <AppText variant="bodyMedium" weight="bold">Đơn hàng #{order.order_id}</AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Đã thanh toán · {formatDate(order.created_at)}
          </AppText>
        </View>
        <AppText variant="captionMedium" weight="bold" color={theme.colors.success.dark}>
          {formatVND(order.total_amount)}
        </AppText>
      </View>

      <AppText variant="label" weight="bold">Tiến trình đơn hàng</AppText>
      {cultivation?.loading ? <ActivityIndicator color={theme.colors.primary[600]} /> : null}
      {cultivation?.error ? (
        <View style={styles.errorRow}>
          <AppText variant="caption" color={theme.colors.error.main}>
            Không tải được tiến độ: {cultivation.error}
          </AppText>
          <AppButton title="Thử lại" variant="outline" size="sm" onPress={onRetryCultivation} />
        </View>
      ) : null}
      {!cultivation?.loading && !cultivation?.error && sessions.length === 0 ? (
        <AppText variant="bodySmall" color={theme.colors.text.secondary}>
          Đã thanh toán · Trang trại đang chuẩn bị phiên nuôi trồng.
        </AppText>
      ) : null}
      {visibleSessions.map((session) => (
        <SessionTimelineCard
          key={session.session_id}
          orderId={order.order_id}
          session={session}
          imageUri={sessionMushroomImage(order, session)}
          sessionDetail={sessionDetails.get(session.session_id)}
          accountId={accountId}
          onReceiptConfirmed={() => onReceiptConfirmed(order.order_id)}
          onOpen={() => {
            const detail = sessionDetails.get(session.session_id);
            if (detail) onOpenSession(detail);
          }}
          onChooseReceiving={() => onChooseReceiving(session)}
        />
      ))}

      {sessionFilter !== 'RECEIVING_METHOD' && accountId && complaints.length > 0 ? (
        <OrderComplaintHistory orderId={order.order_id} accountId={accountId} complaints={complaints} />
      ) : null}
      {sessionFilter !== 'RECEIVING_METHOD' &&
      order.payment_status?.toUpperCase() === 'PAID' &&
      !['PENDING', 'CANCELLED'].includes(order.order_status) ? (
        <OrderDeliveryActions
          orderId={order.order_id}
          alreadySubmitted={complaints.length > 0}
          complaintsReady={complaintsReady}
          deliverySelected={deliverySelected}
        />
      ) : null}
      {sessionFilter !== 'RECEIVING_METHOD' && completed ? (
        <AppButton
          title="Xem tổng kết phiên"
          variant="outline"
          size="sm"
          leftIcon={<Ionicons name="document-text-outline" size={17} color={theme.colors.primary[600]} />}
          onPress={onOpenReport}
        />
      ) : null}
    </AppCard>
  );
}

function TrayCard({ tray, label, onOpen }: {
  tray: CustomerSessionTray;
  label: string;
  onOpen: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${label}`}
      onPress={onOpen}
    >
      <AppCard variant="outlined" style={styles.card}>
        <AppText variant="bodyMedium" weight="bold">{label}</AppText>
        <AppText variant="bodySmall">Gán vào phiên: {customerTrayAssignmentLabel(tray.assignment_status)}</AppText>
        {tray.assignment_status.toUpperCase() === 'ACTIVE' ? (
          <AppText variant="bodySmall">Trạng thái khay: {customerTrayStatusLabel(tray.tray_status)}</AppText>
        ) : null}
        <View style={styles.location}>
          <Ionicons name="location-outline" size={17} color={theme.colors.primary[700]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.locationText}>
            {customerTrayLocation(tray)}
          </AppText>
        </View>
        <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>Xem chi tiết khay ›</AppText>
      </AppCard>
    </Pressable>
  );
}

function SessionDetail({ session, onClose }: { session: CustomerSession; onClose: () => void }) {
  const [selectedTray, setSelectedTray] = useState<CustomerTrayCard | null>(null);
  const deviceHistoryUnavailable = !customerSessionDeviceHistoryAvailable(session);

  return (
    <AppModal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <AppHeader title="Chi tiết phiên" subtitle={`Phiên #${session.session_id}`} showBack onBack={onClose} />
        <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
          <FlatList
            data={session.trays}
            keyExtractor={(tray) => String(tray.session_tray_id)}
            renderItem={({ item }) => (
              <TrayCard
                tray={item}
                label={customerSessionTrayLabel(session, item)}
                onOpen={() => setSelectedTray(customerSessionTrayDetail(session, item))}
              />
            )}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.summary}>
                <AppText variant="title" weight="bold">{session.mushroom_name}</AppText>
                <AppText variant="bodySmall">Đơn hàng #{session.order_id} · {lifecycleStatusLabel(session.status)}</AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Bắt đầu: {formatDate(session.start_at)} · Kết thúc: {formatDate(session.end_at)}
                </AppText>
                <AppText variant="bodyMedium" weight="bold">Khay của phiên ({session.trays.length})</AppText>
              </View>
            }
            ListEmptyComponent={
              <AppEmptyState title="Chưa có khay được gán" description="Vị trí và trạng thái sẽ xuất hiện khi khay được gán vào phiên." />
            }
          />
        </ScreenContainer>
        {selectedTray ? (
          <AppModal visible transparent animationType="slide" onRequestClose={() => setSelectedTray(null)}>
            <CustomerTrayDetail
              selectedTray={selectedTray}
              onClose={() => setSelectedTray(null)}
              deviceHistoryUnavailable={deviceHistoryUnavailable}
            />
          </AppModal>
        ) : null}
      </View>
    </AppModal>
  );
}

export function CustomerSessionsScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { user, updateProfile } = useAuth();
  const accountId = user?.id ?? '';
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [sessionFilter, setSessionFilter] = useState<SessionTimelineFilter>('ALL');
  const [cultivationByOrder, setCultivationByOrder] = useState<Record<number, CultivationLoadState>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null);
  const [reportOrderId, setReportOrderId] = useState<number | null>(null);
  const [receivingContext, setReceivingContext] = useState<{
    orderId: number;
    session: CultivationSession;
  } | null>(null);
  const {
    currentData: complaints,
    isError: complaintsError,
    isFetching: complaintsFetching,
    refetch: refetchComplaints,
  } = useGetMyComplaintsQuery({ accountId }, { skip: !accountId, refetchOnMountOrArgChange: true });
  const {
    currentData: sessionDetails = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useGetAllCustomerSessionsQuery(
    {
      accountId,
      status: sessionFilter === 'RECEIVING_METHOD' ? 'ALL' : sessionFilter,
    },
    { skip: !accountId, refetchOnMountOrArgChange: true },
  );
  const complaintsByOrder = useMemo(() => {
    const grouped = new Map<number, OrderComplaint[]>();
    for (const complaint of complaints ?? []) {
      const current = grouped.get(complaint.order_id) ?? [];
      current.push(complaint);
      grouped.set(complaint.order_id, current);
    }
    return grouped;
  }, [complaints]);
  const sessionDetailsById = useMemo(
    () => new Map(sessionDetails.map((session) => [session.session_id, session])),
    [sessionDetails],
  );
  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (sessionFilter === 'ALL') return true;
    const cultivation = cultivationByOrder[order.order_id];
    if (!cultivation?.data || cultivation.loading || cultivation.error) return true;
    return cultivation.data.sessions.some((session) => customerSessionMatchesFilter(session, sessionFilter));
  }), [cultivationByOrder, orders, sessionFilter]);

  const loadCultivationStatus = useCallback(async (orderId: number) => {
    setCultivationByOrder((current) => ({
      ...current,
      [orderId]: { ...current[orderId], loading: true, error: undefined },
    }));
    try {
      const data = await orderRepository.getCustomerCultivationStatus(orderId);
      setCultivationByOrder((current) => ({ ...current, [orderId]: { data } }));
    } catch (error: unknown) {
      setCultivationByOrder((current) => ({
        ...current,
        [orderId]: {
          ...current[orderId],
          loading: false,
          error: error instanceof Error ? error.message : 'Không thể tải trạng thái nuôi trồng.',
        },
      }));
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    if (!accountId) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const allOrders = await orderRepository.getCustomerOrders();
      const paidOrders = allOrders
        .filter((order) => order.payment_status?.toUpperCase() === 'PAID')
        .sort((left, right) => Date.parse(right.created_at ?? '') - Date.parse(left.created_at ?? ''));
      setOrders(paidOrders);
      setCultivationByOrder(Object.fromEntries(
        paidOrders.map((order) => [order.order_id, { loading: true }]),
      ));

      const results = await Promise.allSettled(
        paidOrders.map((order) => orderRepository.getCustomerCultivationStatus(order.order_id)),
      );
      const nextState: Record<number, CultivationLoadState> = {};
      results.forEach((result, index) => {
        const orderId = paidOrders[index].order_id;
        nextState[orderId] = result.status === 'fulfilled'
          ? { data: result.value }
          : {
              error: result.reason instanceof Error
                ? result.reason.message
                : 'Không thể tải trạng thái nuôi trồng.',
            };
      });
      setCultivationByOrder(nextState);
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'Không thể tải đơn hàng đã thanh toán.');
    } finally {
      setLoadingOrders(false);
    }
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      void loadTimeline();
    }, [loadTimeline]),
  );

  const refreshAll = () => {
    void loadTimeline();
    if (accountId) {
      void refetchSessions();
      void refetchComplaints();
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Phiên của tôi"
        subtitle="Theo dõi đơn đã thanh toán đến khi hoàn tất"
        rightAction={
          <AppButton
            title="Đơn hàng & QR"
            variant="outline"
            size="sm"
            onPress={() => router.push('/customer-orders' as Href)}
          />
        }
      />
      <ScreenContainer
        scrollable
        edges={['left', 'right', 'bottom']}
        keyboardAvoiding={false}
        scrollViewRef={scrollViewRef}
        onScroll={(event) => setShowScrollToTop(event.nativeEvent.contentOffset.y > 300)}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Theo dõi quá trình chuẩn bị, nuôi trồng, thu hoạch và nhận nấm của từng đơn hàng.
          </AppText>
          <AppButton title="Làm mới dữ liệu" variant="outline" size="sm" onPress={refreshAll} />
          <View style={styles.filters}>
            {sessionFilters.map((filter) => (
              <AppButton
                key={filter.value}
                title={filter.label}
                variant={sessionFilter === filter.value ? 'primary' : 'outline'}
                size="sm"
                accessibilityState={{ selected: sessionFilter === filter.value }}
                onPress={() => setSessionFilter(filter.value)}
              />
            ))}
          </View>
          {complaintsError ? (
            <AppText variant="caption" color={theme.colors.error.main}>
              Không tải được lịch sử khiếu nại. Hãy thử làm mới dữ liệu.
            </AppText>
          ) : null}

          {ordersError ? (
            <AppCard variant="outlined" style={styles.errorCard}>
              <AppText variant="bodySmall" color={theme.colors.error.main}>{ordersError}</AppText>
              <AppButton title="Thử tải lại" variant="outline" size="sm" onPress={refreshAll} />
            </AppCard>
          ) : null}

          {loadingOrders && orders.length === 0 ? (
            <ActivityIndicator color={theme.colors.primary[600]} />
          ) : !ordersError && orders.length === 0 ? (
            <AppEmptyState
              title="Chưa có đơn đã thanh toán"
              description="Sau khi thanh toán, đơn hàng sẽ xuất hiện tại đây để bạn theo dõi toàn bộ quá trình."
            />
          ) : loadingOrders && sessionFilter === 'RECEIVING_METHOD' ? (
            <ActivityIndicator color={theme.colors.primary[600]} />
          ) : !ordersError && visibleOrders.length === 0 ? (
            <AppEmptyState
              title={
                sessionFilter === 'COMPLETED'
                  ? 'Chưa có phiên hoàn thành'
                  : sessionFilter === 'RECEIVING_METHOD'
                    ? 'Không có phiên cần chọn cách nhận nấm'
                    : 'Chưa có phiên đang nuôi'
              }
              description={
                sessionFilter === 'RECEIVING_METHOD'
                  ? 'Phiên sẽ xuất hiện ở đây khi đã sẵn sàng thu hoạch và chưa chọn cách nhận nấm.'
                  : 'Thử chọn trạng thái khác để xem các phiên trong đơn hàng đã thanh toán.'
              }
            />
          ) : (
            visibleOrders.map((order) => (
              <OrderTimelineCard
                key={order.order_id}
                order={order}
                cultivation={cultivationByOrder[order.order_id]}
                sessionDetails={sessionDetailsById}
                sessionFilter={sessionFilter}
                complaints={complaintsByOrder.get(order.order_id) ?? []}
                complaintsReady={Boolean(complaints) && !complaintsError && !complaintsFetching}
                accountId={accountId}
                onRetryCultivation={() => void loadCultivationStatus(order.order_id)}
                onReceiptConfirmed={(orderId) => void loadCultivationStatus(orderId)}
                onOpenSession={setSelectedSession}
                onChooseReceiving={(session) => setReceivingContext({ orderId: order.order_id, session })}
                onOpenReport={() => setReportOrderId(order.order_id)}
              />
            ))
          )}

          {sessionsError ? (
            <AppText variant="caption" color={theme.colors.error.main}>
              Không tải được chi tiết phiên và khay. Hãy thử làm mới dữ liệu.
            </AppText>
          ) : sessionsLoading && visibleOrders.length > 0 ? (
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Đang tải chi tiết phiên và khay...
            </AppText>
          ) : null}
        </View>
      </ScreenContainer>
      <ScrollToTopButton
        visible={showScrollToTop}
        onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
      />

      {selectedSession ? (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      ) : null}
      <CompletedOrderReportModal
        visible={reportOrderId !== null}
        orderId={reportOrderId}
        cultivation={reportOrderId === null ? undefined : cultivationByOrder[reportOrderId]?.data}
        onClose={() => setReportOrderId(null)}
      />
      <HarvestReceivingModal
        visible={receivingContext !== null}
        session={receivingContext?.session ?? null}
        profileAddress={user?.address ?? ''}
        profilePhone={user?.phone || user?.phoneNumber || ''}
        farmAddress={ABOUT_US_INFO.contact.address}
        onClose={() => setReceivingContext(null)}
        onSavePhone={async (phone) => {
          await updateProfile({
            fullName: user?.fullName || user?.full_name || '',
            phone,
            address: user?.address ?? null,
          });
        }}
        onConfirm={async ({ method, address, scheduledAt }) => {
          if (!receivingContext) return;
          await orderRepository.saveCustomerHarvestReceiving(
            receivingContext.session.session_id,
            receivingContext.session.harvest_request_id,
            { harvestMethod: method, scheduledAt, deliveryAddress: address },
          );
          await loadCultivationStatus(receivingContext.orderId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  summary: { gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  orderCard: { gap: theme.spacing.md },
  sessionCard: { gap: theme.spacing.sm, backgroundColor: theme.colors.background.default },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  orderHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  location: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs },
  locationText: { flex: 1 },
  handoverDetails: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  harvestNotice: { gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.success.light },
  errorRow: { gap: theme.spacing.xs, alignItems: 'flex-start' },
  errorCard: { gap: theme.spacing.sm, borderColor: theme.colors.error.light },
});
