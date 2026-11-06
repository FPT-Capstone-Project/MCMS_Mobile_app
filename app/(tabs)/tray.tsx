import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ENV } from '../../src/core/config';
import { AppError } from '../../src/core/errors/appError';
import { theme } from '../../src/core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';
import { CustomerFloorRack, CustomerTrayCard } from '../../src/features/tray';
import { trayRepository } from '../../src/features/tray/data/repositories/TrayRepository';

type TrayLoadState = 'loading' | 'ready' | 'error';

function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return error instanceof Error ? error.message : 'Không thể tải sơ đồ khay.';
}

export default function TrayScreen() {
  const router = useRouter();
  const [racks, setRacks] = useState<CustomerFloorRack[]>([]);
  const [loadState, setLoadState] = useState<TrayLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRacks = useCallback(async () => {
    try {
      setErrorMessage(null);
      setRacks(await trayRepository.getCustomerFloorRacks());
      setLoadState('ready');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRacks();
    }, [loadRacks])
  );

  const handleRetry = () => {
    setLoadState('loading');
    void loadRacks();
  };

  const handleViewCamera = () => {
    router.push({
      pathname: '/camera/[cameraId]',
      params: { cameraId: ENV.cameraId || '0' },
    });
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Khay của tôi"
        subtitle="Sơ đồ khay tại SmartMush Farm"
        rightAction={
          <AppIconButton
            icon={<Ionicons name="refresh-outline" size={20} color={theme.colors.text.primary} />}
            onPress={handleRetry}
            accessibilityLabel="Tải lại sơ đồ khay"
            disabled={loadState === 'loading'}
          />
        }
      />

      <View style={styles.content}>
        <TrayLegend />

        {loadState === 'loading' ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải sơ đồ các tầng...
            </AppText>
          </View>
        ) : null}

        {loadState === 'error' ? (
          <AppCard elevation="sm" style={styles.messageCard}>
            <Ionicons name="cloud-offline-outline" size={34} color={theme.colors.error.main} />
            <AppText variant="title" weight="bold" align="center">
              Không thể tải sơ đồ khay
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              {errorMessage}
            </AppText>
            <AppButton title="Thử lại" onPress={handleRetry} />
          </AppCard>
        ) : null}

        {loadState === 'ready' && racks.length === 0 ? (
          <AppCard elevation="xs" style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={30} color={theme.colors.text.muted} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              Hiện chưa có tầng khay đang hoạt động.
            </AppText>
          </AppCard>
        ) : null}

        {loadState === 'ready'
          ? racks.map((rack) => (
              <View key={rack.id} style={styles.floorSection}>
                <AppText variant="title" weight="bold" style={styles.floorTitle}>
                  Tầng {rack.floorNumber} ({rack.floorName})
                </AppText>
                {rack.trays.length > 0 ? (
                  <View style={styles.trayGrid}>
                    {rack.trays.map((tray) => (
                      <TrayTile
                        key={tray.id}
                        tray={tray}
                        onViewCamera={handleViewCamera}
                      />
                    ))}
                  </View>
                ) : (
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Tầng này chưa có khay.
                  </AppText>
                )}
              </View>
            ))
          : null}
      </View>
    </ScreenContainer>
  );
}

interface TrayTileProps {
  tray: CustomerTrayCard;
  onViewCamera: () => void;
}

const TrayTile: React.FC<TrayTileProps> = ({ tray, onViewCamera }) => {
  const isMine = tray.usage === 'MY_CULTIVATION';
  const isInUse = tray.usage !== 'AVAILABLE';
  const palette =
    tray.usage === 'MY_CULTIVATION'
      ? {
          background: '#E8F5EC',
          border: '#168A4A',
          text: '#08743A',
          accent: '#16A34A',
        }
      : tray.usage === 'OTHER_CULTIVATION'
        ? {
            background: '#EAF2FB',
            border: '#2F70B7',
            text: '#275E99',
            accent: '#3478C5',
          }
        : {
            background: '#F1F4F8',
            border: '#94A3B8',
            text: '#64748B',
            accent: '#FFFFFF',
          };

  return (
    <View
      style={[
        styles.trayTile,
        { backgroundColor: palette.background, borderColor: palette.border },
        !isInUse && styles.unusedTile,
      ]}
      accessibilityLabel={`${tray.code}, ${
        isMine
          ? `khay của tôi, đang trồng ${tray.mushroomName ?? 'nấm'}`
          : tray.usage === 'OTHER_CULTIVATION'
            ? `đang trồng ${tray.mushroomName ?? 'nấm'}`
            : 'chưa sử dụng'
      }`}
    >
      <View style={styles.tileHeading}>
        <AppText
          variant="captionMedium"
          weight="medium"
          color={palette.text}
          numberOfLines={1}
          style={styles.tileCode}
        >
          {tray.code}
        </AppText>
        {isInUse ? (
          <Ionicons
            name="leaf-outline"
            size={18}
            color={palette.text}
            accessibilityLabel="Đang trồng"
          />
        ) : null}
      </View>

      {isMine ? (
        <View style={styles.ownedTrayContent}>
          <AppText variant="caption" weight="bold" color={palette.text} numberOfLines={1}>
            Khay của tôi
          </AppText>
          <AppText variant="caption" color={palette.text} numberOfLines={2}>
            {tray.mushroomName ?? 'Đang trồng nấm'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem camera tại khay ${tray.code}`}
            onPress={onViewCamera}
            style={({ pressed }) => [
              styles.cameraButton,
              pressed && styles.cameraButtonPressed,
            ]}
          >
            <Ionicons name="videocam-outline" size={14} color="#FFFFFF" />
            <AppText variant="caption" weight="bold" color="#FFFFFF" numberOfLines={1}>
              Xem camera
            </AppText>
          </Pressable>
        </View>
      ) : tray.usage === 'OTHER_CULTIVATION' ? (
        <AppText variant="caption" color={palette.text} numberOfLines={2}>
          {tray.mushroomName ?? 'Đang trồng nấm'}
        </AppText>
      ) : null}

      <View style={[styles.tileStatusLine, { backgroundColor: palette.accent }]} />
    </View>
  );
};

const TrayLegend: React.FC = () => (
  <View style={styles.legend}>
    <LegendItem color="#168A4A" label="Khay của tôi" />
    <LegendItem color="#3478C5" label="Đang trồng" />
    <LegendItem color="#94A3B8" label="Chưa sử dụng" />
  </View>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <AppText variant="caption" color={theme.colors.text.secondary}>
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.lg,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  messageCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
  },
  floorSection: {
    gap: theme.spacing.sm,
  },
  floorTitle: {
    color: '#18243B',
  },
  trayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  trayTile: {
    width: '31.5%',
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  unusedTile: {
    borderStyle: 'dashed',
  },
  tileHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 3,
  },
  tileCode: {
    flexShrink: 1,
  },
  ownedTrayContent: {
    gap: 2,
  },
  cameraButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#168A4A',
  },
  cameraButtonPressed: {
    opacity: 0.75,
  },
  tileStatusLine: {
    height: 4,
    width: '100%',
    borderRadius: 4,
  },
});
