import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import { CustomerNotification, notificationRepository } from '../../src/features/notification';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

type NotificationFilter = 'all' | 'unread' | 'read';

const notificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'MUSHROOM_DISEASE':
      return 'leaf-outline';
    case 'DEVICE_ISSUE':
      return 'hardware-chip-outline';
    default:
      return 'chatbubble-ellipses-outline';
  }
};

export default function NotificationsScreen() {
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

  const loadNotifications = useCallback(async (nextPage = 1, append = false) => {
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
        error instanceof Error ? error.message : 'Không thể tải thông báo. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkRead = async (notification: CustomerNotification) => {
    if (notification.is_read) return;
    try {
      const updated = await notificationRepository.markAsRead(notification.notification_id);
      setNotifications((current) =>
        filter === 'unread'
          ? current.filter((item) => item.notification_id !== updated.notification_id)
          : current.map((item) =>
              item.notification_id === updated.notification_id ? updated : item
            )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể cập nhật thông báo.'
      );
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
        error instanceof Error ? error.message : 'Không thể đánh dấu tất cả đã đọc.'
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

  return (
    <ScreenContainer edges={['left', 'right']}>
      <AppHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Cập nhật từ SmartMush'}
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
              style={[styles.filterButton, filter === value && styles.filterButtonSelected]}
            >
              <AppText
                variant="captionMedium"
                weight="bold"
                color={filter === value ? theme.colors.primary[700] : theme.colors.text.secondary}
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
            <Ionicons name="alert-circle-outline" size={40} color={theme.colors.error.main} />
            <AppText variant="bodySmall" color={theme.colors.error.main} align="center">
              {errorMessage}
            </AppText>
            <AppButton title="Thử lại" variant="outline" size="sm" onPress={() => loadNotifications()} />
          </View>
        ) : notifications.length === 0 ? (
          <AppEmptyState
            icon={<Ionicons name="notifications-outline" size={48} color={theme.colors.text.muted} />}
            title={filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
            description="Các cập nhật về đơn hàng và quá trình nuôi trồng sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            {errorMessage ? (
              <AppText variant="caption" color={theme.colors.error.main}>{errorMessage}</AppText>
            ) : null}
            {notifications.map((notification) => (
              <Pressable
                key={notification.notification_id}
                accessibilityRole="button"
                accessibilityLabel={`${notification.title}. ${notification.is_read ? 'Đã đọc' : 'Chưa đọc'}`}
                onPress={() => handleMarkRead(notification)}
              >
                <AppCard
                  elevation="xs"
                  style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
                >
                  <View style={styles.notificationRow}>
                    <View style={[
                      styles.iconWrapper,
                      { backgroundColor: notification.is_read ? theme.colors.neutral[100] : theme.colors.primary[50] },
                    ]}>
                      <Ionicons
                        name={notificationIcon(notification.notification_type)}
                        size={22}
                        color={notification.is_read ? theme.colors.neutral[600] : theme.colors.primary[600]}
                      />
                    </View>
                    <View style={styles.notificationBody}>
                      <View style={styles.titleRow}>
                        <AppText variant="label" weight="bold" style={styles.title}>
                          {notification.title}
                        </AppText>
                        {!notification.is_read ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                        {notification.message}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        {new Date(notification.created_at).toLocaleString('vi-VN')}
                      </AppText>
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            ))}
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
});
