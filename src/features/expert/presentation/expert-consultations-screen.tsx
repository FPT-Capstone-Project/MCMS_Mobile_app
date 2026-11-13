import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../core/theme';
import { useAuth } from '../../auth';
import { expertConsultationRepository } from '../data/repositories/expert-consultation-repository';
import {
  ExpertConsultation,
  ExpertConsultationStatus,
  ExpertIssue,
} from '../domain/entities/expert-consultation';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../shared/components';

type ConsultationFilter = 'ALL' | ExpertConsultationStatus;

const consultationFilters: { value: ConsultationFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'ANSWERED', label: 'Đã trả lời' },
  { value: 'CLOSED', label: 'Đã đóng' },
];

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatStatus(status: string, expertId?: number | string | null): string {
  const labels: Record<string, string> = {
    IN_PROGRESS: 'Đang xử lý',
    ANSWERED: 'Đã trả lời',
    CLOSED: 'Đã đóng',
    OPEN: 'Mới báo cáo',
    WAITING_EXPERT: 'Chờ chuyên gia',
    MONITORING: 'Chờ chuyên gia duyệt',
    RESOLVED: 'Đã giải quyết',
  };
  if (status === 'PENDING') {
    return expertId == null ? 'Chờ chuyên gia nhận' : 'Chờ trang trại phản hồi';
  }
  return labels[status] ?? status.replace(/_/g, ' ');
}

function getStatusColors(status: string) {
  if (status === 'ANSWERED' || status === 'RESOLVED') {
    return {
      backgroundColor: theme.colors.success.light,
      color: theme.colors.success.dark,
    };
  }
  if (status === 'IN_PROGRESS' || status === 'MONITORING') {
    return {
      backgroundColor: theme.colors.warning.light,
      color: theme.colors.warning.dark,
    };
  }
  if (status === 'CLOSED') {
    return {
      backgroundColor: theme.colors.neutral[100],
      color: theme.colors.neutral[600],
    };
  }
  return {
    backgroundColor: theme.colors.primary[50],
    color: theme.colors.primary[700],
  };
}

function formatDate(value?: string | null): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có' : date.toLocaleString('vi-VN');
}

function isAssignedTo(consultation: ExpertConsultation, userId?: number): boolean {
  return consultation.expert_id != null && String(consultation.expert_id) === String(userId);
}

function shouldShowResolution(issue?: ExpertIssue | null, userId?: number): boolean {
  return Boolean(
    issue?.status === 'MONITORING' &&
      issue.assigned_expert_id != null &&
      String(issue.assigned_expert_id) === String(userId)
  );
}

export function ExpertConsultationsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const userId = user?.user_id ?? Number(user?.id);
  const [consultations, setConsultations] = useState<ExpertConsultation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageRef = useRef(1);
  const [filter, setFilter] = useState<ConsultationFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedConsultation, setSelectedConsultation] =
    useState<ExpertConsultation | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ExpertIssue | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [solution, setSolution] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadConsultations = useCallback(async (refresh = false, append = false) => {
    if (append) setLoadingMore(true);
    else if (refresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const requestedPage = append ? pageRef.current + 1 : 1;
      const result = await expertConsultationRepository.listConsultations(requestedPage);
      setConsultations((current) =>
        append ? [...current, ...result.consultations] : result.consultations
      );
      pageRef.current = result.page;
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Không thể tải yêu cầu tư vấn.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConsultations();
    }, [loadConsultations])
  );

  const visibleConsultations = useMemo(
    () =>
      consultations
        .filter(
          (consultation) =>
            consultation.expert_id == null || isAssignedTo(consultation, userId)
        )
        .filter((consultation) => filter === 'ALL' || consultation.status === filter),
    [consultations, filter, userId]
  );

  const loadDetails = useCallback(async (consultation: ExpertConsultation) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedConsultation(consultation);
    setSelectedIssue(null);
    setDiagnosis('');
    setSolution('');
    try {
      const [detail, issue] = await Promise.all([
        expertConsultationRepository.getConsultation(consultation.consultation_id),
        expertConsultationRepository.getIssue(consultation.issue_id),
      ]);
      setSelectedConsultation(detail);
      setSelectedIssue(issue);
      setDiagnosis(detail.diagnosis ?? '');
      setSolution(detail.solution ?? '');
    } catch (error: unknown) {
      setDetailError(getErrorMessage(error, 'Không thể tải chi tiết yêu cầu tư vấn.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshSelectedDetails = useCallback(async () => {
    if (!selectedConsultation) return;
    await loadDetails(selectedConsultation);
  }, [loadDetails, selectedConsultation]);

  const handleAssign = async () => {
    if (!selectedConsultation) return;
    setActionLoading(true);
    setDetailError(null);
    try {
      await expertConsultationRepository.assignToSelf(
        selectedConsultation.consultation_id
      );
      await Promise.all([
        refreshSelectedDetails(),
        loadConsultations(true),
      ]);
    } catch (error: unknown) {
      setDetailError(getErrorMessage(error, 'Không thể nhận yêu cầu tư vấn.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespond = async (needsMoreInfo: boolean) => {
    if (!selectedConsultation) return;
    if (!diagnosis.trim()) {
      setDetailError('Vui lòng nhập nội dung chẩn đoán trước khi gửi.');
      return;
    }
    if (!needsMoreInfo && !solution.trim()) {
      setDetailError('Vui lòng nhập hướng xử lý hoặc chọn yêu cầu bổ sung thông tin.');
      return;
    }

    setActionLoading(true);
    setDetailError(null);
    try {
      await expertConsultationRepository.respond(
        selectedConsultation.consultation_id,
        {
          diagnosis: diagnosis.trim(),
          solution: solution.trim() || undefined,
          needsMoreInfo,
        }
      );
      await Promise.all([
        refreshSelectedDetails(),
        loadConsultations(true),
      ]);
    } catch (error: unknown) {
      setDetailError(getErrorMessage(error, 'Không thể gửi phản hồi chẩn đoán.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseConsultation = async () => {
    if (!selectedConsultation) return;
    setActionLoading(true);
    setDetailError(null);
    try {
      await expertConsultationRepository.close(
        selectedConsultation.consultation_id
      );
      await Promise.all([
        refreshSelectedDetails(),
        loadConsultations(true),
      ]);
    } catch (error: unknown) {
      setDetailError(getErrorMessage(error, 'Không thể đóng yêu cầu tư vấn.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveIssue = () => {
    if (!selectedIssue) return;
    Alert.alert(
      'Xác nhận giải quyết',
      'Bạn xác nhận sự cố đã được xử lý và có thể đóng?',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Giải quyết sự cố',
          onPress: async () => {
            setActionLoading(true);
            setDetailError(null);
            try {
              await expertConsultationRepository.resolveIssue(selectedIssue.issue_id);
              await Promise.all([
                refreshSelectedDetails(),
                loadConsultations(true),
              ]);
            } catch (error: unknown) {
              setDetailError(getErrorMessage(error, 'Không thể giải quyết sự cố.'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error: unknown) {
      Alert.alert('Không thể đăng xuất', getErrorMessage(error, 'Vui lòng thử lại.'));
    }
  };

  const assignedToCurrentUser = selectedConsultation
    ? isAssignedTo(selectedConsultation, userId)
    : false;
  const canRespond =
    selectedConsultation?.status === 'IN_PROGRESS' && assignedToCurrentUser;
  const canClose =
    selectedConsultation?.status === 'ANSWERED' && assignedToCurrentUser;

  return (
    <>
      <ScreenContainer
        scrollable
        edges={['left', 'right']}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadConsultations(true)}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        <AppHeader
          title="Chuyên gia nấm"
          subtitle="Tư vấn và chẩn đoán sự cố"
          rightAction={
            <AppButton
              title="Đăng xuất"
              size="sm"
              variant="ghost"
              onPress={() => void handleLogout()}
            />
          }
        />
        <View style={styles.content}>
          <AppCard elevation="xs" style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="flask-outline"
                size={24}
                color={theme.colors.primary[700]}
              />
            </View>
            <View style={styles.introCopy}>
              <AppText variant="label" weight="bold">
                Hộp thư tư vấn chuyên gia
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Nhận yêu cầu, đánh giá thông tin và gửi hướng xử lý cho trang trại.
              </AppText>
            </View>
          </AppCard>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {consultationFilters.map((option) => {
              const selected = filter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(option.value)}
                  style={[
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                  ]}
                >
                  <AppText
                    variant="captionMedium"
                    weight="bold"
                    color={
                      selected
                        ? theme.colors.primary[700]
                        : theme.colors.text.secondary
                    }
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải yêu cầu tư vấn...
            </AppText>
          ) : errorMessage && consultations.length === 0 ? (
            <View style={styles.errorState}>
              <AppText variant="bodySmall" color={theme.colors.error.main}>
                {errorMessage}
              </AppText>
              <AppButton
                title="Thử lại"
                size="sm"
                variant="outline"
                onPress={() => void loadConsultations()}
              />
            </View>
          ) : visibleConsultations.length === 0 ? (
            <>
              <AppEmptyState
                icon={
                  <Ionicons
                    name="chatbubbles-outline"
                    size={44}
                    color={theme.colors.text.muted}
                  />
                }
                title="Chưa có yêu cầu tư vấn"
                description={
                  page < totalPages
                    ? 'Có thể còn yêu cầu khác ở trang tiếp theo.'
                    : 'Yêu cầu mới từ trang trại sẽ hiển thị tại đây.'
                }
              />
              {page < totalPages ? (
                <AppButton
                  title="Tải thêm yêu cầu"
                  variant="outline"
                  loading={loadingMore}
                  onPress={() => void loadConsultations(false, true)}
                />
              ) : null}
            </>
          ) : (
            <>
              {errorMessage ? (
                <AppText variant="caption" color={theme.colors.error.main}>
                  {errorMessage}
                </AppText>
              ) : null}
              {visibleConsultations.map((consultation) => {
              const statusColors = getStatusColors(consultation.status);
              return (
                <Pressable
                  key={consultation.consultation_id}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở yêu cầu ${consultation.issue_title}`}
                  onPress={() => void loadDetails(consultation)}
                >
                  <AppCard elevation="xs" style={styles.consultationCard}>
                    <View style={styles.cardHeading}>
                      <View style={styles.cardTitle}>
                        <AppText variant="label" weight="bold" numberOfLines={2}>
                          {consultation.issue_title}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          Yêu cầu #{consultation.consultation_id}
                          {consultation.session_id
                            ? ` · Phiên #${consultation.session_id}`
                            : ''}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.backgroundColor },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={statusColors.color}
                        >
                          {formatStatus(consultation.status, consultation.expert_id)}
                        </AppText>
                      </View>
                    </View>
                    <AppText
                      variant="bodySmall"
                      color={theme.colors.text.secondary}
                      numberOfLines={2}
                    >
                      {consultation.question}
                    </AppText>
                    <View style={styles.cardFooter}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {consultation.reported_by_name || 'Nhân viên nông trại'}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {formatDate(consultation.created_at)}
                      </AppText>
                    </View>
                  </AppCard>
                </Pressable>
              );
              })}
              {page < totalPages ? (
                <AppButton
                  title="Tải thêm yêu cầu"
                  variant="outline"
                  loading={loadingMore}
                  onPress={() => void loadConsultations(false, true)}
                />
              ) : null}
            </>
          )}
        </View>
      </ScreenContainer>

      <Modal
        visible={Boolean(selectedConsultation)}
        animationType="slide"
        onRequestClose={() => {
          setSelectedConsultation(null);
          setSelectedIssue(null);
          setDetailError(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AppHeader
            title="Chi tiết tư vấn"
            subtitle={
              selectedConsultation
                ? `Yêu cầu #${selectedConsultation.consultation_id}`
                : undefined
            }
            showBack
            onBack={() => {
              setSelectedConsultation(null);
              setSelectedIssue(null);
              setDetailError(null);
            }}
          />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {detailLoading ? (
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Đang tải chi tiết...
              </AppText>
            ) : selectedConsultation && selectedIssue ? (
              <>
                <AppCard elevation="xs" style={styles.detailCard}>
                  <View style={styles.cardHeading}>
                    <AppText variant="h3" style={styles.detailTitle}>
                      {selectedIssue.title}
                    </AppText>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColors(selectedIssue.status)
                            .backgroundColor,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={getStatusColors(selectedIssue.status).color}
                      >
                        {formatStatus(selectedIssue.status)}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    {selectedIssue.mushroom_name || 'Loại nấm chưa xác định'}
                    {selectedIssue.session_id
                      ? ` · Phiên #${selectedIssue.session_id}`
                      : ''}
                    {selectedIssue.tray_id ? ` · Khay #${selectedIssue.tray_id}` : ''}
                  </AppText>
                  <AppText variant="bodySmall" selectable>
                    {selectedIssue.description || 'Không có mô tả chi tiết.'}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Loại sự cố: {selectedIssue.issue_type}
                    {selectedIssue.severity
                      ? ` · Mức độ: ${selectedIssue.severity}`
                      : ''}
                  </AppText>
                  {(selectedIssue.reported_stage ||
                    selectedIssue.growth_stage ||
                    selectedIssue.spawn_stage) && (
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Giai đoạn: {selectedIssue.reported_stage ||
                        selectedIssue.growth_stage ||
                        selectedIssue.spawn_stage}
                    </AppText>
                  )}
                  {selectedIssue.media?.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.evidenceList}
                    >
                      {selectedIssue.media.map((media) => (
                        <View key={media.media_id} style={styles.evidenceItem}>
                          <Image
                            source={{ uri: media.media_url }}
                            contentFit="cover"
                            accessibilityLabel={media.caption || 'Ảnh bằng chứng sự cố'}
                            style={styles.evidenceImage}
                          />
                          {media.caption ? (
                            <AppText variant="caption" numberOfLines={1}>
                              {media.caption}
                            </AppText>
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </AppCard>

                <AppCard elevation="xs" style={styles.detailCard}>
                  <AppText variant="label" weight="bold">
                    Trao đổi với trang trại
                  </AppText>
                  {(selectedConsultation.messages ?? []).map((message) => (
                    <View key={message.message_id} style={styles.messageCard}>
                      <View style={styles.cardFooter}>
                        <AppText variant="captionMedium" weight="bold">
                          {message.sender_name}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          {formatDate(message.created_at)}
                        </AppText>
                      </View>
                      <AppText variant="bodySmall" selectable>
                        {message.message}
                      </AppText>
                    </View>
                  ))}
                </AppCard>

                {selectedConsultation.diagnosis ? (
                  <AppCard elevation="xs" style={styles.detailCard}>
                    <AppText variant="label" weight="bold">
                      Chẩn đoán đã gửi
                    </AppText>
                    <AppText variant="bodySmall" selectable>
                      {selectedConsultation.diagnosis}
                    </AppText>
                    {selectedConsultation.solution ? (
                      <>
                        <AppText variant="label" weight="bold">
                          Hướng xử lý
                        </AppText>
                        <AppText variant="bodySmall" selectable>
                          {selectedConsultation.solution}
                        </AppText>
                      </>
                    ) : null}
                  </AppCard>
                ) : null}

                {selectedConsultation.treatments?.length ? (
                  <AppCard elevation="xs" style={styles.detailCard}>
                    <AppText variant="label" weight="bold">
                      Nhật ký xử lý
                    </AppText>
                    {selectedConsultation.treatments.map((treatment) => (
                      <View
                        key={treatment.treatment_log_id}
                        style={styles.messageCard}
                      >
                        <AppText variant="bodySmall" weight="bold" selectable>
                          {treatment.action_description}
                        </AppText>
                        {treatment.result_description ? (
                          <AppText variant="caption" selectable>
                            Kết quả: {treatment.result_description}
                          </AppText>
                        ) : null}
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          {treatment.performed_by_name} ·{' '}
                          {formatDate(treatment.performed_at)}
                        </AppText>
                      </View>
                    ))}
                  </AppCard>
                ) : null}

                {selectedConsultation.status === 'PENDING' &&
                selectedConsultation.expert_id == null ? (
                  <AppButton
                    title="Nhận tư vấn này"
                    fullWidth
                    loading={actionLoading}
                    onPress={() => void handleAssign()}
                  />
                ) : null}

                {canRespond ? (
                  <AppCard elevation="xs" style={styles.detailCard}>
                    <AppText variant="label" weight="bold">
                      Gửi phản hồi chuyên môn
                    </AppText>
                    <AppInput
                      label="Chẩn đoán"
                      placeholder="Mô tả nguyên nhân hoặc nhận định chuyên môn"
                      value={diagnosis}
                      onChangeText={setDiagnosis}
                      multiline
                      inputStyle={styles.multilineInput}
                    />
                    <AppInput
                      label="Hướng xử lý"
                      placeholder="Đề xuất biện pháp xử lý cho trang trại"
                      value={solution}
                      onChangeText={setSolution}
                      multiline
                      inputStyle={styles.multilineInput}
                      helperText="Có thể bỏ trống nếu cần trang trại bổ sung thông tin."
                    />
                    <AppButton
                      title="Gửi chẩn đoán và hướng xử lý"
                      fullWidth
                      loading={actionLoading}
                      onPress={() => void handleRespond(false)}
                    />
                    <AppButton
                      title="Yêu cầu trang trại bổ sung thông tin"
                      variant="outline"
                      fullWidth
                      disabled={actionLoading}
                      onPress={() => void handleRespond(true)}
                    />
                  </AppCard>
                ) : null}

                {canClose ? (
                  <AppButton
                    title="Đóng yêu cầu tư vấn"
                    variant="outline"
                    fullWidth
                    loading={actionLoading}
                    onPress={() => void handleCloseConsultation()}
                  />
                ) : null}

                {shouldShowResolution(selectedIssue, userId) ? (
                  <AppButton
                    title="Xác nhận đã giải quyết sự cố"
                    fullWidth
                    loading={actionLoading}
                    onPress={handleResolveIssue}
                  />
                ) : null}

                {detailError ? (
                  <AppText variant="caption" color={theme.colors.error.main} selectable>
                    {detailError}
                  </AppText>
                ) : null}
              </>
            ) : detailError ? (
              <AppEmptyState
                icon={
                  <Ionicons
                    name="alert-circle-outline"
                    size={40}
                    color={theme.colors.error.main}
                  />
                }
                title="Không thể tải yêu cầu"
                description={detailError}
                actionTitle="Thử lại"
                onAction={() => {
                  if (selectedConsultation) void loadDetails(selectedConsultation);
                }}
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  filters: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  errorState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  consultationCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.borderRadius.full,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  modalContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  detailCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  detailTitle: {
    flex: 1,
    color: theme.colors.text.primary,
  },
  evidenceList: {
    gap: theme.spacing.sm,
  },
  evidenceItem: {
    width: 144,
    gap: theme.spacing.xxs,
  },
  evidenceImage: {
    width: 144,
    height: 144,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  messageCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
