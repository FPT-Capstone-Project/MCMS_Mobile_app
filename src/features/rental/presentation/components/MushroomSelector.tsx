import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { formatVND } from '../../../../core/utils/currency';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { MushroomVariety } from '../../domain/entities/Rental';

export interface MushroomSelectorProps {
  varieties: MushroomVariety[];
  selectedMushroom: MushroomVariety | null;
  onSelectMushroom: (variety: MushroomVariety) => void;
}

export const MushroomSelector: React.FC<MushroomSelectorProps> = ({
  varieties,
  selectedMushroom,
  onSelectMushroom,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="h3" weight="bold">
          Chọn phôi nấm
        </AppText>
        <AppText variant="bodySmall" color={theme.colors.text.secondary}>
          Chọn giống phôi cấy sẵn cho mẻ nuôi trồng đầu tiên của bạn
        </AppText>
      </View>

      <View style={styles.list}>
        {varieties.map((variety) => {
          const isSelected = selectedMushroom?.id === variety.id;

          return (
            <Pressable
              key={variety.id}
              onPress={() => onSelectMushroom(variety)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                pressed && styles.cardPressed,
              ]}
            >
              {/* Left Column: Icon Avatar */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary[500]
                      : theme.colors.primary[50],
                  },
                ]}
              >
                <Ionicons
                  name={(variety.iconName as keyof typeof Ionicons.glyphMap) || 'leaf'}
                  size={24}
                  color={isSelected ? '#FFFFFF' : theme.colors.primary[600]}
                />
              </View>

              {/* Middle Column: Details */}
              <View style={styles.detailsCol}>
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
                    {variety.name}
                  </AppText>
                  {variety.scientificName ? (
                    <AppText
                      variant="caption"
                      color={theme.colors.text.muted}
                      style={styles.italicText}
                    >
                      ({variety.scientificName})
                    </AppText>
                  ) : null}
                </View>

                <AppText
                  variant="bodySmall"
                  color={theme.colors.text.secondary}
                  numberOfLines={2}
                  style={styles.description}
                >
                  {variety.description}
                </AppText>

                {/* Metadata Pills */}
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.neutral[600]} />
                    <AppText variant="caption" color={theme.colors.neutral[600]}>
                      ~{variety.harvestDays} ngày thu hoạch
                    </AppText>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="scale-outline" size={13} color={theme.colors.neutral[600]} />
                    <AppText variant="caption" color={theme.colors.neutral[600]}>
                      {variety.yieldPerBatch}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Right Column: Price & Radio */}
              <View style={styles.rightCol}>
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                <View style={styles.priceGroup}>
                  <AppText
                    variant="label"
                    weight="bold"
                    color={
                      isSelected
                        ? theme.colors.primary[600]
                        : theme.colors.text.primary
                    }
                  >
                    {formatVND(variety.price)}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    / phôi
                  </AppText>
                </View>
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
  list: {
    gap: theme.spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'column',
  },
  italicText: {
    fontStyle: 'italic',
  },
  description: {
    marginTop: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    minHeight: 70,
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
    backgroundColor: theme.colors.primary[500],
  },
  priceGroup: {
    alignItems: 'flex-end',
  },
});
