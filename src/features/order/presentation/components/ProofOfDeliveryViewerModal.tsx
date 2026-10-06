import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton } from '../../../../shared/components/primitives/AppIconButton';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { DeliveryOrder } from '../../domain/entities/DeliveryOrder';

export interface ProofOfDeliveryViewerModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  onClose: () => void;
}

export const ProofOfDeliveryViewerModal: React.FC<ProofOfDeliveryViewerModalProps> = ({
  visible,
  order,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  if (!order || !order.proofOfDeliveryImage) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Header Bar */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerInfo}>
            <AppText variant="title" color="#FFFFFF" weight="bold">
              Ảnh xác thực giao hàng
            </AppText>
            <AppText variant="caption" color="#CBD5E1">
              Đơn hàng: {order.orderCode} • {order.customerName}
            </AppText>
          </View>

          <AppIconButton
            icon={<Ionicons name="close" size={24} color="#FFFFFF" />}
            onPress={onClose}
            accessibilityLabel="Đóng"
            size="md"
            style={styles.closeBtn}
          />
        </View>

        {/* Main Image */}
        <Pressable style={styles.imageWrapper} onPress={onClose}>
          <Image
            source={{ uri: order.proofOfDeliveryImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Pressable>

        {/* Footer Info */}
        <View style={[styles.footerBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.footerBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <AppText variant="captionMedium" color="#FFFFFF" weight="bold">
              Đã giao thành công lúc {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay'}
            </AppText>
          </View>
          {order.notes ? (
            <AppText variant="caption" color="#94A3B8" align="center" style={styles.notesText}>
              Ghi chú: {order.notes}
            </AppText>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  footerBar: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  notesText: {
    maxWidth: 320,
  },
});
