import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { TrayStatus } from '../../domain/entities/Tray';

interface LegendItem {
  status: TrayStatus;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    status: 'AVAILABLE',
    label: 'Còn trống',
    iconName: 'radio-button-on-outline',
    color: theme.colors.success.main,
    bgColor: theme.colors.success.light,
  },
  {
    status: 'SELECTED',
    label: 'Đang chọn',
    iconName: 'checkmark-circle',
    color: theme.colors.primary[500],
    bgColor: theme.colors.primary[50],
  },
  {
    status: 'MY_RENTED_TRAY',
    label: 'Khay của bạn',
    iconName: 'shield-checkmark',
    color: theme.colors.info.main,
    bgColor: theme.colors.info.light,
  },
  {
    status: 'RENTED_BY_OTHER',
    label: 'Đã có người thuê',
    iconName: 'lock-closed',
    color: theme.colors.neutral[500],
    bgColor: theme.colors.neutral[100],
  },
  {
    status: 'MAINTENANCE',
    label: 'Đang bảo trì',
    iconName: 'construct',
    color: theme.colors.warning.main,
    bgColor: theme.colors.warning.light,
  },
];

export const TrayStatusLegend: React.FC = () => {
  return (
    <View style={styles.container}>
      <AppText variant="captionMedium" color={theme.colors.text.secondary} style={styles.title}>
        Chú thích trạng thái khay:
      </AppText>
      <View style={styles.grid}>
        {LEGEND_ITEMS.map((item) => (
          <View key={item.status} style={styles.item}>
            <View style={[styles.badge, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.iconName} size={13} color={item.color} />
            </View>
            <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={1}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  title: {
    marginBottom: theme.spacing.xxs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minWidth: '45%',
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
