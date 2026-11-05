import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { theme } from '../../../../core/theme';
import { AppCard, AppDivider, AppText } from '../../../../shared/components';
import {
  EnvironmentHistoryPoint,
  FloorEnvironmentHistory,
} from '../../domain/entities/EnvironmentHistory';

interface FloorEnvironmentChartCardProps {
  floor: FloorEnvironmentHistory;
  from?: number;
  to?: number;
}

const PLOT_HEIGHT = 220;
const LEFT_AXIS_WIDTH = 42;
const RIGHT_AXIS_WIDTH = 46;
const PADDING_TOP = 22;
const PADDING_BOTTOM = 14;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;

interface DynamicAxis {
  min: number;
  max: number;
  ticks: number[];
}

/**
 * Calculates a dynamic, human-readable range with padding and integer/clean tick marks.
 * Handles edge cases: single value, constant values, empty array.
 */
function calculateDynamicAxis(
  values: number[],
  type: 'temperature' | 'humidity'
): DynamicAxis {
  const intervals = 3; // 4 ticks: index 0 (top/max), 1, 2, 3 (bottom/min)

  if (!values || values.length === 0) {
    if (type === 'temperature') {
      return { min: 20, max: 32, ticks: [32, 28, 24, 20] };
    }
    return { min: 60, max: 90, ticks: [90, 80, 70, 60] };
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  let rangeMin: number;
  let rangeMax: number;
  let step: number;

  if (type === 'temperature') {
    if (rawMin === rawMax) {
      step = 1;
      rangeMin = Math.floor(rawMin - 1);
      rangeMax = rangeMin + step * intervals;
    } else {
      const span = rawMax - rawMin;
      step = Math.max(1, Math.ceil(span / intervals));
      rangeMin = Math.floor(rawMin);
      while (rangeMin + step * intervals < rawMax) {
        step++;
      }
      rangeMax = rangeMin + step * intervals;
    }
  } else {
    // Humidity (%RH): step in clean intervals (5, 10, 15)
    if (rawMin === rawMax) {
      step = 5;
      rangeMin = Math.max(0, Math.floor((rawMin - 5) / 5) * 5);
      rangeMax = Math.min(100, rangeMin + step * intervals);
    } else {
      const span = rawMax - rawMin;
      step = Math.max(5, Math.ceil(span / (intervals * 5)) * 5);
      rangeMin = Math.max(0, Math.floor(rawMin / 5) * 5);
      while (rangeMin + step * intervals < rawMax && rangeMin + step * intervals <= 100) {
        step += 5;
      }
      if (rangeMin + step * intervals > 100) {
        rangeMin = Math.max(0, 100 - step * intervals);
      }
      rangeMax = rangeMin + step * intervals;
    }
  }

  const ticks: number[] = [];
  for (let i = intervals; i >= 0; i--) {
    ticks.push(rangeMin + i * step);
  }

  return { min: rangeMin, max: rangeMax, ticks };
}

/**
 * Formats epoch ms timestamp to HH:mm string in Asia/Ho_Chi_Minh timezone.
 */
function formatTimeHHmm(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Formats epoch ms timestamp to full date and time string with seconds in Asia/Ho_Chi_Minh timezone.
 */
function formatFullDateTimeWithSeconds(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString('vi-VN');
  }
}

export const FloorEnvironmentChartCard: React.FC<FloorEnvironmentChartCardProps> = ({
  floor,
  from,
  to,
}) => {
  const points = useMemo(() => floor.points || [], [floor.points]);

  // Width of chart container measured dynamically on mobile
  const [containerWidth, setContainerWidth] = useState<number>(330);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 2) {
      setContainerWidth(width);
    }
  };

  const svgWidth = Math.max(160, containerWidth - LEFT_AXIS_WIDTH - RIGHT_AXIS_WIDTH);
  const innerWidth = Math.max(10, svgWidth - PADDING_LEFT - PADDING_RIGHT);
  const innerHeight = Math.max(10, PLOT_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

  // Extract valid numerical values for temperature and humidity independently
  const validTemps = useMemo(() => {
    return points
      .map((p) => p.temperature)
      .filter((v): v is number => v !== null && !isNaN(v));
  }, [points]);

  const validHums = useMemo(() => {
    return points
      .map((p) => p.humidity)
      .filter((v): v is number => v !== null && !isNaN(v));
  }, [points]);

  // Compute dynamic ranges for left and right Y-axes independently
  const tempAxis = useMemo(() => calculateDynamicAxis(validTemps, 'temperature'), [validTemps]);
  const humAxis = useMemo(() => calculateDynamicAxis(validHums, 'humidity'), [validHums]);

  // Find latest valid reading point for quick glance badge
  const latestValidPoint = useMemo(() => {
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].temperature != null || points[i].humidity != null) {
        return points[i];
      }
    }
    return null;
  }, [points]);

  // Selected point index for interactive tooltip inspection
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    points.length > 0 ? points.length - 1 : null
  );

  const selectedPoint: EnvironmentHistoryPoint | null =
    selectedPointIndex !== null && points[selectedPointIndex]
      ? points[selectedPointIndex]
      : latestValidPoint;

  // Check if all points are null
  const isAllNull = useMemo(() => {
    return (
      points.length > 0 &&
      points.every((p) => p.temperature === null && p.humidity === null)
    );
  }, [points]);

  // Coordinate mapping functions
  const getX = useCallback(
    (index: number) => {
      if (points.length <= 1) return PADDING_LEFT + innerWidth / 2;
      return PADDING_LEFT + (index / (points.length - 1)) * innerWidth;
    },
    [points.length, innerWidth]
  );

  const getTempY = useCallback(
    (val: number) => {
      const span = tempAxis.max - tempAxis.min || 1;
      const ratio = (val - tempAxis.min) / span;
      return PADDING_TOP + (1 - ratio) * innerHeight;
    },
    [tempAxis.max, tempAxis.min, innerHeight]
  );

  const getHumY = useCallback(
    (val: number) => {
      const span = humAxis.max - humAxis.min || 1;
      const ratio = (val - humAxis.min) / span;
      return PADDING_TOP + (1 - ratio) * innerHeight;
    },
    [humAxis.max, humAxis.min, innerHeight]
  );

  // Generate SVG paths with gaps at null values (breaking the line)
  const { tempPath, humPath, validTempPoints } = useMemo(() => {
    let tPath = '';
    let inTempSeg = false;
    const validTemp: { x: number; y: number; val: number; index: number }[] = [];

    let hPath = '';
    let inHumSeg = false;

    points.forEach((pt, idx) => {
      const x = getX(idx);

      // Temperature path & dots
      if (pt.temperature !== null && !isNaN(pt.temperature)) {
        const y = getTempY(pt.temperature);
        validTemp.push({ x, y, val: pt.temperature, index: idx });
        if (!inTempSeg) {
          const prefix = tPath.length > 0 ? ' M ' : 'M ';
          tPath += `${prefix}${x.toFixed(1)} ${y.toFixed(1)}`;
          inTempSeg = true;
        } else {
          tPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else {
        // Break line on null! Next valid point starts with M
        inTempSeg = false;
      }

      // Humidity path (dashed)
      if (pt.humidity !== null && !isNaN(pt.humidity)) {
        const y = getHumY(pt.humidity);
        if (!inHumSeg) {
          const prefix = hPath.length > 0 ? ' M ' : 'M ';
          hPath += `${prefix}${x.toFixed(1)} ${y.toFixed(1)}`;
          inHumSeg = true;
        } else {
          hPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else {
        // Break line on null!
        inHumSeg = false;
      }
    });

    return {
      tempPath: tPath,
      humPath: hPath,
      validTempPoints: validTemp,
    };
  }, [points, getX, getTempY, getHumY]);

  // Touch handler to scrub/select points on mobile
  const handleTouch = (e: GestureResponderEvent) => {
    if (points.length === 0 || innerWidth <= 0) return;
    const touchX = e.nativeEvent.locationX;
    const clampedX = Math.max(PADDING_LEFT, Math.min(PADDING_LEFT + innerWidth, touchX));
    const ratio = (clampedX - PADDING_LEFT) / innerWidth;
    const nearestIndex = Math.round(ratio * (points.length - 1));
    if (nearestIndex >= 0 && nearestIndex < points.length) {
      setSelectedPointIndex(nearestIndex);
    }
  };

  // Select 5 evenly spaced points for X-axis timestamps
  const xTicks = useMemo(() => {
    if (points.length === 0) return [];
    const count = Math.min(5, points.length);
    const result: { index: number; x: number; timeStr: string }[] = [];
    for (let i = 0; i < count; i++) {
      const ptIdx = Math.round((i / (count - 1)) * (points.length - 1));
      const pt = points[ptIdx];
      if (pt) {
        result.push({
          index: ptIdx,
          x: getX(ptIdx),
          timeStr: formatTimeHHmm(pt.timestamp),
        });
      }
    }
    return result;
  }, [points, getX]);

  // Selected point coordinates for highlight overlays
  const selectedX = selectedPointIndex !== null ? getX(selectedPointIndex) : null;
  const selectedTempY =
    selectedPoint && selectedPoint.temperature !== null
      ? getTempY(selectedPoint.temperature)
      : null;
  const selectedHumY =
    selectedPoint && selectedPoint.humidity !== null
      ? getHumY(selectedPoint.humidity)
      : null;

  const thresholds = floor.thresholds;
  const hasTempThreshold =
    thresholds &&
    (thresholds.temperature_min !== null || thresholds.temperature_max !== null);
  const hasHumThreshold =
    thresholds &&
    (thresholds.humidity_min !== null || thresholds.humidity_max !== null);

  // Time range summary
  const timeRangeLabel = useMemo(() => {
    if (from && to) {
      return `${formatFullDateTimeWithSeconds(from)} – ${formatFullDateTimeWithSeconds(to)}`;
    }
    return 'Khoảng thời gian: 24 giờ qua (bước 15 phút)';
  }, [from, to]);

  return (
    <AppCard elevation="sm" style={styles.card}>
      {/* Floor Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.floorNameRow}>
            <Ionicons name="layers" size={20} color={theme.colors.primary[600]} />
            <AppText variant="title" weight="bold">
              {floor.floorName}
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Phòng #{floor.roomId} • Node #{floor.nodeId} • Master: {floor.masterId}
          </AppText>
        </View>

        {/* Latest Metric Badges */}
        <View style={styles.latestBadgeContainer}>
          <View style={styles.tempBadge}>
            <Ionicons name="thermometer" size={13} color="#8B5CF6" />
            <AppText variant="caption" weight="bold" color="#7C3AED">
              {latestValidPoint?.temperature !== null && latestValidPoint?.temperature !== undefined
                ? `${latestValidPoint.temperature.toFixed(1)}°C`
                : '—'}
            </AppText>
          </View>
          <View style={styles.humBadge}>
            <Ionicons name="water" size={13} color="#14B8A6" />
            <AppText variant="caption" weight="bold" color="#0D9488">
              {latestValidPoint?.humidity !== null && latestValidPoint?.humidity !== undefined
                ? `${latestValidPoint.humidity.toFixed(1)}%`
                : '—'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Threshold chips (only shown if configured, no fake defaults) */}
      {(hasTempThreshold || hasHumThreshold) && (
        <View style={styles.thresholdChipsRow}>
          {hasTempThreshold && (
            <View style={styles.thresholdChip}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#8B5CF6" />
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Nhiệt độ tối ưu:{' '}
                <AppText variant="caption" weight="bold">
                  {thresholds.temperature_min !== null ? `${thresholds.temperature_min}°C` : '—'}
                  {' – '}
                  {thresholds.temperature_max !== null ? `${thresholds.temperature_max}°C` : '—'}
                </AppText>
              </AppText>
            </View>
          )}

          {hasHumThreshold && (
            <View style={styles.thresholdChip}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#14B8A6" />
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Độ ẩm tối ưu:{' '}
                <AppText variant="caption" weight="bold">
                  {thresholds.humidity_min !== null ? `${thresholds.humidity_min}%` : '—'}
                  {' – '}
                  {thresholds.humidity_max !== null ? `${thresholds.humidity_max}%` : '—'}
                </AppText>
              </AppText>
            </View>
          )}
        </View>
      )}

      <AppDivider spacing="sm" />

      {/* Interactive Tooltip Inspection Box */}
      {selectedPoint && (
        <View style={styles.tooltipBox}>
          <View style={styles.tooltipHeaderRow}>
            <View style={styles.tooltipTimeContainer}>
              <Ionicons name="time-outline" size={13} color={theme.colors.text.secondary} />
              <AppText variant="caption" weight="bold" color={theme.colors.text.primary}>
                {formatFullDateTimeWithSeconds(selectedPoint.timestamp)}
              </AppText>
            </View>
            <AppText variant="overline" color={theme.colors.text.muted}>
              (Asia/Ho_Chi_Minh)
            </AppText>
          </View>

          <View style={styles.tooltipMetricsRow}>
            <View style={styles.tooltipMetricItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ:
              </AppText>
              <AppText
                variant="bodySmall"
                weight="bold"
                color={selectedPoint.temperature !== null ? '#8B5CF6' : theme.colors.text.disabled}
              >
                {selectedPoint.temperature !== null
                  ? `${selectedPoint.temperature.toFixed(1)} °C`
                  : 'Không có dữ liệu'}
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.tooltipMetricItem}>
              <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm:
              </AppText>
              <AppText
                variant="bodySmall"
                weight="bold"
                color={selectedPoint.humidity !== null ? '#14B8A6' : theme.colors.text.disabled}
              >
                {selectedPoint.humidity !== null
                  ? `${selectedPoint.humidity.toFixed(1)} %RH`
                  : 'Không có dữ liệu'}
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* Chart Canvas Area */}
      {points.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={32} color={theme.colors.text.muted} />
          <AppText variant="bodySmall" color={theme.colors.text.muted}>
            Chưa có dữ liệu vi khí hậu cho tầng này.
          </AppText>
        </View>
      ) : isAllNull ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.warning.main} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.centerText}>
            Cảm biến chưa ghi nhận dữ liệu trong 24 giờ qua (toàn bộ điểm trống).
          </AppText>
        </View>
      ) : (
        <View style={styles.chartWrapper} onLayout={handleContainerLayout}>
          {/* Main Chart Canvas: Left Y-Axis | SVG Plot Canvas | Right Y-Axis */}
          <View style={styles.chartCanvasRow}>
            {/* Left Y-Axis: Temperature (°C) */}
            <View style={styles.leftYAxis}>
              <AppText variant="overline" weight="bold" color="#8B5CF6" style={styles.axisHeader}>
                °C
              </AppText>
              <View style={styles.axisLabelsColumn}>
                {tempAxis.ticks.map((tick, i) => {
                  const topPos = PADDING_TOP + (i / (tempAxis.ticks.length - 1)) * innerHeight - 7;
                  return (
                    <View key={`t-tick-${i}`} style={[styles.tickLabelWrap, { top: topPos }]}>
                      <AppText variant="overline" color="#7C3AED" style={styles.axisTickText}>
                        {tick}°
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* SVG Plot Canvas with Touch Scrubbing */}
            <View
              style={[styles.svgContainer, { width: svgWidth, height: PLOT_HEIGHT }]}
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
            >
              <Svg width={svgWidth} height={PLOT_HEIGHT}>
                {/* Horizontal Dashed Grid Lines aligned with both axes */}
                {tempAxis.ticks.map((_, i) => {
                  const y = PADDING_TOP + (i / (tempAxis.ticks.length - 1)) * innerHeight;
                  return (
                    <Line
                      key={`hgrid-${i}`}
                      x1={0}
                      y1={y}
                      x2={svgWidth}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth={1}
                      strokeDasharray="4, 4"
                    />
                  );
                })}

                {/* Vertical Dashed Grid Lines aligned with X ticks */}
                {xTicks.map((tick) => (
                  <Line
                    key={`vgrid-${tick.index}`}
                    x1={tick.x}
                    y1={PADDING_TOP}
                    x2={tick.x}
                    y2={PADDING_TOP + innerHeight}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                    strokeDasharray="4, 4"
                  />
                ))}

                {/* Vertical Indicator Line at Selected Touch Position */}
                {selectedX !== null && (
                  <Line
                    x1={selectedX}
                    y1={PADDING_TOP}
                    x2={selectedX}
                    y2={PADDING_TOP + innerHeight}
                    stroke="#94A3B8"
                    strokeWidth={1.2}
                    strokeDasharray="3, 3"
                  />
                )}

                {/* Humidity Line: Teal Dashed (#14B8A6) */}
                {humPath.length > 0 && (
                  <Path
                    d={humPath}
                    stroke="#14B8A6"
                    strokeWidth={2}
                    strokeDasharray="5, 4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Temperature Line: Purple Solid (#8B5CF6) */}
                {tempPath.length > 0 && (
                  <Path
                    d={tempPath}
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Small Circular Dots on Temperature Data Points */}
                {validTempPoints.map((pt) => (
                  <Circle
                    key={`tdot-${pt.index}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={2.5}
                    fill="#8B5CF6"
                  />
                ))}

                {/* Highlight Overlays for Selected Point */}
                {selectedX !== null && selectedHumY !== null && (
                  <Circle
                    cx={selectedX}
                    cy={selectedHumY}
                    r={5}
                    fill="#14B8A6"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
                {selectedX !== null && selectedTempY !== null && (
                  <Circle
                    cx={selectedX}
                    cy={selectedTempY}
                    r={5}
                    fill="#8B5CF6"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
              </Svg>
            </View>

            {/* Right Y-Axis: Humidity (%RH) */}
            <View style={styles.rightYAxis}>
              <AppText variant="overline" weight="bold" color="#14B8A6" style={styles.axisHeader}>
                %RH
              </AppText>
              <View style={styles.axisLabelsColumn}>
                {humAxis.ticks.map((tick, i) => {
                  const topPos = PADDING_TOP + (i / (humAxis.ticks.length - 1)) * innerHeight - 7;
                  return (
                    <View key={`h-tick-${i}`} style={[styles.tickLabelWrap, { top: topPos }]}>
                      <AppText variant="overline" color="#0D9488" style={styles.axisTickText}>
                        {tick}%
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* X-Axis Hour Labels Row (HH:mm in Asia/Ho_Chi_Minh) */}
          <View style={[styles.xAxisLabelsRow, { marginLeft: LEFT_AXIS_WIDTH, width: svgWidth }]}>
            {xTicks.map((tick) => (
              <View
                key={`xlabel-${tick.index}`}
                style={[
                  styles.xTickLabelContainer,
                  {
                    left: Math.max(0, Math.min(svgWidth - 44, tick.x - 22)),
                  },
                ]}
              >
                <AppText
                  variant="overline"
                  color={selectedPointIndex === tick.index ? '#8B5CF6' : theme.colors.text.muted}
                  style={[
                    styles.xTickText,
                    selectedPointIndex === tick.index && styles.boldText,
                  ]}
                >
                  {tick.timeStr}
                </AppText>
              </View>
            ))}
          </View>

          {/* Overall Time Range Footer */}
          <AppText variant="overline" color={theme.colors.text.muted} style={styles.timeRangeFooter}>
            {timeRangeLabel}
          </AppText>
        </View>
      )}

      {/* Chart Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLineSolid, { backgroundColor: '#8B5CF6' }]} />
          <AppText variant="caption" weight="medium" color={theme.colors.text.primary}>
            Nhiệt độ (°C)
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.legendDashedWrapper}>
            <View style={[styles.legendDash, { backgroundColor: '#14B8A6' }]} />
            <View style={[styles.legendDash, { backgroundColor: '#14B8A6' }]} />
            <View style={[styles.legendDash, { backgroundColor: '#14B8A6' }]} />
          </View>
          <AppText variant="caption" weight="medium" color={theme.colors.text.primary}>
            Độ ẩm (%RH)
          </AppText>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  floorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  latestBadgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tempBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  humBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  thresholdChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  thresholdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background.subtle,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.md,
  },
  tooltipBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: 2,
  },
  tooltipMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  centerText: {
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  chartWrapper: {
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  chartCanvasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: PLOT_HEIGHT,
  },
  leftYAxis: {
    width: LEFT_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    paddingRight: 4,
    position: 'relative',
  },
  rightYAxis: {
    width: RIGHT_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    paddingLeft: 4,
    position: 'relative',
  },
  axisHeader: {
    fontSize: 10,
    lineHeight: 12,
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  axisLabelsColumn: {
    flex: 1,
    position: 'relative',
    height: PLOT_HEIGHT,
  },
  tickLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  axisTickText: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
  svgContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  xAxisLabelsRow: {
    height: 22,
    position: 'relative',
    marginTop: 4,
  },
  xTickLabelContainer: {
    position: 'absolute',
    width: 44,
    alignItems: 'center',
  },
  xTickText: {
    fontSize: 9,
    lineHeight: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  timeRangeFooter: {
    textAlign: 'center',
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLineSolid: {
    width: 22,
    height: 3,
    borderRadius: 1.5,
  },
  legendDashedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 22,
  },
  legendDash: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
  },
});
