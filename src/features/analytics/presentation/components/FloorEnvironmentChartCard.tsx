import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AppText } from '../../../../shared/components';
import {
  EnvironmentHistoryPoint,
  FloorEnvironmentHistory,
} from '../../domain/entities/EnvironmentHistory';

export interface FloorEnvironmentChartCardProps {
  floor: FloorEnvironmentHistory;
  from?: number;
  to?: number;
  bucketMs?: number;
}

const PLOT_HEIGHT = 220;
const LEFT_AXIS_WIDTH = 50;
const RIGHT_AXIS_WIDTH = 50;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 20;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;

export interface DynamicAxis {
  min: number;
  max: number;
  ticks: number[];
}

/**
 * Dynamic Y Domain & Ticks algorithm as strictly specified in climateAxis.
 * Operates purely on valid finite values of a series; ignores null/undefined/NaN.
 */
export function climateAxis(values: number[]): DynamicAxis {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) {
    return { min: 0, max: 10, ticks: [0, 5, 10] };
  }

  let dataMin = Math.min(...valid);
  let dataMax = Math.max(...valid);
  if (dataMin === dataMax) {
    dataMin -= 1;
    dataMax += 1;
  }

  const span = dataMax - dataMin;
  const pad = span * 0.08;
  const targetMin = dataMin - pad;
  const targetMax = dataMax + pad;
  const roughStep = (targetMax - targetMin) / 4;
  const stepPower = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const stepNorm = roughStep / stepPower;

  let cleanStep: number;
  if (stepNorm < 1.5) {
    cleanStep = 1 * stepPower;
  } else if (stepNorm < 3.5) {
    cleanStep = 2 * stepPower;
  } else if (stepNorm < 7.5) {
    cleanStep = 5 * stepPower;
  } else {
    cleanStep = 10 * stepPower;
  }

  const min = Math.floor(targetMin / cleanStep) * cleanStep;
  const max = Math.ceil(targetMax / cleanStep) * cleanStep;
  const ticks: number[] = [];
  for (let t = min; t <= max + cleanStep * 0.001; t += cleanStep) {
    ticks.push(Number(t.toFixed(4)));
  }
  return { min, max, ticks };
}

/**
 * Format tick with at most 1 decimal place (or integer without decimal) and unit.
 */
function formatTick(val: number, unit: string): string {
  const rounded = Math.round(val * 10) / 10;
  const numStr = Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
  return `${numStr}${unit}`;
}

/**
 * Formats epoch ms timestamp to HH:mm string in 24h format (Asia/Ho_Chi_Minh).
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

interface SplinePoint {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson Monotone Cubic Spline generator.
 * Produces smooth monotonic curves without overshoot artifacts or fake oscillations.
 */
function buildMonotoneSegments(points: SplinePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const deltaX = points[i + 1].x - points[i].x;
    const deltaY = points[i + 1].y - points[i].y;
    dx.push(deltaX);
    dy.push(deltaY);
    slopes.push(deltaX === 0 ? 0 : deltaY / deltaX);
  }

  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / slopes[i];
      const beta = tangents[i + 1] / slopes[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        tangents[i] = tau * alpha * slopes[i];
        tangents[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const curDx = dx[i];
    const cp1x = p0.x + curDx / 3;
    const cp1y = p0.y + (tangents[i] * curDx) / 3;
    const cp2x = p1.x - curDx / 3;
    const cp2y = p1.y - (tangents[i + 1] * curDx) / 3;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return path;
}

interface ThresholdEval {
  referenceText: string;
  warningText: string | null;
  isWarning: boolean;
}

function evaluateThreshold(
  val: number | null,
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string
): ThresholdEval {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;

  if (!hasMin && !hasMax) {
    return {
      referenceText: 'Chưa có ngưỡng',
      warningText: null,
      isWarning: false,
    };
  }

  let referenceText = '';
  if (hasMin && hasMax) {
    referenceText = `≥ ${min}${unit} – ≤ ${max}${unit}`;
  } else if (hasMin) {
    referenceText = `≥ ${min}${unit}`;
  } else if (hasMax) {
    referenceText = `≤ ${max}${unit}`;
  }

  if (val === null) {
    return {
      referenceText,
      warningText: null,
      isWarning: false,
    };
  }

  if (hasMax && val > (max as number)) {
    const diff = val - (max as number);
    const diffStr = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    return {
      referenceText,
      warningText: `▲ vượt ngưỡng (+${diffStr}${unit})`,
      isWarning: true,
    };
  }

  if (hasMin && val < (min as number)) {
    const diff = val - (min as number);
    const diffStr = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    return {
      referenceText,
      warningText: `▼ dưới ngưỡng (${diffStr}${unit})`,
      isWarning: true,
    };
  }

  return {
    referenceText,
    warningText: null,
    isWarning: false,
  };
}

export const FloorEnvironmentChartCard: React.FC<FloorEnvironmentChartCardProps> = ({
  floor,
  from,
  to,
  bucketMs,
}) => {
  // Sort points ascending by timestamp and normalize non-finite values to null
  const points = useMemo(() => {
    const raw = floor.points || [];
    return [...raw]
      .map((p) => ({
        timestamp: Number(p.timestamp),
        temperature:
          p.temperature !== null &&
          p.temperature !== undefined &&
          typeof p.temperature === 'number' &&
          Number.isFinite(p.temperature)
            ? p.temperature
            : null,
        humidity:
          p.humidity !== null &&
          p.humidity !== undefined &&
          typeof p.humidity === 'number' &&
          Number.isFinite(p.humidity)
            ? p.humidity
            : null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [floor.points]);

  // Check if both metrics are null for ALL points
  const isAllNull = useMemo(() => {
    return points.every((p) => p.temperature === null && p.humidity === null);
  }, [points]);

  // Measure container width for responsive scaling on mobile
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

  // Time boundaries: Real timestamp X-axis
  const effectiveBucketMs = bucketMs || 900000;
  const firstPointTs = points[0]?.timestamp ?? from ?? 0;
  const lastPointTs = points[points.length - 1]?.timestamp ?? to ?? 0;

  const startX = Math.min(from ?? firstPointTs, firstPointTs);
  const endX = Math.max(to ?? (lastPointTs + effectiveBucketMs), lastPointTs + effectiveBucketMs);
  const timeSpan = Math.max(effectiveBucketMs, endX - startX);

  // Coordinate mapping for X
  const getX = useCallback(
    (timestamp: number) => {
      const ratio = (timestamp - startX) / timeSpan;
      return PADDING_LEFT + Math.max(0, Math.min(1, ratio)) * innerWidth;
    },
    [startX, timeSpan, innerWidth]
  );

  // Filter valid numbers independently for dynamic Y domain
  const validTemps = useMemo(() => {
    return points
      .map((p) => p.temperature)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  }, [points]);

  const validHums = useMemo(() => {
    return points
      .map((p) => p.humidity)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  }, [points]);

  const tempAxis = useMemo(() => climateAxis(validTemps), [validTemps]);
  const humAxis = useMemo(() => climateAxis(validHums), [validHums]);

  // Coordinate mapping for Y
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

  // Build monotone spline paths broken on nulls independently
  const { tempPath, humPath } = useMemo(() => {
    const tempSegments: SplinePoint[][] = [];
    let curTempChunk: SplinePoint[] = [];

    const humSegments: SplinePoint[][] = [];
    let curHumChunk: SplinePoint[] = [];

    points.forEach((pt) => {
      const x = getX(pt.timestamp);

      if (pt.temperature !== null) {
        curTempChunk.push({ x, y: getTempY(pt.temperature) });
      } else if (curTempChunk.length > 0) {
        tempSegments.push(curTempChunk);
        curTempChunk = [];
      }

      if (pt.humidity !== null) {
        curHumChunk.push({ x, y: getHumY(pt.humidity) });
      } else if (curHumChunk.length > 0) {
        humSegments.push(curHumChunk);
        curHumChunk = [];
      }
    });

    if (curTempChunk.length > 0) tempSegments.push(curTempChunk);
    if (curHumChunk.length > 0) humSegments.push(curHumChunk);

    return {
      tempPath: tempSegments.map(buildMonotoneSegments).filter(Boolean).join(' '),
      humPath: humSegments.map(buildMonotoneSegments).filter(Boolean).join(' '),
    };
  }, [points, getX, getTempY, getHumY]);

  // Interactive selection: nearest bucket by timestamp on tap/scrub
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    points.length > 0 ? points.length - 1 : null
  );

  const handleTouch = (e: GestureResponderEvent) => {
    if (points.length === 0 || innerWidth <= 0) return;
    const touchX = e.nativeEvent.locationX;
    const clampedX = Math.max(PADDING_LEFT, Math.min(PADDING_LEFT + innerWidth, touchX));
    const touchRatio = (clampedX - PADDING_LEFT) / innerWidth;
    const touchTs = startX + touchRatio * timeSpan;

    let nearestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].timestamp - touchTs);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }
    setSelectedPointIndex(nearestIdx);
  };

  const selectedPoint: EnvironmentHistoryPoint | null =
    selectedPointIndex !== null && points[selectedPointIndex]
      ? points[selectedPointIndex]
      : points[points.length - 1] ?? null;

  // Selected point highlight coordinates
  const selectedX = selectedPoint ? getX(selectedPoint.timestamp) : null;
  const selectedTempY =
    selectedPoint && selectedPoint.temperature !== null
      ? getTempY(selectedPoint.temperature)
      : null;
  const selectedHumY =
    selectedPoint && selectedPoint.humidity !== null
      ? getHumY(selectedPoint.humidity)
      : null;

  // X ticks with reference ~45-55px spacing to prevent overlapping
  const xTicks = useMemo(() => {
    if (points.length === 0) return [];
    const count = Math.max(2, Math.min(6, Math.floor(innerWidth / 50)));
    const result: { timestamp: number; x: number; timeStr: string }[] = [];
    for (let i = 0; i < count; i++) {
      const ts = startX + (i / (count - 1)) * timeSpan;
      result.push({
        timestamp: ts,
        x: getX(ts),
        timeStr: formatTimeHHmm(ts),
      });
    }
    return result;
  }, [startX, timeSpan, innerWidth, getX, points.length]);

  // Threshold evaluations for selected point
  const tempEval = useMemo(() => {
    return evaluateThreshold(
      selectedPoint?.temperature ?? null,
      floor.thresholds?.temperature_min,
      floor.thresholds?.temperature_max,
      '°C'
    );
  }, [selectedPoint?.temperature, floor.thresholds]);

  const humEval = useMemo(() => {
    return evaluateThreshold(
      selectedPoint?.humidity ?? null,
      floor.thresholds?.humidity_min,
      floor.thresholds?.humidity_max,
      '%RH'
    );
  }, [selectedPoint?.humidity, floor.thresholds]);

  // Requirement: Omit floors with empty points from the card list
  if (points.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Floor Card Header: floorName font 14 */}
      <View style={styles.headerRow}>
        <View style={styles.floorTitleGroup}>
          <Ionicons name="business-outline" size={18} color="#0f172a" />
          <AppText style={styles.floorTitleText} numberOfLines={1}>
            {floor.floorName}
          </AppText>
        </View>
        <AppText style={styles.floorMetaText}>
          Phòng #{floor.roomId} • Node #{floor.nodeId}
        </AppText>
      </View>

      {/* Tooltip on Tap/Press */}
      {selectedPoint && !isAllNull && (
        <View style={styles.tooltipBox}>
          {/* Tooltip Time */}
          <View style={styles.tooltipHeaderRow}>
            <View style={styles.tooltipTimeRow}>
              <Ionicons name="time-outline" size={13} color="#5b6b80" />
              <AppText style={styles.tooltipTimeText}>
                {formatTimeHHmm(selectedPoint.timestamp)}
              </AppText>
            </View>
            <AppText style={styles.tooltipTimeSubtext}>
              {new Date(selectedPoint.timestamp).toLocaleDateString('vi-VN')}
            </AppText>
          </View>

          {/* Metric Rows */}
          <View style={styles.tooltipMetricsContainer}>
            {/* Temperature Tooltip Row */}
            <View style={styles.tooltipMetricRow}>
              <View style={styles.metricLabelValueRow}>
                <View style={[styles.bullet, { backgroundColor: '#c2413b' }]} />
                <AppText style={styles.tooltipLabel}>Nhiệt độ: </AppText>
                <AppText
                  style={[
                    styles.tooltipValue,
                    {
                      color:
                        selectedPoint.temperature !== null ? '#c2413b' : '#5b6b80',
                    },
                  ]}
                >
                  {selectedPoint.temperature !== null
                    ? `${selectedPoint.temperature.toFixed(1)}°C`
                    : '—'}
                </AppText>
              </View>

              {/* Threshold info & warning */}
              <View style={styles.thresholdInfoCol}>
                <AppText style={styles.thresholdRefText}>
                  Ngưỡng: {tempEval.referenceText}
                </AppText>
                {tempEval.warningText && (
                  <AppText style={styles.thresholdWarningText}>
                    {tempEval.warningText}
                  </AppText>
                )}
              </View>
            </View>

            {/* Humidity Tooltip Row */}
            <View style={styles.tooltipMetricRow}>
              <View style={styles.metricLabelValueRow}>
                <View style={[styles.bullet, { backgroundColor: '#2563eb' }]} />
                <AppText style={styles.tooltipLabel}>Độ ẩm: </AppText>
                <AppText
                  style={[
                    styles.tooltipValue,
                    {
                      color:
                        selectedPoint.humidity !== null ? '#2563eb' : '#5b6b80',
                    },
                  ]}
                >
                  {selectedPoint.humidity !== null
                    ? `${selectedPoint.humidity.toFixed(1)}%RH`
                    : '—'}
                </AppText>
              </View>

              {/* Threshold info & warning */}
              <View style={styles.thresholdInfoCol}>
                <AppText style={styles.thresholdRefText}>
                  Ngưỡng: {humEval.referenceText}
                </AppText>
                {humEval.warningText && (
                  <AppText style={styles.thresholdWarningText}>
                    {humEval.warningText}
                  </AppText>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Chart Canvas Area or Empty Floor Data */}
      {isAllNull ? (
        <View style={styles.emptyChartContainer}>
          <Ionicons name="stats-chart-outline" size={28} color="#5b6b80" />
          <AppText style={styles.emptyChartText}>Chưa có dữ liệu</AppText>
        </View>
      ) : (
        <View style={styles.chartWrapper} onLayout={handleContainerLayout}>
          {/* Main Chart Canvas: Left Y-Axis | SVG Plot Area | Right Y-Axis */}
          <View style={styles.canvasRow}>
            {/* Left Y-Axis: Temperature (°C) */}
            <View style={styles.leftYAxis}>
              <AppText style={[styles.axisHeaderText, { color: '#c2413b' }]}>
                °C
              </AppText>
              <View style={styles.ticksColumn}>
                {tempAxis.ticks.map((tick, i) => {
                  const topPos =
                    PADDING_TOP + (1 - i / (tempAxis.ticks.length - 1)) * innerHeight - 8;
                  return (
                    <View
                      key={`temp-tick-${i}`}
                      style={[styles.tickLabelWrapper, { top: topPos, right: 4 }]}
                    >
                      <AppText style={styles.axisTickText}>
                        {formatTick(tick, '°C')}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* SVG Plot Canvas with Scrub Touch Support */}
            <View
              style={[styles.svgArea, { width: svgWidth, height: PLOT_HEIGHT }]}
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
            >
              <Svg width={svgWidth} height={PLOT_HEIGHT}>
                {/* Horizontal Dashed Grid Lines aligned with Left Y ticks */}
                {tempAxis.ticks.map((_, i) => {
                  const y =
                    PADDING_TOP + (1 - i / (tempAxis.ticks.length - 1)) * innerHeight;
                  return (
                    <Line
                      key={`hgrid-${i}`}
                      x1={0}
                      y1={y}
                      x2={svgWidth}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                      strokeDasharray="3, 3"
                    />
                  );
                })}

                {/* Vertical Dashed Grid Lines aligned with X ticks */}
                {xTicks.map((tick, i) => (
                  <Line
                    key={`vgrid-${i}`}
                    x1={tick.x}
                    y1={PADDING_TOP}
                    x2={tick.x}
                    y2={PADDING_TOP + innerHeight}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    strokeDasharray="3, 3"
                  />
                ))}

                {/* Vertical Active Line at Selected Touch Position */}
                {selectedX !== null && (
                  <Line
                    x1={selectedX}
                    y1={PADDING_TOP}
                    x2={selectedX}
                    y2={PADDING_TOP + innerHeight}
                    stroke="#94a3b8"
                    strokeWidth={1.2}
                    strokeDasharray="3, 3"
                  />
                )}

                {/* Humidity Series: Color #2563eb, dashed [4, 4], width 2 */}
                {humPath.length > 0 && (
                  <Path
                    d={humPath}
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="4, 4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Temperature Series: Color #c2413b, solid line, width 2 */}
                {tempPath.length > 0 && (
                  <Path
                    d={tempPath}
                    stroke="#c2413b"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Active Focus Marker on Humidity Series: Radius 4 */}
                {selectedX !== null && selectedHumY !== null && (
                  <Circle
                    cx={selectedX}
                    cy={selectedHumY}
                    r={4}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}

                {/* Active Focus Marker on Temperature Series: Radius 4 */}
                {selectedX !== null && selectedTempY !== null && (
                  <Circle
                    cx={selectedX}
                    cy={selectedTempY}
                    r={4}
                    fill="#c2413b"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
              </Svg>
            </View>

            {/* Right Y-Axis: Humidity (%RH) */}
            <View style={styles.rightYAxis}>
              <AppText style={[styles.axisHeaderText, { color: '#2563eb' }]}>
                %RH
              </AppText>
              <View style={styles.ticksColumn}>
                {humAxis.ticks.map((tick, i) => {
                  const topPos =
                    PADDING_TOP + (1 - i / (humAxis.ticks.length - 1)) * innerHeight - 8;
                  return (
                    <View
                      key={`hum-tick-${i}`}
                      style={[styles.tickLabelWrapper, { top: topPos, left: 4 }]}
                    >
                      <AppText style={styles.axisTickText}>
                        {formatTick(tick, '%RH')}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* X-Axis Hour Labels Row (HH:mm) */}
          <View style={[styles.xAxisLabelsRow, { marginLeft: LEFT_AXIS_WIDTH, width: svgWidth }]}>
            {xTicks.map((tick, i) => (
              <View
                key={`xtick-${i}`}
                style={[
                  styles.xTickLabelContainer,
                  {
                    left: Math.max(0, Math.min(svgWidth - 44, tick.x - 22)),
                  },
                ]}
              >
                <AppText style={styles.xTickText}>{tick.timeStr}</AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Legend Below Chart: always shows both series, no toggle */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.solidLegendLine, { backgroundColor: '#c2413b' }]} />
          <AppText style={styles.legendText}>Nhiệt độ (°C)</AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.dashedLegendLine}>
            <View style={[styles.legendDash, { backgroundColor: '#2563eb' }]} />
            <View style={[styles.legendDash, { backgroundColor: '#2563eb' }]} />
            <View style={[styles.legendDash, { backgroundColor: '#2563eb' }]} />
          </View>
          <AppText style={styles.legendText}>Độ ẩm (%RH)</AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  floorTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  floorTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  floorMetaText: {
    fontSize: 11,
    color: '#5b6b80',
  },
  tooltipBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
    marginBottom: 8,
  },
  tooltipTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tooltipTimeSubtext: {
    fontSize: 11,
    color: '#5b6b80',
  },
  tooltipMetricsContainer: {
    gap: 8,
  },
  tooltipMetricRow: {
    gap: 2,
  },
  metricLabelValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tooltipLabel: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  thresholdInfoCol: {
    paddingLeft: 12,
    gap: 1,
  },
  thresholdRefText: {
    fontSize: 11,
    color: '#5b6b80',
    lineHeight: 15,
  },
  thresholdWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c2413b',
    lineHeight: 15,
  },
  emptyChartContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    color: '#5b6b80',
  },
  chartWrapper: {
    width: '100%',
    minHeight: 240,
    marginTop: 4,
  },
  canvasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: PLOT_HEIGHT,
  },
  leftYAxis: {
    width: LEFT_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    position: 'relative',
  },
  rightYAxis: {
    width: RIGHT_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    position: 'relative',
  },
  axisHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  ticksColumn: {
    flex: 1,
    position: 'relative',
    height: PLOT_HEIGHT,
  },
  tickLabelWrapper: {
    position: 'absolute',
  },
  axisTickText: {
    fontSize: 12,
    color: '#5b6b80',
    lineHeight: 14,
  },
  svgArea: {
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  xAxisLabelsRow: {
    height: 24,
    position: 'relative',
    marginTop: 4,
  },
  xTickLabelContainer: {
    position: 'absolute',
    width: 44,
    alignItems: 'center',
  },
  xTickText: {
    fontSize: 12,
    color: '#5b6b80',
    lineHeight: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  solidLegendLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  dashedLegendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 20,
  },
  legendDash: {
    width: 4,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 12,
    color: '#5b6b80',
  },
});
