import { ConsultationChat } from './ConsultationChat';
import { ConsultationPhotoPicker } from './ConsultationPhotoPicker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { AppModal as Modal } from '../../../shared/components/feedback/AppDialog';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../shared/components';
import { theme } from '../../../core/theme';
import { expertConsultationRepository as expert } from '../data/repositories/expert-consultation-repository';
import { operatorConsultationRepository as repository } from '../data/repositories/operator-consultation-repository';
import type { ExpertConsultation, ExpertIssue } from '../domain/entities/expert-consultation';

const filters = [
  ['ALL', 'Tất cả'],
  ['OPEN', 'Chưa gửi'],
  ['WAITING_EXPERT', 'Chờ tư vấn'],
  ['IN_PROGRESS', 'Đang xử lý'],
  ['WAITING_REVIEW', 'Chờ chuyên gia duyệt'],
  ['MONITORING', 'Đang theo dõi'],
  ['RESOLVED', 'Hoàn tất'],
];
function issueStatus(status: string) {
  return filters.find(([key]) => key === status)?.[1] || 'Chưa xác định';
}
function consultationStatus(item: ExpertConsultation) {
  if (item.status === 'PENDING')
    return item.expert_id == null ? 'Chờ chuyên gia tiếp nhận' : 'Chuyên gia cần thêm thông tin';
  return {
    IN_PROGRESS: 'Chuyên gia đang xem xét',
    ANSWERED: 'Đã có hướng dẫn xử lý',
    CLOSED: 'Đã kết thúc tư vấn',
  }[item.status];
}
export function OperatorExpertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ issueId?: string }>();
  const [filter, setFilter] = useState('ALL');
  const [issues, setIssues] = useState<ExpertIssue[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listVersion = useRef(0);
  const selectedId = params.issueId && /^\d+$/.test(params.issueId) ? params.issueId : null;
  const load = useCallback(
    async (requestedPage = 1) => {
      const version = ++listVersion.current;
      setLoading(true);
      setError('');
      try {
        const response = await repository.listIssues(
          requestedPage,
          filter === 'ALL' ? undefined : filter
        );
        if (version !== listVersion.current) return;
        setIssues((current) =>
          requestedPage === 1 ? response.data : [...current, ...response.data]
        );
        setPage(requestedPage);
        setTotalPages(response.pagination.totalPages);
      } catch {
        if (version === listVersion.current) setError('Không tải được yêu cầu. Vui lòng thử lại.');
      } finally {
        if (version === listVersion.current) setLoading(false);
      }
    },
    [filter]
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        listVersion.current += 1;
      };
    }, [load])
  );
  return (
    <ScreenContainer scrollable={false} edges={['left', 'right', 'bottom']}>
      <AppHeader
        title="Làm việc với chuyên gia"
        subtitle="Theo dõi tư vấn và kết quả xử lý"
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {filters.map(([value, label]) => (
            <AppButton
              key={value}
              title={label}
              size="sm"
              variant={filter === value ? 'primary' : 'ghost'}
              disabled={loading}
              onPress={() => {
                setIssues([]);
                setFilter(value);
              }}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        <AppText variant="bodySmall" color={theme.colors.text.secondary}>
          Để tạo yêu cầu, mở lịch sử báo cáo khay hoặc kiểm tra phôi và chọn “Nhờ chuyên gia”. Yêu
          cầu sẽ kèm đúng báo cáo và ảnh liên quan.
        </AppText>
        <AppButton
          title="Mở đơn & phiên trồng"
          variant="outline"
          onPress={() => router.push('/admin-orders')}
        />
        {!!error && (
          <>
            <AppText color={theme.colors.error.dark}>{error}</AppText>
            <AppButton title="Thử lại" variant="outline" onPress={() => void load()} />
          </>
        )}
        {loading && issues.length === 0 ? (
          <ActivityIndicator />
        ) : !error && issues.length === 0 ? (
          <AppText align="center">Chưa có yêu cầu trong mục này.</AppText>
        ) : null}
        {issues.map((issue) => (
          <Pressable
            key={issue.issue_id}
            accessibilityRole="button"
            onPress={() => router.setParams({ issueId: String(issue.issue_id) })}
          >
            <AppCard style={styles.card}>
              <AppText variant="caption" color={theme.colors.primary[700]}>
                {issueStatus(issue.status)} · #{issue.issue_id}
              </AppText>
              <AppText variant="title" weight="bold">
                {issue.title}
              </AppText>
              <AppText variant="bodySmall">
                {issue.mushroom_name || 'Nấm'} · Phiên #{issue.session_id}
                {issue.tray_id ? ` · Khay #${issue.tray_id}` : ' · Phôi giống'}
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Xem yêu cầu và phản hồi
              </AppText>
            </AppCard>
          </Pressable>
        ))}
        {page < totalPages && (
          <AppButton
            title="Xem thêm"
            variant="outline"
            loading={loading}
            onPress={() => void load(page + 1)}
          />
        )}
      </ScrollView>
      {selectedId && (
        <IssueDetail
          key={selectedId}
          id={selectedId}
          onClose={() => {
            router.setParams({ issueId: undefined });
            void load();
          }}
        />
      )}
    </ScreenContainer>
  );
}
function IssueDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [issue, setIssue] = useState<ExpertIssue | null>(null);
  const [consultation, setConsultation] = useState<ExpertConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [notice, setNotice] = useState('');
  const [requestPhoto, setRequestPhoto] = useState<ImagePickerAsset | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await expert.getIssue(id);
      const detail = data.latest_consultation_id
        ? await expert.getConsultation(data.latest_consultation_id)
        : null;
      setIssue(data);
      setConsultation(detail);
    } catch {
      setError('Không tải được chi tiết. Hãy tải lại trước khi thao tác.');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(success);
      setMessage('');
      setAction('');
      setResult('');
      await refresh();
    } catch {
      setError(
        'Chưa xác nhận được thao tác. Hãy tải lại để kiểm tra trạng thái trước khi thử lại.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const canRequest =
    issue &&
    issue.status === 'OPEN' &&
    (!consultation || consultation.status === 'CLOSED');
  const canTreat =
    ['IN_PROGRESS', 'MONITORING'].includes(consultation?.issue_status ?? '') &&
    consultation &&
    consultation.status === 'ANSWERED' &&
    !!consultation.solution;
  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <AppHeader title={`Chi tiết yêu cầu #${id}`} showBack backDisabled={busy}
          onBack={() => { if (!lock.current) onClose(); }}
          rightAction={<AppButton title="Tải lại" size="sm" variant="ghost" disabled={busy || loading} onPress={refresh} />} />
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
        {loading && <ActivityIndicator />}
        {!!error && <AppText color={theme.colors.error.dark}>{error}</AppText>}
        {!!notice && <AppText color={theme.colors.success.dark}>{notice}</AppText>}
        {issue && (
          <>
            <AppCard style={styles.card}>
              <AppText weight="bold" variant="title">
                {issue.title}
              </AppText>
              <AppText>
                {issueStatus(consultation?.issue_status ?? issue.status)} · Phiên #{issue.session_id}
              </AppText>
              <AppText>{issue.description}</AppText>
              <ScrollView horizontal contentContainerStyle={styles.row}>
                {issue.media?.map((media) => (
                  <View key={media.media_id}>
                    <Image
                      source={{ uri: media.media_url }}
                      style={styles.photo}
                      accessibilityLabel={media.caption || 'Ảnh báo cáo'}
                    />
                    {!!media.caption && (
                      <AppText variant="caption" style={{ maxWidth: 180 }}>
                        {media.caption}
                      </AppText>
                    )}
                  </View>
                ))}
              </ScrollView>
            </AppCard>
            {consultation && (
              <AppCard style={styles.card}>
                <AppText variant="title" weight="bold">
                  {consultationStatus(consultation)}
                </AppText>
                <AppText variant="caption">
                  {consultation.expert_name ||
                    (consultation.expert_id
                      ? `Chuyên gia #${consultation.expert_id}`
                      : 'Chưa có chuyên gia tiếp nhận')}
                </AppText>
                {!!consultation.diagnosis && (
                  <>
                    <AppText weight="bold">Chẩn đoán / phản hồi</AppText>
                    <AppText>{consultation.diagnosis}</AppText>
                  </>
                )}
                {!!consultation.solution && (
                  <>
                    <AppText weight="bold">Hướng dẫn xử lý</AppText>
                    <AppText>{consultation.solution}</AppText>
                  </>
                )}
              </AppCard>
            )}
            {consultation && <ConsultationChat key={consultation.consultation_id} id={consultation.consultation_id} onUpdate={setConsultation} />}
            {!loading && !error && (
              <>
                {canRequest && (
                  <AppCard style={styles.card}>
                    <AppInput
                      label="Câu hỏi cho chuyên gia"
                      value={message}
                      onChangeText={setMessage}
                      multiline
                      maxLength={5000}
                      editable={!busy}
                    />
                    <ConsultationPhotoPicker photo={requestPhoto} onChange={setRequestPhoto} disabled={busy} />
                    <AppButton
                      title="Gửi yêu cầu tư vấn"
                      loading={busy}
                      disabled={!message.trim()}
                      onPress={() =>
                        run(
                          async () => {
                            if (requestPhoto) {
                              await repository.uploadIssuePhoto(id, requestPhoto);
                              setRequestPhoto(null);
                            }
                            await repository.request(id, message.trim());
                          },
                          'Đã gửi yêu cầu đến chuyên gia.'
                        )
                      }
                    />
                  </AppCard>
                )}
                {canTreat && consultation && (
                  <AppCard style={styles.card}>
                    <AppText weight="bold">Ghi nhận xử lý theo hướng dẫn</AppText>
                    <AppInput
                      label="Đã thực hiện"
                      value={action}
                      onChangeText={setAction}
                      multiline
                      maxLength={5000}
                      editable={!busy}
                    />
                    <AppInput
                      label="Kết quả quan sát"
                      value={result}
                      onChangeText={setResult}
                      multiline
                      maxLength={5000}
                      editable={!busy}
                    />
                    <AppButton
                      title="Lưu kết quả xử lý"
                      loading={busy}
                      disabled={!action.trim() || !result.trim()}
                      onPress={() =>
                        run(
                          () =>
                            repository.recordTreatment(
                              consultation.consultation_id,
                              action.trim(),
                              result.trim()
                            ),
                          'Đã gửi kết quả xử lý cho chuyên gia duyệt.'
                        )
                      }
                    />
                  </AppCard>
                )}
              </>
            )}
            {!!consultation?.treatments?.length && (
              <AppCard style={styles.card}>
                <AppText weight="bold">Lịch sử xử lý</AppText>
                {consultation.treatments.map((item) => (
                  <View key={item.treatment_log_id} style={styles.block}>
                    <AppText variant="caption">
                      {new Date(item.performed_at).toLocaleString('vi-VN')} ·{' '}
                      {item.performed_by_name}
                    </AppText>
                    <AppText>{item.action_description}</AppText>
                    <AppText>{item.result_description}</AppText>
                    {item.reviews?.map((review) => (
                      <View key={review.review_id} style={styles.block}>
                        <AppText weight="semibold">
                          {review.review_result === 'APPROVED' ? 'Chuyên gia đã duyệt — tiếp tục theo dõi' : review.review_result === 'NEEDS_MORE_ACTION' ? 'Cần xử lý thêm' : 'Nhận xét của chuyên gia'}
                        </AppText>
                        {!!review.review_comment && <AppText>{review.review_comment}</AppText>}
                      </View>
                    ))}
                  </View>
                ))}
              </AppCard>
            )}
          </>
        )}
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  detail: { padding: 20, paddingBottom: 48, gap: 16 },
  card: { padding: 16, gap: 10 },
  filters: { flexShrink: 0, paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  block: { gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border.light, paddingTop: 10 },
  photo: { width: 180, height: 150, borderRadius: 8 },
});
