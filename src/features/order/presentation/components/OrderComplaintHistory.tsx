import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, View } from 'react-native';
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

  const submitReply = async () => {
    const message = reply.trim();
    if (submitLock.current || !message || closed) return;
    submitLock.current = true;
    try {
      await sendReply({ complaintId, message }).unwrap();
      setReply('');
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
      ) : (
        <View style={styles.replyForm}>
          {needsInformation ? (
            <AppText variant="bodySmall" color={theme.colors.warning.dark}>
              Nhân viên đang cần thêm thông tin. Hãy bổ sung nội dung cụ thể để tiếp tục xử lý.
            </AppText>
          ) : (
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Gửi thêm thông tin hoặc trao đổi với nhân viên. Việc gửi phản hồi sẽ không đóng khiếu nại.
            </AppText>
          )}
          <AppInput
            label={needsInformation ? 'Thông tin bổ sung' : 'Nội dung phản hồi'}
            placeholder="Nhập phản hồi cho nhân viên..."
            multiline
            maxLength={10000}
            value={reply}
            onChangeText={setReply}
            disabled={isReplying}
            inputStyle={styles.replyInput}
          />
          <AppButton
            title="Gửi phản hồi"
            loading={isReplying}
            disabled={isReplying || !reply.trim()}
            onPress={() => void submitReply()}
          />
        </View>
      )}
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
});
