import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components';
import { CustomerEnvironmentHistoryPoint } from '../../domain/entities/Tray';

export type EnvironmentHistoryRange = 1 | 6 | 12 | 24;

interface CustomerEnvironmentHistoryChartProps {
  points: Pick<CustomerEnvironmentHistoryPoint, 'period_start' | 'temperature_avg' | 'humidity_avg'>[];
  range?: EnvironmentHistoryRange;
  onRangeChange?: (range: EnvironmentHistoryRange) => void;
  showRangeControls?: boolean;
  selectDay?: boolean;
  timeLabelMode?: 'time' | 'date';
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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--/--'
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getLocalDayKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export const CustomerEnvironmentHistoryChart: React.FC<CustomerEnvironmentHistoryChartProps> = ({
  points,
  range = 24,
  onRangeChange,
  showRangeControls = true,
  selectDay = false,
  timeLabelMode = 'time',
  loading,
  error,
}) => {
  const [width, setWidth] = useState(320);
  const availableDays = useMemo(() => [...new Set(points
    .map((point) => getLocalDayKey(point.period_start))
    .filter((day): day is string => day !== null))].sort(), [points]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const activeDay = selectedDay && availableDays.includes(selectedDay)
    ? selectedDay
    : availableDays[availableDays.length - 1] ?? null;
  const visiblePoints = useMemo(
    () => selectDay && activeDay
      ? points.filter((point) => getLocalDayKey(point.period_start) === activeDay)
      : points,
    [activeDay, points, selectDay]
  );
  const temperatures = useMemo(() => finiteValues(visiblePoints.map((point) => point.temperature_avg)), [visiblePoints]);
  const humidities = useMemo(() => finiteValues(visiblePoints.map((point) => point.humidity_avg)), [visiblePoints]);
  const temperatureBounds = useMemo(() => getBounds(temperatures, [0, 10]), [temperatures]);
  const humidityBounds = useMemo(() => getBounds(humidities, [0, 100]), [humidities]);
  const temperaturePath = useMemo(
    () => createLinePath(visiblePoints.map((point) => point.temperature_avg), width, temperatureBounds),
    [visiblePoints, temperatureBounds, width]
  );
  const humidityPath = useMemo(
    () => createLinePath(visiblePoints.map((point) => point.humidity_avg), width, humidityBounds),
    [visiblePoints, humidityBounds, width]
  );
  const first = visiblePoints[0];
  const middle = visiblePoints[Math.floor((visiblePoints.length - 1) / 2)];
  const last = visiblePoints[visiblePoints.length - 1];

  return (
    <View style={styles.card} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart-outline" size={17} color={theme.colors.primary[700]} />
          <AppText variant="bodyMedium" weight="bold" color={theme.colors.text.primary}>
            Diễn biến nhiệt độ & độ ẩm
          </AppText>
        </View>
        {showRangeControls ? <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: range === option }}
              onPress={() => onRangeChange?.(option)}
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
        </View> : null}
      </View>

      {selectDay && availableDays.length > 0 ? (
        <View style={styles.daySelector}>
          <AppText variant="caption" weight="bold" color={theme.colors.text.secondary}>Chọn ngày xem</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayOptions}>
            {availableDays.map((day) => (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`Xem biểu đồ ngày ${formatDayLabel(day)}`}
                accessibilityState={{ selected: day === activeDay }}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayButton, day === activeDay && styles.dayButtonActive]}
              >
                <AppText
                  variant="caption"
                  weight={day === activeDay ? 'bold' : 'medium'}
                  color={day === activeDay ? theme.colors.primary[700] : theme.colors.text.secondary}
                >
                  {formatDayLabel(day)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

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
      ) : visiblePoints.length === 0 ? (
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
            <AppText variant="caption" color={theme.colors.text.muted}>{first ? (timeLabelMode === 'date' ? formatDate(first.period_start) : formatTime(first.period_start)) : ''}</AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>{middle ? (timeLabelMode === 'date' ? formatDate(middle.period_start) : formatTime(middle.period_start)) : ''}</AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>{last ? (timeLabelMode === 'date' ? formatDate(last.period_start) : formatTime(last.period_start)) : ''}</AppText>
          </View>
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
  daySelector: { gap: 5 },
  dayOptions: { gap: 6, paddingRight: 4 },
  dayButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.sm, backgroundColor: '#F3F6F8' },
  dayButtonActive: { backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#C8D9FA' },
  rangeButton: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.borderRadius.sm, backgroundColor: '#F3F6F8' },
  rangeButtonActive: { backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#C8D9FA' },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 15, height: 2, borderRadius: 2 },
  message: { minHeight: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
  messageText: { flexShrink: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: LEFT, marginRight: RIGHT },
});
