import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppBottomSheet,
  AppButton,
  AppInput,
  AppText,
} from '../../../../shared/components';
import { AppAlert } from '../../../../shared/components/feedback/AppDialog';
import { useAuth } from '../../../auth';
import {
  useCreateOrderComplaintMutation,
  useGetMyComplaintsQuery,
} from '../../data/complaintApi';
import { useGetOrderShipmentsQuery } from '../../data/shipmentApi';
import {
  canComplainAboutShipment,
  latestShipment,
} from '../../domain/shipment';
import { ShipmentTrackingButton } from './ShipmentTracking';

const COMPLAINT_TYPES = [
  { value: 'DAMAGED', label: 'Hàng bị hư hỏng' },
  { value: 'QUALITY', label: 'Chất lượng không đạt' },
  { value: 'QUANTITY', label: 'Thiếu hoặc sai số lượng' },
  { value: 'OTHER', label: 'Lý do khác' },
] as const;

export function OrderDeliveryActions({
  orderId,
  deliverySelected,
}: {
  orderId: number;
  deliverySelected: boolean;
}) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const { currentData: shipments } = useGetOrderShipmentsQuery(
    { orderId, accountId: user?.id || '' },
    {
      skip: !deliverySelected || !user,
      refetchOnMountOrArgChange: true,
    }
  );
  const latest = latestShipment(shipments || []);
  const [, refreshComplaintWindow] = useState(0);
  const complaintWindowOpen = canComplainAboutShipment(latest);

  useEffect(() => {
    if (latest?.status !== 'DELIVERED' || !latest.delivered_at) return;

    const deliveredAt = new Date(latest.delivered_at).getTime();
    if (!Number.isFinite(deliveredAt)) return;

    const deadline = deliveredAt + 2 * 24 * 60 * 60 * 1000;
    const delay = Math.max(0, deadline - Date.now() + 1);
    const timer = setTimeout(
      () => refreshComplaintWindow((version) => version + 1),
      delay
    );

    return () => clearTimeout(timer);
  }, [latest?.delivered_at, latest?.status]);

  const { currentData: complaints } = useGetMyComplaintsQuery(
    { accountId: user?.id || '', pageSize: 100 },
    { skip: !user || !complaintWindowOpen }
  );
  const alreadySubmitted = complaints?.some(
    (complaint) => complaint.order_id === orderId
  );

  if (!deliverySelected || submitted || alreadySubmitted) return null;
  if (latest?.status === 'DELIVERED') {
    return complaintWindowOpen ? (
      <ComplaintButton
        orderId={orderId}
        deliveredAt={latest.delivered_at}
        onSubmitted={() => setSubmitted(true)}
      />
    ) : null;
  }

  return <ShipmentTrackingButton orderId={orderId} />;
}

function ComplaintButton({
  orderId,
  deliveredAt,
  onSubmitted,
}: {
  orderId: number;
  deliveredAt: string | null;
  onSubmitted: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [complaintType, setComplaintType] = useState<string>(
    COMPLAINT_TYPES[0].value
  );
  const [description, setDescription] = useState('');
  const [createComplaint, { isLoading }] = useCreateOrderComplaintMutation();

  const submit = async () => {
    const normalizedDescription = description.trim();
    if (!complaintType || !normalizedDescription) {
      AppAlert.alert(
        'Thiếu thông tin',
        'Vui lòng chọn loại khiếu nại và mô tả chi tiết vấn đề.'
      );
      return;
    }

    try {
      await createComplaint({
        orderId,
        complaintType,
        description: normalizedDescription,
      }).unwrap();
      setVisible(false);
      onSubmitted();
      AppAlert.alert(
        'Đã gửi khiếu nại',
        'Chúng tôi đã tiếp nhận khiếu nại và sẽ phản hồi trong thời gian sớm nhất.'
      );
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Không thể gửi khiếu nại. Vui lòng thử lại.';
      AppAlert.alert('Chưa gửi được khiếu nại', message);
    }
  };

  return (
    <>
      <AppButton
        title="Khiếu nại đơn giao hàng"
        variant="outline"
        size="sm"
        leftIcon={
          <Ionicons
            name="chatbox-ellipses-outline"
            size={18}
            color={theme.colors.primary[600]}
          />
        }
        onPress={() => setVisible(true)}
      />
      <AppBottomSheet
        visible={visible}
        onClose={() => !isLoading && setVisible(false)}
        title="Khiếu nại giao hàng"
        subtitle={`Đơn hàng #${orderId}`}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            Khiếu nại được nhận trong 2 ngày kể từ khi giao hàng thành công
            {deliveredAt
              ? ` (${new Date(deliveredAt).toLocaleString('vi-VN')})`
              : ''}
            .
          </AppText>
          <View style={styles.typeList}>
            {COMPLAINT_TYPES.map((type) => {
              const selected = complaintType === type.value;
              return (
                <Pressable
                  key={type.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: isLoading }}
                  disabled={isLoading}
                  onPress={() => setComplaintType(type.value)}
                  style={[
                    styles.typeOption,
                    selected && styles.typeOptionSelected,
                  ]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={
                      selected
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[500]
                    }
                  />
                  <AppText
                    variant="bodySmall"
                    weight={selected ? 'bold' : 'normal'}
                  >
                    {type.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppInput
            label="Nội dung khiếu nại"
            required
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
            multiline
            numberOfLines={5}
            maxLength={10000}
            disabled={isLoading}
            inputStyle={styles.descriptionInput}
          />
          <AppButton
            title="Gửi khiếu nại"
            loading={isLoading}
            disabled={isLoading || !description.trim()}
            onPress={() => void submit()}
          />
        </ScrollView>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  content: { gap: 12, paddingBottom: 16 },
  typeList: { gap: 8 },
  typeOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.borderRadius.md,
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary[400],
    backgroundColor: theme.colors.primary[50],
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
