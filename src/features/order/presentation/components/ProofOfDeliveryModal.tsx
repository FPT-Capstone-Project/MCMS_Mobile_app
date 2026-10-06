import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../../core/theme';
import { AppButton } from '../../../../shared/components/primitives/AppButton';
import { AppCard } from '../../../../shared/components/primitives/AppCard';
import { AppDivider } from '../../../../shared/components/primitives/AppDivider';
import { AppIconButton } from '../../../../shared/components/primitives/AppIconButton';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { DeliveryOrder } from '../../domain/entities/DeliveryOrder';

export interface ProofOfDeliveryModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  onClose: () => void;
  onSubmit: (orderId: string, imageUri: string, notes?: string) => Promise<void>;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  visible,
  order,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  // Reset local state on close or when order changes
  const handleClose = () => {
    if (submitting) return;
    setImageUri(null);
    setNotes('');
    onClose();
  };

  // Launch Camera
  const handleTakePhoto = async () => {
    try {
      setPickingImage(true);
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Yêu cầu quyền Camera',
          'Vui lòng cấp quyền truy cập Camera để chụp ảnh xác nhận giao hàng.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động Camera. Vui lòng thử lại.');
    } finally {
      setPickingImage(false);
    }
  };

  // Launch Gallery
  const handlePickFromGallery = async () => {
    try {
      setPickingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Yêu cầu quyền Thư viện ảnh',
          'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh xác nhận giao hàng.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh. Vui lòng thử lại.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    if (!imageUri) {
      Alert.alert(
        'Thiếu ảnh xác nhận',
        'Vui lòng chụp hoặc chọn ảnh xác nhận đã bàn giao khay nấm cho khách hàng.'
      );
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(order.id, imageUri, notes.trim() || undefined);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.base) },
          ]}
        >
          {/* Top Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.titleIconBadge}>
                <Ionicons name="camera" size={20} color={theme.colors.primary[600]} />
              </View>
              <View>
                <AppText variant="title" weight="bold">
                  Xác nhận giao hàng
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Mã đơn: <AppText weight="bold">{order.orderCode}</AppText>
                </AppText>
              </View>
            </View>

            <AppIconButton
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={handleClose}
              disabled={submitting}
              accessibilityLabel="Đóng"
              size="sm"
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Delivery Target Details */}
            <AppCard elevation="sm" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={15} color={theme.colors.text.muted} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={styles.infoLabel}>
                  Khách hàng:
                </AppText>
                <AppText variant="captionMedium" weight="bold" style={styles.infoValue}>
                  {order.customerName} ({order.customerPhone})
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={15} color={theme.colors.text.muted} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={styles.infoLabel}>
                  Địa chỉ:
                </AppText>
                <AppText variant="caption" color={theme.colors.text.primary} style={styles.infoValue}>
                  {order.deliveryAddress}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={15} color={theme.colors.primary[500]} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={styles.infoLabel}>
                  Hàng giao:
                </AppText>
                <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]} style={styles.infoValue}>
                  Khay {order.trayId} • {order.mushroomType}
                </AppText>
              </View>
            </AppCard>

            {/* Proof of Delivery Photo Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="image-outline" size={16} color={theme.colors.primary[600]} />
                <AppText variant="bodySmallMedium" weight="bold">
                  Hình ảnh xác nhận giao hàng (POD)
                </AppText>
                <View style={styles.requiredBadge}>
                  <AppText variant="overline" color={theme.colors.error.main} weight="bold">
                    Bắt buộc
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Chụp ảnh khay nấm đã bàn giao hoặc tại vị trí nhận hàng để lưu bằng chứng giao hàng thành công.
              </AppText>
            </View>

            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

                <View style={styles.previewOverlay}>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                    <AppText variant="overline" color="#FFFFFF" weight="bold">
                      Đã đính kèm ảnh
                    </AppText>
                  </View>

                  <View style={styles.previewActions}>
                    <Pressable
                      style={styles.previewActionBtn}
                      onPress={handleTakePhoto}
                      disabled={submitting}
                    >
                      <Ionicons name="camera-reverse-outline" size={16} color="#FFFFFF" />
                      <AppText variant="caption" color="#FFFFFF" weight="bold">
                        Chụp lại
                      </AppText>
                    </Pressable>

                    <Pressable
                      style={[styles.previewActionBtn, styles.deleteBtn]}
                      onPress={() => setImageUri(null)}
                      disabled={submitting}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      <AppText variant="caption" color="#FFFFFF" weight="bold">
                        Xóa
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.photoPickerBox}>
                {pickingImage ? (
                  <View style={styles.pickingLoading}>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Đang xử lý ảnh...
                    </AppText>
                  </View>
                ) : (
                  <>
                    <View style={styles.cameraIconCircle}>
                      <Ionicons name="camera-outline" size={32} color={theme.colors.primary[500]} />
                    </View>
                    <AppText variant="bodySmall" weight="bold" align="center">
                      Chưa có hình ảnh xác nhận
                    </AppText>
                    <AppText
                      variant="caption"
                      color={theme.colors.text.muted}
                      align="center"
                      style={styles.photoHint}
                    >
                      Vui lòng chọn hình thức bên dưới để tải ảnh lên
                    </AppText>

                    <View style={styles.photoButtonsRow}>
                      <AppButton
                        title="Chụp ảnh ngay"
                        variant="primary"
                        size="sm"
                        leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                        onPress={handleTakePhoto}
                        style={styles.photoBtn}
                      />
                      <AppButton
                        title="Chọn từ thư viện"
                        variant="outline"
                        size="sm"
                        leftIcon={
                          <Ionicons
                            name="images-outline"
                            size={16}
                            color={theme.colors.primary[600]}
                          />
                        }
                        onPress={handlePickFromGallery}
                        style={styles.photoBtn}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            <AppDivider spacing="sm" />

            {/* Shipper Delivery Notes Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="create-outline" size={16} color={theme.colors.neutral[600]} />
                <AppText variant="bodySmallMedium" weight="bold">
                  Ghi chú giao hàng (Tùy chọn)
                </AppText>
              </View>
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="VD: Giao trực tiếp cho khách hàng, đã kiểm tra khay nuôi trồng..."
              placeholderTextColor={theme.colors.text.muted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              editable={!submitting}
            />

            {/* Notice */}
            <View style={styles.noticeBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={theme.colors.success.main}
              />
              <AppText variant="caption" color={theme.colors.text.secondary} style={{ flex: 1 }}>
                Hình ảnh và thời gian giao hàng sẽ được đồng bộ lên hệ thống để khách hàng theo dõi.
              </AppText>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.bottomActions}>
            <AppButton
              title="Hủy"
              variant="ghost"
              size="md"
              disabled={submitting}
              onPress={handleClose}
              style={styles.cancelBtn}
            />
            <AppButton
              title="Xác nhận giao hàng"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={!imageUri}
              leftIcon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
              onPress={handleConfirm}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screenHorizontal,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: 'center',
    marginBottom: theme.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  titleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing.xxs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    width: 75,
  },
  infoValue: {
    flex: 1,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requiredBadge: {
    backgroundColor: theme.colors.error.light,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  photoPickerBox: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  cameraIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  photoHint: {
    maxWidth: 260,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  photoBtn: {
    flex: 1,
  },
  pickingLoading: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  imagePreviewContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.primary[400],
    position: 'relative',
    height: 220,
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success.main,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
  },
  previewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  deleteBtn: {
    backgroundColor: theme.colors.error.main,
  },
  notesInput: {
    backgroundColor: theme.colors.background.paper,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success.light,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
