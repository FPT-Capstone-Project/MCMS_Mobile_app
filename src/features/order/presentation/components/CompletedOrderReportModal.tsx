import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppButton, AppCard, AppText } from '../../../../shared/components';
import { MushroomImage } from '../../../../shared/components/MushroomImage';
import { CompletedSessionReportData, CultivationProgressEntry, CustomerCultivationStatus, OrderHarvestHistory } from '../../domain/entities/Order';
import { orderRepository } from '../../data/repositories/OrderRepository';
import { lifecycleStatusLabel } from '../../../cultivation/domain/sessionWorkflow';
import { CustomerEnvironmentHistoryChart } from '../../../tray/presentation/components/CustomerEnvironmentHistoryChart';

const LIFECYCLE_STAGES = [
  { code: 'RECEIVED', description: 'Phôi đã được tiếp nhận' },
  { code: 'RESTING', description: 'Phôi đang nghỉ và ổn định' },
  { code: 'DEVELOPING', description: 'Tơ nấm phát triển' },
  { code: 'READY_FOR_CULTIVATION', description: 'Phôi khỏe mạnh, tơ đạt yêu cầu' },
  { code: 'FRUITING_INITIATION', description: 'Phôi được bố trí bắt đầu ra quả thể.' },
  { code: 'PINNING', description: 'Mầm nấm xuất hiện.' },
  { code: 'YOUNG_FRUITING', description: 'Nấm non phát triển' },
  { code: 'MATURATION', description: 'Nấm trưởng thành' },
  { code: 'HARVEST_READY', description: 'Sẵn sàng thu hoạch' },
] as const;

function normalizeLifecycleStage(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'SPAWN_RESTING') return 'RESTING';
  if (normalized === 'MYCELIAL_DEVELOPMENT') return 'DEVELOPING';
  return normalized;
}

interface CompletedOrderReportModalProps {
  visible: boolean;
  orderId: number | null;
  cultivation?: CustomerCultivationStatus;
  onClose: () => void;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

function kg(value: number | string | null | undefined): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg` : 'Chưa ghi nhận';
}

export function CompletedOrderReportModal({
  visible,
  orderId,
  cultivation,
  onClose,
}: CompletedOrderReportModalProps) {
  const [report, setReport] = useState<OrderHarvestHistory | null>(null);
  const [sessionData, setSessionData] = useState<Record<number, CompletedSessionReportData>>({});
  const [progressHistory, setProgressHistory] = useState<CultivationProgressEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, number | null>>({});
  const requestedSections = useRef(new Set<string>());

  useEffect(() => {
    if (!visible || orderId === null) return;
    let mounted = true;
    requestedSections.current.clear();
    void Promise.resolve().then(async () => {
      if (mounted) {
        setLoading(true);
      }
      const [historyResult] = await Promise.allSettled([orderRepository.getCustomerHarvestHistory(orderId)]);
      const history = historyResult.status === 'fulfilled' ? historyResult.value : null;
      if (mounted) {
        setReport(history);
      }
    })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [cultivation, orderId, visible]);

  const completedSessions = useMemo(
    () => (cultivation?.sessions ?? []).filter((session) => session.status === 'COMPLETED'),
    [cultivation]
  );
  const completedReports = (report?.harvests ?? []).filter((item) =>
    completedSessions.some((session) => session.session_id === item.session_id)
  );
  const totalYield = completedReports.reduce((sum, item) => sum + Number(item.harvest?.total_weight_kg || 0), 0);
  const usableYield = completedReports.reduce((sum, item) => sum + Number(item.harvest?.usable_weight_kg || 0), 0);
  const rejectedYield = completedReports.reduce((sum, item) => sum + Number(item.harvest?.rejected_weight_kg || 0), 0);
  const getTrayQuantity = (session: CustomerCultivationStatus['sessions'][number]) =>
    Number.isFinite(Number(session.tray_quantity)) && Number(session.tray_quantity) > 0
      ? Number(session.tray_quantity)
      : (session.assigned_trays?.length ?? 0);
  const totalTrays = completedSessions.reduce((sum, session) => sum + getTrayQuantity(session), 0);

  const loadSection = (session: CustomerCultivationStatus['sessions'][number], section: number) => {
    const key = section === 2 ? `progress:${orderId}` : `${section}:${session.session_id}`;
    if (requestedSections.current.has(key) || orderId === null) return;
    requestedSections.current.add(key);
    setLoadingSections((current) => ({ ...current, [key]: true }));
    const finish = () => setLoadingSections((current) => ({ ...current, [key]: false }));
    if (section === 2) {
      void orderRepository.getCustomerCultivationProgress(orderId)
        .then(setProgressHistory)
        .catch(() => setProgressHistory([]))
        .finally(finish);
    } else if (section === 3) {
      void orderRepository.getSessionEnvironmentReport(
        session.session_id,
        session.mushroom_type_id,
        session.start_at,
        session.end_at
      ).then((environmentReport) => {
        setSessionData((current) => ({
          ...current,
          [session.session_id]: {
            inspectionCount: current[session.session_id]?.inspectionCount ?? null,
            environmentReport,
          },
        }));
      }).finally(finish);
    } else if (section === 4) {
      void orderRepository.getSessionInspectionCount(session.session_id)
        .then((inspectionCount) => {
          setSessionData((current) => ({
            ...current,
            [session.session_id]: {
              environmentReport: current[session.session_id]?.environmentReport ?? null,
              inspectionCount,
            },
          }));
        }).finally(finish);
    }
  };

  const toggleSection = (session: CustomerCultivationStatus['sessions'][number], section: number) => {
    const opening = expandedSections[session.session_id] !== section;
    setExpandedSections((current) => ({ ...current, [session.session_id]: opening ? section : null }));
    if (opening) loadSection(session, section);
  };

  const closeReport = () => {
    setExpandedSections({});
    setLoadingSections({});
    setSessionData({});
    setProgressHistory([]);
    requestedSections.current.clear();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeReport}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><Ionicons name="document-text-outline" size={22} color={theme.colors.primary[700]} /></View>
          <View style={styles.headerCopy}>
            <AppText variant="title" weight="bold">Báo cáo tổng kết</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>Đơn hàng #{orderId} · {completedSessions.length} phiên hoàn tất</AppText>
          </View>
          <AppButton title="Đóng" variant="ghost" size="sm" onPress={closeReport} />
        </View>

        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator color={theme.colors.primary[600]} /> : null}
          {!loading && completedSessions.length === 0 ? (
            <AppCard variant="outlined"><AppText>Đơn hàng chưa có phiên nào ở trạng thái hoàn tất.</AppText></AppCard>
          ) : null}

          {!loading && completedSessions.length > 0 ? (
            <>
              <AppCard variant="filled" style={styles.overview}>
                <AppText variant="title" weight="bold">Kết quả thu hoạch</AppText>
                <View style={styles.metrics}>
                  <Metric label="Tổng thu hoạch" value={kg(totalYield)} />
                  <Metric label="Sử dụng được" value={kg(usableYield)} />
                  <Metric label="Loại bỏ" value={kg(rejectedYield)} />
                </View>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  {completedSessions.length} phiên · {totalTrays} khay
                </AppText>
              </AppCard>

              {completedSessions.map((session) => {
                const item = completedReports.find((record) => record.session_id === session.session_id);
                const harvest = item?.harvest;
                const details = sessionData[session.session_id];
                const environment = details?.environmentReport;
                return (
                  <AppCard key={session.session_id} variant="outlined" style={styles.sessionCard}>
                    <View style={styles.sessionTitle}>
                      <MushroomImage name={session.mushroom_name} tiny />
                      <View style={styles.headerCopy}>
                        <AppText variant="title" weight="bold">{session.mushroom_name}</AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>Phiên #{session.session_id}</AppText>
                      </View>
                      <AppText variant="captionMedium" color={theme.colors.success.dark} weight="bold">{lifecycleStatusLabel(session.status)}</AppText>
                    </View>

                    <ReportSection title="01 · Tổng quan phiên trồng" description="Thông tin và thời gian thực hiện" expanded={expandedSections[session.session_id] === 1} onPress={() => toggleSection(session, 1)}>
                      <ReportRow label="Trạng thái phiên" value={lifecycleStatusLabel(session.status)} />
                      <ReportRow label="Ngày bắt đầu" value={formatDate(session.start_at)} />
                      <ReportRow label="Ngày kết thúc" value={formatDate(session.end_at)} />
                      <ReportRow label="Số khay" value={`${getTrayQuantity(session)}`} />
                      {session.assigned_trays?.length ? (
                        <ReportRow label="Mã khay" value={session.assigned_trays.map((tray) => tray.tray_code || `#${tray.tray_id}`).join(', ')} />
                      ) : null}
                    </ReportSection>
                    <ReportSection title="02 · Quá trình phát triển" description="Các giai đoạn trồng nấm" expanded={expandedSections[session.session_id] === 2} onPress={() => toggleSection(session, 2)}>
                      {loadingSections[`progress:${orderId}`] ? <ActivityIndicator color={theme.colors.primary[600]} /> : null}
                      <ReportRow label="Ngày thu hoạch" value={formatDate(harvest?.harvest_date || session.harvest_date)} />
                      <View style={styles.lifecycleList}>
                        {LIFECYCLE_STAGES.map((stage, index) => {
                          const recordedAt = progressHistory.find((entry) =>
                            entry.session_id === session.session_id &&
                            normalizeLifecycleStage(entry.current_stage) === stage.code
                          )?.updated_at;
                          return (
                            <View key={stage.code} style={styles.lifecycleItem}>
                              <View style={styles.lifecycleMarker}>
                                <AppText variant="captionMedium" weight="bold" color={theme.colors.success.dark}>{index + 1}</AppText>
                              </View>
                              <View style={styles.lifecycleCopy}>
                                <AppText variant="captionMedium" weight="bold">{lifecycleStatusLabel(stage.code)}</AppText>
                                <AppText variant="caption" color={theme.colors.text.secondary}>{stage.description}</AppText>
                                {recordedAt ? <AppText variant="caption" color={theme.colors.text.muted}>{formatDate(recordedAt)}</AppText> : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ReportSection>
                    <ReportSection title="03 · Môi trường IoT" description="Nhiệt độ, độ ẩm và cảnh báo" expanded={expandedSections[session.session_id] === 3} onPress={() => toggleSection(session, 3)}>
                      {loadingSections[`3:${session.session_id}`] ? <ActivityIndicator color={theme.colors.primary[600]} /> : environment ? (
                        <>
                          <View style={styles.environmentMetrics}>
                            <Metric label="Nhiệt độ trung bình" value={environment.summary.averageTemperature == null ? '—' : `${environment.summary.averageTemperature.toFixed(1)} °C`} />
                            <Metric label="Độ ẩm trung bình" value={environment.summary.averageHumidity == null ? '—' : `${environment.summary.averageHumidity.toFixed(1)}%`} />
                            <Metric label="Khoảng vượt ngưỡng" value={environment.summary.exceededBucketCount == null ? 'Chưa cấu hình ngưỡng' : `${environment.summary.exceededBucketCount}`} />
                          </View>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Nhiệt độ vượt: {environment.summary.temperatureExceedanceCount ?? '—'} khoảng · Độ ẩm vượt: {environment.summary.humidityExceedanceCount ?? '—'} khoảng
                          </AppText>
                          <AppText variant="caption" color={theme.colors.text.muted}>
                            Ngưỡng nhiệt độ: {environment.thresholds.temperatureMin ?? '—'}–{environment.thresholds.temperatureMax ?? '—'} °C · Độ ẩm: {environment.thresholds.humidityMin ?? '—'}–{environment.thresholds.humidityMax ?? '—'}%
                          </AppText>
                          <CustomerEnvironmentHistoryChart
                            points={environment.points}
                            loading={false}
                            error={null}
                            showRangeControls={false}
                            selectDay
                            timeLabelMode="time"
                          />
                        </>
                      ) : (
                        <AppText variant="caption" color={theme.colors.text.secondary}>Chưa có lịch sử môi trường cho phiên này.</AppText>
                      )}
                    </ReportSection>
                    <ReportSection title="04 · Hoạt động chăm sóc" description="Nhật ký chăm sóc" expanded={expandedSections[session.session_id] === 4} onPress={() => toggleSection(session, 4)}>
                      {loadingSections[`4:${session.session_id}`] ? <ActivityIndicator color={theme.colors.primary[600]} /> : (
                        <>
                          <ReportRow label="Lượt kiểm tra khay" value={details?.inspectionCount == null ? 'Chưa tải được' : `${details.inspectionCount} lượt`} />
                          <AppText variant="caption" color={theme.colors.text.secondary}>Chi tiết nhật ký được lưu theo từng khay trong lịch sử phiên.</AppText>
                        </>
                      )}
                    </ReportSection>
                    <ReportSection title="05 · Kết quả thu hoạch" description="Sản lượng và chất lượng nấm" expanded={expandedSections[session.session_id] === 5} onPress={() => toggleSection(session, 5)}>
                      <ReportRow label="Tổng khối lượng" value={kg(harvest?.total_weight_kg)} />
                      <ReportRow label="Dùng được" value={kg(harvest?.usable_weight_kg)} />
                      <ReportRow label="Loại bỏ" value={kg(harvest?.rejected_weight_kg)} />
                      <ReportRow label="Xếp loại" value={harvest?.quality_grade || 'Chưa phân loại'} />
                    </ReportSection>
                    <ReportSection title="06 · Bàn giao" description="Kết quả cuối cùng, bàn giao" expanded={expandedSections[session.session_id] === 6} onPress={() => toggleSection(session, 6)}>
                      <ReportRow label="Phương thức" value={harvest?.harvest_method === 'PICKUP' ? 'Khách nhận tại trại' : harvest?.harvest_method === 'DELIVERY' ? 'Giao hàng' : 'Chưa ghi nhận'} />
                      <ReportRow label="Trạng thái" value={session.harvest_request_status === 'COMPLETED' ? 'Đã xác nhận hoàn tất' : 'Chưa có xác nhận bàn giao'} />
                    </ReportSection>
                  </AppCard>
                );
              })}

            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><AppText variant="caption" color={theme.colors.text.secondary}>{label}</AppText><AppText variant="title" weight="bold">{value}</AppText></View>;
}

function ReportSection({
  title,
  description,
  expanded,
  onPress,
  children,
}: React.PropsWithChildren<{ title: string; description: string; expanded: boolean; onPress: () => void }>) {
  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={styles.sectionHeader}>
        <View style={styles.sectionNumber}>
          <AppText variant="caption" weight="bold">{title.slice(0, 2)}</AppText>
        </View>
        <View style={styles.sectionHeading}>
          <AppText variant="captionMedium" weight="bold" color={theme.colors.text.primary}>{title.slice(5)}</AppText>
          <AppText variant="caption" color={theme.colors.text.secondary}>{description}</AppText>
        </View>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color={theme.colors.text.muted} />
      </Pressable>
      {expanded ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><AppText variant="caption" numberOfLines={1} color={theme.colors.text.secondary}>{label}</AppText><AppText variant="captionMedium" weight="bold" style={styles.rowValue}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.base, borderBottomWidth: 1, borderBottomColor: theme.colors.border.light, backgroundColor: theme.colors.background.paper },
  headerIcon: { width: 42, height: 42, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  content: { padding: theme.spacing.base, gap: theme.spacing.md, paddingBottom: theme.spacing['2xl'] },
  overview: { gap: theme.spacing.md },
  environmentMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  metric: { flexGrow: 1, minWidth: '28%', gap: 3 },
  sessionCard: { gap: theme.spacing.md },
  sessionTitle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  section: { borderTopWidth: 1, borderTopColor: theme.colors.border.light },
  sectionHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  sectionNumber: { width: 24, height: 24, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.background.subtle, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flex: 1, gap: 1 },
  sectionContent: { gap: theme.spacing.xs, paddingBottom: theme.spacing.sm, paddingLeft: 32 },
  lifecycleList: { gap: theme.spacing.sm, paddingTop: theme.spacing.xs },
  lifecycleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  lifecycleMarker: { width: 24, height: 24, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.success.light, alignItems: 'center', justifyContent: 'center' },
  lifecycleCopy: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowValue: { flexShrink: 1, textAlign: 'right' },
});
