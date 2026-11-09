import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  CultivationSessionAdmin,
  ProgressHistoryItem,
  SessionProgressResponse,
} from '../../../iot/domain/entities/Iot';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';
import { formatVietnameseDisplayDate } from './GrowthUpdateModal';

interface SessionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin | null;
  onRefreshParent?: () => Promise<void> | void;
  onOpenGrowthUpdate?: (session: CultivationSessionAdmin, latestProgress?: ProgressHistoryItem | null) => void;
  onOpenHarvestReadiness?: (session: CultivationSessionAdmin) => void;
  onOpenHarvestAction?: (session: CultivationSessionAdmin) => void;
  onOpenSpawnInspection?: (session: CultivationSessionAdmin) => void;
  onOpenSpawnHistory?: (session: CultivationSessionAdmin) => void;
  onOpenDailyTrayInspection?: (session: CultivationSessionAdmin, sessionTrayId?: number | null) => void;
  onOpenDailyTrayInspectionHistory?: (session: CultivationSessionAdmin, sessionTrayId?: number | null) => void;
  onTransitionStage?: (session: CultivationSessionAdmin, stage: 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION') => void;
  onNavigateToAssignTrays?: () => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  visible,
  onClose,
  session,
  onRefreshParent,
  onOpenGrowthUpdate,
  onOpenHarvestReadiness,
  onOpenHarvestAction,
  onOpenSpawnInspection,
  onOpenSpawnHistory,
  onOpenDailyTrayInspection,
  onOpenDailyTrayInspectionHistory,
  onTransitionStage,
  onNavigateToAssignTrays,
}) => {
  if (!visible || !session) return null;

  return (
    <SessionDetailModalContent
      visible={visible}
      onClose={onClose}
      session={session}
      onRefreshParent={onRefreshParent}
      onOpenGrowthUpdate={onOpenGrowthUpdate}
      onOpenHarvestReadiness={onOpenHarvestReadiness}
      onOpenHarvestAction={onOpenHarvestAction}
      onOpenSpawnInspection={onOpenSpawnInspection}
      onOpenSpawnHistory={onOpenSpawnHistory}
      onOpenDailyTrayInspection={onOpenDailyTrayInspection}
      onOpenDailyTrayInspectionHistory={onOpenDailyTrayInspectionHistory}
      onTransitionStage={onTransitionStage}
      onNavigateToAssignTrays={onNavigateToAssignTrays}
    />
  );
};

const SessionDetailModalContent: React.FC<{
  visible: boolean;
  onClose: () => void;
  session: CultivationSessionAdmin;
  onRefreshParent?: () => Promise<void> | void;
  onOpenGrowthUpdate?: (session: CultivationSessionAdmin, latestProgress?: ProgressHistoryItem | null) => void;
  onOpenHarvestReadiness?: (session: CultivationSessionAdmin) => void;
  onOpenHarvestAction?: (session: CultivationSessionAdmin) => void;
  onOpenSpawnInspection?: (session: CultivationSessionAdmin) => void;
  onOpenSpawnHistory?: (session: CultivationSessionAdmin) => void;
  onOpenDailyTrayInspection?: (session: CultivationSessionAdmin, sessionTrayId?: number | null) => void;
  onOpenDailyTrayInspectionHistory?: (session: CultivationSessionAdmin, sessionTrayId?: number | null) => void;
  onTransitionStage?: (session: CultivationSessionAdmin, stage: 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION') => void;
  onNavigateToAssignTrays?: () => void;
}> = ({
  visible,
  onClose,
  session,
  onOpenGrowthUpdate,
  onOpenHarvestReadiness,
  onOpenHarvestAction,
  onOpenSpawnInspection,
  onOpenSpawnHistory,
  onOpenDailyTrayInspection,
  onOpenDailyTrayInspectionHistory,
  onTransitionStage,
  onNavigateToAssignTrays,
}) => {
  const [loading, setLoading] = useState(true);
  const [sessionDetail, setSessionDetail] = useState<CultivationSessionAdmin | null>(null);
  const [progressData, setProgressData] = useState<SessionProgressResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected tray for targeted daily report
  const [selectedSessionTrayId, setSelectedSessionTrayId] = useState<number | null>(null);

  const fetchFullDetail = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch cultivation session admin detail
      try {
        const detail = await iotRepository.getSessionAdminDetail(session.session_id);
        setSessionDetail(detail);
        if (detail.trays && detail.trays.length > 0) {
          setSelectedSessionTrayId(detail.trays[0].session_tray_id);
        }
      } catch {
        // Fallback to current session object
        setSessionDetail(session);
        if (session.trays && session.trays.length > 0) {
          setSelectedSessionTrayId(session.trays[0].session_tray_id);
        }
      }

      // 2. Fetch progress history
      try {
        const prog = await iotRepository.getSessionProgress(session.session_id);
        setProgressData(prog);
      } catch {
        setProgressData(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải toàn bộ chi tiết phiên.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        void fetchFullDetail();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchFullDetail]);

  const current = sessionDetail || session;
  const reqTrays = current.required_trays || current.tray_quantity || 1;
  const spawnQuantity = current.spawn_quantity || reqTrays * 3;
  const assignedTrays = current.trays || [];
  const hasAssignedTrays = assignedTrays.length > 0;

  // Stages & Progress
  const growthStage = (
    progressData?.growth_status ||
    progressData?.current_stage ||
    current.growth_status ||
    current.current_stage ||
    ''
  ).toUpperCase();

  const progressPercent =
    progressData?.progress_percent != null
      ? progressData.progress_percent
      : current.progress_percent != null
      ? current.progress_percent
      : 0;

  const conditionText = progressData?.condition || current.condition || 'Bình thường (NORMAL)';
  const harvestStatus = current.status === 'COMPLETED'
    ? 'COMPLETED'
    : (progressData?.harvest_status || current.harvest_status || (current.harvest_ready ? 'HARVEST_READY' : 'NOT_READY'));

  const expectedHarvest = progressData?.expected_harvest_date || current.harvest_date;

  const renderStatusBadge = (status: string) => {
    let bg: string = theme.colors.neutral[100];
    let color: string = theme.colors.text.secondary;

    if (status === 'PENDING') {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = theme.colors.warning.dark;
    } else if (status === 'CULTIVATING') {
      bg = 'rgba(34, 197, 94, 0.15)';
      color = theme.colors.success.dark;
    } else if (status === 'READY_FOR_CULTIVATION') {
      bg = 'rgba(245, 158, 11, 0.2)';
      color = theme.colors.warning.dark;
    } else if (status === 'HARVESTING' || status === 'SPAWN_RESTING' || status === 'MYCELIAL_DEVELOPMENT') {
      bg = 'rgba(14, 165, 233, 0.15)';
      color = theme.colors.info.dark;
    } else if (status === 'COMPLETED') {
      bg = 'rgba(100, 116, 139, 0.15)';
      color = theme.colors.text.secondary;
    } else if (status === 'CANCELLED') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = theme.colors.error.dark;
    }

    return (
      <View style={[styles.badgePill, { backgroundColor: bg }]}>
        <AppText variant="caption" weight="bold" color={color}>
          {status}
        </AppText>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <AppText variant="h3" weight="bold">
                  Phiên nuôi trồng #{current.session_id}
                </AppText>
                {renderStatusBadge(current.status)}
              </View>
              {current.order_id && (
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Đơn hàng: #{current.order_id} • Khách: {current.customer_name || 'Khách hàng SmartMush'}
                </AppText>
              )}
            </View>
            <AppIconButton
              icon={<Ionicons name="close" size={22} color={theme.colors.text.secondary} />}
              size="sm"
              accessibilityLabel="Đóng"
              onPress={onClose}
            />
          </View>

          <AppDivider spacing="none" />

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
                  Đang tải chi tiết phiên và lịch sử...
                </AppText>
              </View>
            ) : (
              <>
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.error.main} />
                    <AppText variant="caption" color={theme.colors.error.dark} style={{ flex: 1 }}>
                      {errorMessage}
                    </AppText>
                  </View>
                )}

                {/* Status overview cards */}
                <View style={styles.metricsRow}>
                  {/* Growth stage */}
                  <View style={styles.metricCard}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Giai đoạn sinh trưởng
                    </AppText>
                    <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[700]}>
                      {growthStage || 'Chưa ghi nhận'}
                    </AppText>
                    {growthStage ? (
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
                      </View>
                    ) : null}
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Tiến độ: {progressPercent}%
                    </AppText>
                  </View>

                  {/* Harvest readiness */}
                  <View style={styles.metricCard}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Trạng thái thu hoạch
                    </AppText>
                    <View style={styles.harvestStatusBadgeBox}>
                      <Ionicons
                        name={harvestStatus === 'HARVEST_READY' ? 'checkmark-circle' : 'hourglass-outline'}
                        size={16}
                        color={harvestStatus === 'HARVEST_READY' ? theme.colors.success.dark : theme.colors.warning.dark}
                      />
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={harvestStatus === 'HARVEST_READY' ? theme.colors.success.dark : theme.colors.warning.dark}
                      >
                        {harvestStatus}
                      </AppText>
                    </View>
                    {expectedHarvest && (
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Dự kiến: {formatVietnameseDisplayDate(expectedHarvest)}
                      </AppText>
                    )}
                  </View>
                </View>

                {/* Mushroom & Floor Summary */}
                <AppCard elevation="none" style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="leaf-outline" size={18} color={theme.colors.primary[600]} />
                    <AppText variant="label" weight="bold">
                      THÔNG TIN GIỐNG NẤM & QUY MÔ
                    </AppText>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Giống nấm
                      </AppText>
                      <AppText variant="bodySmall" weight="bold">
                        {current.mushroom_name || 'Nấm giống'}
                      </AppText>
                    </View>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Quy mô nuôi trồng
                      </AppText>
                      <AppText variant="bodySmall" weight="bold">
                        {reqTrays} khay • {spawnQuantity} bịch phôi
                      </AppText>
                    </View>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Vị trí tầng nuôi trồng
                      </AppText>
                      {(() => {
                        const assignedFloorName =
                          current.floor_name ||
                          current.trays?.[0]?.floor_name ||
                          (current.floor_id != null ? `Tầng ${current.floor_id}` : null) ||
                          (current.trays?.[0]?.floor_id != null ? `Tầng ${current.trays[0].floor_id}` : null);
                        return (
                          <AppText
                            variant="bodySmall"
                            weight="bold"
                            color={
                              assignedFloorName
                                ? theme.colors.text.primary
                                : theme.colors.warning.dark
                            }
                          >
                            {assignedFloorName || 'Chưa gán tầng'}
                          </AppText>
                        );
                      })()}
                    </View>
                    <View style={styles.gridCol}>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Tình trạng quan sát
                      </AppText>
                      <AppText variant="bodySmall" weight="bold">
                        {conditionText}
                      </AppText>
                    </View>
                  </View>
                </AppCard>

                {/* ========================================================================= */}
                {/* SECTION 1: KIỂM TRA PHÔI THEO PHIÊN (Chung cả phiên) */}
                {/* ========================================================================= */}
                <AppCard elevation="none" style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="flask-outline" size={18} color="#0284C7" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" weight="bold" color="#0369A1">
                        1. KIỂM TRA PHÔI THEO PHIÊN
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Kiểm tra chất lượng và số lượng bịch phôi chung cho cả phiên (không gắn riêng từng khay).
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.workflowDetailBox}>
                    <View style={styles.workflowDetailRow}>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Tiêu chuẩn phôi phiên:
                      </AppText>
                      <AppText variant="caption" weight="bold">
                        {spawnQuantity} bịch ({reqTrays} khay × 3 bịch/khay)
                      </AppText>
                    </View>
                    <View style={[styles.workflowDetailRow, { marginTop: 4 }]}>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Trạng thái phôi:
                      </AppText>
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={current.spawn_issued ? theme.colors.success.dark : theme.colors.warning.dark}
                      >
                        {current.spawn_status || (current.spawn_issued ? 'Đã xuất kho phôi' : 'Chờ xuất phôi')}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.sectionButtonsRow}>
                    {onOpenSpawnInspection && (
                      <AppButton
                        title="Kiểm tra phôi"
                        variant="primary"
                        size="sm"
                        leftIcon={<Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />}
                        onPress={() => {
                          onClose();
                          onOpenSpawnInspection(current);
                        }}
                        style={{ flex: 1 }}
                      />
                    )}
                    {onOpenSpawnHistory && (
                      <AppButton
                        title="Lịch sử kiểm tra phôi"
                        variant="outline"
                        size="sm"
                        leftIcon={<Ionicons name="time-outline" size={16} color={theme.colors.primary[600]} />}
                        onPress={() => {
                          onClose();
                          onOpenSpawnHistory(current);
                        }}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
                </AppCard>

                {/* ========================================================================= */}
                {/* SECTION 2: BÁO CÁO KHAY HẰNG NGÀY (Theo từng khay) */}
                {/* ========================================================================= */}
                <AppCard elevation="none" style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="grid-outline" size={18} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" weight="bold" color="#047857">
                        2. BÁO CÁO KHAY HẰNG NGÀY
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.muted}>
                        Báo cáo sinh trưởng, hình ảnh quả thể và tình trạng theo từng khay vật lý riêng biệt.
                      </AppText>
                    </View>
                  </View>

                  {/* Tray List / Assignment Status */}
                  <View style={styles.traysListBox}>
                    <View style={styles.trayHeaderRow}>
                      <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
                        Danh sách khay ({assignedTrays.length}/{reqTrays} khay):
                      </AppText>
                      {hasAssignedTrays && (
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          Chạm để chọn khay báo cáo
                        </AppText>
                      )}
                    </View>

                    {hasAssignedTrays ? (
                      <View style={styles.traysChipContainer}>
                        {assignedTrays.map((tray) => {
                          const isSelected = selectedSessionTrayId === tray.session_tray_id;
                          return (
                            <Pressable
                              key={tray.session_tray_id || tray.tray_id}
                              onPress={() => setSelectedSessionTrayId(tray.session_tray_id)}
                              style={[styles.traySelectChip, isSelected && styles.traySelectChipActive]}
                            >
                              <Ionicons
                                name="cube"
                                size={13}
                                color={isSelected ? '#FFFFFF' : theme.colors.primary[600]}
                              />
                              <AppText
                                variant="caption"
                                weight="bold"
                                color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                              >
                                {tray.tray_code}
                              </AppText>
                              {tray.row_number != null && tray.column_number != null && (
                                <AppText
                                  variant="caption"
                                  color={isSelected ? 'rgba(255,255,255,0.85)' : theme.colors.text.muted}
                                >
                                  (H{tray.row_number}-C{tray.column_number})
                                </AppText>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.unassignedWarningBox}>
                        <Ionicons name="warning-outline" size={18} color={theme.colors.warning.dark} />
                        <View style={{ flex: 1, marginLeft: 6 }}>
                          <AppText variant="caption" weight="bold" color={theme.colors.warning.dark}>
                            Chưa gán khay vật lý
                          </AppText>
                          <AppText variant="caption" color={theme.colors.warning.dark}>
                            Phiên nuôi trồng chưa được xếp vào khay tầng. Bạn cần xếp khay vào tầng trước khi có thể tạo báo cáo theo khay.
                          </AppText>
                        </View>
                        {onNavigateToAssignTrays && (
                          <AppButton
                            title="Xếp khay ngay"
                            variant="primary"
                            size="sm"
                            onPress={() => {
                              onClose();
                              onNavigateToAssignTrays();
                            }}
                          />
                        )}
                      </View>
                    )}
                  </View>

                  {/* Actions for Daily Tray Report */}
                  <View style={styles.sectionButtonsRow}>
                    <AppButton
                      title={hasAssignedTrays ? 'Tạo báo cáo khay' : 'Chưa gán khay'}
                      variant="primary"
                      size="sm"
                      leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                      disabled={!hasAssignedTrays || !onOpenDailyTrayInspection}
                      onPress={() => {
                        if (!hasAssignedTrays) return;
                        onClose();
                        onOpenDailyTrayInspection?.(current, selectedSessionTrayId);
                      }}
                      style={{ flex: 1 }}
                    />
                    <AppButton
                      title="Lịch sử báo cáo khay"
                      variant="outline"
                      size="sm"
                      leftIcon={<Ionicons name="images-outline" size={16} color={theme.colors.primary[600]} />}
                      disabled={!onOpenDailyTrayInspectionHistory}
                      onPress={() => {
                        onClose();
                        onOpenDailyTrayInspectionHistory?.(current, selectedSessionTrayId);
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </AppCard>

                {/* Progress History Timeline */}
                <AppCard elevation="none" style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.primary[600]} />
                    <AppText variant="label" weight="bold">
                      LỊCH SỬ TIẾN ĐỘ SINH TRƯỞNG (WF-03)
                    </AppText>
                  </View>

                  {progressData?.progress_history && progressData.progress_history.length > 0 ? (
                    <View style={styles.timelineContainer}>
                      {progressData.progress_history.map((item, index) => {
                        const isLatest = index === progressData.progress_history.length - 1;
                        return (
                          <View key={item.progress_id || index} style={styles.timelineItem}>
                            <View style={styles.timelineDotLine}>
                              <View style={[styles.timelineDot, isLatest && styles.timelineDotLatest]} />
                              {index < progressData.progress_history.length - 1 && (
                                <View style={styles.timelineLine} />
                              )}
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <AppText variant="bodySmall" weight="bold" color={isLatest ? theme.colors.primary[700] : theme.colors.text.primary}>
                                  {item.current_stage} ({item.progress_percent}%)
                                </AppText>
                                <AppText variant="caption" color={theme.colors.text.muted}>
                                  {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
                                </AppText>
                              </View>
                              <AppText variant="caption" color={theme.colors.text.secondary}>
                                Tình trạng: <AppText variant="caption" weight="medium">{item.condition || 'Bình thường'}</AppText>
                              </AppText>
                              {item.description && (
                                <AppText variant="caption" color={theme.colors.text.muted}>
                                  {item.description}
                                </AppText>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Chưa có lịch sử cập nhật sinh trưởng nào được ghi nhận.
                    </AppText>
                  )}
                </AppCard>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Bar Footer */}
          <View style={styles.footer}>
            {/* If PENDING */}
            {current.status === 'PENDING' && onTransitionStage && (
              <AppButton
                title="Bắt đầu ủ tơ / Hồi sức"
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="flask-outline" size={18} color="#FFFFFF" />}
                onPress={() => {
                  onClose();
                  onTransitionStage(current, 'SPAWN_RESTING');
                }}
                style={{ flex: 1 }}
              />
            )}

            {/* If SPAWN_RESTING or MYCELIAL_DEVELOPMENT */}
            {(current.status === 'SPAWN_RESTING' || current.status === 'MYCELIAL_DEVELOPMENT') && (
              <View style={styles.footerActionCol}>
                <View style={styles.footerActionRow}>
                  {onOpenSpawnInspection && (
                    <AppButton
                      title="Kiểm tra phôi"
                      variant="primary"
                      size="sm"
                      leftIcon={<Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />}
                      onPress={() => {
                        onClose();
                        onOpenSpawnInspection(current);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                  {onOpenSpawnHistory && (
                    <AppButton
                      title="Lịch sử kiểm tra"
                      variant="outline"
                      size="sm"
                      leftIcon={<Ionicons name="time-outline" size={16} color={theme.colors.primary[600]} />}
                      onPress={() => {
                        onClose();
                        onOpenSpawnHistory(current);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
                {onTransitionStage && (
                  <AppButton
                    title="Xác nhận Sẵn sàng trồng (READY_FOR_CULTIVATION)"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Ionicons name="checkmark-done" size={16} color={theme.colors.success.dark} />}
                    onPress={() => {
                      onClose();
                      onTransitionStage(current, 'READY_FOR_CULTIVATION');
                    }}
                  />
                )}
              </View>
            )}

            {/* If READY_FOR_CULTIVATION */}
            {current.status === 'READY_FOR_CULTIVATION' && onNavigateToAssignTrays && (
              <AppButton
                title="Xếp khay vào tầng"
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="grid-outline" size={18} color="#FFFFFF" />}
                onPress={() => {
                  onClose();
                  onNavigateToAssignTrays();
                }}
                style={{ flex: 1 }}
              />
            )}

            {/* If CULTIVATING */}
            {current.status === 'CULTIVATING' && (
              <View style={styles.footerActionCol}>
                {/* Primary Daily Report row */}
                <View style={styles.footerActionRow}>
                  <AppButton
                    title="Báo cáo khay"
                    variant="primary"
                    size="sm"
                    leftIcon={<Ionicons name="camera" size={16} color="#FFFFFF" />}
                    disabled={!hasAssignedTrays || !onOpenDailyTrayInspection}
                    onPress={() => {
                      if (!hasAssignedTrays) return;
                      onClose();
                      onOpenDailyTrayInspection?.(current, selectedSessionTrayId);
                    }}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Lịch sử khay"
                    variant="outline"
                    size="sm"
                    leftIcon={<Ionicons name="images-outline" size={16} color={theme.colors.primary[600]} />}
                    disabled={!onOpenDailyTrayInspectionHistory}
                    onPress={() => {
                      onClose();
                      onOpenDailyTrayInspectionHistory?.(current, selectedSessionTrayId);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>

                {/* Secondary management row */}
                <View style={styles.footerActionRow}>
                  {onOpenGrowthUpdate && (
                    <AppButton
                      title="Cập nhật tiến độ"
                      variant="outline"
                      size="sm"
                      leftIcon={<Ionicons name="trending-up" size={16} color={theme.colors.primary[600]} />}
                      onPress={() => {
                        onClose();
                        const latestProg: ProgressHistoryItem | null =
                          progressData?.latest_progress ||
                          (progressData
                            ? {
                                progress_id: 0,
                                session_id: current.session_id,
                                current_stage: (progressData.current_stage ||
                                  progressData.growth_status ||
                                  current.current_stage ||
                                  current.growth_status ||
                                  'FRUITING_INITIATION') as string,
                                progress_percent:
                                  progressData.progress_percent != null
                                    ? Number(progressData.progress_percent)
                                    : current.progress_percent != null
                                    ? Number(current.progress_percent)
                                    : 0,
                                condition: progressData.condition || current.condition || 'NORMAL',
                                description: '',
                                expected_harvest_date:
                                  progressData.expected_harvest_date || current.harvest_date,
                                created_at: new Date().toISOString(),
                              }
                            : null);
                        onOpenGrowthUpdate(current, latestProg);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                  {onOpenHarvestReadiness && (
                    <AppButton
                      title="Đánh giá thu hoạch"
                      variant="outline"
                      size="sm"
                      leftIcon={<Ionicons name="ribbon-outline" size={16} color={theme.colors.primary[600]} />}
                      onPress={() => {
                        onClose();
                        onOpenHarvestReadiness(current);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>

                {harvestStatus === 'HARVEST_READY' && onOpenHarvestAction && (
                  <AppButton
                    title="Quản lý thu hoạch (HARVEST)"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Ionicons name="leaf" size={16} color={theme.colors.success.dark} />}
                    onPress={() => {
                      onClose();
                      onOpenHarvestAction(current);
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '92%',
    minHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: 12,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[600],
  },
  harvestStatusBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sectionCard: {
    padding: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCol: {
    flex: 1,
    minWidth: '45%',
    gap: 2,
  },
  workflowDetailBox: {
    backgroundColor: theme.colors.neutral[50],
    padding: 8,
    borderRadius: theme.borderRadius.sm,
  },
  workflowDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  traysListBox: {
    gap: 6,
  },
  trayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  traysChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  traySelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  traySelectChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[700],
  },
  unassignedWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 8,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  timelineContainer: {
    gap: 12,
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineDotLine: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.neutral[300],
    marginTop: 4,
  },
  timelineDotLatest: {
    backgroundColor: theme.colors.primary[600],
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.neutral[200],
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
  },
  footerActionCol: {
    gap: 8,
    width: '100%',
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
