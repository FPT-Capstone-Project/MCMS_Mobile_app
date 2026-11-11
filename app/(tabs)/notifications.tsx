import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { formatVietnamDateTime } from '../../src/core/utils';
import { useAuth } from '../../src/features/auth';
import {
  CustomerNotification,
  DeviceIncident,
  notificationRepository,
} from '../../src/features/notification';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

type NotificationFilter = 'all' | 'unread' | 'read';

/**
 * Returns icon based on notification type and reference type
 */
const notificationIcon = (
  type: string,
  refType?: string | null
): keyof typeof Ionicons.glyphMap => {
  if (
    refType === 'DEVICE_INCIDENT' ||
    type === 'DEVICE_INCIDENT' ||
    type === 'DEVICE_ISSUE'
  ) {
    return 'hardware-chip-outline';
  }
  switch (type) {
    case 'MUSHROOM_DISEASE':
      return 'leaf-outline';
    default:
      return 'chatbubble-ellipses-outline';
  }
};

/**
 * Translate IoT device type
 */
function formatDeviceType(type?: string): string {
  switch (type) {
    case 'MASTER':
      return 'Thiết bị trung tâm (Master)';
    case 'NODE':
      return 'Node cảm biến tầng';
    case 'SENSOR':
      return 'Đầu đo cảm biến';
    default:
      return type || 'Thiết bị IoT';
  }
}

/**
 * Format incident location from available fields
 */
function formatIncidentLocation(incident?: DeviceIncident | null): string {
  if (!incident) return 'Không có thông tin vị trí';
  const parts: string[] = [];
  if (incident.floor_id != null) {
    parts.push(`Tầng #${incident.floor_id}`);
  }
  if (incident.master_id != null) {
    parts.push(`Master #${incident.master_id}`);
  }
  if (incident.node_address != null) {
    parts.push(`Node #${incident.node_address}`);
  }
  if (incident.sensor_address != null) {
    parts.push(`Cảm biến #${incident.sensor_address}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'Không xác định';
}

export default function NotificationsScreen() {
  const { isFarmOperator, isAdmin } = useAuth();

  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedNotification, setSelectedNotification] =
    useState<CustomerNotification | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Confirm Repair Modal State
  const [isRepairModalVisible, setIsRepairModalVisible] = useState(false);
  const [repairNote, setRepairNote] = useState('');
  const [confirmingRepair, setConfirmingRepair] = useState(false);
  const [repairFormError, setRepairFormError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (nextPage = 1, append = false) => {
      try {
        setErrorMessage(null);
        const result = await notificationRepository.getNotifications({
          page: nextPage,
          pageSize: 20,
          isRead: filter === 'all' ? undefined : filter === 'read',
        });
        setNotifications((current) =>
          append ? [...current, ...result.notifications] : result.notifications
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        setUnreadCount(result.unreadCount);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Không thể tải thông báo. Vui lòng thử lại.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkRead = async (notification: CustomerNotification) => {
    if (notification.is_read) return;
    try {
      const updated = await notificationRepository.markAsRead(
        notification.notification_id
      );
      setNotifications((current) =>
        filter === 'unread'
          ? current.filter((item) => item.notification_id !== updated.notification_id)
          : current.map((item) =>
              item.notification_id === updated.notification_id
                ? { ...item, is_read: true, read_at: updated.read_at }
                : item
            )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Ignore background read error
    }
  };

  const handleOpenNotification = (notification: CustomerNotification) => {
    setSelectedNotification(notification);
    setIsDetailModalVisible(true);
    if (!notification.is_read) {
      handleMarkRead(notification);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await notificationRepository.markAllAsRead();
      await loadNotifications();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể đánh dấu tất cả đã đọc.'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    loadNotifications(page + 1, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleOpenRepairModal = () => {
    setRepairNote('');
    setRepairFormError(null);
    setIsRepairModalVisible(true);
  };

  const handleConfirmRepair = async () => {
    if (!selectedNotification) return;
    const notificationId = selectedNotification.notification_id;

    try {
      setConfirmingRepair(true);
      setRepairFormError(null);

      const res = await notificationRepository.confirmRepair(
        notificationId,
        repairNote
      );
      const updatedIncident = res.data;

      // Close repair modal on success
      setIsRepairModalVisible(false);
      setRepairNote('');

      Alert.alert(
        'Thành công',
        res.message || 'Đã xác nhận sửa xong thiết bị.'
      );

      // 1. Update selectedNotification in detail modal so UI immediately syncs
      setSelectedNotification((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          device_incident: {
            ...prev.device_incident,
            ...updatedIncident,
            status: 'RESOLVED',
            can_confirm_repair: false,
          },
        };
      });

      // 2. Update notifications in state for this notification AND other notifications with same incident_id
      setNotifications((current) =>
        current.map((item) => {
          const matchNotification = item.notification_id === notificationId;
          const matchIncident =
            item.device_incident &&
            updatedIncident &&
            item.device_incident.incident_id === updatedIncident.incident_id;

          if (matchNotification || matchIncident) {
            return {
              ...item,
              device_incident: {
                ...item.device_incident,
                ...updatedIncident,
                status: 'RESOLVED',
                can_confirm_repair: false,
              },
            };
          }
          return item;
        })
      );

      // 3. Reload notifications from server
      await loadNotifications();
    } catch (err: unknown) {
      let msg = 'Đã xảy ra lỗi khi xác nhận sửa chữa.';
      let statusCode = 0;
      if (err && typeof err === 'object') {
        const errObj = err as any;
        statusCode =
          errObj.statusCode || errObj.response?.status || errObj.status || 0;
        if (errObj.message) {
          msg = errObj.message;
        }
      }

      if (statusCode === 409) {
        // 409: device hasn't reported recovery data yet. Keep form and repairNote open!
        const alertMsg =
          msg || 'Thiết bị chưa phục hồi. Hãy kiểm tra lại trước khi xác nhận.';
        setRepairFormError(alertMsg);
        Alert.alert('Chưa thể xác nhận', alertMsg);
      } else if (statusCode === 404) {
        // 404: notification doesn't exist or does not belong to user
        Alert.alert(
          'Lỗi',
          'Thông báo không tồn tại hoặc bạn không có quyền truy cập.'
        );
        setIsRepairModalVisible(false);
        setIsDetailModalVisible(false);
        await loadNotifications();
      } else if (statusCode === 403) {
        // 403: forbidden
        const alertMsg =
          'Bạn không có quyền xác nhận (yêu cầu vai trò Farm Operator).';
        setRepairFormError(alertMsg);
        Alert.alert('Không có quyền', alertMsg);
      } else if (statusCode === 400) {
        // 400: validation error
        const alertMsg =
          msg || 'Dữ liệu không hợp lệ. Ghi chú tối đa 1000 ký tự.';
        setRepairFormError(alertMsg);
        Alert.alert('Dữ liệu không hợp lệ', alertMsg);
      } else {
        // Network or server error: keep note, allow retry
        const alertMsg =
          msg || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
        setRepairFormError(alertMsg);
        Alert.alert('Lỗi', alertMsg);
      }
    } finally {
      setConfirmingRepair(false);
    }
  };

  const activeIncident = selectedNotification?.device_incident;
  const isIncidentResolved = activeIncident?.status === 'RESOLVED';
  const canOperatorConfirm =
    isFarmOperator && activeIncident?.can_confirm_repair === true && !isIncidentResolved;

  return (
    <ScreenContainer edges={['left', 'right']}>
      <AppHeader
        title="Thông báo"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} thông báo chưa đọc`
            : 'Cập nhật từ SmartMush'
        }
        rightAction={
          <AppButton
            title="Đọc tất cả"
            variant="ghost"
            size="sm"
            loading={markingAll}
            disabled={unreadCount === 0 || markingAll}
            onPress={handleMarkAllRead}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.filters}>
          {([
            ['all', 'Tất cả'],
            ['unread', 'Chưa đọc'],
            ['read', 'Đã đọc'],
          ] as const).map(([value, title]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[
                styles.filterButton,
                filter === value && styles.filterButtonSelected,
              ]}
            >
              <AppText
                variant="captionMedium"
                weight="bold"
                color={
                  filter === value
                    ? theme.colors.primary[700]
                    : theme.colors.text.secondary
                }
              >
                {title}
              </AppText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải thông báo...
            </AppText>
          </View>
        ) : errorMessage && notifications.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color={theme.colors.error.main}
            />
            <AppText
              variant="bodySmall"
              color={theme.colors.error.main}
              align="center"
            >
              {errorMessage}
            </AppText>
            <AppButton
              title="Thử lại"
              variant="outline"
              size="sm"
              onPress={() => loadNotifications()}
            />
          </View>
        ) : notifications.length === 0 ? (
          <AppEmptyState
            icon={
              <Ionicons
                name="notifications-outline"
                size={48}
                color={theme.colors.text.muted}
              />
            }
            title={
              filter === 'unread'
                ? 'Không có thông báo chưa đọc'
                : 'Chưa có thông báo'
            }
            description="Các cập nhật về đơn hàng, thiết bị IoT và quá trình nuôi trồng sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            {errorMessage ? (
              <AppText variant="caption" color={theme.colors.error.main}>
                {errorMessage}
              </AppText>
            ) : null}
            {notifications.map((notification) => {
              const isIncident =
                notification.reference_type === 'DEVICE_INCIDENT' ||
                Boolean(notification.device_incident);
              const incident = notification.device_incident;

              return (
                <Pressable
                  key={notification.notification_id}
                  accessibilityRole="button"
                  accessibilityLabel={`${notification.title}. ${
                    notification.is_read ? 'Đã đọc' : 'Chưa đọc'
                  }`}
                  onPress={() => handleOpenNotification(notification)}
                >
                  <AppCard
                    elevation="xs"
                    style={[
                      styles.notificationCard,
                      !notification.is_read && styles.unreadCard,
                    ]}
                  >
                    <View style={styles.notificationRow}>
                      <View
                        style={[
                          styles.iconWrapper,
                          {
                            backgroundColor: notification.is_read
                              ? theme.colors.neutral[100]
                              : isIncident
                              ? 'rgba(239, 68, 68, 0.1)'
                              : theme.colors.primary[50],
                          },
                        ]}
                      >
                        <Ionicons
                          name={notificationIcon(
                            notification.notification_type,
                            notification.reference_type
                          )}
                          size={22}
                          color={
                            notification.is_read
                              ? theme.colors.neutral[600]
                              : isIncident
                              ? theme.colors.error.main
                              : theme.colors.primary[600]
                          }
                        />
                      </View>
                      <View style={styles.notificationBody}>
                        <View style={styles.titleRow}>
                          <AppText
                            variant="label"
                            weight="bold"
                            style={styles.title}
                            numberOfLines={2}
                          >
                            {notification.title}
                          </AppText>
                          {!notification.is_read ? (
                            <View style={styles.unreadDot} />
                          ) : null}
                        </View>
                        <AppText
                          variant="bodySmall"
                          color={theme.colors.text.secondary}
                          numberOfLines={3}
                        >
                          {notification.message}
                        </AppText>

                        {/* Incident Tag on card if applicable */}
                        {isIncident && incident && (
                          <View style={styles.incidentTagRow}>
                            <View
                              style={[
                                styles.incidentTag,
                                {
                                  backgroundColor:
                                    incident.status === 'RESOLVED'
                                      ? 'rgba(34, 197, 94, 0.12)'
                                      : 'rgba(234, 179, 8, 0.15)',
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  incident.status === 'RESOLVED'
                                    ? 'checkmark-circle'
                                    : 'alert-circle'
                                }
                                size={12}
                                color={
                                  incident.status === 'RESOLVED'
                                    ? theme.colors.success.dark
                                    : theme.colors.warning.dark
                                }
                              />
                              <AppText
                                variant="caption"
                                weight="bold"
                                color={
                                  incident.status === 'RESOLVED'
                                    ? theme.colors.success.dark
                                    : theme.colors.warning.dark
                                }
                              >
                                {incident.status === 'RESOLVED'
                                  ? 'Đã giải quyết'
                                  : 'Chưa giải quyết'}
                              </AppText>
                            </View>
                            {incident.device_type && (
                              <View style={styles.deviceTypeTag}>
                                <AppText
                                  variant="caption"
                                  color={theme.colors.text.secondary}
                                >
                                  {formatDeviceType(incident.device_type)}
                                </AppText>
                              </View>
                            )}
                          </View>
                        )}

                        <AppText variant="caption" color={theme.colors.text.muted}>
                          {formatVietnamDateTime(notification.created_at)}
                        </AppText>
                      </View>
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
            {page < totalPages ? (
              <AppButton
                title="Tải thêm thông báo"
                variant="outline"
                size="sm"
                loading={loadingMore}
                onPress={handleLoadMore}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {/* ================= MODAL: CHI TIẾT THÔNG BÁO ================= */}
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons
                  name={notificationIcon(
                    selectedNotification?.notification_type || '',
                    selectedNotification?.reference_type
                  )}
                  size={20}
                  color={theme.colors.primary[600]}
                />
                <AppText variant="h3" weight="bold">
                  Chi tiết thông báo
                </AppText>
              </View>
              <Pressable
                onPress={() => setIsDetailModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Notification Core Info */}
              <View style={styles.detailSection}>
                <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                  {selectedNotification?.title}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  {formatVietnamDateTime(selectedNotification?.created_at)}
                </AppText>
                <AppText
                  variant="bodyMedium"
                  color={theme.colors.text.secondary}
                  style={styles.detailMessageText}
                >
                  {selectedNotification?.message}
                </AppText>
              </View>

              {/* ================= SECTION: SỰ CỐ THIẾT BỊ IOT ================= */}
              {activeIncident ? (
                <>
                  <AppDivider spacing="sm" />

                  <View style={styles.incidentBox}>
                    <View style={styles.incidentHeaderRow}>
                      <View style={styles.incidentTitleWithIcon}>
                        <Ionicons
                          name="hardware-chip-outline"
                          size={18}
                          color={theme.colors.error.main}
                        />
                        <AppText variant="label" weight="bold" color={theme.colors.text.primary}>
                          SỰ CỐ THIẾT BỊ IOT
                        </AppText>
                      </View>

                      {/* Status Badge: OPEN (Chưa giải quyết) / RESOLVED (Đã giải quyết) */}
                      <View
                        style={[
                          styles.incidentStatusBadge,
                          {
                            backgroundColor: isIncidentResolved
                              ? 'rgba(34, 197, 94, 0.12)'
                              : 'rgba(234, 179, 8, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isIncidentResolved ? 'checkmark-circle' : 'alert-circle'}
                          size={14}
                          color={
                            isIncidentResolved
                              ? theme.colors.success.dark
                              : theme.colors.warning.dark
                          }
                        />
                        <AppText
                          variant="captionMedium"
                          weight="bold"
                          color={
                            isIncidentResolved
                              ? theme.colors.success.dark
                              : theme.colors.warning.dark
                          }
                        >
                          {isIncidentResolved ? 'Đã giải quyết' : 'Chưa giải quyết'}
                        </AppText>
                      </View>
                    </View>

                    <AppDivider spacing="xs" />

                    {/* Incident Details Grid */}
                    <View style={styles.incidentMetaGrid}>
                      <View style={styles.metaRow}>
                        <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                          Loại thiết bị:
                        </AppText>
                        <AppText variant="captionMedium" weight="bold" color={theme.colors.text.primary} style={styles.metaValue}>
                          {formatDeviceType(activeIncident.device_type)}
                        </AppText>
                      </View>

                      <View style={styles.metaRow}>
                        <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                          Vị trí lắp đặt:
                        </AppText>
                        <AppText variant="captionMedium" weight="medium" color={theme.colors.text.primary} style={styles.metaValue}>
                          {formatIncidentLocation(activeIncident)}
                        </AppText>
                      </View>

                      <View style={styles.metaRow}>
                        <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                          Lý do phát hiện:
                        </AppText>
                        <AppText variant="captionMedium" color={theme.colors.error.main} style={styles.metaValue}>
                          {activeIncident.reason || 'Mất kết nối hoặc sai lệch thông số'}
                        </AppText>
                      </View>

                      <View style={styles.metaRow}>
                        <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                          Thời điểm phát hiện:
                        </AppText>
                        <AppText variant="captionMedium" color={theme.colors.text.secondary} style={styles.metaValue}>
                          {formatVietnamDateTime(activeIncident.detected_at, '—')}
                        </AppText>
                      </View>

                      {/* RESOLVED details */}
                      {isIncidentResolved && (
                        <>
                          <View style={styles.metaRow}>
                            <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                              Thời điểm giải quyết:
                            </AppText>
                            <AppText variant="captionMedium" color={theme.colors.success.dark} weight="bold" style={styles.metaValue}>
                              {formatVietnamDateTime(activeIncident.resolved_at, '—')}
                            </AppText>
                          </View>

                          <View style={styles.metaRow}>
                            <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                              Ghi chú sửa chữa:
                            </AppText>
                            <AppText variant="captionMedium" color={theme.colors.text.primary} style={styles.metaValue}>
                              {activeIncident.repair_note || 'Không có ghi chú'}
                            </AppText>
                          </View>

                          {activeIncident.resolved_by ? (
                            <View style={styles.metaRow}>
                              <AppText variant="caption" color={theme.colors.text.muted} style={styles.metaLabel}>
                                Người xác nhận:
                              </AppText>
                              <AppText variant="captionMedium" color={theme.colors.text.secondary} style={styles.metaValue}>
                                ID #{activeIncident.resolved_by}
                              </AppText>
                            </View>
                          ) : null}
                        </>
                      )}
                    </View>

                    {/* Operational Actions & Guidelines */}
                    {!isIncidentResolved && (
                      <View style={styles.incidentActionBox}>
                        {canOperatorConfirm ? (
                          <>
                            <View style={styles.operatorNoticeBox}>
                              <Ionicons
                                name="information-circle-outline"
                                size={18}
                                color={theme.colors.primary[700]}
                              />
                              <AppText
                                variant="caption"
                                color={theme.colors.primary[700]}
                                style={{ flex: 1 }}
                              >
                                Sự cố này đã có thể xác nhận sửa xong. Vui lòng kiểm tra thực tế phần cứng trước khi xác nhận.
                              </AppText>
                            </View>

                            <AppButton
                              title="Xác nhận đã sửa xong"
                              variant="primary"
                              size="md"
                              leftIcon={
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={18}
                                  color="#FFFFFF"
                                />
                              }
                              onPress={handleOpenRepairModal}
                              style={styles.confirmRepairBtn}
                            />
                          </>
                        ) : isFarmOperator ? (
                          <View style={styles.pendingRecoveryNotice}>
                            <Ionicons
                              name="hourglass-outline"
                              size={18}
                              color={theme.colors.warning.dark}
                            />
                            <AppText
                              variant="caption"
                              color={theme.colors.warning.dark}
                              style={{ flex: 1 }}
                            >
                              Hệ thống đang theo dõi tín hiệu thiết bị. Nút xác nhận sửa xong sẽ kích hoạt khi thiết bị gửi dữ liệu ổn định trở lại.
                            </AppText>
                          </View>
                        ) : (
                          /* Admin & Customer view only notice */
                          <View style={styles.viewerNoticeBox}>
                            <Ionicons
                              name="eye-outline"
                              size={16}
                              color={theme.colors.text.secondary}
                            />
                            <AppText
                              variant="caption"
                              color={theme.colors.text.secondary}
                              style={{ flex: 1 }}
                            >
                              {isAdmin
                                ? 'Quyền Quản trị viên (Admin): Theo dõi tiến độ sự cố. Xác nhận sửa chữa do Kỹ thuật viên (Farm Operator) thực hiện.'
                                : 'Thông báo theo dõi sự cố thiết bị tại trang trại.'}
                            </AppText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FORM XÁC NHẬN SỬA CHỮA (FARM OPERATOR) ================= */}
      <Modal
        visible={isRepairModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!confirmingRepair) setIsRepairModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.repairModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={theme.colors.primary[600]}
                />
                <AppText variant="h3" weight="bold">
                  Xác nhận sửa xong
                </AppText>
              </View>
              <Pressable
                disabled={confirmingRepair}
                onPress={() => setIsRepairModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            {/* Device Info Summary */}
            {activeIncident && (
              <View style={styles.repairDeviceSummary}>
                <AppText variant="captionMedium" weight="bold" color={theme.colors.text.primary}>
                  {formatDeviceType(activeIncident.device_type)}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Vị trí: {formatIncidentLocation(activeIncident)}
                </AppText>
              </View>
            )}

            {/* Error Message if 409 or network failure */}
            {repairFormError && (
              <View style={styles.repairErrorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={theme.colors.error.main}
                />
                <AppText
                  variant="caption"
                  color={theme.colors.error.main}
                  style={{ flex: 1 }}
                >
                  {repairFormError}
                </AppText>
              </View>
            )}

            {/* Input Note */}
            <View style={styles.repairInputContainer}>
              <AppText variant="label" weight="medium" color={theme.colors.text.primary}>
                Ghi chú sửa chữa (không bắt buộc):
              </AppText>
              <TextInput
                style={styles.repairTextInput}
                multiline
                numberOfLines={4}
                maxLength={1000}
                placeholder="VD: Đã kiểm tra dây nguồn và đầu đo cảm biến, thiết bị đã hoạt động ổn định trở lại."
                placeholderTextColor={theme.colors.text.muted}
                value={repairNote}
                onChangeText={setRepairNote}
                editable={!confirmingRepair}
                textAlignVertical="top"
              />
              <AppText variant="caption" color={theme.colors.text.muted} style={styles.charCount}>
                {repairNote.length}/1000 ký tự
              </AppText>
            </View>

            {/* Actions */}
            <View style={styles.repairActionRow}>
              <AppButton
                title="Hủy"
                variant="outline"
                size="md"
                disabled={confirmingRepair}
                onPress={() => setIsRepairModalVisible(false)}
                style={styles.repairActionBtn}
              />
              <AppButton
                title="Xác nhận sửa xong"
                variant="primary"
                size="md"
                loading={confirmingRepair}
                disabled={confirmingRepair}
                onPress={handleConfirmRepair}
                style={styles.repairActionBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  filterButtonSelected: {
    backgroundColor: theme.colors.primary[50],
  },
  center: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  notificationCard: {
    padding: theme.spacing.md,
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  notificationRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[600],
  },
  incidentTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  incidentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  deviceTypeTag: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
    gap: theme.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.xs,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBodyScroll: {
    flexGrow: 0,
  },
  detailSection: {
    gap: 6,
    paddingVertical: theme.spacing.xs,
  },
  detailMessageText: {
    lineHeight: 22,
    marginTop: 4,
  },
  incidentBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  incidentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incidentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  incidentMetaGrid: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    width: 120,
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
  },
  incidentActionBox: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  operatorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  confirmRepairBtn: {
    width: '100%',
  },
  pendingRecoveryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  viewerNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  repairModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  repairDeviceSummary: {
    backgroundColor: '#F1F5F9',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 2,
  },
  repairErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  repairInputContainer: {
    gap: 6,
  },
  repairTextInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    alignSelf: 'flex-end',
  },
  repairActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  repairActionBtn: {
    flex: 1,
  },
});
