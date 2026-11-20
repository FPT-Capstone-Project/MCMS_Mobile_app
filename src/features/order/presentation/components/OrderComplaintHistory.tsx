import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVietnamDateTime } from '../../../../core/utils';
import { AppBottomSheet, AppButton, AppText } from '../../../../shared/components';
import { useGetMyComplaintDetailQuery, type OrderComplaint } from '../../data/complaintApi';

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
  const { currentData: complaint, isFetching, isError, refetch } = useGetMyComplaintDetailQuery(
    { accountId, complaintId },
    { refetchOnMountOrArgChange: true },
  );

  if (isFetching && !complaint) return <ActivityIndicator color={theme.colors.primary[600]} />;
  if (isError || !complaint) {
    return (
      <View style={styles.section}>
        <AppText color={theme.colors.error.main}>Không thể tải chi tiết khiếu nại.</AppText>
        <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetch()} />
      </View>
    );
  }

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
});
