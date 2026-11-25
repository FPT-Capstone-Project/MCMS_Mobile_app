import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { useAuth } from '../../../auth';
import {
  useGetStaffComplaintsQuery,
  useGetStaffComplaintDetailQuery,
  useReplyToComplaintMutation,
  useResolveStaffComplaintMutation,
  type OrderComplaint,
  type StaffComplaintQueue,
} from '../../data/complaintApi';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { AppAlert } from '../../../../shared/components/feedback/AppDialog';
import { ComplaintConversation } from '../components/OrderComplaintHistory';

const PAGE_SIZE = 20;

const filters: { value: StaffComplaintQueue; label: string }[] = [
  { value: 'UNASSIGNED', label: 'Chưa phân công' },
  { value: 'ASSIGNED', label: 'Được giao' },
  { value: 'RESPONDED', label: 'Đã phản hồi' },
];

function complaintStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    UNDER_REVIEW: 'Đang xem xét',
    NEED_MORE_INFO: 'Cần thêm thông tin',
    RESOLVING: 'Đang giải quyết',
    RESOLVED: 'Đã giải quyết',
    REJECTED: 'Đã từ chối',
    CLOSED: 'Đã đóng',
  };
  return labels[status] ?? status;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Chưa ghi nhận thời gian';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận thời gian' : date.toLocaleString('vi-VN');
}

function complaintErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'message' in data &&
        typeof data.message === 'string') {
      return data.message;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Không thể gửi phản hồi. Vui lòng thử lại.';
}

export function OperatorComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [queue, setQueue] = useState<StaffComplaintQueue>('UNASSIGNED');
  const [page, setPage] = useState(1);
  const [expandedComplaintId, setExpandedComplaintId] = useState<number | null>(null);
  const { currentData, isLoading, isFetching, isError, refetch } = useGetStaffComplaintsQuery(
    { page, pageSize: PAGE_SIZE, queue },
    { skip: !user, refetchOnMountOrArgChange: true },
  );
  const complaints = currentData?.data ?? [];
  const totalPages = Math.ceil((currentData?.total ?? 0) / PAGE_SIZE);

  const selectQueue = (nextQueue: StaffComplaintQueue) => {
    setQueue(nextQueue);
    setPage(1);
    setExpandedComplaintId(null);
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Khiếu nại khách hàng"
        subtitle="Phân công và xử lý khiếu nại đơn hàng"
        showBack
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      />
      <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
        <FlatList
          data={complaints}
          keyExtractor={(item) => String(item.complaint_id)}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          refreshing={isFetching && !!currentData}
          onRefresh={() => { void refetch(); }}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              queue={queue}
              accountId={String(user?.id ?? '')}
              operatorId={Number(user?.id)}
              ownRoleId={Number(user?.role_id ?? 0)}
              expanded={expandedComplaintId === item.complaint_id}
              onToggle={() => setExpandedComplaintId((current) =>
                current === item.complaint_id ? null : item.complaint_id)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.filters}>
                {filters.map((option) => (
                  <AppButton
                    key={option.value}
                    title={option.label}
                    variant={queue === option.value ? 'primary' : 'outline'}
                    size="sm"
                    accessibilityState={{ selected: queue === option.value }}
                    onPress={() => selectQueue(option.value)}
                  />
                ))}
              </View>
              {isError ? (
                <AppCard variant="outlined" style={styles.errorCard}>
                  <AppText variant="bodySmall" color={theme.colors.error.main}>
                    Không thể tải danh sách khiếu nại.
                  </AppText>
                  <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetch()} />
                </AppCard>
              ) : null}
              {currentData ? <AppText variant="caption">{currentData.total} khiếu nại</AppText> : null}
            </View>
          }
          ListEmptyComponent={
            isLoading || (isFetching && !currentData)
              ? <ActivityIndicator color={theme.colors.primary[600]} />
              : !isError
                ? <AppEmptyState
                    title="Không có khiếu nại"
                    description={queue === 'UNASSIGNED'
                      ? 'Các khiếu nại chưa được phân công sẽ hiển thị tại đây.'
                      : queue === 'ASSIGNED'
                        ? 'Không có khiếu nại nào đang được giao cho bạn.'
                        : 'Các khiếu nại đã được phản hồi sẽ hiển thị tại đây.'}
                  />
                : undefined
          }
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <AppButton
                title="Trang trước"
                variant="outline"
                size="sm"
                disabled={page === 1 || isFetching}
                onPress={() => {
                  setExpandedComplaintId(null);
                  setPage((value) => value - 1);
                }}
              />
              <AppText variant="caption">Trang {page} / {totalPages}</AppText>
              <AppButton
                title="Trang sau"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onPress={() => {
                  setExpandedComplaintId(null);
                  setPage((value) => value + 1);
                }}
              />
            </View>
          ) : undefined}
        />
      </ScreenContainer>
    </View>
  );
}

function ComplaintCard({
  complaint,
  queue,
  accountId,
  operatorId,
  ownRoleId,
  expanded,
  onToggle,
}: {
  complaint: OrderComplaint;
  queue: StaffComplaintQueue;
  accountId: string;
  operatorId: number;
  ownRoleId: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const canRespond = queue === 'ASSIGNED' &&
    complaint.assigned_to === operatorId &&
    !complaint.resolved_at &&
    !['RESOLVED', 'REJECTED', 'CLOSED'].includes(complaint.status);

  return (
    <AppCard variant="outlined" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <AppText variant="bodyMedium" weight="bold">Khiếu nại đơn #{complaint.order_id}</AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            {complaint.complaint_type}{complaint.customer_name ? ` · ${complaint.customer_name}` : ''}
          </AppText>
        </View>
        <AppText variant="captionMedium" weight="bold" color={theme.colors.warning.dark}>
          {complaintStatusLabel(complaint.status)}
        </AppText>
      </View>
      <AppText variant="caption" color={theme.colors.text.muted}>
        Gửi lúc: {formatDate(complaint.created_at)}
      </AppText>
      {queue === 'RESPONDED' && complaint.resolved_at ? (
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Phản hồi lúc: {formatDate(complaint.resolved_at)}
        </AppText>
      ) : null}
      <AppButton
        title={expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
        variant="outline"
        size="sm"
        onPress={onToggle}
      />
      {expanded ? (
        <StaffComplaintDetail
          accountId={accountId}
          complaintId={complaint.complaint_id}
          canRespond={canRespond}
          ownRoleId={ownRoleId}
        />
      ) : null}
    </AppCard>
  );
}

function StaffComplaintDetail({
  accountId,
  complaintId,
  canRespond,
  ownRoleId,
}: {
  accountId: string;
  complaintId: number;
  canRespond: boolean;
  ownRoleId: number;
}) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  const { currentData: complaint, isFetching, isError, refetch } = useGetStaffComplaintDetailQuery(
    { accountId, complaintId },
    { pollingInterval: active ? 5000 : 0, refetchOnMountOrArgChange: true },
  );
  const [resolutionDraft, setResolutionDraft] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [resolveComplaintMutation, resolutionState] = useResolveStaffComplaintMutation();
  const [sendReply, replyState] = useReplyToComplaintMutation();
  const submitLock = useRef(false);

  if (isFetching && !complaint) return <ActivityIndicator color={theme.colors.primary[600]} />;
  if (isError || !complaint) {
    return (
      <View style={styles.detailSection}>
        <AppText color={theme.colors.error.main}>Không thể tải chi tiết khiếu nại.</AppText>
        <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetch()} />
      </View>
    );
  }

  const resolution = resolutionDraft ?? complaint.resolution ?? '';
  const isBusy = resolutionState.isLoading || replyState.isLoading;

  const submitReply = async () => {
    const message = replyDraft.trim();
    if (submitLock.current || !message) return;
    submitLock.current = true;
    try {
      await sendReply({ complaintId, message }).unwrap();
      setReplyDraft('');
      AppAlert.alert(
        'Đã gửi yêu cầu phản hồi',
        'Khiếu nại tự động chuyển sang chờ khách hàng bổ sung thông tin.',
      );
    } catch (error) {
      AppAlert.alert('Chưa gửi được phản hồi', complaintErrorMessage(error));
    } finally {
      submitLock.current = false;
    }
  };

  const resolveComplaint = async () => {
    const normalizedResolution = resolution.trim();
    if (submitLock.current || !normalizedResolution) return;
    submitLock.current = true;
    try {
      await resolveComplaintMutation({
        complaintId,
        resolution: normalizedResolution,
      }).unwrap();
      AppAlert.alert('Đã gửi phản hồi', 'Khiếu nại đã được đánh dấu là đã giải quyết.');
    } catch (error) {
      AppAlert.alert('Chưa gửi được phản hồi', complaintErrorMessage(error));
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <View style={styles.details}>
      <AppCard variant="outlined" style={styles.detailCard}>
        <AppText variant="bodyMedium" weight="bold">Thông tin khiếu nại</AppText>
        <DetailRow label="Loại khiếu nại" value={complaint.complaint_type} />
        <DetailRow label="Trạng thái" value={complaintStatusLabel(complaint.status)} />
        <DetailRow label="Ngày gửi" value={formatDate(complaint.created_at)} />
        {complaint.assigned_staff ? (
          <DetailRow label="Người được giao" value={complaint.assigned_staff.full_name} />
        ) : null}
      </AppCard>
      <AppCard variant="outlined" style={styles.detailCard}>
        <AppText variant="bodyMedium" weight="bold">Nội dung xử lý</AppText>
        {canRespond ? (
          <>
            <AppInput
              label="Nội dung phản hồi"
              placeholder="Ghi rõ giải pháp khắc phục cho khách hàng"
              multiline
              maxLength={10000}
              value={resolution}
              onChangeText={setResolutionDraft}
              disabled={isBusy}
              inputStyle={styles.resolutionInput}
            />
            <AppButton
              title="Gửi phản hồi"
              disabled={isBusy || !resolution.trim()}
              loading={resolutionState.isLoading}
              onPress={() => void resolveComplaint()}
            />
          </>
        ) : (
          <>
            <AppText selectable>{complaint.resolution || 'Chưa có nội dung xử lý.'}</AppText>
            {complaint.resolved_at ? (
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Đã phản hồi lúc: {formatDate(complaint.resolved_at)}
              </AppText>
            ) : null}
          </>
        )}
      </AppCard>
      <AppCard variant="outlined" style={styles.detailCard}>
        <AppText variant="caption" color={theme.colors.text.secondary}>Ảnh minh chứng</AppText>
        {complaint.image_urls.length ? complaint.image_urls.map((url, index) => (
          <Image
            key={`${url}-${index}`}
            source={{ uri: url }}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel={`Ảnh minh chứng ${index + 1}`}
          />
        )) : <AppText variant="bodySmall">Không có ảnh đính kèm.</AppText>}
      </AppCard>
      <AppCard variant="outlined" style={styles.detailCard}>
        <AppText variant="bodyMedium" weight="bold">Trao đổi khiếu nại</AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Nội dung khách hàng gửi và lịch sử phản hồi được hiển thị như một cuộc hội thoại.
        </AppText>
        <ComplaintConversation
          initialMessage={{
            id: complaint.complaint_id,
            senderName: complaint.customer_name || 'Khách hàng',
            senderRoleId: 3,
            message: complaint.description,
            createdAt: complaint.created_at,
          }}
          replies={complaint.replies}
          ownRoleId={ownRoleId}
        />
      </AppCard>
      <AppCard variant="outlined" style={styles.detailCard}>
        <AppText variant="bodyMedium" weight="bold">Trao đổi với khách hàng</AppText>
        {canRespond ? (
          <>
            <AppInput
              label="Nội dung phản hồi"
              placeholder="Trao đổi với khách hàng hoặc yêu cầu thông tin bổ sung"
              multiline
              maxLength={10000}
              value={replyDraft}
              onChangeText={setReplyDraft}
              disabled={isBusy}
              inputStyle={styles.replyInput}
            />
            <View style={styles.actionRow}>
              <AppButton
                title="Gửi phản hồi cho khách hàng"
                size="sm"
                disabled={isBusy || !replyDraft.trim()}
                onPress={() => void submitReply()}
              />
            </View>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Sau khi gửi, hệ thống tự chuyển khiếu nại sang chờ khách hàng phản hồi.
            </AppText>
          </>
        ) : null}
      </AppCard>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailSection}>
      <AppText variant="caption" color={theme.colors.text.secondary}>{label}</AppText>
      <AppText selectable>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  header: { gap: theme.spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  errorCard: { gap: theme.spacing.sm, borderColor: theme.colors.error.light },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  details: { gap: theme.spacing.md, paddingTop: theme.spacing.sm },
  detailSection: { gap: theme.spacing.xs },
  detailCard: { gap: theme.spacing.sm },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  resolutionInput: { minHeight: 120, textAlignVertical: 'top' },
  replyInput: { minHeight: 96, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
