import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppButton, AppCard, AppEmptyState, AppHeader, AppText, ScreenContainer } from '../../../../shared/components';
import { AppModal } from '../../../../shared/components/feedback/AppDialog';
import { useAuth } from '../../../auth';
import { lifecycleStatusLabel } from '../../../cultivation/domain/sessionWorkflow';
import type { CustomerTrayCard } from '../../../tray/domain/entities/Tray';
import { CustomerTrayDetail } from '../../../tray/presentation/components/CustomerTrayDetail';
import { useGetCustomerSessionsQuery } from '../../data/customerSessionApi';
import { customerSessionDeviceHistoryAvailable, customerSessionTrayDetail, customerTrayAssignmentLabel, customerTrayLocation, customerTrayStatusLabel } from '../../domain/customerSessions';
import type { CustomerSession, CustomerSessionFilter, CustomerSessionTray } from '../../domain/entities/Order';

const filters: { value: CustomerSessionFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'GROWING', label: 'Đang trồng' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

function formatDate(value: string | null): string {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleDateString('vi-VN');
}

function SessionCard({ session, onOpen }: { session: CustomerSession; onOpen: () => void }) {
  return (
    <AppCard variant="outlined" style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.cardTitle}>
          <AppText variant="bodyMedium" weight="bold">{session.mushroom_name}</AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Phiên #{session.session_id} · Đơn hàng #{session.order_id}
          </AppText>
        </View>
        <Ionicons name="leaf-outline" size={24} color={theme.colors.primary[600]} />
      </View>
      <AppText variant="bodySmall">Trạng thái: {lifecycleStatusLabel(session.status)}</AppText>
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Bắt đầu: {formatDate(session.start_at)} · {session.trays.length} khay đã gán
      </AppText>
      <AppButton title="Xem chi tiết phiên" variant="outline" size="sm" onPress={onOpen} />
    </AppCard>
  );
}

function TrayCard({ tray, onOpen }: { tray: CustomerSessionTray; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem chi tiết ${tray.tray_code || `khay ${tray.tray_id}`}`} onPress={onOpen}>
      <AppCard variant="outlined" style={styles.card}>
        <AppText variant="bodyMedium" weight="bold">{tray.tray_code || `Khay #${tray.tray_id}`}</AppText>
        <AppText variant="bodySmall">Gán vào phiên: {customerTrayAssignmentLabel(tray.assignment_status)}</AppText>
        {tray.assignment_status.toUpperCase() === 'ACTIVE' ? (
          <AppText variant="bodySmall">Trạng thái khay: {customerTrayStatusLabel(tray.tray_status)}</AppText>
        ) : null}
        <View style={styles.location}>
          <Ionicons name="location-outline" size={17} color={theme.colors.primary[700]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.locationText}>
            {customerTrayLocation(tray)}
          </AppText>
        </View>
        <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>Xem chi tiết khay ›</AppText>
      </AppCard>
    </Pressable>
  );
}

function SessionDetail({ session, onClose }: { session: CustomerSession; onClose: () => void }) {
  const [selectedTray, setSelectedTray] = useState<CustomerTrayCard | null>(null);
  const deviceHistoryUnavailable = !customerSessionDeviceHistoryAvailable(session);

  const openTray = (tray: CustomerSessionTray) => {
    setSelectedTray(customerSessionTrayDetail(session, tray));
  };

  return (
    <AppModal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <AppHeader title="Chi tiết phiên" subtitle={`Phiên #${session.session_id}`} showBack onBack={onClose} />
        <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
          <FlatList
            data={session.trays}
            keyExtractor={(tray) => String(tray.session_tray_id)}
            renderItem={({ item }) => <TrayCard tray={item} onOpen={() => openTray(item)} />}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.summary}>
                <AppText variant="title" weight="bold">{session.mushroom_name}</AppText>
                <AppText variant="bodySmall">Đơn hàng #{session.order_id} · {lifecycleStatusLabel(session.status)}</AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Bắt đầu: {formatDate(session.start_at)} · Kết thúc: {formatDate(session.end_at)}
                </AppText>
                <AppText variant="bodyMedium" weight="bold">Khay của phiên ({session.trays.length})</AppText>
              </View>
            }
            ListEmptyComponent={
              <AppEmptyState title="Chưa có khay được gán" description="Vị trí và trạng thái sẽ xuất hiện khi khay được gán vào phiên." />
            }
          />
        </ScreenContainer>
        {selectedTray ? (
          <AppModal visible transparent animationType="slide" onRequestClose={() => setSelectedTray(null)}>
            <CustomerTrayDetail
              selectedTray={selectedTray}
              onClose={() => setSelectedTray(null)}
              deviceHistoryUnavailable={deviceHistoryUnavailable}
            />
          </AppModal>
        ) : null}
      </View>
    </AppModal>
  );
}

export function CustomerSessionsScreen() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CustomerSessionFilter>('ALL');
  const [selected, setSelected] = useState<CustomerSession | null>(null);
  const { currentData, isLoading, isFetching, isError, refetch } = useGetCustomerSessionsQuery(
    { accountId: user?.id || '', page, status },
    { skip: !user, refetchOnMountOrArgChange: true },
  );
  const sessions = currentData?.data ?? [];
  const totalPages = currentData?.pagination.totalPages ?? 0;

  return (
    <View style={styles.screen}>
      <AppHeader title="Phiên của tôi" subtitle="Theo dõi phiên nuôi trồng" showBack />
      <ScreenContainer edges={['left', 'right', 'bottom']} keyboardAvoiding={false}>
        <FlatList
          data={sessions}
          keyExtractor={(session) => String(session.session_id)}
          renderItem={({ item }) => <SessionCard session={item} onOpen={() => setSelected(item)} />}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          refreshing={isFetching && !!currentData}
          onRefresh={() => void refetch()}
          ListHeaderComponent={
            <View style={styles.summary}>
              <AppText variant="title" weight="bold">Phiên nuôi trồng</AppText>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Để xem chi tiết trạng thái nấm, hãy xem camera của từng khay ở trang khay của tôi.
              </AppText>
              <View style={styles.filters}>
                {filters.map((filter) => (
                  <AppButton
                    key={filter.value}
                    title={filter.label}
                    variant={status === filter.value ? 'primary' : 'outline'}
                    size="sm"
                    accessibilityState={{ selected: status === filter.value }}
                    onPress={() => {
                      setPage(1);
                      setStatus(filter.value);
                    }}
                  />
                ))}
              </View>
              {currentData ? <AppText variant="caption">{currentData.pagination.total} phiên</AppText> : null}
              {isError ? (
                <AppButton title="Không tải được dữ liệu · Thử lại" variant="outline" onPress={() => void refetch()} />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoading || (isFetching && !currentData) ? (
              <ActivityIndicator color={theme.colors.primary[600]} />
            ) : !isError ? (
              <AppEmptyState title="Không có phiên phù hợp" description="Các phiên từ đơn hàng của bạn sẽ hiển thị tại đây." />
            ) : undefined
          }
          ListFooterComponent={page > 1 || totalPages > 1 ? (
            <View style={styles.pagination}>
              <AppButton title="Trang trước" variant="outline" size="sm" disabled={page === 1 || isFetching} onPress={() => setPage((value) => value - 1)} />
              <AppText variant="caption">Trang {page}{totalPages ? ` / ${totalPages}` : ''}</AppText>
              <AppButton title="Trang sau" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onPress={() => setPage((value) => value + 1)} />
            </View>
          ) : undefined}
        />
      </ScreenContainer>
      {selected ? <SessionDetail session={selected} onClose={() => setSelected(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  summary: { gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: theme.spacing.xs },
  location: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs },
  locationText: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
});
