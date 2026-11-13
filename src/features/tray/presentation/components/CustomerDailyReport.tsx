import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { cultivationRepository } from '../../../cultivation/data/repositories/CultivationRepository';
import {
  DailyTrayInspection,
  DailyTrayInspectionImage,
} from '../../../cultivation/domain/entities/Cultivation';
import { AppButton, AppCard, AppText } from '../../../../shared/components';

const STAGE_LABELS: Record<string, string> = {
  FRUITING_INITIATION: 'Bắt đầu tạo quả thể',
  PINNING: 'Ra nụ',
  YOUNG_FRUITING: 'Nấm non',
  MATURATION: 'Trưởng thành',
};

interface CustomerDailyReportProps {
  sessionId: number;
  trayId: number;
}

interface ReportPhoto {
  image: DailyTrayInspectionImage;
  report: DailyTrayInspection;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions): string {
  return parseLocalDateKey(dateKey).toLocaleDateString('vi-VN', options);
}

function getDateRange(startAt?: string): string[] {
  if (!startAt) return [];
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return [];

  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start > today) return [];

  const dates: string[] = [];
  for (const date = new Date(today); date >= start; date.setDate(date.getDate() - 1)) {
    dates.push(getLocalDateKey(date));
  }
  return dates;
}

export const CustomerDailyReport: React.FC<CustomerDailyReportProps> = ({ sessionId, trayId }) => {
  const [inspections, setInspections] = useState<DailyTrayInspection[]>([]);
  const [startAt, setStartAt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    void cultivationRepository
      .getAllDailyInspectionHistory(sessionId)
      .then((history) => {
        if (!active) return;
        setInspections(history.inspections ?? []);
        setStartAt(history.session?.startAt);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error ? error.message : 'Không thể tải báo cáo sinh trưởng.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId, retryCount]);

  const availableDates = useMemo(() => getDateRange(startAt), [startAt]);
  const activeSelectedDate =
    availableDates.length > 0 && !availableDates.includes(selectedDate)
      ? availableDates[0]
      : selectedDate;
  const trayInspections = useMemo(
    () => inspections.filter((inspection) => inspection.trayId === trayId),
    [inspections, trayId]
  );
  const inspectionCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inspection of trayInspections) {
      const dateKey = getLocalDateKey(new Date(inspection.inspectionDate));
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
    return counts;
  }, [trayInspections]);
  const reportsForDate = useMemo(
    () =>
      trayInspections.filter(
        (inspection) => getLocalDateKey(new Date(inspection.inspectionDate)) === activeSelectedDate
      ),
    [activeSelectedDate, trayInspections]
  );

  const retry = useCallback(() => {
    setLoading(true);
    setErrorMessage(null);
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionTitle}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary[700]} />
          <AppText variant="bodyMedium" weight="bold">
            Báo cáo sinh trưởng theo ngày
          </AppText>
        </View>
        {availableDates.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn ngày xem báo cáo nấm"
            onPress={() => setDatePickerVisible(true)}
            style={styles.dateSelector}
          >
            <AppText variant="captionMedium" weight="semibold" color={theme.colors.primary[700]}>
              {getDateLabel(activeSelectedDate, { day: '2-digit', month: 'short', year: 'numeric' })}
            </AppText>
            <Ionicons name="chevron-down" size={15} color={theme.colors.primary[700]} />
          </Pressable>
        ) : null}
      </View>

  
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.colors.primary[600]} />
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Đang tải báo cáo từ Farm Operator...
          </AppText>
        </View>
      ) : errorMessage ? (
        <View style={styles.state}>
          <AppText variant="caption" color={theme.colors.error.main} align="center">
            {errorMessage}
          </AppText>
          <AppButton title="Thử lại" variant="outline" size="sm" onPress={retry} />
        </View>
      ) : availableDates.length === 0 ? (
        <View style={styles.state}>
          <AppText variant="caption" color={theme.colors.text.secondary} align="center">
            Chưa xác định được ngày bắt đầu trồng của khay.
          </AppText>
        </View>
      ) : reportsForDate.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={22} color={theme.colors.text.muted} />
          <AppText variant="caption" color={theme.colors.text.secondary} align="center">
            Chưa có báo cáo cho khay này vào ngày đã chọn.
          </AppText>
        </View>
      ) : (
        reportsForDate.map((report) => (
          <ReportCard key={report.inspectionId} report={report} onPressPhoto={setPhoto} />
        ))
      )}

      <DatePickerModal
        visible={datePickerVisible}
        dates={availableDates}
        selectedDate={activeSelectedDate}
        reportCountByDate={inspectionCountByDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(dateKey) => {
          setSelectedDate(dateKey);
          setDatePickerVisible(false);
        }}
      />
      <PhotoViewer photo={photo} onClose={() => setPhoto(null)} />
    </View>
  );
};

const ReportCard: React.FC<{
  report: DailyTrayInspection;
  onPressPhoto: (photo: ReportPhoto) => void;
}> = ({ report, onPressPhoto }) => {
  const progress = Number(report.growthProgress);
  const stageLabel = STAGE_LABELS[report.growthStage] ?? report.growthStage;

  return (
    <AppCard elevation="xs" style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportHeading}>
          <AppText variant="bodyMedium" weight="bold" color={theme.colors.text.primary}>
            {stageLabel}
          </AppText>
          <AppText variant="caption" color={theme.colors.text.muted}>
            {new Date(report.inspectionDate).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {report.inspectedByName ? ` · ${report.inspectedByName}` : ''}
          </AppText>
        </View>
        <View style={styles.progressValue}>
          <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[700]}>
            {Number.isFinite(progress) ? `${progress}%` : '--'}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0}%` },
          ]}
        />
      </View>
      <AppText variant="caption" color={theme.colors.text.secondary}>
        Tiến độ sinh trưởng
      </AppText>

      <View style={styles.conditions}>
        <View style={styles.conditionRow}>
          <Ionicons name="cube-outline" size={16} color={theme.colors.primary[700]} />
          <AppText variant="caption" color={theme.colors.text.secondary} style={styles.conditionText}>
            Tình trạng khay: <AppText variant="caption" weight="semibold">{report.trayCondition || 'Chưa ghi nhận'}</AppText>
          </AppText>
        </View>
        <View style={styles.conditionRow}>
          <Ionicons name="leaf-outline" size={16} color={theme.colors.success.dark} />
          <AppText variant="caption" color={theme.colors.text.secondary} style={styles.conditionText}>
            Tình trạng nấm: <AppText variant="caption" weight="semibold">{report.mushroomCondition || 'Chưa ghi nhận'}</AppText>
          </AppText>
        </View>
      </View>

      {report.notes ? (
        <View style={styles.notes}>
          <AppText variant="caption" weight="bold" color={theme.colors.text.primary}>
            Ghi chú chi tiết
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.text.secondary}>
            {report.notes}
          </AppText>
        </View>
      ) : null}

      {report.images?.length ? (
        <View style={styles.photos}>
          <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
            Ảnh thực tế ({report.images.length})
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
            {report.images.map((image) => (
              <Pressable
                key={image.imageId}
                accessibilityRole="imagebutton"
                accessibilityLabel={image.caption || 'Mở ảnh báo cáo sinh trưởng'}
                onPress={() => onPressPhoto({ image, report })}
              >
                <Image
                  source={{ uri: image.imageUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <AppText variant="caption" color={theme.colors.text.muted}>
          Báo cáo này chưa có ảnh thực tế.
        </AppText>
      )}
    </AppCard>
  );
};

const DatePickerModal: React.FC<{
  visible: boolean;
  dates: string[];
  selectedDate: string;
  reportCountByDate: Map<string, number>;
  onClose: () => void;
  onSelect: (dateKey: string) => void;
}> = ({ visible, dates, selectedDate, reportCountByDate, onClose, onSelect }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.dateModal}>
        <View style={styles.modalHeader}>
          <View>
            <AppText variant="bodyMedium" weight="bold">Chọn ngày báo cáo</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Từ ngày bắt đầu trồng đến hôm nay
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn ngày" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {dates.map((dateKey) => {
            const count = reportCountByDate.get(dateKey) ?? 0;
            const isSelected = dateKey === selectedDate;
            return (
              <Pressable
                key={dateKey}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(dateKey)}
                style={[styles.dateRow, isSelected && styles.dateRowSelected]}
              >
                <View style={styles.dateRowText}>
                  <AppText variant="bodySmall" weight={isSelected ? 'bold' : 'medium'}>
                    {getDateLabel(dateKey, {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </AppText>
                  <AppText variant="caption" color={count > 0 ? theme.colors.primary[700] : theme.colors.text.muted}>
                    {count > 0 ? `${count} báo cáo` : 'Chưa có báo cáo'}
                  </AppText>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[700]} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const PhotoViewer: React.FC<{
  photo: ReportPhoto | null;
  onClose: () => void;
}> = ({ photo, onClose }) => (
  <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.photoBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {photo ? (
        <>
          <View style={styles.photoHeader}>
            <View style={styles.photoHeaderText}>
              <AppText variant="bodyMedium" weight="bold" color="#FFFFFF">
                {photo.report.trayCode || 'Báo cáo khay'}
              </AppText>
              <AppText variant="caption" color="#D1D5DB">
                {new Date(photo.report.inspectionDate).toLocaleString('vi-VN')}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng ảnh" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
          <Image
            source={{ uri: photo.image.imageUrl }}
            style={styles.fullscreenPhoto}
            contentFit="contain"
          />
          {photo.image.caption ? (
            <View style={styles.photoCaption}>
              <AppText variant="bodySmall" color="#FFFFFF">{photo.image.caption}</AppText>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
  },
  state: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
  },
  reportCard: {
    gap: theme.spacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reportHeading: {
    flex: 1,
    gap: 2,
  },
  progressValue: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[200],
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[600],
  },
  conditions: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  conditionText: {
    flex: 1,
  },
  notes: {
    gap: theme.spacing.xs,
  },
  photos: {
    gap: theme.spacing.xs,
  },
  photoList: {
    gap: theme.spacing.sm,
  },
  thumbnail: {
    width: 104,
    height: 88,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dateModal: {
    maxHeight: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.background.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  dateRowSelected: {
    backgroundColor: theme.colors.primary[50],
  },
  dateRowText: {
    gap: 2,
  },
  photoBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  photoHeader: {
    position: 'absolute',
    top: 56,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  photoHeaderText: {
    flex: 1,
  },
  fullscreenPhoto: {
    width: '100%',
    height: '72%',
  },
  photoCaption: {
    position: 'absolute',
    bottom: 36,
    left: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
});
