import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { TierLevel, Tray, TrayId } from '../../domain/entities/Tray';

export interface RackVisualizerProps {
  trays: Tray[];
  selectedTrayId: TrayId | null;
  onSelectTray: (trayId: TrayId) => void;
  onDisabledTrayPress?: (tray: Tray) => void;
}

interface TrayCardProps {
  tray: Tray;
  isSelected: boolean;
  onPress: () => void;
  onDisabledPress?: () => void;
}

const TrayCard: React.FC<TrayCardProps> = ({
  tray,
  isSelected,
  onPress,
  onDisabledPress,
}) => {
  const isAvailable = tray.status === 'AVAILABLE';
  const isMyTray = tray.status === 'MY_RENTED_TRAY';
  const isMaintenance = tray.status === 'MAINTENANCE';

  const getStatusConfig = () => {
    if (isSelected) {
      return {
        label: 'Đã chọn',
        icon: 'checkmark-circle' as const,
        color: theme.colors.neutral[0],
        badgeBg: theme.colors.primary[500],
        cardBg: theme.colors.primary[50],
        borderColor: theme.colors.primary[500],
        borderWidth: 2.5,
      };
    }
    if (isMyTray) {
      return {
        label: 'Của bạn',
        icon: 'person-circle' as const,
        color: theme.colors.info.main,
        badgeBg: theme.colors.info.light,
        cardBg: '#F0F9FF',
        borderColor: theme.colors.info.main,
        borderWidth: 1.5,
      };
    }
    if (isAvailable) {
      return {
        label: 'Còn trống',
        icon: 'add-circle-outline' as const,
        color: theme.colors.success.main,
        badgeBg: theme.colors.success.light,
        cardBg: theme.colors.background.paper,
        borderColor: theme.colors.border.default,
        borderWidth: 1.5,
      };
    }
    if (isMaintenance) {
      return {
        label: 'Bảo trì',
        icon: 'construct-outline' as const,
        color: theme.colors.warning.main,
        badgeBg: theme.colors.warning.light,
        cardBg: theme.colors.neutral[50],
        borderColor: theme.colors.neutral[200],
        borderWidth: 1,
      };
    }
    // RENTED_BY_OTHER
    return {
      label: 'Đã thuê',
      icon: 'lock-closed-outline' as const,
      color: theme.colors.neutral[500],
      badgeBg: theme.colors.neutral[100],
      cardBg: theme.colors.neutral[100],
      borderColor: theme.colors.neutral[200],
      borderWidth: 1,
    };
  };

  const statusConfig = getStatusConfig();

  const handlePress = () => {
    if (isAvailable) {
      onPress();
    } else if (onDisabledPress) {
      onDisabledPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isAvailable && !onDisabledPress}
      accessibilityRole="button"
      accessibilityLabel={`Khay ${tray.id}, trạng thái ${statusConfig.label}`}
      accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
      style={({ pressed }) => [
        styles.trayCard,
        {
          backgroundColor: statusConfig.cardBg,
          borderColor: statusConfig.borderColor,
          borderWidth: statusConfig.borderWidth,
        },
        isSelected && styles.trayCardSelected,
        pressed && isAvailable && styles.trayCardPressed,
        !isAvailable && styles.trayCardDisabled,
      ]}
    >
      {/* Top row: ID + Status Icon */}
      <View style={styles.cardHeader}>
        <AppText
          variant="label"
          weight="bold"
          color={isSelected ? theme.colors.primary[700] : theme.colors.text.primary}
        >
          {tray.id}
        </AppText>
        <Ionicons
          name={statusConfig.icon}
          size={16}
          color={isSelected ? theme.colors.primary[500] : statusConfig.color}
        />
      </View>

      {/* Tray Graphic Indicator */}
      <View
        style={[
          styles.trayGraphic,
          {
            backgroundColor: isSelected
              ? theme.colors.primary[100]
              : isAvailable
              ? theme.colors.neutral[50]
              : theme.colors.neutral[200],
          },
        ]}
      >
        <Ionicons
          name="cube"
          size={20}
          color={
            isSelected
              ? theme.colors.primary[600]
              : isAvailable
              ? theme.colors.success.main
              : isMyTray
              ? theme.colors.info.main
              : theme.colors.neutral[400]
          }
        />
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: isSelected ? theme.colors.primary[500] : statusConfig.badgeBg },
        ]}
      >
        <AppText
          variant="overline"
          weight="bold"
          color={isSelected ? '#FFFFFF' : statusConfig.color}
          numberOfLines={1}
        >
          {statusConfig.label}
        </AppText>
      </View>
    </Pressable>
  );
};

export const RackVisualizer: React.FC<RackVisualizerProps> = ({
  trays,
  selectedTrayId,
  onSelectTray,
  onDisabledTrayPress,
}) => {
  // Group trays by tiers: 3, 2, 1 (ordered top to bottom)
  const tiers: TierLevel[] = [3, 2, 1];

  return (
    <View style={styles.container}>
      {/* Rack Header */}
      <View style={styles.rackFrameHeader}>
        <View style={styles.frameDot} />
        <AppText variant="captionMedium" color={theme.colors.text.secondary}>
          GIÁ ĐỠ KHAY THÔNG MINH (3 TẦNG × 3 KHAY)
        </AppText>
        <View style={styles.frameDot} />
      </View>

      {/* 2D Isometric Rack Structure */}
      <View style={styles.rackStructure}>
        {/* Left Vertical Frame Pillar */}
        <View style={styles.rackPillarLeft} />

        {/* Tiers Container */}
        <View style={styles.tiersContainer}>
          {tiers.map((tierLevel) => {
            const tierTrays = trays
              .filter((t) => t.tier === tierLevel)
              .sort((a, b) => a.position - b.position);

            return (
              <View key={`tier-${tierLevel}`} style={styles.tierSection}>
                {/* Tier Label Row */}
                <View style={styles.tierLabelRow}>
                  <View style={styles.tierPill}>
                    <AppText variant="captionMedium" weight="bold" color={theme.colors.neutral[700]}>
                      Tầng {tierLevel}
                    </AppText>
                  </View>
                  <View style={styles.shelfBeamLine} />
                </View>

                {/* 3 Trays in this tier */}
                <View style={styles.traysRow}>
                  {tierTrays.map((tray) => (
                    <View key={tray.id} style={styles.trayWrapper}>
                      <TrayCard
                        tray={tray}
                        isSelected={selectedTrayId === tray.id}
                        onPress={() => onSelectTray(tray.id)}
                        onDisabledPress={
                          onDisabledTrayPress ? () => onDisabledTrayPress(tray) : undefined
                        }
                      />
                    </View>
                  ))}
                </View>

                {/* Isometric Shelf Base Bar */}
                <View style={styles.shelfBaseBar} />
              </View>
            );
          })}
        </View>

        {/* Right Vertical Frame Pillar */}
        <View style={styles.rackPillarRight} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  rackFrameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
  },
  frameDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[500],
  },
  rackStructure: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  rackPillarLeft: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 12,
    width: 4,
    backgroundColor: theme.colors.neutral[400],
    borderRadius: 2,
    zIndex: 1,
  },
  rackPillarRight: {
    position: 'absolute',
    right: 8,
    top: 12,
    bottom: 12,
    width: 4,
    backgroundColor: theme.colors.neutral[400],
    borderRadius: 2,
    zIndex: 1,
  },
  tiersContainer: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  tierSection: {
    gap: theme.spacing.xs,
  },
  tierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  tierPill: {
    backgroundColor: theme.colors.neutral[200],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  shelfBeamLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.neutral[200],
  },
  traysRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  trayWrapper: {
    flex: 1,
  },
  trayCard: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minHeight: 104,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  trayCardSelected: {
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  trayCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  trayCardDisabled: {
    opacity: 0.85,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trayGraphic: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xxs,
  },
  statusBadge: {
    width: '100%',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: theme.borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfBaseBar: {
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    marginTop: 2,
  },
});
