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
import { theme } from '../../../../core/theme';
import {
  CultivationSessionAdmin,
  RecordSpawnInspectionRequest,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';
import { cultivationRepository } from '../../../cultivation';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface SelectedImageItem {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
  caption?: string;
  uploaded?: boolean;
}

interface SpawnInspectionModalProps {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SpawnInspectionModal: React.FC<SpawnInspectionModalProps> = ({
  visible,
  session,
  onClose,
  onSuccess,
}) => {
  if (!visible || !session) return null;

  return (
    <SpawnInspectionModalContent
      visible={visible}
      session={session}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

const SpawnInspectionModalContent: React.FC<{
  visible: boolean;
  session: CultivationSessionAdmin;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, session, onClose, onSuccess }) => {
  const spawnQuantityFromBackend =
    session.spawn_quantity != null && session.spawn_quantity > 0
      ? session.spawn_quantity
      : undefined;
  const requiredTrays = session.required_trays || session.tray_count || 1;
  const expectedSpawnBags = spawnQuantityFromBackend ?? requiredTrays * 2;

  const [totalChecked, setTotalChecked] = useState(String(expectedSpawnBags));
  const [normalQuantity, setNormalQuantity] = useState(String(expectedSpawnBags));
  const [warningQuantity, setWarningQuantity] = useState('0');
  const [abnormalQuantity, setAbnormalQuantity] = useState('0');
  const [condition, setCondition] = useState<'NORMAL' | 'WARNING' | 'ABNORMAL'>('NORMAL');
  const [replacementQuantity, setReplacementQuantity] = useState('0');
  const [notes, setNotes] = useState('');

  // Selected Images
  const [images, setImages] = useState<SelectedImageItem[]>([]);
  const [editingCaptionIndex, setEditingCaptionIndex] = useState<number | null>(null);
  const [captionInput, setCaptionInput] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdInspectionId, setCreatedInspectionId] = useState<number | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [failedImageIndices, setFailedImageIndices] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto update condition when quantities change
  const handleNormalChange = (val: string) => {
    setNormalQuantity(val);
    const n = parseInt(val, 10) || 0;
    const w = parseInt(warningQuantity, 10) || 0;
    const a = parseInt(abnormalQuantity, 10) || 0;
    if (a > 0) setCondition('ABNORMAL');
    else if (w > 0) setCondition('WARNING');
    else if (n > 0) setCondition('NORMAL');
  };

  const handleWarningChange = (val: string) => {
    setWarningQuantity(val);
    const w = parseInt(val, 10) || 0;
    const a = parseInt(abnormalQuantity, 10) || 0;
    if (a > 0) setCondition('ABNORMAL');
    else if (w > 0) setCondition('WARNING');
    else setCondition('NORMAL');
  };

  const handleAbnormalChange = (val: string) => {
    setAbnormalQuantity(val);
    const a = parseInt(val, 10) || 0;
    const w = parseInt(warningQuantity, 10) || 0;
    if (a > 0) {
      setCondition('ABNORMAL');
      setReplacementQuantity(String(a));
    } else if (w > 0) {
      setCondition('WARNING');
    } else {
      setCondition('NORMAL');
    }
  };

  // Image Picking
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần cấp quyền', 'Ứng dụng cần quyền sử dụng máy ảnh để chụp ảnh kiểm tra phôi.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'Ảnh quá lớn',
            `Ảnh chụp có kích thước ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB vượt quá giới hạn 5 MB. Vui lòng chụp lại.`
          );
          return;
        }
        setImages((prev) => [
          ...prev,
          {
            uri: asset.uri,
            name: asset.fileName || `spawn_cam_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            size: asset.fileSize,
          },
        ]);
      }
    } catch {
      Alert.alert('Lỗi chụp ảnh', 'Không thể khởi động camera. Vui lòng thử lại.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần cấp quyền', 'Ứng dụng cần quyền thư viện ảnh để chọn ảnh phôi.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const validAssets: SelectedImageItem[] = [];
        let hasOversized = false;
        result.assets.forEach((asset, idx) => {
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            hasOversized = true;
          } else {
            validAssets.push({
              uri: asset.uri,
              name: asset.fileName || `spawn_gallery_${Date.now()}_${idx}.jpg`,
              type: asset.mimeType || 'image/jpeg',
              size: asset.fileSize,
            });
          }
        });

        if (hasOversized) {
          Alert.alert(
            'Ảnh quá dung lượng',
            'Một số ảnh đã chọn vượt quá giới hạn 5 MB và đã được tự động bỏ qua.'
          );
        }

        if (validAssets.length > 0) {
          setImages((prev) => [...prev, ...validAssets]);
        }
      }
    } catch {
      Alert.alert('Lỗi chọn ảnh', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setFailedImageIndices((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    );
  };

  const handleOpenCaption = (index: number) => {
    setEditingCaptionIndex(index);
    setCaptionInput(images[index]?.caption || '');
  };

  const handleSaveCaption = () => {
    if (editingCaptionIndex !== null) {
      setImages((prev) =>
        prev.map((img, i) =>
          i === editingCaptionIndex ? { ...img, caption: captionInput.trim() || undefined } : img
        )
      );
      setEditingCaptionIndex(null);
      setCaptionInput('');
    }
  };

  // Sequential image uploader
  const uploadPhotosSequentially = async (
    inspectionId: number,
    targetImages: { item: SelectedImageItem; index: number }[]
  ): Promise<number[]> => {
    const failed: number[] = [];

    for (let i = 0; i < targetImages.length; i++) {
      const { item, index } = targetImages[i];
      setUploadProgressText(`Đang tải ảnh ${i + 1}/${targetImages.length}...`);

      try {
        await cultivationRepository.uploadSpawnInspectionImage(
          inspectionId,
          item.uri,
          item.caption,
          {
            name: item.name,
            type: item.type,
            size: item.size,
          }
        );
        setImages((prev) =>
          prev.map((img, idx) => (idx === index ? { ...img, uploaded: true } : img))
        );
      } catch {
        failed.push(index);
      }
    }

    return failed;
  };

  // Main Submit Handler
  const handleSubmit = async () => {
    setErrorMessage(null);
    const total = parseInt(totalChecked, 10);
    const normal = parseInt(normalQuantity, 10) || 0;
    const warning = parseInt(warningQuantity, 10) || 0;
    const abnormal = parseInt(abnormalQuantity, 10) || 0;
    const replacement = parseInt(replacementQuantity, 10) || 0;

    if (isNaN(total) || total < 1) {
      setErrorMessage('Số lượng phôi kiểm tra phải lớn hơn hoặc bằng 1.');
      return;
    }

    if (normal + warning + abnormal !== total) {
      setErrorMessage(
        `Tổng số bịch (${normal + warning + abnormal}) không khớp với số đã kiểm tra (${total}).`
      );
      return;
    }

    setSubmitting(true);

    let inspectionId = createdInspectionId;

    // STEP 1: CREATE INSPECTION REPORT (If not already created in a previous attempt)
    if (!inspectionId) {
      setUploadProgressText('Đang ghi nhận kết quả kiểm tra phôi...');
      try {
        const payload: RecordSpawnInspectionRequest = {
          totalChecked: total,
          normalQuantity: normal,
          warningQuantity: warning,
          abnormalQuantity: abnormal,
          condition,
          replacementQuantity: replacement, // Always number (0 if no replacement)
          notes: notes.trim(), // Always string ("" if blank)
        };

        const result = await iotRepository.recordSpawnInspection(session.session_id, payload);
        const newId = Number(result.inspection_id || result.id);

        if (!newId || isNaN(newId) || newId <= 0) {
          throw new Error('Máy chủ không trả về mã inspection_id hợp lệ.');
        }

        inspectionId = newId;
        setCreatedInspectionId(newId);
      } catch (createErr: any) {
        const msg = createErr?.message || 'Không thể tạo báo cáo kiểm tra phôi.';
        setErrorMessage(`Lỗi tạo báo cáo kiểm tra: ${msg}`);
        setSubmitting(false);
        setUploadProgressText(null);
        return;
      }
    }

    // STEP 2: UPLOAD IMAGES (If user has selected images)
    const unuploaded = images
      .map((img, idx) => ({ item: img, index: idx }))
      .filter(({ item }) => !item.uploaded);

    if (unuploaded.length > 0) {
      const failed = await uploadPhotosSequentially(inspectionId, unuploaded);
      setFailedImageIndices(failed);

      if (failed.length > 0) {
        setSubmitting(false);
        setUploadProgressText(null);
        setErrorMessage(
          `Báo cáo #${inspectionId} đã tạo, nhưng có ${failed.length} ảnh chưa thể tải lên. Vui lòng bấm "Thử lại tải ảnh".`
        );
        Alert.alert(
          'Đã lưu báo cáo kiểm tra (ảnh cần thử lại)',
          `Kết quả kiểm tra phôi #${inspectionId} đã được ghi nhận trên hệ thống. Tuy nhiên, ${failed.length} ảnh chưa được tải lên thành công. Bạn có thể bấm "Thử lại tải ảnh" ngay bên dưới để tiếp tục mà không tạo trùng báo cáo.`,
          [{ text: 'Đã hiểu' }]
        );
        return;
      }
    }

    // STEP 3: SUCCESS FEEDBACK AND REFRESH
    setSubmitting(false);
    setUploadProgressText(null);
    Alert.alert(
      'Đã lưu kết quả kiểm tra',
      condition === 'NORMAL' && total >= expectedSpawnBags
        ? 'Đợt kiểm tra đạt chuẩn và đủ số lượng bịch phôi. Phiên đã đủ điều kiện để chuyển sang Sẵn sàng trồng.'
        : 'Kết quả kiểm tra phôi cùng hình ảnh minh chứng đã được lưu thành công vào lịch sử.',
      [
        {
          text: 'Đóng',
          onPress: () => {
            try {
              onSuccess();
            } catch {
              onClose();
            }
          },
        },
      ]
    );
  };

  // Retry upload failed images only
  const handleRetryFailedImages = async () => {
    if (!createdInspectionId || failedImageIndices.length === 0) return;

    setSubmitting(true);
    setErrorMessage(null);

    const targetImages = failedImageIndices.map((idx) => ({
      item: images[idx],
      index: idx,
    }));

    try {
      const stillFailed = await uploadPhotosSequentially(createdInspectionId, targetImages);
      setFailedImageIndices(stillFailed);

      if (stillFailed.length === 0) {
        Alert.alert(
          'Tải ảnh hoàn tất',
          'Tất cả hình ảnh kiểm tra phôi đã được tải lên thành công!',
          [
            {
              text: 'Đóng',
              onPress: () => {
                try {
                  onSuccess();
                } catch {
                  onClose();
                }
              },
            },
          ]
        );
      } else {
        setErrorMessage(
          `Còn ${stillFailed.length} ảnh chưa thể tải lên. Vui lòng bấm thử lại lần nữa.`
        );
        Alert.alert(
          'Vẫn còn ảnh lỗi',
          `Còn ${stillFailed.length} ảnh chưa thể tải lên. Vui lòng bấm thử lại lần nữa.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể hoàn tất tải ảnh.');
    } finally {
      setSubmitting(false);
      setUploadProgressText(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">
                Kiểm tra phôi nấm theo phiên
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name || 'Nấm giống'}
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          {/* Explicit Notice: Common for session */}
          <View style={styles.scopeNotice}>
            <Ionicons name="shield-checkmark" size={15} color={theme.colors.primary[600]} />
            <AppText variant="caption" color={theme.colors.primary[700]} style={{ flex: 1, marginLeft: 6 }}>
              Kiểm tra chung cho toàn bộ phiên nuôi trồng (không gắn ảnh riêng cho từng khay).
            </AppText>
          </View>

          <AppDivider spacing="xs" />

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Standards Info Banner */}
            <AppCard elevation="xs" style={styles.infoBanner}>
              <View style={styles.infoBannerRow}>
                <Ionicons name="information-circle" size={18} color={theme.colors.primary[600]} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.primary[800]}>
                    Quy chuẩn phôi giống SmartMush:
                  </AppText>
                  <AppText variant="caption" color={theme.colors.primary[700]}>
                    {spawnQuantityFromBackend != null
                      ? `Phiên #${session.session_id} đã xuất đúng ${expectedSpawnBags} bịch phôi (${requiredTrays} khay). Đợt kiểm tra cần đạt chuẩn và kiểm tra đủ ${expectedSpawnBags} bịch để được chuyển sang Sẵn sàng trồng.`
                      : `Mỗi khay tiêu chuẩn cần đúng ${Math.round(expectedSpawnBags / requiredTrays)} bịch phôi. Phiên này cần ${requiredTrays} khay (${expectedSpawnBags} bịch phôi). Đợt kiểm tra phải đạt chuẩn và kiểm tra đủ ${expectedSpawnBags} bịch để được chuyển sang Sẵn sàng trồng.`}
                  </AppText>
                </View>
              </View>
            </AppCard>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error.dark} />
                <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1, marginLeft: 4 }}>
                  {errorMessage}
                </AppText>
              </View>
            )}

            {/* Partial Upload Warning Banner */}
            {failedImageIndices.length > 0 && createdInspectionId && (
              <View style={styles.retryBanner}>
                <Ionicons name="warning" size={18} color={theme.colors.warning.dark} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.warning.dark}>
                    Đã lưu kết quả đợt kiểm tra #{createdInspectionId}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Còn {failedImageIndices.length} ảnh chưa tải lên thành công do kết nối. Bấm nút dưới để thử lại.
                  </AppText>
                </View>
                <AppButton
                  title="Thử lại tải ảnh"
                  variant="primary"
                  size="sm"
                  onPress={handleRetryFailedImages}
                  disabled={submitting}
                />
              </View>
            )}

            {/* Total checked */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Tổng số bịch phôi kiểm tra:
              </AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={totalChecked}
                onChangeText={setTotalChecked}
                placeholder={`Mặc định: ${expectedSpawnBags}`}
                placeholderTextColor={theme.colors.text.muted}
                editable={!createdInspectionId}
              />
            </View>

            {/* Quantity Breakdown Grid */}
            <View style={styles.breakdownGrid}>
              {/* Normal */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.success.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.success.dark}>
                    Đạt chuẩn
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputNormal]}
                  keyboardType="numeric"
                  value={normalQuantity}
                  onChangeText={handleNormalChange}
                  placeholder="0"
                  editable={!createdInspectionId}
                />
              </View>

              {/* Warning */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.warning.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.warning.dark}>
                    Cảnh báo
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputWarning]}
                  keyboardType="numeric"
                  value={warningQuantity}
                  onChangeText={handleWarningChange}
                  placeholder="0"
                  editable={!createdInspectionId}
                />
              </View>

              {/* Abnormal */}
              <View style={styles.breakdownCol}>
                <View style={styles.badgeLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.error.main }]} />
                  <AppText variant="caption" weight="semibold" color={theme.colors.error.dark}>
                    Bất thường
                  </AppText>
                </View>
                <TextInput
                  style={[styles.textInput, styles.inputAbnormal]}
                  keyboardType="numeric"
                  value={abnormalQuantity}
                  onChangeText={handleAbnormalChange}
                  placeholder="0"
                  editable={!createdInspectionId}
                />
              </View>
            </View>

            {/* Condition Picker */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Đánh giá tổng thể đợt kiểm tra:
              </AppText>
              <View style={styles.conditionRow}>
                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'NORMAL' && styles.conditionBtnNormalActive,
                  ]}
                  onPress={() => !createdInspectionId && setCondition('NORMAL')}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={condition === 'NORMAL' ? '#FFFFFF' : theme.colors.success.main}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'NORMAL' ? '#FFFFFF' : theme.colors.success.dark}
                  >
                    Đạt chuẩn
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'WARNING' && styles.conditionBtnWarningActive,
                  ]}
                  onPress={() => !createdInspectionId && setCondition('WARNING')}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={condition === 'WARNING' ? '#FFFFFF' : theme.colors.warning.dark}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'WARNING' ? '#FFFFFF' : theme.colors.warning.dark}
                  >
                    Cảnh báo
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.conditionBtn,
                    condition === 'ABNORMAL' && styles.conditionBtnAbnormalActive,
                  ]}
                  onPress={() => !createdInspectionId && setCondition('ABNORMAL')}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={condition === 'ABNORMAL' ? '#FFFFFF' : theme.colors.error.dark}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={condition === 'ABNORMAL' ? '#FFFFFF' : theme.colors.error.dark}
                  >
                    Bất thường
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Replacement Quantity */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Số lượng bịch phôi thay thế từ kho (nếu có):
              </AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={replacementQuantity}
                onChangeText={setReplacementQuantity}
                placeholder="0"
                placeholderTextColor={theme.colors.text.muted}
                editable={!createdInspectionId}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" weight="bold">
                Ghi chú kiểm tra (tình trạng tơ nấm, màu sắc, ẩm độ):
              </AppText>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ví dụ: Tơ nấm ăn kín 90%, trắng đều, không có dấu hiệu mốc xanh hay vi khuẩn."
                placeholderTextColor={theme.colors.text.muted}
                editable={!createdInspectionId}
              />
            </View>

            {/* Images Section */}
            <View style={styles.inputGroup}>
              <View style={styles.imageHeaderRow}>
                <AppText variant="caption" weight="bold">
                  Ảnh chụp kiểm tra ({images.length} ảnh):
                </AppText>
                {!createdInspectionId && (
                  <View style={styles.photoActions}>
                    <Pressable onPress={handleTakePhoto} style={styles.photoActionBtn}>
                      <Ionicons name="camera-outline" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="caption" weight="bold" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                        Chụp ảnh
                      </AppText>
                    </Pressable>
                    <Pressable onPress={handlePickFromGallery} style={styles.photoActionBtn}>
                      <Ionicons name="image-outline" size={16} color={theme.colors.primary[600]} />
                      <AppText variant="caption" weight="bold" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                        Thư viện
                      </AppText>
                    </Pressable>
                  </View>
                )}
              </View>

              {images.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesScroll}>
                  {images.map((img, idx) => {
                    const isFailed = failedImageIndices.includes(idx);
                    return (
                      <View key={idx} style={styles.imageThumbnailBox}>
                        <Image source={{ uri: img.uri }} style={styles.thumbnailImg} />

                        {img.uploaded && (
                          <View style={styles.uploadedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                          </View>
                        )}

                        {isFailed && (
                          <View style={styles.failedBadge}>
                            <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
                          </View>
                        )}

                        {!createdInspectionId && (
                          <Pressable onPress={() => handleRemoveImage(idx)} style={styles.removeImageBtn}>
                            <Ionicons name="close" size={12} color="#FFFFFF" />
                          </Pressable>
                        )}

                        <Pressable onPress={() => handleOpenCaption(idx)} style={styles.captionBar}>
                          <AppText variant="caption" numberOfLines={1} color="#FFFFFF" style={styles.captionText}>
                            {img.caption ? img.caption : '+ Chú thích'}
                          </AppText>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyImagesBox}>
                  <Ionicons name="camera-outline" size={24} color={theme.colors.text.muted} />
                  <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 4 }}>
                    Chụp hoặc tải ảnh bịch phôi để lưu minh chứng
                  </AppText>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Upload Progress Overlay Text */}
          {uploadProgressText && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              <AppText variant="caption" weight="bold" color={theme.colors.primary[700]} style={{ marginLeft: 8 }}>
                {uploadProgressText}
              </AppText>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.footerRow}>
            <AppButton
              title="Đóng"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={submitting}
              style={{ flex: 1 }}
            />
            {!createdInspectionId ? (
              <AppButton
                title={submitting ? 'Đang lưu...' : 'Lưu kết quả'}
                variant="primary"
                size="md"
                onPress={handleSubmit}
                disabled={submitting}
                style={{ flex: 1 }}
              />
            ) : failedImageIndices.length > 0 ? (
              <AppButton
                title="Tải lại ảnh lỗi"
                variant="primary"
                size="md"
                onPress={handleRetryFailedImages}
                disabled={submitting}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Caption Editor Modal */}
      <Modal
        visible={editingCaptionIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCaptionIndex(null)}
      >
        <View style={styles.captionModalBackdrop}>
          <View style={styles.captionModalCard}>
            <AppText variant="bodyMedium" weight="bold">
              Chú thích cho ảnh
            </AppText>
            <TextInput
              style={styles.captionTextInput}
              value={captionInput}
              onChangeText={setCaptionInput}
              placeholder="Nhập ghi chú cho ảnh này (tối đa 500 ký tự)..."
              placeholderTextColor={theme.colors.text.muted}
              maxLength={500}
              multiline
              numberOfLines={3}
            />
            <View style={styles.captionModalActions}>
              <AppButton
                title="Hủy"
                variant="outline"
                size="sm"
                onPress={() => setEditingCaptionIndex(null)}
              />
              <AppButton
                title="Lưu chú thích"
                variant="primary"
                size="sm"
                onPress={handleSaveCaption}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  scopeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    marginBottom: 6,
  },
  scrollArea: {
    marginTop: theme.spacing.xs,
  },
  infoBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  infoBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  breakdownCol: {
    flex: 1,
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  inputNormal: {
    borderColor: theme.colors.success.main,
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
    fontWeight: 'bold',
    color: theme.colors.success.dark,
  },
  inputWarning: {
    borderColor: theme.colors.warning.main,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    fontWeight: 'bold',
    color: theme.colors.warning.dark,
  },
  inputAbnormal: {
    borderColor: theme.colors.error.main,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    fontWeight: 'bold',
    color: theme.colors.error.dark,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  conditionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  conditionBtnNormalActive: {
    backgroundColor: theme.colors.success.main,
    borderColor: theme.colors.success.main,
  },
  conditionBtnWarningActive: {
    backgroundColor: theme.colors.warning.main,
    borderColor: theme.colors.warning.main,
  },
  conditionBtnAbnormalActive: {
    backgroundColor: theme.colors.error.main,
    borderColor: theme.colors.error.main,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  imagesScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  imageThumbnailBox: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: theme.colors.success.main,
    borderRadius: 7,
    padding: 1,
  },
  failedBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: theme.colors.error.main,
    borderRadius: 7,
    padding: 1,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  captionText: {
    fontSize: 9,
  },
  emptyImagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.neutral[50],
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: theme.spacing.xs,
  },
  captionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  captionModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  captionTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: 8,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  captionModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
