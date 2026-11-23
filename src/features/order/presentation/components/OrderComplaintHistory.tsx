import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVietnamDateTime } from '../../../../core/utils';
import { AppBottomSheet, AppButton, AppInput, AppText } from '../../../../shared/components';
import { AppAlert } from '../../../../shared/components/feedback/AppDialog';
import {
  useGetMyComplaintDetailQuery,
  useReplyToComplaintMutation,
  type OrderComplaint,
} from '../../data/complaintApi';

const typeLabels: Record<string, string> = {
  DAMAGED: 'Hàng bị hư hỏng',
  QUALITY: 'Chất lượng không đạt',
  QUANTITY: 'Thiếu hoặc sai số lượng',
  OTHER: 'Lý do khác',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ tiếp nhận',
  UNDER_REVIEW: 'Đang xem xét',
  NEED_MORE_INFO: 'Cần bổ sung thông tin',
  RESOLVING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Đã từ chối',
  CLOSED: 'Đã đóng',
  OPEN: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_CUSTOMER: 'Cần bổ sung thông tin',
};

const MAX_REPLY_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function OrderComplaintHistory({
  orderId,
  accountId,
  complaints,
}: {
  orderId: number;
  accountId: string;
  complaints: OrderComplaint[];
}) {
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!complaints.length) return null;

  return (
    <>
      <AppButton
        title="Xem khiếu nại"
        variant="outline"
        size="sm"
        leftIcon={<Ionicons name="chatbox-ellipses-outline" size={18} color={theme.colors.primary[600]} />}
        onPress={() => {
          setSelectedId(complaints.length === 1 ? complaints[0].complaint_id : null);
          setVisible(true);
        }}
      />
      {visible ? (
        <AppBottomSheet
          visible
          onClose={() => setVisible(false)}
          title="Khiếu nại của bạn"
          subtitle={`Đơn hàng #${orderId}`}
          style={styles.sheet}
          contentStyle={styles.sheetContent}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {selectedId === null ? (
              <>
                <AppText color={theme.colors.text.secondary}>Chọn khiếu nại để xem chi tiết.</AppText>
                {complaints.map((complaint) => (
                  <View key={complaint.complaint_id} style={styles.card}>
                    <AppText weight="bold">Khiếu nại #{complaint.complaint_id}</AppText>
                    <AppText variant="bodySmall">{statusLabels[complaint.status] ?? complaint.status}</AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      {formatVietnamDateTime(complaint.created_at, 'Chưa cập nhật')}
                    </AppText>
                    <AppButton title="Xem chi tiết" variant="outline" size="sm" onPress={() => setSelectedId(complaint.complaint_id)} />
                  </View>
                ))}
              </>
            ) : (
              <>
                {complaints.length > 1 ? (
                  <AppButton title="Danh sách khiếu nại" variant="ghost" size="sm" onPress={() => setSelectedId(null)} />
                ) : null}
                <ComplaintDetail accountId={accountId} complaintId={selectedId} />
              </>
            )}
          </ScrollView>
        </AppBottomSheet>
      ) : null}
    </>
  );
}

function ComplaintDetail({ accountId, complaintId }: { accountId: string; complaintId: number }) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  const { currentData: complaint, isFetching, isError, refetch } = useGetMyComplaintDetailQuery(
    { accountId, complaintId },
    { pollingInterval: active ? 5000 : 0, refetchOnMountOrArgChange: true },
  );
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectingImage, setSelectingImage] = useState(false);
  const [sendReply, { isLoading: isReplying }] = useReplyToComplaintMutation();
  const submitLock = useRef(false);

  if (isFetching && !complaint) return <ActivityIndicator color={theme.colors.primary[600]} />;
  if (isError || !complaint) {
    return (
      <View style={styles.section}>
        <AppText color={theme.colors.error.main}>Không thể tải chi tiết khiếu nại.</AppText>
        <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetch()} />
      </View>
    );
  }

  const closed = ['RESOLVED', 'REJECTED', 'CLOSED'].includes(complaint.status);
  const needsInformation = complaint.status === 'NEED_MORE_INFO';

  const selectImages = async (source: 'camera' | 'library') => {
    if (selectingImage || isReplying || replyImages.length >= MAX_REPLY_IMAGES) return;
    setSelectingImage(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          AppAlert.alert('Cần cấp quyền', 'Vui lòng cấp quyền sử dụng máy ảnh để chụp ảnh bổ sung.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: MAX_REPLY_IMAGES - replyImages.length,
          });
      if (result.canceled) return;
      const valid = result.assets.filter(
        (asset) => (asset.fileSize ?? asset.file?.size ?? 0) <= MAX_IMAGE_SIZE,
      );
      const remaining = MAX_REPLY_IMAGES - replyImages.length;
      setReplyImages((current) => [...current, ...valid.slice(0, remaining)]);
      if (valid.length !== result.assets.length) {
        AppAlert.alert('Ảnh quá lớn', 'Ảnh vượt quá 5 MB đã được bỏ qua. Vui lòng chọn ảnh nhỏ hơn.');
      } else if (valid.length > remaining) {
        AppAlert.alert('Giới hạn ảnh', `Mỗi lần bổ sung chỉ được đính kèm tối đa ${MAX_REPLY_IMAGES} ảnh.`);
      }
    } catch {
      AppAlert.alert('Không thể chọn ảnh', 'Không thể mở máy ảnh hoặc thư viện. Vui lòng thử lại.');
    } finally {
      setSelectingImage(false);
    }
  };

  const submitReply = async () => {
    const message = reply.trim();
    if (submitLock.current || !message || !needsInformation || closed) return;
    submitLock.current = true;
    try {
      await sendReply({ complaintId, message, images: replyImages }).unwrap();
      setReply('');
      setReplyImages([]);
      AppAlert.alert('Đã gửi phản hồi', 'Thông tin bổ sung đã được gửi cho nhân viên xử lý.');
    } catch {
      AppAlert.alert(
        'Chưa gửi được phản hồi',
        'Không xác nhận được việc gửi. Vui lòng tải lại khiếu nại để kiểm tra trước khi gửi lại.',
      );
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <>
      <View style={styles.card}>
        <AppText weight="bold">Khiếu nại #{complaint.complaint_id}</AppText>
        <DetailRow label="Trạng thái" value={statusLabels[complaint.status] ?? complaint.status} />
        <DetailRow label="Loại khiếu nại" value={typeLabels[complaint.complaint_type] ?? complaint.complaint_type} />
        <DetailRow label="Ngày gửi" value={formatVietnamDateTime(complaint.created_at, 'Chưa cập nhật')} />
        <DetailRow label="Nội dung" value={complaint.description} />
      </View>
      <View style={styles.section}>
        <AppText weight="bold">Ảnh minh chứng</AppText>
        {complaint.image_urls?.length ? (
          complaint.image_urls.map((url, index) => (
            <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.image} contentFit="contain" accessibilityLabel={`Ảnh minh chứng ${index + 1}`} />
          ))
        ) : <AppText color={theme.colors.text.secondary}>Không có ảnh đính kèm.</AppText>}
      </View>
      <View style={styles.section}>
        <AppText weight="bold">Nội dung xử lý</AppText>
        <AppText selectable>{complaint.resolution || 'Chưa có nội dung xử lý.'}</AppText>
        {complaint.assigned_staff?.full_name ? (
          <AppText variant="caption" color={theme.colors.text.secondary}>Người phụ trách: {complaint.assigned_staff.full_name}</AppText>
        ) : null}
      </View>
      <View style={styles.section}>
        <AppText weight="bold">Phản hồi</AppText>
        {complaint.replies?.length ? complaint.replies.map((reply) => (
          <View key={reply.reply_id} style={styles.card}>
            <AppText variant="bodySmall" weight="bold">
              {reply.sender_role_id === 3 ? 'Khách hàng' : 'Nhân viên'}{reply.sender_name ? ` · ${reply.sender_name}` : ''}
            </AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              {formatVietnamDateTime(reply.created_at, 'Chưa cập nhật')}
            </AppText>
            <AppText selectable>{reply.message}</AppText>
          </View>
        )) : <AppText color={theme.colors.text.secondary}>Chưa có phản hồi.</AppText>}
      </View>
      {closed ? (
        <AppText variant="bodySmall" color={theme.colors.text.secondary}>
          Khiếu nại đã hoàn tất. Lịch sử trao đổi được giữ lại để bạn theo dõi.
        </AppText>
      ) : needsInformation ? (
        <View style={styles.replyForm}>
          <AppText variant="bodySmall" color={theme.colors.warning.dark}>
            Nhân viên đang cần thêm thông tin. Hãy bổ sung nội dung và ảnh bằng chứng để tiếp tục xử lý.
          </AppText>
          <AppInput
            label="Thông tin bổ sung"
            placeholder="Nhập nội dung cần bổ sung cho nhân viên..."
            multiline
            maxLength={10000}
            value={reply}
            onChangeText={setReply}
            disabled={isReplying || selectingImage}
            inputStyle={styles.replyInput}
          />
          <View style={styles.imageSection}>
            <AppText variant="bodySmall" weight="bold">
              Ảnh bổ sung ({replyImages.length}/{MAX_REPLY_IMAGES})
            </AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Không bắt buộc. Tối đa 5 MB mỗi ảnh.
            </AppText>
            <View style={styles.imageActions}>
              <AppButton
                title="Chụp ảnh"
                variant="outline"
                size="sm"
                disabled={isReplying || selectingImage || replyImages.length >= MAX_REPLY_IMAGES}
                onPress={() => void selectImages('camera')}
              />
              <AppButton
                title="Tải ảnh lên"
                variant="outline"
                size="sm"
                disabled={isReplying || selectingImage || replyImages.length >= MAX_REPLY_IMAGES}
                onPress={() => void selectImages('library')}
              />
            </View>
            {replyImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
                {replyImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.imageItem}>
                    <Image source={{ uri: image.uri }} style={styles.thumbnail} contentFit="cover" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ảnh bổ sung ${index + 1}`}
                      disabled={isReplying || selectingImage}
                      onPress={() =>
                        setReplyImages((current) =>
                          current.filter((_, imageIndex) => imageIndex !== index))}
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
          <AppButton
            title="Gửi thông tin bổ sung"
            loading={isReplying || selectingImage}
            disabled={isReplying || selectingImage || !reply.trim()}
            onPress={() => void submitReply()}
          />
        </View>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color={theme.colors.text.secondary}>{label}</AppText>
      <AppText selectable>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '85%' },
  sheetContent: { flex: 1 },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  section: { gap: theme.spacing.xs },
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.borderRadius.md,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  replyForm: { gap: theme.spacing.sm },
  replyInput: { minHeight: 96, textAlignVertical: 'top' },
  imageSection: { gap: theme.spacing.xs },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  imageList: { gap: theme.spacing.sm, paddingTop: theme.spacing.xs },
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
