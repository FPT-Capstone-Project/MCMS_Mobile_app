import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVietnamDateTime } from '../../../../core/utils';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { useAuth } from '../../../auth';
import { useGetMyComplaintsQuery, type OrderComplaint } from '../../data/complaintApi';
import { CustomerComplaintDetail } from '../components/OrderComplaintHistory';

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

const typeLabels: Record<string, string> = {
  DAMAGED: 'Hàng bị hư hỏng',
  QUALITY: 'Chất lượng không đạt',
  QUANTITY: 'Thiếu hoặc sai số lượng',
  OTHER: 'Lý do khác',
};

function ComplaintCard({
  complaint,
  expanded,
  accountId,
  onToggle,
}: {
  complaint: OrderComplaint;
  expanded: boolean;
  accountId: string;
  onToggle: () => void;
}) {
  return (
    <AppCard variant="outlined" style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.cardTitle}>
          <AppText variant="bodyMedium" weight="bold">
            Khiếu nại đơn #{complaint.order_id}
          </AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            {typeLabels[complaint.complaint_type] ?? complaint.complaint_type}
          </AppText>
        </View>
        <AppText variant="captionMedium" weight="bold" color={theme.colors.warning.dark}>
          {statusLabels[complaint.status] ?? complaint.status}
        </AppText>
      </View>
      <AppText variant="caption" color={theme.colors.text.muted}>
        Gửi lúc: {formatVietnamDateTime(complaint.created_at, 'Chưa cập nhật')}
      </AppText>
      <AppButton
        title={expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
        variant="outline"
        size="sm"
        onPress={onToggle}
      />
      {expanded ? (
        <View style={styles.details}>
          <CustomerComplaintDetail
            accountId={accountId}
            complaintId={complaint.complaint_id}
          />
        </View>
      ) : null}
    </AppCard>
  );
}

export function CustomerComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const accountId = user?.id ?? '';
  const [expandedComplaintId, setExpandedComplaintId] = useState<number | null>(null);
  const { currentData, isLoading, isFetching, isError, refetch } = useGetMyComplaintsQuery(
    { accountId },
    { skip: !accountId, refetchOnMountOrArgChange: true },
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Khiếu nại của tôi"
        subtitle="Theo dõi và bổ sung thông tin khiếu nại"
        showBack
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      />
      <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
        <FlatList
          data={currentData ?? []}
          keyExtractor={(complaint) => String(complaint.complaint_id)}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          refreshing={isFetching && !!currentData}
          onRefresh={() => { void refetch(); }}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              accountId={accountId}
              expanded={expandedComplaintId === item.complaint_id}
              onToggle={() => setExpandedComplaintId((current) =>
                current === item.complaint_id ? null : item.complaint_id)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Các khiếu nại được cập nhật khi nhân viên phản hồi hoặc cần thông tin bổ sung.
              </AppText>
              {currentData ? (
                <AppText variant="caption">{currentData.length} khiếu nại</AppText>
              ) : null}
              {isError ? (
                <AppCard variant="outlined" style={styles.errorCard}>
                  <AppText variant="bodySmall" color={theme.colors.error.main}>
                    Không thể tải danh sách khiếu nại.
                  </AppText>
                  <AppButton
                    title="Thử lại"
                    variant="outline"
                    size="sm"
                    onPress={() => { void refetch(); }}
                  />
                </AppCard>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoading || (isFetching && !currentData)
              ? <ActivityIndicator color={theme.colors.primary[600]} />
              : !isError
                ? <AppEmptyState
                    title="Chưa có khiếu nại"
                    description="Các khiếu nại của bạn sẽ được hiển thị tại đây."
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
  card: { gap: theme.spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  details: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  errorCard: { gap: theme.spacing.sm, borderColor: theme.colors.error.light },
});