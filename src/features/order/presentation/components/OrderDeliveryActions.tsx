import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function OrderDeliveryActions({
  orderId,
  deliverySelected,
  alreadySubmitted,
  complaintsReady,
}: {
  orderId: number;
  deliverySelected: boolean;
  alreadySubmitted: boolean;
  complaintsReady: boolean;
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

  if (!deliverySelected || submitted || alreadySubmitted) return null;
  if (latest?.status === 'DELIVERED') {
    return complaintWindowOpen && complaintsReady ? (
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
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectingImage, setSelectingImage] = useState(false);
  const [createComplaint, { isLoading }] = useCreateOrderComplaintMutation();

  const selectImages = async (source: 'camera' | 'library') => {
    if (selectingImage || isLoading || images.length >= MAX_IMAGES) return;
    setSelectingImage(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          AppAlert.alert('Cần cấp quyền', 'Vui lòng cấp quyền sử dụng máy ảnh để chụp ảnh khiếu nại.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: MAX_IMAGES - images.length,
          });
      if (result.canceled) return;

      const valid = result.assets.filter((asset) => (asset.fileSize ?? asset.file?.size ?? 0) <= MAX_IMAGE_SIZE);
      const remaining = MAX_IMAGES - images.length;
      setImages((current) => [...current, ...valid.slice(0, remaining)]);
      if (valid.length !== result.assets.length) {
        AppAlert.alert('Ảnh quá lớn', 'Ảnh vượt quá 5 MB đã được bỏ qua. Vui lòng chọn ảnh nhỏ hơn.');
      } else if (valid.length > remaining) {
        AppAlert.alert('Giới hạn ảnh', `Mỗi khiếu nại chỉ được đính kèm tối đa ${MAX_IMAGES} ảnh.`);
      }
    } catch {
      AppAlert.alert('Không thể chọn ảnh', 'Không thể mở máy ảnh hoặc thư viện. Vui lòng thử lại.');
    } finally {
      setSelectingImage(false);
    }
  };

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
        images,
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
        onClose={() => !isLoading && !selectingImage && setVisible(false)}
        title="Khiếu nại giao hàng"
        subtitle={`Đơn hàng #${orderId}`}
        style={styles.sheet}
        contentStyle={styles.sheetContent}
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
          <View style={styles.imageSection}>
            <AppText variant="bodySmall" weight="bold">Ảnh minh chứng ({images.length}/{MAX_IMAGES})</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Không bắt buộc. Tối đa 5 MB mỗi ảnh.
            </AppText>
            <View style={styles.imageActions}>
              <AppButton
                title="Chụp ảnh"
                variant="outline"
                size="sm"
                disabled={isLoading || selectingImage || images.length >= MAX_IMAGES}
                leftIcon={<Ionicons name="camera-outline" size={18} color={theme.colors.primary[600]} />}
                onPress={() => void selectImages('camera')}
              />
              <AppButton
                title="Tải ảnh lên"
                variant="outline"
                size="sm"
                disabled={isLoading || selectingImage || images.length >= MAX_IMAGES}
                leftIcon={<Ionicons name="image-outline" size={18} color={theme.colors.primary[600]} />}
                onPress={() => void selectImages('library')}
              />
            </View>
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.imageItem}>
                    <Image source={{ uri: image.uri }} style={styles.thumbnail} contentFit="cover" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ảnh minh chứng ${index + 1}`}
                      accessibilityState={{ disabled: isLoading || selectingImage }}
                      disabled={isLoading || selectingImage}
                      onPress={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      style={styles.removeImage}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={16} color={theme.colors.background.paper} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.submit}>
          <AppButton
            title="Gửi khiếu nại"
            loading={isLoading}
            disabled={isLoading || selectingImage || !description.trim()}
            onPress={() => void submit()}
          />
        </View>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '85%' },
  sheetContent: { flex: 1 },
  scroll: { flex: 1 },
  submit: { paddingTop: theme.spacing.sm },
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
  imageSection: { gap: theme.spacing.xs },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  imageList: { gap: theme.spacing.sm, paddingTop: theme.spacing.xs, paddingRight: theme.spacing.xs },
  imageItem: { width: 88, height: 88 },
  thumbnail: { width: '100%', height: '100%', borderRadius: theme.borderRadius.md },
  removeImage: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
});
