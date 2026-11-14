import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components';
import { CustomerEnvironmentHistoryPoint } from '../../domain/entities/Tray';

export type EnvironmentHistoryRange = 1 | 6 | 12 | 24;

interface CustomerEnvironmentHistoryChartProps {
  points: CustomerEnvironmentHistoryPoint[];
  range: EnvironmentHistoryRange;
  onRangeChange: (range: EnvironmentHistoryRange) => void;
  loading: boolean;
  error: string | null;
}

const RANGE_OPTIONS: EnvironmentHistoryRange[] = [1, 6, 12, 24];
const PLOT_HEIGHT = 164;
const LEFT = 40;
const RIGHT = 42;
const TOP = 12;
const BOTTOM = 22;

function finiteValues(values: (number | string | null)[]): number[] {
  return values
    .map((value) => (value == null ? Number.NaN : Number(value)))
    .filter(Number.isFinite);
}

function getBounds(values: number[], fallback: [number, number]): [number, number] {
  if (values.length === 0) return fallback;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || Math.max(Math.abs(minValue) * 0.04, 1);
  return [minValue - span * 0.12, maxValue + span * 0.12];
}

function createLinePath(
  values: (number | string | null)[],
  width: number,
  bounds: [number, number]
): string {
  const plotWidth = Math.max(width - LEFT - RIGHT, 1);
  const plotHeight = PLOT_HEIGHT - TOP - BOTTOM;
  const [min, max] = bounds;
  return values.reduce<string>((path, value, index) => {
    if (value == null || !Number.isFinite(Number(value))) return path;
    const x = LEFT + (values.length <= 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth);
    const y = TOP + ((max - Number(value)) / (max - min)) * plotHeight;
    return `${path}${path ? ' ' : ''}${path ? 'L' : 'M'} ${x} ${y}`;
  }, '');
}

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const CustomerEnvironmentHistoryChart: React.FC<CustomerEnvironmentHistoryChartProps> = ({
  points,
  range,
  onRangeChange,
  loading,
  error,
}) => {
  const [width, setWidth] = useState(320);
  const temperatures = useMemo(() => finiteValues(points.map((point) => point.temperature_avg)), [points]);
  const humidities = useMemo(() => finiteValues(points.map((point) => point.humidity_avg)), [points]);
  const temperatureBounds = useMemo(() => getBounds(temperatures, [0, 10]), [temperatures]);
  const humidityBounds = useMemo(() => getBounds(humidities, [0, 100]), [humidities]);
  const temperaturePath = useMemo(
    () => createLinePath(points.map((point) => point.temperature_avg), width, temperatureBounds),
    [points, temperatureBounds, width]
  );
  const humidityPath = useMemo(
    () => createLinePath(points.map((point) => point.humidity_avg), width, humidityBounds),
    [points, humidityBounds, width]
  );
  const first = points[0];
  const middle = points[Math.floor((points.length - 1) / 2)];
  const last = points[points.length - 1];

  return (
    <View style={styles.card} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart-outline" size={17} color={theme.colors.primary[700]} />
          <AppText variant="bodyMedium" weight="bold" color={theme.colors.text.primary}>
            Diễn biến nhiệt độ & độ ẩm
          </AppText>
        </View>
        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: range === option }}
              onPress={() => onRangeChange(option)}
              style={[styles.rangeButton, range === option && styles.rangeButtonActive]}
            >
              <AppText
                variant="caption"
                weight={range === option ? 'bold' : 'medium'}
                color={range === option ? theme.colors.primary[700] : theme.colors.text.secondary}
              >
                {option} giờ
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.message}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error.main} />
          <AppText variant="caption" color={theme.colors.error.main} style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : loading && points.length === 0 ? (
        <View style={styles.message}>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Đang tải lịch sử môi trường…
          </AppText>
        </View>
      ) : points.length === 0 ? (
        <View style={styles.message}>
          <Ionicons name="time-outline" size={18} color={theme.colors.text.muted} />
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Chưa có dữ liệu tổng hợp trong khoảng thời gian này.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: '#D83E35' }]} />
              <AppText variant="caption" color={theme.colors.text.secondary}>Nhiệt độ (°C)</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: '#2868E8' }]} />
              <AppText variant="caption" color={theme.colors.text.secondary}>Độ ẩm (%RH)</AppText>
            </View>
            {loading ? <AppText variant="caption" color={theme.colors.text.muted}>Đang cập nhật</AppText> : null}
          </View>
          <Svg width={width} height={PLOT_HEIGHT}>
            {[0, 1, 2, 3].map((tick) => {
              const y = TOP + (tick / 3) * (PLOT_HEIGHT - TOP - BOTTOM);
              const temp = temperatureBounds[1] - (tick / 3) * (temperatureBounds[1] - temperatureBounds[0]);
              const humidity = humidityBounds[1] - (tick / 3) * (humidityBounds[1] - humidityBounds[0]);
              return (
                <React.Fragment key={tick}>
                  <Line x1={LEFT} y1={y} x2={width - RIGHT} y2={y} stroke="#DFE7EF" strokeDasharray="3 4" />
                  <SvgTextLabel x={LEFT - 5} y={y + 4} anchor="end" text={`${formatTick(temp)}°`} />
                  <SvgTextLabel x={width - RIGHT + 5} y={y + 4} anchor="start" text={`${formatTick(humidity)}%`} />
                </React.Fragment>
              );
            })}
            {temperaturePath ? <Path d={temperaturePath} fill="none" stroke="#D83E35" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {humidityPath ? <Path d={humidityPath} fill="none" stroke="#2868E8" strokeWidth={2.5} strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>
          <View style={styles.xAxis}>
            <AppText variant="caption" color={theme.colors.text.muted}>{first ? formatTime(first.period_start) : ''}</AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>{middle ? formatTime(middle.period_start) : ''}</AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>{last ? formatTime(last.period_start) : ''}</AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.muted}>
            Mỗi điểm là giá trị trung bình theo nhóm 10 phút.
          </AppText>
        </>
      )}
    </View>
  );
};

const SvgTextLabel: React.FC<{ x: number; y: number; anchor: 'start' | 'end'; text: string }> = ({ x, y, anchor, text }) => (
  <SvgText x={x} y={y} textAnchor={anchor} fontSize={10} fill="#64748B">
    {text}
  </SvgText>
);

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
    gap: theme.spacing.xs,
    overflow: 'hidden',
  },
  header: { gap: theme.spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  rangeRow: { flexDirection: 'row', alignSelf: 'flex-end', gap: 2 },
  rangeButton: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.borderRadius.sm, backgroundColor: '#F3F6F8' },
  rangeButtonActive: { backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#C8D9FA' },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 15, height: 2, borderRadius: 2 },
  message: { minHeight: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
  messageText: { flexShrink: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: LEFT, marginRight: RIGHT },
});
