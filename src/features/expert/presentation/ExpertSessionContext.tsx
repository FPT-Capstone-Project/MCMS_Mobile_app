import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppModal } from '../../../shared/components/feedback/AppDialog';
import { AppButton, AppCard, AppHeader, AppText } from '../../../shared/components';
import { theme } from '../../../core/theme';
import { GROWTH_STAGE_LABELS } from '../../../core/constants/growthStages';
import { useExpertIssueContextQuery } from '../data/consultation-chat-api';

const labels: Record<string, string> = {
  ...GROWTH_STAGE_LABELS,
  PENDING: 'Chờ bắt đầu', SPAWN_PENDING: 'Chờ phôi', SPAWN_ISSUED: 'Đã xuất phôi',
  RESTING: 'Phôi đang nghỉ', SPAWN_RESTING: 'Phôi đang nghỉ',
  MYCELIAL_DEVELOPMENT: 'Phát triển tơ', READY_FOR_CULTIVATION: 'Sẵn sàng đưa vào khay',
  CULTIVATING: 'Đang trồng', HARVEST_READY: 'Sẵn sàng thu hoạch',
  HARVESTING: 'Đang thu hoạch', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy',
  NORMAL: 'Bình thường', WARNING: 'Cần theo dõi', ABNORMAL: 'Bất thường',
};
const label = (value?: string | null) => value ? labels[value] ?? value : 'Chưa ghi nhận';
function date(value?: string | null) {
  if (!value) return 'Chưa ghi nhận';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa ghi nhận' : parsed.toLocaleString('vi-VN');
}
function Info({ title, value }: { title: string; value?: string | null }) {
  return <View style={styles.info}>
    <AppText variant="caption" color={theme.colors.text.secondary}>{title}</AppText>
    <AppText selectable>{value || 'Chưa ghi nhận'}</AppText>
  </View>;
}

export function ExpertSessionContext({ issueId }: { issueId: number | string }) {
  const [visible, setVisible] = useState(false);
  const { data: issue, isFetching, error, refetch } = useExpertIssueContextQuery(issueId, {
    skip: !visible, refetchOnMountOrArgChange: true,
  });
  return <>
    <AppButton title="Xem thông tin phiên trồng" variant="outline" fullWidth onPress={() => setVisible(true)} />
    <AppModal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.root}>
        <AppHeader title="Thông tin phiên trồng" subtitle={issue?.session_id ? `Phiên #${issue.session_id} · Sự cố #${issueId}` : `Sự cố #${issueId}`} showBack onBack={() => setVisible(false)} />
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="caption" color={theme.colors.text.secondary}>Thông tin tham khảo để tư vấn. Các dữ liệu chưa được ghi nhận sẽ hiển thị rõ bên dưới.</AppText>
          <AppButton title="Cập nhật thông tin" variant="ghost" disabled={isFetching} onPress={() => void refetch()} />
          {isFetching && <ActivityIndicator color={theme.colors.primary[500]} />}
          {!!error && <AppText color={theme.colors.error.dark}>Không tải được thông tin mới nhất. Vui lòng bấm cập nhật để thử lại.</AppText>}
          {issue && !error && <>
            <AppCard style={styles.card}>
              <AppText variant="title" weight="bold">Phiên và loại nấm</AppText>
              <Info title="Loại nấm" value={issue.mushroom_name} />
              <Info title="Trạng thái phiên" value={label(issue.session_status)} />
              <Info title="Khay liên quan" value={issue.tray_code || (issue.tray_id ? `Khay #${issue.tray_id}` : issue.spawn_inspection_id ? 'Báo cáo phôi, chưa liên kết khay' : undefined)} />
              {issue.floor_id != null && <Info title="Vị trí" value={`Tầng #${issue.floor_id}`} />}
              <Info title="Bắt đầu phiên" value={date(issue.session_start_at)} />
              <Info title="Dự kiến thu hoạch" value={issue.expected_harvest_date ? new Date(issue.expected_harvest_date).toLocaleDateString('vi-VN') : undefined} />
            </AppCard>
            <AppCard style={styles.card}>
              <AppText variant="title" weight="bold">Sinh trưởng hiện tại</AppText>
              <Info title="Giai đoạn hiện tại" value={label(issue.growth_stage || issue.session_status)} />
              <Info title="Tiến độ" value={issue.growth_progress != null ? `${issue.growth_progress}%` : undefined} />
              <Info title="Tình trạng được ghi nhận" value={issue.growth_condition} />
              <Info title="Cập nhật tiến độ lúc" value={date(issue.growth_updated_at)} />
              <Info title="Giai đoạn lúc báo sự cố" value={label(issue.reported_stage)} />
            </AppCard>
            <AppCard style={styles.card}>
              <AppText variant="title" weight="bold">Báo cáo liên quan</AppText>
              <Info title="Báo cáo nguồn" value={issue.inspection_id ? `Báo cáo khay #${issue.inspection_id}` : issue.spawn_inspection_id ? `Kiểm tra phôi #${issue.spawn_inspection_id}` : undefined} />
              <Info title="Người báo sự cố" value={issue.reported_by_name} />
              <Info title="Thời gian kiểm tra" value={date(issue.inspection_at)} />
              {issue.spawn_inspection_id ? <>
                <Info title="Giai đoạn kiểm tra phôi" value={label(issue.spawn_stage)} />
                <Info title="Tình trạng phôi" value={label(issue.spawn_condition)} />
              </> : <>
                <Info title="Tình trạng khay" value={issue.tray_condition} />
                <Info title="Tình trạng nấm" value={issue.mushroom_condition} />
              </>}
              <Info title="Ghi chú kiểm tra" value={issue.inspection_notes} />
              <Info title="Mô tả sự cố" value={issue.description} />
            </AppCard>
            <AppCard style={styles.card}>
              <AppText variant="title" weight="bold">Môi trường lúc báo sự cố</AppText>
              <AppText variant="caption">Đây là dữ liệu lưu tại thời điểm báo sự cố, không phải số đo trực tiếp hiện tại.</AppText>
              <Info title="Thời điểm lưu" value={date(issue.environment_snapshot?.capturedAt)} />
              {issue.environment_snapshot?.sensors?.length ? issue.environment_snapshot.sensors.map((sensor) => <View key={sensor.sensorAddress} style={styles.info}>
                <AppText weight="semibold">Cảm biến #{sensor.sensorAddress}{!sensor.isValid ? ' · Dữ liệu không hợp lệ' : ''}</AppText>
                <AppText>{sensor.isValid ? `${sensor.temperature ?? '—'} °C · ${sensor.humidity ?? '—'}% độ ẩm` : 'Không sử dụng số đo này để đánh giá.'}</AppText>
                <AppText variant="caption">Nhận lúc: {date(sensor.receivedAt)}</AppText>
              </View>) : <AppText>Chưa có dữ liệu môi trường được lưu.</AppText>}
            </AppCard>
          </>}
          <AppButton title="Quay lại tư vấn" onPress={() => setVisible(false)} />
        </ScrollView>
      </View>
    </AppModal>
  </>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background.default },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing['2xl'] },
  card: { gap: theme.spacing.md },
  info: { gap: theme.spacing.xs },
});
