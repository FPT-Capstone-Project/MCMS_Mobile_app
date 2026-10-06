import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppText } from '../../../../shared/components/primitives/AppText';
import {
  MushroomVariety,
  RentalDuration,
  getMinimumWeeksForMushroom,
} from '../../domain/entities/Rental';

export interface DurationSelectorProps {
  durations: RentalDuration[];
  selectedDuration: RentalDuration | null;
  selectedMushroom?: MushroomVariety | null;
  onSelectDuration: (duration: RentalDuration) => void;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  durations,
  selectedDuration,
  selectedMushroom,
  onSelectDuration,
}) => {
  const minWeeksRequired = selectedMushroom
    ? getMinimumWeeksForMushroom(selectedMushroom.harvestDays)
    : 1;

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

      {/* Requirement Growth Cycle Banner */}
      {selectedMushroom ? (
        <View style={styles.requirementBanner}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="information-circle" size={20} color={theme.colors.info.main} />
          </View>
          <View style={styles.bannerTextCol}>
            <AppText variant="captionMedium" weight="bold" color={theme.colors.info.dark}>
              Chu kỳ sinh trưởng: {selectedMushroom.name}
            </AppText>
            <AppText variant="caption" color={theme.colors.info.text} style={styles.bannerDesc}>
              Cần tối thiểu <AppText weight="bold" color={theme.colors.info.dark}>{selectedMushroom.harvestDays} ngày</AppText> (~<AppText weight="bold" color={theme.colors.info.dark}>{minWeeksRequired} tuần</AppText>) để hoàn thành 1 đợt thu hoạch. Các gói không đủ thời gian đã được tự động khóa.
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={styles.optionsList}>
        {durations.map((item) => {
          const isDisabled = item.weeks < minWeeksRequired;
          const isSelected = !isDisabled && selectedDuration?.id === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (!isDisabled) {
                  onSelectDuration(item);
                }
              }}
              disabled={isDisabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                isDisabled && styles.optionCardDisabled,
                pressed && !isDisabled && styles.optionCardPressed,
              ]}
            >
              {/* Left: Radio & Title */}
              <View style={styles.leftCol}>
                <View
                  style={[
                    styles.radioCircle,
                    isDisabled && styles.radioCircleDisabled,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isDisabled ? (
                    <Ionicons name="lock-closed" size={11} color={theme.colors.neutral[400]} />
                  ) : (
                    isSelected && <View style={styles.radioInner} />
                  )}
                </View>

                <View style={styles.labelGroup}>
                  <View style={styles.titleRow}>
                    <AppText
                      variant="title"
                      weight="bold"
                      color={
                        isDisabled
                          ? theme.colors.text.disabled
                          : isSelected
                          ? theme.colors.primary[700]
                          : theme.colors.text.primary
                      }
                    >
                      {item.label}
                    </AppText>

                    {item.popular && !isDisabled && (
                      <View style={styles.popularBadge}>
                        <AppText variant="overline" color={theme.colors.secondary[900]}>
                          Phổ biến
                        </AppText>
                      </View>
                    )}

                    {isDisabled && (
                      <View style={styles.lockedBadge}>
                        <Ionicons name="alert-circle-outline" size={11} color={theme.colors.warning.main} />
                        <AppText variant="overline" color={theme.colors.warning.text} weight="bold">
                          Không đủ chu kỳ
                        </AppText>
                      </View>
                    )}
                  </View>

                  <AppText
                    variant="caption"
                    color={isDisabled ? theme.colors.text.disabled : theme.colors.text.secondary}
                  >
                    {isDisabled
                      ? `Cần tối thiểu ${minWeeksRequired} tuần (~${selectedMushroom?.harvestDays} ngày)`
                      : item.description}
                  </AppText>
                </View>
              </View>

              {/* Right: Price */}
              <View style={styles.rightCol}>
                <AppText
                  variant="title"
                  weight="bold"
                  color={
                    isDisabled
                      ? theme.colors.text.disabled
                      : isSelected
                      ? theme.colors.primary[600]
                      : theme.colors.text.primary
                  }
                >
                  {formatVND(item.price)}
                </AppText>
                <AppText
                  variant="caption"
                  color={isDisabled ? theme.colors.text.disabled : theme.colors.text.muted}
                >
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
  requirementBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.info.light,
    borderColor: theme.colors.info.main,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  bannerIconBox: {
    marginTop: 1,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  bannerDesc: {
    lineHeight: 17,
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
  optionCardDisabled: {
    backgroundColor: theme.colors.neutral[100],
    borderColor: theme.colors.neutral[200],
    opacity: 0.65,
    elevation: 0,
    shadowOpacity: 0,
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
  radioCircleDisabled: {
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.neutral[200],
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
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  popularBadge: {
    backgroundColor: theme.colors.secondary[100],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.warning.light,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
    borderWidth: 0.5,
    borderColor: theme.colors.warning.main,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
});
