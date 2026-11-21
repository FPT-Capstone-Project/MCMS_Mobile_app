import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppBottomSheet, AppButton, AppCard, AppInput, AppText } from '../../../../shared/components';
import { AppAlert } from '../../../../shared/components/feedback/AppDialog';
import { useAuth } from '../../../auth';
import {
  useGetOrderShipmentsQuery,
  useCreateShipmentMutation,
  useUpdateShipmentDetailsMutation,
  useUpdateShipmentStatusMutation,
} from '../../data/shipmentApi';
import {
  latestShipment,
  nextShipmentStatuses,
  Shipment,
  shipmentError,
  shipmentLabel,
  ShipmentStatus,
} from '../../domain/shipment';

import { completeDeliveryReceiving } from '../../domain/completeDelivery';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import { useAppDispatch } from '../../../../app/store';
import { baseApi } from '../../../../core/api/baseApi';

/** Lazy-load order-level tracking only when the user opens the sheet. */
export function ShipmentTrackingButton({ orderId }: { orderId: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <AppButton title="Theo dõi giao hàng" variant="outline" size="sm"
        leftIcon={<Ionicons name="car-outline" size={18} color={theme.colors.primary[600]} />}
        onPress={() => setVisible(true)} />
      {visible && (
        <AppBottomSheet
          visible
          onClose={() => setVisible(false)}
          title="Giao hàng tận nhà"
          subtitle={`Đơn hàng #${orderId}`}
          contentStyle={{ flexShrink: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 520, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <ShipmentTracking orderId={orderId} />
          </ScrollView>
        </AppBottomSheet>
      )}
    </>
  );
}

export function ShipmentTracking({ orderId, disabled = false, onCompleted }: { orderId: number; disabled?: boolean; onCompleted?: () => Promise<void> | void }) {
  const dispatch = useAppDispatch();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const syncingRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR';
  const { currentData: shipments, isFetching, isError, refetch } = useGetOrderShipmentsQuery(
    { orderId, accountId: user?.id || '' }, { skip: !user, refetchOnMountOrArgChange: true },
  );
  const [update, updateState] = useUpdateShipmentStatusMutation();
  const [updateDetails, detailsState] = useUpdateShipmentDetailsMutation();
  const [create, createState] = useCreateShipmentMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [shippingFee, setShippingFee] = useState('0');
  const parsedFee = Number(shippingFee);
  const validFee = shippingFee.trim() !== '' && Number.isFinite(parsedFee) && parsedFee >= 0 && parsedFee <= 9999999999.99;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDetailsId, setEditingDetailsId] = useState<number | null>(null);
  const [editCarrier, setEditCarrier] = useState('');
  const [editTrackingCode, setEditTrackingCode] = useState('');
  const [editShippingFee, setEditShippingFee] = useState('');
  const [editShippedAt, setEditShippedAt] = useState('');
  const [editDeliveredAt, setEditDeliveredAt] = useState('');
  const [deliveredAtDraft, setDeliveredAtDraft] = useState('');
  const busyRef = useRef(false);
  const busy = syncing || disabled || isFetching || updateState.isLoading ||
    createState.isLoading || detailsState.isLoading;
  const latest = latestShipment(shipments || []);

  const syncDelivery = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(false);
    try {
      const fresh = await refetch().unwrap();
      if (latestShipment(fresh)?.status !== 'DELIVERED') return;
      const completed = await completeDeliveryReceiving(orderId, iotRepository);
      dispatch(baseApi.util.invalidateTags(['Order', 'IoT', 'Tray', 'Notification']));
      if (completed > 0) await onCompletedRef.current?.();
    } catch {
      setSyncError(true);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [dispatch, orderId, refetch]);

  useEffect(() => {
    if (!canManage || latest?.status !== 'DELIVERED') return;
    const timer = setTimeout(() => { void syncDelivery(); }, 0);
    return () => clearTimeout(timer);
  }, [canManage, latest?.shipment_id, latest?.status, syncDelivery]);

  const toggleStatusEditor = (shipment: Shipment) => {
    if (editingId === shipment.shipment_id) {
      setEditingId(null);
      return;
    }
    setDeliveredAtDraft(formatDateTimeInput(shipment.delivered_at || new Date().toISOString()));
    setEditingId(shipment.shipment_id);
  };

  const startDetailsEdit = (shipment: Shipment) => {
    if (editingDetailsId === shipment.shipment_id) {
      setEditingDetailsId(null);
      return;
    }
    setEditCarrier(shipment.carrier || '');
    setEditTrackingCode(shipment.tracking_code || '');
    setEditShippingFee(String(Number(shipment.shipping_fee)));
    setEditShippedAt(formatDateTimeInput(shipment.shipped_at));
    setEditDeliveredAt(formatDateTimeInput(shipment.delivered_at));
    setEditingDetailsId(shipment.shipment_id);
  };

  const confirmStatus = (shipment: Shipment, status: ShipmentStatus) => {
    if (!nextShipmentStatuses(shipment.status).includes(status)) return;
    const deliveredAt = status === 'DELIVERED' ? parseDateTimeInput(deliveredAtDraft) : null;
    if (status === 'DELIVERED' && !deliveredAt) {
      AppAlert.alert('Chưa chọn thời gian', 'Vui lòng chọn thời gian giao hàng thành công.');
      return;
    }
    AppAlert.alert('Cập nhật giao hàng',
      `Chuyển vận đơn #${shipment.shipment_id} từ “${shipmentLabel(shipment.status)}” sang “${shipmentLabel(status)}”?` +
      (status === 'DELIVERED' ? '\nChỉ xác nhận khi khách đã nhận hàng. Ứng dụng sẽ tự xác nhận nhận nấm và hoàn thành các phiên giao hàng đã thu hoạch xong trong đơn này.' : '') +
      (status === 'RETURNED' ? '\nHoàn hàng là hàng được trả về, không đồng nghĩa đã hoàn tiền cho khách.' : ''),
      [{ text: 'Quay lại', style: 'cancel' }, { text: 'Xác nhận', onPress: async () => {
        if (busyRef.current || busy) return;
        busyRef.current = true;
        try {
          // Check for changes made by another operator before overwriting.
          const fresh = await refetch().unwrap();
          if (latestShipment(fresh)?.shipment_id !== shipment.shipment_id || latestShipment(fresh)?.status !== shipment.status) {
            AppAlert.alert('Trạng thái đã thay đổi', 'Đã tải dữ liệu mới. Vui lòng kiểm tra lại trước khi cập nhật.');
            return;
          }
          await update({
            orderId,
            shipmentId: shipment.shipment_id,
            status,
            ...(deliveredAt ? { deliveredAt } : {}),
          }).unwrap();
          setEditingId(null);
          AppAlert.alert('Đã cập nhật', `Vận đơn #${shipment.shipment_id}: ${shipmentLabel(status)}.`);
        } catch (error) { AppAlert.alert('Chưa cập nhật được', shipmentError(error)); }
        finally { busyRef.current = false; }
      } }]);
  };

  const confirmDetailsUpdate = (shipment: Shipment) => {
    if (busyRef.current || busy) return;

    const fee = Number(editShippingFee);
    const shippedAt = parseDateTimeInput(editShippedAt);
    const deliveredAt = shipment.status === 'DELIVERED'
      ? parseDateTimeInput(editDeliveredAt)
      : undefined;
    const requiresHandoffTime = ['SHIPPED', 'DELIVERED', 'RETURNED']
      .includes(shipment.status);

    if (!editShippingFee.trim() || !Number.isFinite(fee) || fee < 0 || fee > 9999999999.99) {
      AppAlert.alert('Phí giao hàng không hợp lệ', 'Nhập số tiền từ 0 đến 9.999.999.999,99 đồng.');
      return;
    }
    if (requiresHandoffTime && !shippedAt) {
      AppAlert.alert('Chưa chọn thời gian', 'Vui lòng chọn thời gian bàn giao cho đơn vị vận chuyển.');
      return;
    }
    if (shipment.status === 'DELIVERED' && !deliveredAt) {
      AppAlert.alert('Chưa chọn thời gian', 'Vui lòng chọn thời gian giao hàng thành công.');
      return;
    }
    if (shippedAt && deliveredAt && new Date(deliveredAt).getTime() < new Date(shippedAt).getTime()) {
      AppAlert.alert('Thời gian không hợp lệ', 'Thời gian giao thành công không thể sớm hơn thời gian bàn giao.');
      return;
    }

    AppAlert.alert(
      'Xác nhận cập nhật',
      'Bạn đã thông báo đến khách hàng để xác nhận. Tiếp tục cập nhật thông tin vận đơn?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận cập nhật',
          onPress: async () => {
            if (busyRef.current || busy) return;
            busyRef.current = true;
            try {
              const fresh = await refetch().unwrap();
              const current = fresh.find((item) => item.shipment_id === shipment.shipment_id);
              const hasChanged = !current
                || current.status !== shipment.status
                || current.carrier !== shipment.carrier
                || current.tracking_code !== shipment.tracking_code
                || Number(current.shipping_fee) !== Number(shipment.shipping_fee)
                || timestampValue(current.shipped_at) !== timestampValue(shipment.shipped_at)
                || timestampValue(current.delivered_at) !== timestampValue(shipment.delivered_at);
              if (hasChanged) {
                AppAlert.alert('Thông tin đã thay đổi', 'Đã tải dữ liệu mới. Vui lòng kiểm tra lại trước khi cập nhật.');
                return;
              }
              await updateDetails({
                orderId,
                shipmentId: shipment.shipment_id,
                carrier: editCarrier.trim() || null,
                trackingCode: editTrackingCode.trim() || null,
                shippingFee: fee,
                shippedAt,
                ...(deliveredAt ? { deliveredAt } : {}),
              }).unwrap();
              setEditingDetailsId(null);
              setEditingId(
                nextShipmentStatuses(shipment.status).includes('DELIVERED')
                  ? shipment.shipment_id
                  : null,
              );
              if (nextShipmentStatuses(shipment.status).includes('DELIVERED')) {
                setDeliveredAtDraft(formatDateTimeInput(new Date().toISOString()));
              }
              AppAlert.alert(
                'Đã cập nhật',
                'Thông tin vận đơn đã được lưu. Trạng thái giao hàng được giữ nguyên.',
              );
            } catch (error) {
              AppAlert.alert('Chưa cập nhật được', shipmentError(error));
            } finally {
              busyRef.current = false;
            }
          },
        },
      ],
    );
  };

  const confirmRetry = (shipment: Shipment) => {
    AppAlert.alert('Tạo vận đơn giao lại',
      `Tạo vận đơn mới cho ${shipment.recipient_name}, ${shipment.recipient_phone}, tại ${shipment.address}? Phí giao hàng: ${formatVND(Number(shipment.shipping_fee))}. Vận đơn cũ vẫn được lưu.`,
      [{ text: 'Quay lại', style: 'cancel' }, { text: 'Tạo vận đơn', onPress: async () => {
        if (busyRef.current || busy) return;
        busyRef.current = true;
        try {
          const fresh = await refetch().unwrap();
          if (latestShipment(fresh)?.shipment_id !== shipment.shipment_id || latestShipment(fresh)?.status !== shipment.status) {
            AppAlert.alert('Trạng thái đã thay đổi', 'Đã tải dữ liệu mới. Vui lòng kiểm tra lại trước khi tạo vận đơn giao lại.');
            return;
          }
          await create({ orderId, address: shipment.address, recipientName: shipment.recipient_name, recipientPhone: shipment.recipient_phone, shippingFee: shipment.shipping_fee }).unwrap();
          AppAlert.alert('Đã tạo vận đơn', 'Vận đơn giao lại đang ở trạng thái Chờ giao hàng.');
        } catch (error) { AppAlert.alert('Chưa tạo được vận đơn', shipmentError(error)); }
        finally { busyRef.current = false; }
      } }]);
  };

  const confirmCreate = () => {
    AppAlert.alert('Tạo vận đơn giao hàng', `Tạo vận đơn cho ${recipientName.trim()}, ${recipientPhone.trim()}, tại ${address.trim()}? Phí giao hàng: ${formatVND(parsedFee)}. Chỉ tạo khi khách đã chọn giao hàng tận nhà.`, [
      { text: 'Quay lại', style: 'cancel' },
      { text: 'Tạo vận đơn', onPress: async () => {
        if (busyRef.current || busy) return;
        busyRef.current = true;
        try {
          await create({ orderId, recipientName: recipientName.trim(), recipientPhone: recipientPhone.trim(), address: address.trim(), shippingFee: parsedFee }).unwrap();
          setShowCreate(false);
          AppAlert.alert('Đã tạo vận đơn', 'Vận đơn đang ở trạng thái Chờ giao hàng.');
        } catch (error) { AppAlert.alert('Chưa tạo được vận đơn', shipmentError(error)); }
        finally { busyRef.current = false; }
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Ionicons name="car-outline" size={22} color={theme.colors.primary[600]} />
        <AppText weight="bold" style={{ flex: 1 }}>Vận đơn giao hàng</AppText>
        <AppButton title="Tải lại" variant="ghost" size="sm" disabled={busy} onPress={() => { void refetch(); }} />
      </View>
      {canManage ? (
        <AppText variant="caption" color={theme.colors.text.secondary}>Theo dõi theo đơn hàng; một vận đơn có thể dùng chung cho nhiều phiên.</AppText>
      ) : null}
      {(isFetching || syncing) && <ActivityIndicator color={theme.colors.primary[600]} />}
      {syncing && <AppText variant="caption">Đang hoàn tất các phiên giao hàng...</AppText>}
      {canManage && syncError && latest?.status === 'DELIVERED' && (
        <View style={styles.container}>
          <AppText color={theme.colors.error.main}>Đã ghi nhận giao hàng thành công nhưng chưa hoàn tất đồng bộ phiên. Vui lòng thử lại.</AppText>
          <AppButton title="Thử lại hoàn tất phiên" disabled={busy} onPress={() => { void syncDelivery(); }} />
        </View>
      )}
      {isError ? (
        <AppText color={theme.colors.error.main}>Chưa tải được trạng thái giao hàng. Bấm Tải lại để thử lại.</AppText>
      ) : shipments?.length === 0 ? (
        <AppText color={theme.colors.text.secondary}>Chưa có vận đơn. Vận đơn được tạo khi lưu phương thức giao hàng tận nhà. Khách đến nhận tại nông trại không cần vận đơn.</AppText>
      ) : null}
      {!isError && shipments?.length === 0 && canManage && (
        <View style={styles.container}>
          <AppButton title={showCreate ? 'Đóng biểu mẫu' : 'Bổ sung vận đơn cho đơn giao tận nhà'} variant="outline" disabled={busy} onPress={() => setShowCreate(!showCreate)} />
          {showCreate && <>
            <AppInput label="Người nhận" value={recipientName} onChangeText={setRecipientName} maxLength={150} editable={!busy} />
            <AppInput label="Số điện thoại" value={recipientPhone} onChangeText={setRecipientPhone} maxLength={30} keyboardType="phone-pad" editable={!busy} />
            <AppInput label="Địa chỉ giao hàng" value={address} onChangeText={setAddress} maxLength={2000} multiline editable={!busy} />
            <AppInput label="Phí giao hàng (đồng)" value={shippingFee} onChangeText={setShippingFee} keyboardType="numeric" editable={!busy} />
            {!validFee && <AppText variant="caption" color={theme.colors.error.main}>Nhập số tiền từ 0 đến 9.999.999.999,99 đồng.</AppText>}
            <AppText variant="caption">Dùng để bổ sung vận đơn còn thiếu cho đơn giao tận nhà.</AppText>
            <AppButton title="Tạo vận đơn" disabled={busy || !validFee || !recipientName.trim() || !recipientPhone.trim() || !address.trim()} onPress={confirmCreate} />
          </>}
        </View>
      )}
      {!isError && [...(shipments || [])].sort((a, b) => b.shipment_id - a.shipment_id).map((shipment) => (
        <AppCard key={shipment.shipment_id} style={styles.card}>
          <AppText variant="caption" color={theme.colors.text.secondary}>Vận đơn #{shipment.shipment_id}{shipment.shipment_id === latest?.shipment_id ? ' · Mới nhất' : ' · Vận đơn trước'}</AppText>
          <View style={[styles.status, (shipment.status === 'RETURNED' || shipment.status === 'CANCELLED') && styles.exception]}>
            <AppText weight="bold">{shipmentLabel(shipment.status)}</AppText>
          </View>
          {shipment.status === 'RETURNED' && <AppText variant="caption">Hàng đã được trả về. Trạng thái này không xác nhận việc hoàn tiền.</AppText>}
          {shipment.status === 'CANCELLED' && <AppText variant="caption">Vận đơn đã hủy; không có nghĩa là đơn nuôi trồng đã bị hủy.</AppText>}
          <AppText>{shipment.recipient_name} · {shipment.recipient_phone}</AppText>
          <AppText color={theme.colors.text.secondary}>{shipment.address}</AppText>
          <AppText variant="caption">Đơn vị vận chuyển: {shipment.carrier || 'Chưa cập nhật'}</AppText>
          <AppText variant="caption">Mã vận đơn: {shipment.tracking_code || 'Chưa cập nhật'}</AppText>
          <AppText variant="caption">Phí giao hàng: {formatVND(Number(shipment.shipping_fee))}</AppText>
          {shipment.shipped_at && <AppText variant="caption">Bàn giao vận chuyển: {formatTimestamp(shipment.shipped_at)}</AppText>}
          {shipment.delivered_at && <AppText variant="caption">{shipment.status === 'RETURNED' ? 'Lần giao trước' : 'Đã giao lúc'}: {formatTimestamp(shipment.delivered_at)}</AppText>}
          {canManage && shipment.shipment_id === latest?.shipment_id && (
            <>
              <AppButton
                title={editingDetailsId === shipment.shipment_id ? 'Đóng cập nhật thông tin' : 'Cập nhật thông tin vận đơn'}
                variant="outline"
                disabled={busy}
                onPress={() => startDetailsEdit(shipment)}
              />
              {editingDetailsId === shipment.shipment_id && (
                <View style={styles.container}>
                  <AppInput label="Đơn vị vận chuyển" value={editCarrier} onChangeText={setEditCarrier} maxLength={100} editable={!busy} />
                  <AppInput label="Mã vận đơn" value={editTrackingCode} onChangeText={setEditTrackingCode} maxLength={150} editable={!busy} />
                  <AppInput label="Phí giao hàng (đồng)" value={editShippingFee} onChangeText={setEditShippingFee} keyboardType="numeric" editable={!busy} />
                  <ShipmentDateTimeField
                    label="Thời gian bàn giao vận chuyển"
                    value={editShippedAt}
                    onChange={setEditShippedAt}
                    disabled={busy}
                  />
                  {shipment.status === 'DELIVERED' && (
                    <ShipmentDateTimeField
                      label="Thời gian giao hàng thành công"
                      value={editDeliveredAt}
                      onChange={setEditDeliveredAt}
                      disabled={busy}
                    />
                  )}
                  <AppButton
                    title="Cập nhật vận đơn"
                    disabled={busy || !areShipmentDetailsValid(
                      shipment,
                      editShippingFee,
                      editShippedAt,
                      editDeliveredAt,
                    )}
                    loading={detailsState.isLoading}
                    onPress={() => confirmDetailsUpdate(shipment)}
                  />
                </View>
              )}
              {nextShipmentStatuses(shipment.status).length > 0 && <AppButton title={editingId === shipment.shipment_id ? 'Đóng lựa chọn' : 'Cập nhật trạng thái'} variant="outline" disabled={busy}
                onPress={() => toggleStatusEditor(shipment)} />}
              {editingId === shipment.shipment_id && (
                <View style={styles.container}>
                  <AppText variant="caption">Chọn trạng thái theo kết quả giao hàng thực tế:</AppText>
                  {shipment.status === 'SHIPPED' && nextShipmentStatuses(shipment.status).includes('DELIVERED') && (
                    <ShipmentDateTimeField
                      label="Thời gian giao thành công"
                      value={deliveredAtDraft}
                      onChange={setDeliveredAtDraft}
                      disabled={busy}
                    />
                  )}
                  {nextShipmentStatuses(shipment.status).map((status) => (
                    <AppButton key={status} title={shipmentLabel(status)} variant={status === 'CANCELLED' || status === 'RETURNED' ? 'danger' : 'secondary'}
                      disabled={busy || (status === 'DELIVERED' && !parseDateTimeInput(deliveredAtDraft))}
                      onPress={() => confirmStatus(shipment, status)} />
                  ))}
                </View>
              )}
              {(shipment.status === 'RETURNED' || shipment.status === 'CANCELLED') && (
                <AppButton title="Tạo vận đơn giao lại" disabled={busy} loading={createState.isLoading} onPress={() => confirmRetry(shipment)} />
              )}
            </>
          )}
        </AppCard>
      ))}
    </View>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function formatDateTimeInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

function parseDateTimeInput(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const normalized = `${day}/${month}/${year} ${hour}:${minute}`;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+07:00`);
  if (Number.isNaN(date.getTime()) || formatDateTimeInput(date.toISOString()) !== normalized) {
    return null;
  }
  return date.toISOString();
}

function timestampValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function ShipmentDateTimeField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const parsedValue = parseDateTimeInput(value);
  const pickerValue = process.env.EXPO_OS === 'ios'
    ? parsedValue ? new Date(parsedValue) : DEFAULT_PICKER_DATE
    : dateTimeInputToLocalDate(value);

  return (
    <View style={styles.dateTimeField}>
      <AppText variant="label">{label}</AppText>
      {process.env.EXPO_OS === 'ios' ? (
        <DateTimePicker
          value={pickerValue}
          mode="datetime"
          display="compact"
          locale="vi_VN"
          timeZoneName="Asia/Ho_Chi_Minh"
          onValueChange={(_event, selectedDate) => {
            onChange(formatDateTimeInput(selectedDate.toISOString()));
          }}
        />
      ) : process.env.EXPO_OS === 'android' ? (
        <>
          <View style={styles.dateTimeButtons}>
            <AppButton
              title={value ? `Ngày: ${value.split(' ')[0]}` : 'Chọn ngày'}
              variant="outline"
              size="sm"
              disabled={disabled}
              onPress={() => setPickerMode('date')}
            />
            <AppButton
              title={value ? `Giờ: ${value.split(' ')[1]}` : 'Chọn giờ'}
              variant="outline"
              size="sm"
              disabled={disabled}
              onPress={() => setPickerMode('time')}
            />
          </View>
          {pickerMode && (
            <DateTimePicker
              value={pickerValue}
              mode={pickerMode}
              presentation="dialog"
              is24Hour
              onValueChange={(_event, selectedDate) => {
                onChange(formatLocalDateTimeInput(selectedDate));
                setPickerMode(null);
              }}
              onDismiss={() => setPickerMode(null)}
            />
          )}
        </>
      ) : (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Bộ chọn ngày giờ chỉ hỗ trợ trên iOS và Android.
        </AppText>
      )}
      <AppText variant="caption" color={theme.colors.text.secondary}>
        {value ? `Giờ Việt Nam (UTC+7): ${value}` : 'Chưa chọn ngày giờ'}
      </AppText>
    </View>
  );
}

const DEFAULT_PICKER_DATE = new Date();

function dateTimeInputToLocalDate(value: string): Date {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return new Date();
  const [, day, month, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function formatLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function areShipmentDetailsValid(
  shipment: Shipment,
  shippingFee: string,
  shippedAtInput: string,
  deliveredAtInput: string,
): boolean {
  const fee = Number(shippingFee);
  if (!shippingFee.trim() || !Number.isFinite(fee) || fee < 0 || fee > 9999999999.99) {
    return false;
  }

  const shippedAt = parseDateTimeInput(shippedAtInput);
  const requiresHandoffTime = ['SHIPPED', 'DELIVERED', 'RETURNED']
    .includes(shipment.status);
  if (requiresHandoffTime && !shippedAt) return false;

  if (shipment.status === 'DELIVERED') {
    const deliveredAt = parseDateTimeInput(deliveredAtInput);
    if (!deliveredAt || !shippedAt) return false;
    if (new Date(deliveredAt).getTime() < new Date(shippedAt).getTime()) return false;
  }
  return true;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  dateTimeField: { gap: 8 },
  dateTimeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { gap: 10 },
  status: { backgroundColor: theme.colors.success.light, borderRadius: 12, padding: 12 },
  exception: { backgroundColor: theme.colors.warning.light },
});
