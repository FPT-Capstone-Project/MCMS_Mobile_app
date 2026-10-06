import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { useAuth } from '../../../auth';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppEmptyState,
  AppHeader,
  AppLoading,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { DeliveryOrder, DeliveryStatus } from '../../domain/entities/DeliveryOrder';
import { deliveryRepository } from '../../data/repositories/DeliveryRepository';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { ProofOfDeliveryViewerModal } from '../components/ProofOfDeliveryViewerModal';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

/**
 * Shipper Deliveries Screen ("Đơn giao hàng")
 * Provides dedicated delivery management, status transition controls, Proof of Delivery photo upload, and isolated Shipper session controls.
 */
export const ShipperDeliveriesScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Proof of Delivery Modal state
  const [selectedOrderForPod, setSelectedOrderForPod] = useState<DeliveryOrder | null>(null);
  const [podModalVisible, setPodModalVisible] = useState(false);

  // Proof of Delivery Viewer Modal state
  const [viewingOrderPhoto, setViewingOrderPhoto] = useState<DeliveryOrder | null>(null);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function fetchInitialOrders() {
      try {
        const data = await deliveryRepository.getDeliveryOrders();
        if (isMounted) {
          setOrders(data);
        }
      } catch {
        if (isMounted) {
          Alert.alert('Lỗi', 'Không thể tải danh sách đơn giao hàng.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInitialOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await deliveryRepository.getDeliveryOrders();
      setOrders(data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn giao hàng.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout with confirmation
  const handleLogoutPress = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Giao hàng (Shipper)?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              // Local state cleanup completes in repository
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Status transition action handler for standard transitions
  const handleStatusUpdate = async (order: DeliveryOrder, nextStatus: DeliveryStatus) => {
    const actionLabel =
      nextStatus === 'IN_TRANSIT'
        ? 'bắt đầu giao đơn hàng'
        : 'cập nhật trạng thái đơn hàng';

    Alert.alert(
      'Xác nhận trạng thái',
      `Bạn có chắc chắn muốn ${actionLabel} ${order.orderCode}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              setUpdatingOrderId(order.id);
              const updated = await deliveryRepository.updateDeliveryStatus(order.id, nextStatus);
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              Alert.alert('Thành công', `Đơn hàng ${order.orderCode} đã cập nhật trạng thái thành: ${updated.statusText}`);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
              Alert.alert('Lỗi', msg);
            } finally {
              setUpdatingOrderId(null);
            }
          },
        },
      ]
    );
  };

  // Open Proof of Delivery Modal for IN_TRANSIT orders
  const handleOpenPodModal = (order: DeliveryOrder) => {
    setSelectedOrderForPod(order);
    setPodModalVisible(true);
  };

  // Submit Proof of Delivery
  const handlePodSubmit = async (orderId: string, imageUri: string, notes?: string) => {
    const updated = await deliveryRepository.updateDeliveryStatus(
      orderId,
      'DELIVERED',
      notes,
      imageUri
    );
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    Alert.alert(
      'Giao hàng thành công!',
      `Đơn hàng ${updated.orderCode} đã được xác nhận hoàn tất kèm ảnh chụp xác nhận.`
    );
  };

  // Open Photo Viewer
  const handleViewPhoto = (order: DeliveryOrder) => {
    setViewingOrderPhoto(order);
    setViewerModalVisible(true);
  };

  // Direct phone call handler
  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Số điện thoại', `Số điện thoại khách hàng: ${phone}`);
    });
  };

  // Filter orders according to active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ACTIVE') {
      return order.status === 'READY_FOR_PICKUP' || order.status === 'IN_TRANSIT';
    }
    if (activeTab === 'COMPLETED') {
      return order.status === 'DELIVERED';
    }
    return true;
  });

  const getStatusBadgeStyle = (status: DeliveryStatus) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
        return {
          bg: theme.colors.warning.light,
          text: theme.colors.warning.dark,
          border: theme.colors.warning.main,
          icon: 'time-outline' as const,
        };
      case 'IN_TRANSIT':
        return {
          bg: theme.colors.primary[50],
          text: theme.colors.primary[700],
          border: theme.colors.primary[300],
          icon: 'bicycle-outline' as const,
        };
      case 'DELIVERED':
        return {
          bg: theme.colors.success.light,
          text: theme.colors.success.dark,
          border: theme.colors.success.main,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'CANCELLED':
      default:
        return {
          bg: theme.colors.neutral[100],
          text: theme.colors.neutral[600],
          border: theme.colors.neutral[300],
          icon: 'close-circle-outline' as const,
        };
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Đơn giao hàng" subtitle="Hệ thống vận chuyển SmartMush" />
        <AppLoading fullscreen message="Đang tải danh sách đơn giao hàng..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header with Shipper Title and Logout Action */}
      <AppHeader
        title="Đơn giao hàng"
        subtitle="Quản lý giao khay & phôi nấm"
        rightAction={
          <AppButton
            title="Đăng xuất"
            variant="outline"
            size="sm"
            loading={isLoggingOut}
            onPress={handleLogoutPress}
            leftIcon={
              <Ionicons name="log-out-outline" size={16} color={theme.colors.error.main} />
            }
          />
        }
      />

      {/* Shipper Session Banner */}
      <View style={styles.shipperBanner}>
        <View style={styles.shipperBadge}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.primary[600]} />
          <AppText variant="captionMedium" color={theme.colors.primary[700]} weight="bold">
            Tài khoản Nhân viên Giao hàng: {user?.fullName || 'Lê Khôi (Shipper)'}
          </AppText>
        </View>
        <AppText variant="overline" color={theme.colors.text.muted}>
          {user?.email || 'lekhoi@gmail.com'}
        </AppText>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === 'ALL' && styles.tabItemActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <AppText
            variant="bodySmallMedium"
            weight={activeTab === 'ALL' ? 'bold' : 'normal'}
            color={activeTab === 'ALL' ? theme.colors.primary[600] : theme.colors.text.secondary}
          >
            Tất cả ({orders.length})
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'ACTIVE' && styles.tabItemActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <AppText
            variant="bodySmallMedium"
            weight={activeTab === 'ACTIVE' ? 'bold' : 'normal'}
            color={activeTab === 'ACTIVE' ? theme.colors.primary[600] : theme.colors.text.secondary}
          >
            Cần giao ({orders.filter((o) => o.status !== 'DELIVERED').length})
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'COMPLETED' && styles.tabItemActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <AppText
            variant="bodySmallMedium"
            weight={activeTab === 'COMPLETED' ? 'bold' : 'normal'}
            color={
              activeTab === 'COMPLETED' ? theme.colors.primary[600] : theme.colors.text.secondary
            }
          >
            Đã giao ({orders.filter((o) => o.status === 'DELIVERED').length})
          </AppText>
        </Pressable>
      </View>

      {/* Main Order List Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <AppEmptyState
            title="Chưa có đơn giao hàng"
            description={
              activeTab === 'ACTIVE'
                ? 'Hiện tại không có đơn hàng nào đang chờ lấy hoặc đang vận chuyển.'
                : activeTab === 'COMPLETED'
                ? 'Chưa có đơn hàng nào hoàn thành giao trong hôm nay.'
                : 'Hiện tại bạn chưa được phân công đơn giao hàng nào.'
            }
            actionTitle="Làm mới danh sách"
            onAction={handleRefresh}
          />
        ) : (
          filteredOrders.map((order) => {
            const badge = getStatusBadgeStyle(order.status);
            const isUpdating = updatingOrderId === order.id;

            return (
              <AppCard key={order.id} elevation="sm" style={styles.orderCard}>
                {/* Header: Order Code & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.codeRow}>
                    <Ionicons name="receipt-outline" size={18} color={theme.colors.primary[600]} />
                    <AppText variant="title" weight="bold">
                      {order.orderCode}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: badge.bg, borderColor: badge.border },
                    ]}
                  >
                    <Ionicons name={badge.icon} size={14} color={badge.text} />
                    <AppText variant="captionMedium" weight="bold" color={badge.text}>
                      {order.statusText}
                    </AppText>
                  </View>
                </View>

                <AppDivider spacing="xs" />

                {/* Customer Information */}
                <View style={styles.sectionBlock}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={theme.colors.text.muted} />
                    <AppText variant="bodySmallMedium" style={styles.infoLabel}>
                      Khách hàng:
                    </AppText>
                    <AppText variant="bodySmall" weight="bold" style={styles.infoValue}>
                      {order.customerName}
                    </AppText>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color={theme.colors.text.muted} />
                    <AppText variant="bodySmallMedium" style={styles.infoLabel}>
                      Số điện thoại:
                    </AppText>
                    <Pressable
                      onPress={() => handleCallCustomer(order.customerPhone)}
                      style={styles.phoneClickable}
                    >
                      <AppText
                        variant="bodySmall"
                        weight="bold"
                        color={theme.colors.primary[600]}
                        style={styles.infoValue}
                      >
                        {order.customerPhone}
                      </AppText>
                      <Ionicons
                        name="open-outline"
                        size={14}
                        color={theme.colors.primary[600]}
                        style={{ marginLeft: 4 }}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={theme.colors.text.muted} />
                    <AppText variant="bodySmallMedium" style={styles.infoLabel}>
                      Địa chỉ:
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color={theme.colors.text.secondary}
                      style={styles.infoValue}
                    >
                      {order.deliveryAddress}
                    </AppText>
                  </View>
                </View>

                <AppDivider spacing="xs" />

                {/* Tray & Mushroom Specs */}
                <View style={styles.specsBox}>
                  <View style={styles.specItem}>
                    <Ionicons name="cube-outline" size={16} color={theme.colors.primary[500]} />
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Mã khay:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold">
                      Khay {order.trayId}
                    </AppText>
                  </View>

                  <View style={styles.specItem}>
                    <Ionicons name="leaf-outline" size={16} color={theme.colors.secondary[500]} />
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Loại nấm:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold">
                      {order.mushroomType}
                    </AppText>
                  </View>
                </View>

                {/* Notes */}
                {order.notes ? (
                  <View style={styles.notesBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={theme.colors.text.muted}
                    />
                    <AppText variant="caption" color={theme.colors.text.secondary} style={{ flex: 1 }}>
                      Ghi chú: {order.notes}
                    </AppText>
                  </View>
                ) : null}

                {/* Proof of Delivery Image Attachment (if DELIVERED) */}
                {order.status === 'DELIVERED' && order.proofOfDeliveryImage ? (
                  <View style={styles.podAttachmentCard}>
                    <View style={styles.podAttachmentHeader}>
                      <View style={styles.podHeaderLeft}>
                        <Ionicons name="camera" size={14} color={theme.colors.primary[600]} />
                        <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
                          Ảnh xác nhận đã giao hàng (POD)
                        </AppText>
                      </View>
                      <Pressable
                        onPress={() => handleViewPhoto(order)}
                        style={styles.viewPhotoBtn}
                      >
                        <AppText variant="overline" color={theme.colors.primary[600]} weight="bold">
                          Xem toàn màn hình
                        </AppText>
                        <Ionicons name="chevron-forward" size={12} color={theme.colors.primary[600]} />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => handleViewPhoto(order)}
                      style={styles.podThumbnailContainer}
                    >
                      <Image
                        source={{ uri: order.proofOfDeliveryImage }}
                        style={styles.podThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.podThumbnailOverlay}>
                        <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  </View>
                ) : null}

                {/* Actions based on delivery status */}
                <View style={styles.actionsRow}>
                  {order.status === 'READY_FOR_PICKUP' && (
                    <AppButton
                      title="Bắt đầu giao hàng"
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={isUpdating}
                      leftIcon={<Ionicons name="bicycle" size={16} color="#FFFFFF" />}
                      onPress={() => handleStatusUpdate(order, 'IN_TRANSIT')}
                    />
                  )}

                  {order.status === 'IN_TRANSIT' && (
                    <AppButton
                      title="Chụp ảnh & Xác nhận đã giao"
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={isUpdating}
                      leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                      onPress={() => handleOpenPodModal(order)}
                    />
                  )}

                  {order.status === 'DELIVERED' && (
                    <View style={styles.completedBanner}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.colors.success.main}
                      />
                      <AppText
                        variant="captionMedium"
                        weight="bold"
                        color={theme.colors.success.dark}
                      >
                        Đã giao thành công
                      </AppText>
                    </View>
                  )}
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Proof of Delivery Action Modal */}
      <ProofOfDeliveryModal
        visible={podModalVisible}
        order={selectedOrderForPod}
        onClose={() => {
          setPodModalVisible(false);
          setSelectedOrderForPod(null);
        }}
        onSubmit={handlePodSubmit}
      />

      {/* Proof of Delivery Fullscreen Photo Viewer */}
      <ProofOfDeliveryViewerModal
        visible={viewerModalVisible}
        order={viewingOrderPhoto}
        onClose={() => {
          setViewerModalVisible(false);
          setViewingOrderPhoto(null);
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  shipperBanner: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary[100],
  },
  shipperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.paper,
    paddingHorizontal: theme.spacing.screenHorizontal,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tabItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  orderCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  sectionBlock: {
    gap: theme.spacing.xxs,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  infoLabel: {
    color: theme.colors.text.secondary,
    width: 95,
  },
  infoValue: {
    flex: 1,
  },
  phoneClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  specsBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'space-around',
    marginVertical: 2,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  actionsRow: {
    marginTop: theme.spacing.xs,
  },
  podAttachmentCard: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
    marginVertical: 2,
  },
  podAttachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  podHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  podThumbnailContainer: {
    height: 140,
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  podThumbnail: {
    width: '100%',
    height: '100%',
  },
  podThumbnailOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success.light,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.base,
  },
});
