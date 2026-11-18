import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { formatVietnamDate, getCustomerPickupTimeOptions, getVietnamDateKey } from '../../domain/harvestSchedule';

interface Props {
  dates: string[];
  date: string;
  time: string;
  disabled?: boolean;
  onChange: (date: string, time: string) => void;
}

export function PickupSchedulePicker({ dates, date, time, disabled = false, onChange }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [period, setPeriod] = useState<'morning' | 'afternoon' | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const availableDates = dates.filter((value) => getCustomerPickupTimeOptions(value, now).length > 0);
  const times = availableDates.includes(date) ? getCustomerPickupTimeOptions(date, now) : [];
  const morning = times.filter((value) => value < '12:00');
  const afternoon = times.filter((value) => value >= '12:00');
  const preferred = period ?? (time ? time < '12:00' ? 'morning' : 'afternoon' : morning.length ? 'morning' : 'afternoon');
  const activePeriod = preferred === 'morning' && morning.length ? 'morning' : preferred === 'afternoon' && afternoon.length ? 'afternoon' : morning.length ? 'morning' : 'afternoon';
  const valid = times.includes(time);

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Ionicons name="calendar-outline" size={19} color={theme.colors.primary[700]} />
        <AppText variant="bodySmall" weight="bold">Chọn ngày đến nhận</AppText>
      </View>
      <View style={styles.dates}>
        {availableDates.map((value) => (
          <Pressable key={value} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Ngày ${formatVietnamDate(value)}`} accessibilityState={{ selected: date === value, disabled }}
            style={[styles.date, date === value && styles.selected, disabled && styles.disabled]}
            onPress={() => {
              const options = getCustomerPickupTimeOptions(value, new Date());
              setPeriod(null);
              onChange(value, options.includes(time) ? time : '');
            }}>
            <AppText variant="bodySmall" weight="bold" color={date === value ? theme.colors.primary[700] : theme.colors.text.primary}>{formatVietnamDate(value)}</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>{value === getVietnamDateKey(now) ? 'Hôm nay' : 'Đến trang trại'}</AppText>
          </Pressable>
        ))}
      </View>
      {!availableDates.length ? <AppText variant="bodySmall" color={theme.colors.warning.dark}>Không còn lịch nhận phù hợp. Vui lòng liên hệ trang trại.</AppText> : (
        <>
          <View style={styles.heading}>
            <Ionicons name="time-outline" size={19} color={theme.colors.primary[700]} />
            <AppText variant="bodySmall" weight="bold">Chọn giờ đến nhận</AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.secondary}>07:00–17:00 · Mỗi 15 phút · Giờ Việt Nam</AppText>
          {!times.length ? <AppText variant="bodySmall" color={theme.colors.text.secondary}>Chọn một ngày còn lịch để xem giờ đến nhận.</AppText> : (
            <>
              <View style={styles.periods}>
                {(['morning', 'afternoon'] as const).map((value) => {
                  const unavailable = disabled || !(value === 'morning' ? morning : afternoon).length;
                  return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: activePeriod === value, disabled: unavailable }} disabled={unavailable}
                    style={[styles.period, activePeriod === value && styles.periodSelected, unavailable && styles.disabled]} onPress={() => setPeriod(value)}>
                    <Ionicons name={value === 'morning' ? 'sunny-outline' : 'partly-sunny-outline'} size={17} color={theme.colors.primary[700]} />
                    <AppText variant="bodySmall" weight="bold">{value === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}</AppText>
                  </Pressable>;
                })}
              </View>
              <View style={styles.slots}>
                {(activePeriod === 'morning' ? morning : afternoon).map((value) => (
                  <Pressable key={value} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Đến nhận lúc ${value}`} accessibilityState={{ selected: time === value, disabled }}
                    style={[styles.slot, time === value && styles.slotSelected, disabled && styles.disabled]}
                    onPress={() => onChange(date, value)}>
                    <AppText variant="bodySmall" weight="bold" color={time === value ? '#FFFFFF' : theme.colors.text.primary}>{value}</AppText>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}
      {!!date && !!time && (
        <View style={[styles.summary, !valid && styles.invalid]} accessibilityLiveRegion="polite">
          <Ionicons name={valid ? 'checkmark-circle' : 'alert-circle-outline'} size={22} color={valid ? theme.colors.primary[700] : theme.colors.warning.dark} />
          <View style={styles.summaryCopy}>
            <AppText variant="caption" color={theme.colors.text.secondary}>{valid ? 'Lịch đang chọn' : 'Vui lòng chọn lại giờ'}</AppText>
            <AppText variant="bodySmall" weight="bold">{time} · {formatVietnamDate(date)}</AppText>
            {!valid && <AppText variant="caption" color={theme.colors.warning.dark}>Giờ này đã qua hoặc không thuộc mốc 00, 15, 30, 45 phút.</AppText>}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  date: { width: '48%', flexGrow: 1, minHeight: 64, gap: 4, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border.light, backgroundColor: theme.colors.background.paper },
  selected: { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50] },
  periods: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, backgroundColor: theme.colors.neutral[100] },
  period: { flex: 1, minHeight: 44, borderRadius: 11, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  periodSelected: { backgroundColor: theme.colors.background.paper },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '22%', flexGrow: 1, minWidth: 58, maxWidth: '25%', minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border.light, borderRadius: 12, backgroundColor: theme.colors.background.paper },
  slotSelected: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: theme.colors.primary[50] },
  summaryCopy: { flex: 1, gap: 3 },
  invalid: { backgroundColor: theme.colors.warning.light },
  disabled: { opacity: 0.4 },
});
