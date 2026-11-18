import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppBottomSheet, AppButton, AppCard, AppInput, AppText } from '../../../../shared/components';
import { AppAlert } from '../../../../shared/components/feedback/AppDialog';
import { useAuth } from '../../../auth';
import { useGetOrderShipmentsQuery, useCreateShipmentMutation, useUpdateShipmentStatusMutation } from '../../data/shipmentApi';
import { latestShipment, SHIPMENT_LABELS, Shipment, shipmentError, shipmentLabel, ShipmentStatus } from '../../domain/shipment';

/** Lazy-load order-level tracking only when the user opens the sheet. */
export function ShipmentTrackingButton({ orderId }: { orderId: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <AppButton title="Theo dõi giao hàng" variant="outline" size="sm"
        leftIcon={<Ionicons name="car-outline" size={18} color={theme.colors.primary[600]} />}
        onPress={() => setVisible(true)} />
      {visible && (
        <AppBottomSheet visible onClose={() => setVisible(false)} title="Giao hàng tận nhà" subtitle={`Đơn hàng #${orderId}`}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 16 }}>
            <ShipmentTracking orderId={orderId} />
          </ScrollView>
        </AppBottomSheet>
      )}
    </>
  );
}

export function ShipmentTracking({ orderId, disabled = false }: { orderId: number; disabled?: boolean }) {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR';
  const { currentData: shipments, isFetching, isError, refetch } = useGetOrderShipmentsQuery(
    { orderId, accountId: user?.id || '' }, { skip: !user, refetchOnMountOrArgChange: true },
  );
  const [update, updateState] = useUpdateShipmentStatusMutation();
  const [create, createState] = useCreateShipmentMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [shippingFee, setShippingFee] = useState('0');
  const parsedFee = Number(shippingFee);
  const validFee = shippingFee.trim() !== '' && Number.isFinite(parsedFee) && parsedFee >= 0 && parsedFee <= 9999999999.99;
  const [editingId, setEditingId] = useState<number | null>(null);
  const busyRef = useRef(false);
  const busy = disabled || isFetching || updateState.isLoading || createState.isLoading;
  const latest = latestShipment(shipments || []);

  const confirmStatus = (shipment: Shipment, status: ShipmentStatus) => {
    AppAlert.alert('Cập nhật giao hàng',
      `Chuyển vận đơn #${shipment.shipment_id} từ “${shipmentLabel(shipment.status)}” sang “${shipmentLabel(status)}”?` +
      (status === 'DELIVERED' ? '\nChỉ xác nhận khi khách đã nhận hàng. Sau đó, hoàn tất bàn giao cho từng phiên trong mục Thu hoạch.' : '') +
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
          await update({ orderId, shipmentId: shipment.shipment_id, status }).unwrap();
          setEditingId(null);
          AppAlert.alert('Đã cập nhật', `Vận đơn #${shipment.shipment_id}: ${shipmentLabel(status)}.`);
        } catch (error) { AppAlert.alert('Chưa cập nhật được', shipmentError(error)); }
        finally { busyRef.current = false; }
      } }]);
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
      <AppText variant="caption" color={theme.colors.text.secondary}>Theo dõi theo đơn hàng; một vận đơn có thể dùng chung cho nhiều phiên.</AppText>
      {isFetching && <ActivityIndicator color={theme.colors.primary[600]} />}
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
              <AppButton title={editingId === shipment.shipment_id ? 'Đóng lựa chọn' : 'Cập nhật trạng thái'} variant="outline" disabled={busy}
                onPress={() => setEditingId(editingId === shipment.shipment_id ? null : shipment.shipment_id)} />
              {editingId === shipment.shipment_id && (
                <View style={styles.container}>
                  <AppText variant="caption">Chọn trạng thái theo kết quả giao hàng thực tế:</AppText>
                  {(Object.keys(SHIPMENT_LABELS) as ShipmentStatus[]).filter((status) => status !== shipment.status).map((status) => (
                    <AppButton key={status} title={shipmentLabel(status)} variant={status === 'CANCELLED' || status === 'RETURNED' ? 'danger' : 'secondary'}
                      disabled={busy} onPress={() => confirmStatus(shipment, status)} />
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

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { gap: 10 },
  status: { backgroundColor: theme.colors.success.light, borderRadius: 12, padding: 12 },
  exception: { backgroundColor: theme.colors.warning.light },
});
