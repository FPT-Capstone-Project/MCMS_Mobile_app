import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { useAuth } from '../../../auth';
import { useGetStaffComplaintsQuery } from '../../data/complaintApi';
import { AppButton, AppCard, AppEmptyState, AppHeader, AppText, ScreenContainer } from '../../../../shared/components';

const PAGE_SIZE = 20;

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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận thời gian' : date.toLocaleString('vi-VN');
}

export function OperatorComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { currentData, isLoading, isFetching, isError, refetch } = useGetStaffComplaintsQuery(
    { page, pageSize: PAGE_SIZE },
    { skip: !user, refetchOnMountOrArgChange: true },
  );
  const complaints = currentData?.data ?? [];
  const totalPages = Math.ceil((currentData?.total ?? 0) / PAGE_SIZE);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Khiếu nại khách hàng"
        subtitle="Danh sách khiếu nại đơn hàng"
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
            <AppCard variant="outlined" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <AppText variant="bodyMedium" weight="bold">Khiếu nại đơn #{item.order_id}</AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>{item.complaint_type}</AppText>
                </View>
                <AppText variant="captionMedium" weight="bold" color={theme.colors.warning.dark}>
                  {complaintStatusLabel(item.status)}
                </AppText>
              </View>
              <AppText variant="bodySmall">{item.description}</AppText>
              <AppText variant="caption" color={theme.colors.text.muted}>{formatDate(item.created_at)}</AppText>
            </AppCard>
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              {isError ? (
                <AppCard variant="outlined" style={styles.errorCard}>
                  <AppText variant="bodySmall" color={theme.colors.error.main}>Không thể tải danh sách khiếu nại.</AppText>
                  <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => void refetch()} />
                </AppCard>
              ) : null}
              {currentData ? <AppText variant="caption">{currentData.total} khiếu nại</AppText> : null}
            </View>
          }
          ListEmptyComponent={
            isLoading || (isFetching && !currentData) ? <ActivityIndicator color={theme.colors.primary[600]} /> :
              !isError ? <AppEmptyState title="Chưa có khiếu nại" description="Khiếu nại từ khách hàng sẽ hiển thị tại đây." /> : undefined
          }
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <AppButton title="Trang trước" variant="outline" size="sm" disabled={page === 1 || isFetching} onPress={() => setPage((value) => value - 1)} />
              <AppText variant="caption">Trang {page} / {totalPages}</AppText>
              <AppButton title="Trang sau" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onPress={() => setPage((value) => value + 1)} />
            </View>
          ) : undefined}
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  errorCard: { gap: theme.spacing.sm, borderColor: theme.colors.error.light },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
});
