import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  CultivationTrayInfo,
  FloorMapping,
} from '../../domain/entities/Iot';
import {
  AppBottomSheet,
  AppButton,
  AppCard,
  AppText,
} from '../../../../shared/components';
import { formatMistingCode } from '../../utils/mistingI18n';

interface FloorTraysGridProps {
  floor: FloorMapping;
  trays: CultivationTrayInfo[];
  // Assign session mode props
  isAssignMode?: boolean;
  requiredTrayCount?: number;
  selectedTrayIds?: number[];
  availableTrayIds?: number[];
  onToggleSelectTray?: (trayId: number) => void;
}

export const FloorTraysGrid: React.FC<FloorTraysGridProps> = ({
  floor,
  trays,
  isAssignMode = false,
  selectedTrayIds = [],
  availableTrayIds = [],
  onToggleSelectTray,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTrayDetail, setActiveTrayDetail] = useState<CultivationTrayInfo | null>(null);

  // Group trays by coordinates: row_number & column_number
  const { gridMatrix, maxRows, maxCols, unpositionedTrays } = useMemo(() => {
    let rowsCount = floor.total_rows || 0;
    let colsCount = floor.total_columns || 0;

    const unpositioned: CultivationTrayInfo[] = [];
    const matrix: Record<string, CultivationTrayInfo> = {};

    trays.forEach((tray) => {
      const r = tray.row_number;
      const c = tray.column_number;
      if (r != null && c != null && r > 0 && c > 0) {
        matrix[`${r}_${c}`] = tray;
        if (r > rowsCount) rowsCount = r;
        if (c > colsCount) colsCount = c;
      } else {
        unpositioned.push(tray);
      }
    });

    // Default to at least 1 row / 1 col if trays exist
    rowsCount = Math.max(rowsCount, 1);
    colsCount = Math.max(colsCount, 1);

    return {
      gridMatrix: matrix,
      maxRows: rowsCount,
      maxCols: colsCount,
      unpositionedTrays: unpositioned,
    };
  }, [floor, trays]);

  const handlePressTray = (tray: CultivationTrayInfo) => {
    if (isAssignMode) {
      if (onToggleSelectTray && availableTrayIds.includes(tray.tray_id)) {
        onToggleSelectTray(tray.tray_id);
      }
    } else {
      setActiveTrayDetail(tray);
    }
  };

  const renderTrayStatusVisual = (tray: CultivationTrayInfo, isSelected: boolean) => {
    const hasSession = Boolean(tray.session_id && tray.mushroom_name);
    const isMaintenance =
      tray.tray_status === 'MAINTENANCE' || tray.position_status === 'MAINTENANCE';
    const isEligibleForAssign = availableTrayIds.includes(tray.tray_id);
    const isLegacyBlocked =
      !hasSession && !isMaintenance && !isEligibleForAssign && (tray.tray_status === 'AVAILABLE' || !tray.session_id);

    return {
      hasSession,
      isMaintenance,
      isEligibleForAssign,
      isLegacyBlocked,
      isSelected,
    };
  };

  // Count blocked trays for legend
  const blockedTraysCount = useMemo(() => {
    return trays.filter((t) => {
      const hasSession = Boolean(t.session_id && t.mushroom_name);
      const isMaint = t.tray_status === 'MAINTENANCE' || t.position_status === 'MAINTENANCE';
      return !hasSession && !isMaint && !availableTrayIds.includes(t.tray_id);
    }).length;
  }, [trays, availableTrayIds]);

  return (
    <View style={styles.container}>
      {/* View Switch Header */}
      <View style={styles.topControlRow}>
        <View style={styles.countBadge}>
          <Ionicons name="cube" size={16} color={theme.colors.primary[600]} />
          <AppText variant="caption" weight="bold" color={theme.colors.primary[800]}>
            Tổng: {trays.length} khay ({maxRows}×{maxCols}) • Có thể gắn: {availableTrayIds.length} khay
          </AppText>
        </View>

        <View style={styles.viewModeToggle}>
          <Pressable
            onPress={() => setViewMode('grid')}
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={viewMode === 'grid' ? '#FFFFFF' : theme.colors.text.secondary}
            />
            <AppText
              variant="caption"
              weight="semibold"
              color={viewMode === 'grid' ? '#FFFFFF' : theme.colors.text.secondary}
              style={{ marginLeft: 3, fontSize: 11 }}
            >
              Lưới
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="list-outline"
              size={14}
              color={viewMode === 'list' ? '#FFFFFF' : theme.colors.text.secondary}
            />
            <AppText
              variant="caption"
              weight="semibold"
              color={viewMode === 'list' ? '#FFFFFF' : theme.colors.text.secondary}
              style={{ marginLeft: 3, fontSize: 11 }}
            >
              Danh sách
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Grid Mode */}
      {viewMode === 'grid' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <View style={styles.gridContainer}>
            {/* Column Headers */}
            <View style={styles.columnHeaderRow}>
              <View style={styles.cornerHeaderCell} />
              {Array.from({ length: maxCols }, (_, ci) => ci + 1).map((colNum) => (
                <View key={`col_${colNum}`} style={styles.columnHeaderCell}>
                  <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
                    Cột {colNum}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Rows with Row Headers */}
            {Array.from({ length: maxRows }, (_, ri) => ri + 1).map((rowNum) => (
              <View key={`row_${rowNum}`} style={styles.rowWrapper}>
                <View style={styles.rowHeaderCell}>
                  <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>
                    Hàng {rowNum}
                  </AppText>
                </View>

                {Array.from({ length: maxCols }, (_, ci) => ci + 1).map((colNum) => {
                  const tray = gridMatrix[`${rowNum}_${colNum}`];
                  if (!tray) {
                    return (
                      <View key={`empty_${rowNum}_${colNum}`} style={styles.emptyGridCell}>
                        <AppText variant="caption" color={theme.colors.text.muted} style={{ fontSize: 10 }}>
                          Trống
                        </AppText>
                      </View>
                    );
                  }

                  const isSelected = selectedTrayIds.includes(tray.tray_id);
                  const status = renderTrayStatusVisual(tray, isSelected);
                  const isSelectable = isAssignMode ? status.isEligibleForAssign : true;

                  return (
                    <Pressable
                      key={tray.tray_id}
                      onPress={() => handlePressTray(tray)}
                      disabled={isAssignMode && !isSelectable}
                      style={[
                        styles.gridCell,
                        status.hasSession && styles.cellCultivating,
                        status.isEligibleForAssign && !status.hasSession && styles.cellEligible,
                        status.isLegacyBlocked && styles.cellLegacyBlocked,
                        status.isMaintenance && styles.cellMaintenance,
                        status.isSelected && styles.cellSelected,
                        isAssignMode && !isSelectable && styles.cellDisabled,
                      ]}
                    >
                      {/* Checkmark Badge if Selected */}
                      {status.isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}

                      {/* Icon */}
                      <View style={styles.cellIconBox}>
                        <Ionicons
                          name={
                            status.hasSession
                              ? 'leaf'
                              : status.isLegacyBlocked
                              ? 'lock-closed'
                              : status.isMaintenance
                              ? 'construct'
                              : 'cube-outline'
                          }
                          size={16}
                          color={
                            status.isSelected
                              ? theme.colors.primary[700]
                              : status.hasSession
                              ? theme.colors.success.dark
                              : status.isLegacyBlocked
                              ? theme.colors.warning.dark
                              : status.isMaintenance
                              ? theme.colors.error.main
                              : theme.colors.primary[600]
                          }
                        />
                      </View>

                      <AppText
                        variant="caption"
                        weight="bold"
                        numberOfLines={1}
                        style={{ fontSize: 11, textAlign: 'center' }}
                      >
                        {tray.tray_code}
                      </AppText>

                      {status.hasSession ? (
                        <AppText
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.success.dark}
                          numberOfLines={1}
                          style={{ fontSize: 9, textAlign: 'center' }}
                        >
                          {tray.mushroom_name}
                        </AppText>
                      ) : status.isLegacyBlocked ? (
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={theme.colors.warning.dark}
                          numberOfLines={1}
                          style={{ fontSize: 8, textAlign: 'center' }}
                        >
                          Vướng phiên cũ
                        </AppText>
                      ) : status.isEligibleForAssign ? (
                        <AppText
                          variant="caption"
                          color={theme.colors.primary[700]}
                          weight="semibold"
                          style={{ fontSize: 9 }}
                        >
                          Có thể gắn
                        </AppText>
                      ) : (
                        <AppText
                          variant="caption"
                          color={theme.colors.text.muted}
                          style={{ fontSize: 9 }}
                        >
                          {formatMistingCode('trayStatus', tray.tray_status)}
                        </AppText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* List Mode */
        <View style={styles.listContainer}>
          {trays.map((tray) => {
            const isSelected = selectedTrayIds.includes(tray.tray_id);
            const status = renderTrayStatusVisual(tray, isSelected);
            const isSelectable = isAssignMode ? status.isEligibleForAssign : true;

            return (
              <Pressable
                key={tray.tray_id}
                onPress={() => handlePressTray(tray)}
                disabled={isAssignMode && !isSelectable}
                style={[
                  styles.listItemCard,
                  status.isSelected && styles.cellSelected,
                  status.isLegacyBlocked && styles.listItemBlocked,
                  isAssignMode && !isSelectable && styles.cellDisabled,
                ]}
              >
                <View style={styles.listLeftRow}>
                  <View
                    style={[
                      styles.listIconBox,
                      status.hasSession && styles.listIconBoxCultivating,
                      status.isLegacyBlocked && styles.listIconBoxBlocked,
                      status.isMaintenance && styles.listIconBoxMaintenance,
                    ]}
                  >
                    <Ionicons
                      name={
                        status.hasSession
                          ? 'leaf'
                          : status.isLegacyBlocked
                          ? 'lock-closed'
                          : status.isMaintenance
                          ? 'construct'
                          : 'cube-outline'
                      }
                      size={18}
                      color={
                        status.hasSession
                          ? theme.colors.success.dark
                          : status.isLegacyBlocked
                          ? theme.colors.warning.dark
                          : status.isMaintenance
                          ? theme.colors.error.main
                          : theme.colors.primary[600]
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.listTitleRow}>
                      <AppText variant="bodyMedium" weight="bold">
                        {tray.tray_code}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        {tray.row_number && tray.column_number
                          ? `Hàng ${tray.row_number}, Cột ${tray.column_number}`
                          : 'Chưa có vị trí'}
                      </AppText>
                    </View>

                    {status.hasSession ? (
                      <AppText variant="caption" color={theme.colors.success.dark} weight="semibold">
                        Nấm: {tray.mushroom_name} • Phiên #{tray.session_id}
                      </AppText>
                    ) : status.isLegacyBlocked ? (
                      <AppText variant="caption" color={theme.colors.warning.dark} weight="bold">
                        ⚠️ Vướng liên kết phiên cũ • Không đủ điều kiện gắn
                      </AppText>
                    ) : status.isEligibleForAssign ? (
                      <AppText variant="caption" color={theme.colors.primary[700]} weight="semibold">
                        ✓ Khay trống đủ điều kiện gán phiên
                      </AppText>
                    ) : (
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Trạng thái: {formatMistingCode('trayStatus', tray.tray_status)}
                      </AppText>
                    )}
                  </View>
                </View>

                {isAssignMode ? (
                  status.isEligibleForAssign ? (
                    <View
                      style={[
                        styles.assignCheckbox,
                        status.isSelected && styles.assignCheckboxSelected,
                      ]}
                    >
                      {status.isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  ) : (
                    <Ionicons name="lock-closed" size={16} color={theme.colors.text.muted} />
                  )
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Unpositioned Trays Section */}
      {unpositionedTrays.length > 0 && (
        <AppCard elevation="xs" style={styles.unpositionedCard}>
          <View style={styles.unpositionedHeader}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.warning.dark} />
            <AppText variant="caption" weight="bold" color={theme.colors.warning.dark}>
              Khay chưa có vị trí tọa độ hàng/cột ({unpositionedTrays.length})
            </AppText>
          </View>
          <View style={styles.unpositionedWrap}>
            {unpositionedTrays.map((t) => (
              <Pressable
                key={t.tray_id}
                onPress={() => handlePressTray(t)}
                style={styles.unpositionedPill}
              >
                <AppText variant="caption" weight="bold">
                  {t.tray_code}
                </AppText>
              </Pressable>
            ))}
          </View>
        </AppCard>
      )}

      {/* Legend Bar */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderColor: theme.colors.primary[600], backgroundColor: 'rgba(14, 165, 233, 0.15)' }]} />
          <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
            Có thể gắn ({availableTrayIds.length})
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderColor: theme.colors.success.main, backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} />
          <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
            Đang trồng
          </AppText>
        </View>
        {blockedTraysCount > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: theme.colors.warning.main, backgroundColor: 'rgba(245, 158, 11, 0.15)' }]} />
            <AppText variant="caption" color={theme.colors.warning.dark} style={{ fontSize: 10 }}>
              Vướng liên kết cũ ({blockedTraysCount})
            </AppText>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderColor: theme.colors.error.main, backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} />
          <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
            Bảo trì
          </AppText>
        </View>
        {isAssignMode && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[600] }]} />
            <AppText variant="caption" color={theme.colors.primary[700]} weight="bold" style={{ fontSize: 10 }}>
              Đã chọn ({selectedTrayIds.length})
            </AppText>
          </View>
        )}
      </View>

      {/* Tray Detail Bottom Sheet */}
      <AppBottomSheet
        visible={Boolean(activeTrayDetail)}
        onClose={() => setActiveTrayDetail(null)}
        title={`Chi tiết khay ${activeTrayDetail?.tray_code || ''}`}
      >
        {activeTrayDetail && (
          <View style={styles.sheetDetailBody}>
            <View style={styles.detailGridRow}>
              <View style={styles.detailGridCol}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Mã khay:
                </AppText>
                <AppText variant="bodyMedium" weight="bold">
                  {activeTrayDetail.tray_code}
                </AppText>
              </View>

              <View style={styles.detailGridCol}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Vị trí tọa độ:
                </AppText>
                <AppText variant="bodyMedium" weight="bold">
                  {activeTrayDetail.row_number && activeTrayDetail.column_number
                    ? `Hàng ${activeTrayDetail.row_number}, Cột ${activeTrayDetail.column_number}`
                    : 'Chưa gán tọa độ'}
                </AppText>
              </View>
            </View>

            <View style={styles.detailGridRow}>
              <View style={styles.detailGridCol}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Trạng thái vật lý:
                </AppText>
                <AppText variant="bodyMedium" weight="semibold">
                  {formatMistingCode('trayStatus', activeTrayDetail.tray_status)}
                </AppText>
              </View>

              <View style={styles.detailGridCol}>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  Tầng nuôi trồng:
                </AppText>
                <AppText variant="bodyMedium" weight="semibold">
                  {floor.floor_name} (Tầng {floor.floor_number})
                </AppText>
              </View>
            </View>

            {/* Inconsistency / Legacy Block Warning Notice */}
            {!activeTrayDetail.session_id &&
              !availableTrayIds.includes(activeTrayDetail.tray_id) &&
              activeTrayDetail.tray_status !== 'MAINTENANCE' && (
                <AppCard elevation="xs" style={styles.detailBlockedCard}>
                  <View style={styles.blockedCardHeader}>
                    <Ionicons name="lock-closed" size={18} color={theme.colors.warning.dark} />
                    <AppText variant="bodySmall" weight="bold" color={theme.colors.warning.dark}>
                      Không đủ điều kiện gán phiên mới
                    </AppText>
                  </View>
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Khay này có trạng thái vật lý AVAILABLE nhưng backend đang ghi nhận khay còn liên kết ACTIVE với phiên nuôi trồng cũ (Phiên #15) đã hoàn tất. Backend không cho phép gán phiên mới cho đến khi liên kết cũ được giải phóng.
                  </AppText>
                </AppCard>
              )}

            {activeTrayDetail.session_id ? (
              <AppCard elevation="xs" style={styles.detailSessionCard}>
                <View style={styles.detailSessionHeader}>
                  <Ionicons name="leaf" size={18} color={theme.colors.success.dark} />
                  <AppText variant="label" weight="bold" color={theme.colors.success.dark}>
                    Phiên nuôi trồng #{activeTrayDetail.session_id}
                  </AppText>
                </View>
                <AppText variant="bodyMedium" weight="bold">
                  Giống nấm: {activeTrayDetail.mushroom_name || 'Nấm giống'}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Trạng thái canh tác: {formatMistingCode('cultivationStatus', activeTrayDetail.cultivation_status || 'CULTIVATING')}
                </AppText>
                {activeTrayDetail.rental_id && (
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Đơn thuê khách hàng: #{activeTrayDetail.rental_id}
                  </AppText>
                )}
              </AppCard>
            ) : availableTrayIds.includes(activeTrayDetail.tray_id) ? (
              <AppCard elevation="xs" style={styles.detailAvailableSessionCard}>
                <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.primary[600]} />
                <AppText variant="bodySmall" weight="semibold" color={theme.colors.primary[800]}>
                  Khay trống và đủ điều kiện
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary} align="center">
                  Khay đã sẵn sàng để gán cho phiên trồng mới đạt chuẩn (READY_FOR_CULTIVATION).
                </AppText>
              </AppCard>
            ) : null}

            <AppButton
              title="Đóng chi tiết"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => setActiveTrayDetail(null)}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </AppBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.sm,
    padding: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm - 2,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary[600],
  },
  horizontalScroll: {
    marginVertical: 4,
  },
  gridContainer: {
    gap: 6,
    paddingRight: theme.spacing.lg,
  },
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cornerHeaderCell: {
    width: 60,
  },
  columnHeaderCell: {
    width: 76,
    alignItems: 'center',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowHeaderCell: {
    width: 60,
    alignItems: 'flex-start',
  },
  gridCell: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    gap: 1,
    position: 'relative',
  },
  emptyGridCell: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCultivating: {
    borderColor: theme.colors.success.main,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  cellEligible: {
    borderColor: 'rgba(14, 165, 233, 0.5)',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  cellLegacyBlocked: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  cellMaintenance: {
    borderColor: theme.colors.error.main,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cellSelected: {
    borderColor: theme.colors.primary[600],
    borderWidth: 2,
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
  },
  cellDisabled: {
    opacity: 0.35,
  },
  selectedBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIconBox: {
    marginBottom: 1,
  },
  listContainer: {
    gap: theme.spacing.xs,
    marginVertical: 4,
  },
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  listItemBlocked: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  listLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconBoxCultivating: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  listIconBoxBlocked: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  listIconBoxMaintenance: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignCheckboxSelected: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  unpositionedCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    padding: theme.spacing.sm,
    marginTop: 6,
    gap: 6,
  },
  unpositionedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unpositionedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unpositionedPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  sheetDetailBody: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  detailGridRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  detailGridCol: {
    flex: 1,
    gap: 2,
  },
  detailBlockedCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    padding: theme.spacing.sm,
    gap: 4,
    marginTop: 4,
  },
  blockedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailSessionCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1,
    padding: theme.spacing.sm,
    gap: 2,
    marginTop: 4,
  },
  detailSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailAvailableSessionCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderColor: 'rgba(14, 165, 233, 0.25)',
    borderWidth: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: 4,
    marginTop: 4,
  },
});
