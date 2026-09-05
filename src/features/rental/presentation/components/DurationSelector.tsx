import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { RentalDuration } from '../../domain/entities/Rental';

export interface DurationSelectorProps {
  durations: RentalDuration[];
  selectedDuration: RentalDuration | null;
  onSelectDuration: (duration: RentalDuration) => void;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  durations,
  selectedDuration,
  onSelectDuration,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="h3" weight="bold">
          Thời gian thuê
        </AppText>
        <AppText variant="bodySmall" color={theme.colors.text.secondary}>
          Chọn gói thời gian bạn muốn thuê khay nuôi trồng thông minh
        </AppText>
      </View>

      <View style={styles.optionsList}>
        {durations.map((item) => {
          const isSelected = selectedDuration?.id === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectDuration(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                pressed && styles.optionCardPressed,
              ]}
            >
              {/* Left: Radio & Title */}
              <View style={styles.leftCol}>
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>

                <View style={styles.labelGroup}>
                  <View style={styles.titleRow}>
                    <AppText
                      variant="title"
                      weight="bold"
                      color={
                        isSelected
                          ? theme.colors.primary[700]
                          : theme.colors.text.primary
                      }
                    >
                      {item.label}
                    </AppText>
                    {item.popular && (
                      <View style={styles.popularBadge}>
                        <AppText variant="overline" color={theme.colors.secondary[900]}>
                          Phổ biến
                        </AppText>
                      </View>
                    )}
                  </View>

                  {item.description ? (
                    <AppText
                      variant="caption"
                      color={theme.colors.text.secondary}
                    >
                      {item.description}
                    </AppText>
                  ) : null}
                </View>
              </View>

              {/* Right: Price */}
              <View style={styles.rightCol}>
                <AppText
                  variant="title"
                  weight="bold"
                  color={
                    isSelected
                      ? theme.colors.primary[600]
                      : theme.colors.text.primary
                  }
                >
                  {formatVND(item.price)}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.muted}>
                  / trọn gói
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.xxs,
  },
  optionsList: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    padding: theme.spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[0],
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary[500],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary[500],
  },
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  popularBadge: {
    backgroundColor: theme.colors.secondary[100],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
});
