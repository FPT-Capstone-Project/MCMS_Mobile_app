import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
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
  GrowthStage,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import {
  CreateDailyTrayInspectionRequest,
} from '../../domain/entities/Cultivation';
import { cultivationRepository } from '../../data/repositories/CultivationRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface SelectedImageItem {
  uri: string;
  caption?: string;
  uploaded?: boolean;
}

interface DailyTrayInspectionModalProps {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  initialSessionTrayId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STAGE_OPTIONS: { stage: GrowthStage; label: string; desc: string }[] = [
  {
    stage: 'FRUITING_INITIATION',
    label: 'Bật mầm (FRUITING_INITIATION)',
    desc: 'Tơ nấm phủ kín khay, kích ẩm bắt đầu ra quả thể',
  },
  {
    stage: 'PINNING',
    label: 'Ghim nụ (PINNING)',
    desc: 'Xuất hiện các đầu ghim nhỏ li ti trên bề mặt',
  },
  {
    stage: 'YOUNG_FRUITING',
    label: 'Nấm non (YOUNG_FRUITING)',
    desc: 'Tai nấm non hình thành và đang lớn nhanh',
  },
  {
    stage: 'MATURATION',
    label: 'Trưởng thành (MATURATION)',
    desc: 'Mũ nấm đạt kích thước chuẩn, chuẩn bị thu hoạch',
  },
];

export const DailyTrayInspectionModal: React.FC<DailyTrayInspectionModalProps> = ({
  visible,
  session,
  initialSessionTrayId,
  onClose,
  onSuccess,
}) => {
  if (!visible || !session) return null;

  return (
    <DailyTrayInspectionModalContent
      key={`${session.session_id}_${initialSessionTrayId ?? 'default'}`}
      visible={visible}
      session={session}
      initialSessionTrayId={initialSessionTrayId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

const DailyTrayInspectionModalContent: React.FC<{
  visible: boolean;
  session: CultivationSessionAdmin;
  initialSessionTrayId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, session, initialSessionTrayId, onClose, onSuccess }) => {
  const trays = useMemo(() => session.trays || [], [session.trays]);
  const defaultTrayId =
    initialSessionTrayId ||
    (trays.length > 0 ? trays[0].session_tray_id : null);

  const initialStage = (session.current_stage ||
    session.growth_status ||
    'FRUITING_INITIATION') as GrowthStage;
  const initialProgress =
    session.progress_percent != null ? String(session.progress_percent) : '0';

  const [selectedSessionTrayId, setSelectedSessionTrayId] = useState<number | null>(defaultTrayId);
  const [growthStage, setGrowthStage] = useState<GrowthStage>(initialStage);
  const [growthProgress, setGrowthProgress] = useState<string>(initialProgress);
  const [trayCondition, setTrayCondition] = useState<string>(
    session.condition || 'Khay sạch, độ ẩm đạt tiêu chuẩn'
  );
  const [mushroomCondition, setMushroomCondition] = useState<string>(
    'Nấm phát triển đều, không phát hiện sâu bệnh'
  );
  const [notes, setNotes] = useState('');
  const [loadingTrayData, setLoadingTrayData] = useState(false);
  const [dataSourceBadge, setDataSourceBadge] = useState<string | null>(null);

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

  // Load real data for the session and selected tray
  useEffect(() => {
    if (!visible || !session?.session_id) return;
    let isMounted = true;

    const loadRealData = async () => {
      setLoadingTrayData(true);
      try {
        const [trayHistoryRes, sessionProgRes] = await Promise.allSettled([
          selectedSessionTrayId
            ? cultivationRepository.getTrayDailyInspectionHistory(
                session.session_id,
                selectedSessionTrayId,
                1,
                1
              )
            : Promise.reject(new Error('No tray selected')),
          iotRepository.getSessionProgress(session.session_id),
        ]);

        if (!isMounted) return;

        const trayHistory =
          trayHistoryRes.status === 'fulfilled' ? trayHistoryRes.value : null;
        const latestTrayInspection =
          trayHistory?.inspections && trayHistory.inspections.length > 0
            ? trayHistory.inspections[0]
            : null;

        const sessionProg =
          sessionProgRes.status === 'fulfilled' ? sessionProgRes.value : null;

        if (latestTrayInspection) {
          // Pre-fill from the tray's most recent daily report
          const stage = (latestTrayInspection.growthStage ||
            sessionProg?.current_stage ||
            sessionProg?.growth_status ||
            session.current_stage ||
            session.growth_status ||
            'FRUITING_INITIATION') as GrowthStage;

          const progress =
            latestTrayInspection.growthProgress != null
              ? String(latestTrayInspection.growthProgress)
              : sessionProg?.progress_percent != null
              ? String(sessionProg.progress_percent)
              : session.progress_percent != null
              ? String(session.progress_percent)
              : '0';

          setGrowthStage(stage);
          setGrowthProgress(progress);
          setTrayCondition(
            latestTrayInspection.trayCondition || 'Khay sạch, độ ẩm đạt tiêu chuẩn'
          );
          setMushroomCondition(
            latestTrayInspection.mushroomCondition ||
              'Nấm phát triển đều, không phát hiện sâu bệnh'
          );
          setDataSourceBadge(
            `Đã nạp từ báo cáo gần nhất của khay này (${progress}%)`
          );
        } else if (sessionProg) {
          // Fallback to session-wide progress
          const stage = (sessionProg.current_stage ||
            sessionProg.growth_status ||
            sessionProg.latest_progress?.current_stage ||
            session.current_stage ||
            session.growth_status ||
            'FRUITING_INITIATION') as GrowthStage;

          const progress =
            sessionProg.progress_percent != null
              ? String(sessionProg.progress_percent)
              : sessionProg.latest_progress?.progress_percent != null
              ? String(sessionProg.latest_progress.progress_percent)
              : session.progress_percent != null
              ? String(session.progress_percent)
              : '0';

          const cond =
            sessionProg.latest_progress?.condition ||
            sessionProg.condition ||
            session.condition ||
            'Khay sạch, độ ẩm đạt tiêu chuẩn';

          setGrowthStage(stage);
          setGrowthProgress(progress);
          setTrayCondition(cond);
          setMushroomCondition('Nấm phát triển đều, không phát hiện sâu bệnh');
          setDataSourceBadge(
            `Khay chưa có báo cáo riêng • Đã nạp từ tiến độ chung của phiên (${progress}%)`
          );
        } else {
          // Session props fallback
          const stage = (session.current_stage ||
            session.growth_status ||
            'FRUITING_INITIATION') as GrowthStage;
          const progress =
            session.progress_percent != null
              ? String(session.progress_percent)
              : '0';

          setGrowthStage(stage);
          setGrowthProgress(progress);
          setTrayCondition(session.condition || 'Khay sạch, độ ẩm đạt tiêu chuẩn');
          setMushroomCondition('Nấm phát triển đều, không phát hiện sâu bệnh');
          setDataSourceBadge(`Đã nạp từ thông tin phiên (${progress}%)`);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) {
          setLoadingTrayData(false);
        }
      }
    };

    void loadRealData();

    return () => {
      isMounted = false;
    };
  }, [
    visible,
    session.session_id,
    session.condition,
    session.current_stage,
    session.growth_status,
    session.progress_percent,
    selectedSessionTrayId,
  ]);

  const handleQuickAddPercent = (delta: number) => {
    const cur = Number(growthProgress) || 0;
    const next = Math.min(100, Math.max(0, cur + delta));
    setGrowthProgress(String(next));
  };

  const selectedTray = trays.find((t) => t.session_tray_id === selectedSessionTrayId);

  // Pick image from Library
  const handlePickLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: SelectedImageItem[] = result.assets.map((asset) => ({
          uri: asset.uri,
          caption: '',
          uploaded: false,
        }));
        setImages((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể mở thư viện ảnh.');
    }
  };

  // Capture image from Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền mở máy ảnh để tiếp tục.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: SelectedImageItem[] = result.assets.map((asset) => ({
          uri: asset.uri,
          caption: '',
          uploaded: false,
        }));
        setImages((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi máy ảnh', err?.message || 'Không thể chụp ảnh.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setFailedImageIndices((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  const handleOpenCaptionEditor = (index: number) => {
    setEditingCaptionIndex(index);
    setCaptionInput(images[index]?.caption || '');
  };

  const handleSaveCaption = () => {
    if (editingCaptionIndex !== null) {
      setImages((prev) =>
        prev.map((img, i) => (i === editingCaptionIndex ? { ...img, caption: captionInput } : img))
      );
      setEditingCaptionIndex(null);
      setCaptionInput('');
    }
  };

  // Submit Report
  const handleSubmit = async () => {
    if (!selectedSessionTrayId) {
      Alert.alert('Chưa chọn khay', 'Vui lòng chọn khay vật lý cần lập báo cáo.');
      return;
    }
    const progressNum = Number(growthProgress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      Alert.alert('Tiến độ không hợp lệ', 'Tiến độ sinh trưởng phải từ 0 đến 100%.');
      return;
    }
    if (!trayCondition.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tình trạng khay.');
      return;
    }
    if (!mushroomCondition.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tình trạng nấm.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setFailedImageIndices([]);

    let inspectionId = createdInspectionId;

    try {
      // 1. Create inspection if not already created
      if (!inspectionId) {
        setUploadProgressText('Đang lưu thông tin báo cáo...');
        const payload: CreateDailyTrayInspectionRequest = {
          growthStage,
          growthProgress: progressNum,
          trayCondition: trayCondition.trim(),
          mushroomCondition: mushroomCondition.trim(),
          notes: notes.trim() || undefined,
        };
        inspectionId = await cultivationRepository.createDailyTrayInspection(
          selectedSessionTrayId,
          payload
        );
        setCreatedInspectionId(inspectionId);
      }

      // 2. Upload images one by one
      if (images.length > 0 && inspectionId) {
        const failed: number[] = [];
        for (let i = 0; i < images.length; i++) {
          if (images[i].uploaded) continue;
          try {
            setUploadProgressText(`Đang tải ảnh ${i + 1}/${images.length}...`);
            await cultivationRepository.uploadDailyTrayInspectionImage(
              inspectionId,
              images[i].uri,
              images[i].caption
            );
            // Mark uploaded
            setImages((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, uploaded: true } : item))
            );
          } catch {
            failed.push(i);
          }
        }

        if (failed.length > 0) {
          setFailedImageIndices(failed);
          setErrorMessage(
            `Đã lưu báo cáo thành công (Mã #${inspectionId}), nhưng còn ${failed.length} ảnh chưa tải lên được do lỗi kết nối. Bạn có thể nhấn 'Tải lại ảnh lỗi' bên dưới.`
          );
          setSubmitting(false);
          setUploadProgressText(null);
          return;
        }
      }

      setUploadProgressText(null);
      Alert.alert(
        'Thành công',
        `Báo cáo khay hằng ngày #${inspectionId} đã được ghi nhận đầy đủ kèm ${images.length} ảnh.`,
        [{ text: 'Đóng', onPress: onSuccess }]
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tạo báo cáo khay. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
      setUploadProgressText(null);
    }
  };

  // Retry uploading failed images
  const handleRetryFailedImages = async () => {
    if (!createdInspectionId || failedImageIndices.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);

    const remainingFailed: number[] = [];
    for (const idx of failedImageIndices) {
      try {
        setUploadProgressText(`Đang tải lại ảnh ${idx + 1}...`);
        await cultivationRepository.uploadDailyTrayInspectionImage(
          createdInspectionId,
          images[idx].uri,
          images[idx].caption
        );
        setImages((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, uploaded: true } : item))
        );
      } catch {
        remainingFailed.push(idx);
      }
    }

    setSubmitting(false);
    setUploadProgressText(null);
    setFailedImageIndices(remainingFailed);

    if (remainingFailed.length === 0) {
      Alert.alert(
        'Hoàn tất',
        `Toàn bộ ảnh đã được tải lên báo cáo #${createdInspectionId} thành công!`,
        [{ text: 'Đóng', onPress: onSuccess }]
      );
    } else {
      setErrorMessage(
        `Vẫn còn ${remainingFailed.length} ảnh chưa tải lên được. Vui lòng kiểm tra lại kết nối mạng.`
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">
                Báo cáo khay hằng ngày
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Phiên #{session.session_id} • {session.mushroom_name}
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          <AppDivider spacing="sm" />

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Warning if no trays assigned */}
            {trays.length === 0 ? (
              <AppCard elevation="xs" style={styles.warningCard}>
                <Ionicons name="alert-circle" size={24} color={theme.colors.warning.dark} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppText variant="bodySmall" weight="bold" color={theme.colors.warning.dark}>
                    Chưa gán khay vật lý
                  </AppText>
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Phiên nuôi trồng này chưa có khay vật lý nào được gán trên tầng. Vui lòng thực hiện xếp khay vào tầng trước khi lập báo cáo quan sát khay.
                  </AppText>
                </View>
              </AppCard>
            ) : (
              <>
                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error.dark} />
                    <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1, marginLeft: 6 }}>
                      {errorMessage}
                    </AppText>
                  </View>
                )}

                {/* Progress bar text if submitting */}
                {uploadProgressText && (
                  <View style={styles.progressBanner}>
                    <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                    <AppText variant="caption" weight="medium" color={theme.colors.primary[700]} style={{ marginLeft: 8 }}>
                      {uploadProgressText}
                    </AppText>
                  </View>
                )}

                {/* 1. Select Tray to Inspect */}
                <View style={styles.inputGroup}>
                  <AppText variant="caption" weight="bold">
                    Chọn khay vật lý báo cáo ({trays.length} khay trong phiên):
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trayPillsRow}>
                    {trays.map((t) => {
                      const isSelected = t.session_tray_id === selectedSessionTrayId;
                      return (
                        <Pressable
                          key={t.session_tray_id}
                          onPress={() => !createdInspectionId && setSelectedSessionTrayId(t.session_tray_id)}
                          style={[styles.trayPill, isSelected && styles.trayPillActive]}
                        >
                          <Ionicons
                            name="cube"
                            size={14}
                            color={isSelected ? '#FFFFFF' : theme.colors.primary[600]}
                          />
                          <AppText
                            variant="caption"
                            weight={isSelected ? 'bold' : 'normal'}
                            color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                            style={{ marginLeft: 4 }}
                          >
                            {t.tray_code} {t.floor_name ? `(${t.floor_name})` : ''}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {selectedTray && (
                    <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 4 }}>
                      Đang lập báo cáo cho khay {selectedTray.tray_code} • sessionTrayId: #{selectedTray.session_tray_id}
                    </AppText>
                  )}

                  {loadingTrayData ? (
                    <View style={styles.loadingBanner}>
                      <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                      <AppText variant="caption" weight="medium" color={theme.colors.primary[700]} style={{ marginLeft: 6 }}>
                        Đang nạp dữ liệu thực tế của khay...
                      </AppText>
                    </View>
                  ) : dataSourceBadge ? (
                    <View style={styles.sourceBadgeRow}>
                      <Ionicons name="sparkles" size={13} color={theme.colors.primary[600]} />
                      <AppText variant="caption" weight="medium" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                        {dataSourceBadge}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {/* 2. Growth Stage Picker */}
                <View style={styles.inputGroup}>
                  <AppText variant="caption" weight="bold">
                    Giai đoạn sinh trưởng (growthStage):
                  </AppText>
                  <View style={styles.stageOptionsContainer}>
                    {STAGE_OPTIONS.map((opt) => {
                      const isChosen = growthStage === opt.stage;
                      return (
                        <Pressable
                          key={opt.stage}
                          onPress={() => setGrowthStage(opt.stage)}
                          style={[styles.stageOptionCard, isChosen && styles.stageOptionCardActive]}
                        >
                          <View style={styles.stageOptionHeader}>
                            <Ionicons
                              name={isChosen ? 'radio-button-on' : 'radio-button-off'}
                              size={16}
                              color={isChosen ? theme.colors.primary[600] : theme.colors.neutral[400]}
                            />
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={isChosen ? theme.colors.primary[800] : theme.colors.text.primary}
                              style={{ marginLeft: 6 }}
                            >
                              {opt.label}
                            </AppText>
                          </View>
                          <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 2 }}>
                            {opt.desc}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Growth Progress % */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="caption" weight="bold">
                      Tiến độ sinh trưởng (%):
                    </AppText>
                    <View style={styles.progressPercentBadge}>
                      <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                        {growthProgress}%
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.quickPercentRow}>
                    <Pressable
                      style={styles.percentQuickBtn}
                      onPress={() => handleQuickAddPercent(5)}
                    >
                      <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                        +5%
                      </AppText>
                    </Pressable>
                    <Pressable
                      style={styles.percentQuickBtn}
                      onPress={() => handleQuickAddPercent(10)}
                    >
                      <AppText variant="caption" weight="bold" color={theme.colors.primary[700]}>
                        +10%
                      </AppText>
                    </Pressable>
                    {['25', '50', '75', '100'].map((val) => (
                      <Pressable
                        key={val}
                        onPress={() => setGrowthProgress(val)}
                        style={[
                          styles.percentQuickBtn,
                          growthProgress === val && styles.percentQuickBtnActive,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight={growthProgress === val ? 'bold' : 'normal'}
                          color={growthProgress === val ? '#FFFFFF' : theme.colors.text.primary}
                        >
                          {val}%
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={growthProgress}
                    onChangeText={setGrowthProgress}
                    placeholder="Nhập phần trăm (0 - 100)"
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>

                {/* 4. Tray condition */}
                <View style={styles.inputGroup}>
                  <AppText variant="caption" weight="bold">
                    Tình trạng khay (trayCondition):
                  </AppText>
                  <TextInput
                    style={styles.textInput}
                    value={trayCondition}
                    onChangeText={setTrayCondition}
                    placeholder="Ví dụ: Khay sạch, đủ ẩm, thoát nước tốt..."
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>

                {/* 5. Mushroom condition */}
                <View style={styles.inputGroup}>
                  <AppText variant="caption" weight="bold">
                    Tình trạng nấm (mushroomCondition):
                  </AppText>
                  <TextInput
                    style={styles.textInput}
                    value={mushroomCondition}
                    onChangeText={setMushroomCondition}
                    placeholder="Ví dụ: Nấm mọc đồng đều, tai nấm dày, màu sắc tự nhiên..."
                    placeholderTextColor={theme.colors.text.muted}
                  />
                </View>

                {/* 6. Notes */}
                <View style={styles.inputGroup}>
                  <AppText variant="caption" weight="bold">
                    Ghi chú chi tiết (notes):
                  </AppText>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Ghi chú thêm về quan sát thực tế (tùy chọn)..."
                    placeholderTextColor={theme.colors.text.muted}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* 7. Photos Section */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="caption" weight="bold">
                      Ảnh chụp thực tế ({images.length} ảnh):
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <AppButton
                        title="Chụp ảnh"
                        variant="outline"
                        size="sm"
                        leftIcon={<Ionicons name="camera" size={14} color={theme.colors.primary[600]} />}
                        onPress={handleTakePhoto}
                      />
                      <AppButton
                        title="Thư viện"
                        variant="outline"
                        size="sm"
                        leftIcon={<Ionicons name="images" size={14} color={theme.colors.primary[600]} />}
                        onPress={handlePickLibrary}
                      />
                    </View>
                  </View>

                  {images.length === 0 ? (
                    <View style={styles.emptyImageBox}>
                      <Ionicons name="image-outline" size={32} color={theme.colors.neutral[300]} />
                      <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 4 }}>
                        Chưa chọn ảnh nào. Khuyến khích chụp ít nhất 1 ảnh khay nấm để khách hàng theo dõi.
                      </AppText>
                    </View>
                  ) : (
                    <View style={styles.imagesGrid}>
                      {images.map((item, idx) => {
                        const isFailed = failedImageIndices.includes(idx);
                        return (
                          <View key={idx} style={styles.imageItemCard}>
                            <Image source={{ uri: item.uri }} style={styles.imageThumbnail} />
                            {item.uploaded && (
                              <View style={styles.uploadedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success.dark} />
                              </View>
                            )}
                            {isFailed && (
                              <View style={styles.failedBadge}>
                                <Ionicons name="close-circle" size={16} color={theme.colors.error.dark} />
                              </View>
                            )}
                            <Pressable style={styles.removeImageBtn} onPress={() => handleRemoveImage(idx)}>
                              <Ionicons name="trash" size={12} color="#FFFFFF" />
                            </Pressable>
                            <Pressable style={styles.captionRow} onPress={() => handleOpenCaptionEditor(idx)}>
                              <AppText variant="caption" numberOfLines={1} style={{ fontSize: 10 }}>
                                {item.caption ? item.caption : 'Thêm chú thích...'}
                              </AppText>
                              <Ionicons name="pencil" size={10} color={theme.colors.text.muted} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Caption editing bottom sub-sheet */}
                {editingCaptionIndex !== null && (
                  <AppCard elevation="xs" style={styles.captionEditCard}>
                    <AppText variant="caption" weight="bold">
                      Chú thích ảnh #{editingCaptionIndex + 1}:
                    </AppText>
                    <TextInput
                      style={styles.textInput}
                      value={captionInput}
                      onChangeText={setCaptionInput}
                      placeholder="Ví dụ: Cận cảnh mật độ nấm non ở góc khay..."
                      maxLength={500}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <AppButton
                        title="Hủy"
                        variant="ghost"
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
                  </AppCard>
                )}

                {/* Retry failed images button */}
                {failedImageIndices.length > 0 && createdInspectionId && (
                  <AppButton
                    title={`Tải lại ${failedImageIndices.length} ảnh bị lỗi`}
                    variant="secondary"
                    loading={submitting}
                    onPress={handleRetryFailedImages}
                    style={{ marginBottom: 12 }}
                  />
                )}

                {/* Submit button */}
                <AppButton
                  title={
                    createdInspectionId
                      ? 'Hoàn tất báo cáo'
                      : 'Lưu báo cáo khay hằng ngày'
                  }
                  variant="primary"
                  loading={submitting}
                  disabled={submitting || trays.length === 0}
                  onPress={handleSubmit}
                  style={{ marginTop: 8, marginBottom: 24 }}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '92%',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollArea: {
    marginTop: theme.spacing.xs,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning.light,
    borderColor: theme.colors.warning.main,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  trayPillsRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
  },
  trayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  trayPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  stageOptionsContainer: {
    gap: 8,
    marginTop: 6,
  },
  stageOptionCard: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: '#FFFFFF',
  },
  stageOptionCardActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  stageOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressPercentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.sm,
  },
  quickPercentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  percentQuickBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[50],
  },
  percentQuickBtnActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  emptyImageBox: {
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 6,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageItemCard: {
    width: 100,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: 80,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  failedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    backgroundColor: theme.colors.neutral[50],
  },
  captionEditCard: {
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.primary[300],
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
});

