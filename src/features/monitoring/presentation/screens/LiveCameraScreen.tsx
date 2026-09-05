import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { TrayId } from '../../../tray/domain/entities/Tray';
import {
  CameraFeed,
  CameraStatus,
  TrayTelemetry,
} from '../../domain/entities/Monitoring';
import { monitoringRepository } from '../../data/repositories/MonitoringRepository';
import { LiveCameraView } from '../components/LiveCameraView';
import { TelemetryGaugeCard } from '../components/TelemetryGaugeCard';

export const LiveCameraScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ trayId?: string }>();
  const trayId = (params.trayId as TrayId) || '1-1';

  // Camera stream & telemetry state
  const [feed, setFeed] = useState<CameraFeed | null>(null);
  const [telemetry, setTelemetry] = useState<TrayTelemetry | null>(null);
  const [status, setStatus] = useState<CameraStatus>('CONNECTING');
  const [chamberLightOn, setChamberLightOn] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCameraData = React.useCallback(async () => {
    try {
      // 1. Verify ownership
      const isOwner = await monitoringRepository.verifyTrayOwnership(trayId);
      if (!isOwner) {
        setStatus('UNAUTHORIZED');
        return;
      }

      // 2. Fetch camera feed & telemetry concurrently
      const [feedData, telemetryData] = await Promise.all([
        monitoringRepository.getCameraFeed(trayId),
        monitoringRepository.getTrayTelemetry(trayId),
      ]);

      setFeed(feedData);
      setTelemetry(telemetryData);
      setStatus(feedData.status);
    } catch {
      setStatus('ERROR');
    }
  }, [trayId]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const isOwner = await monitoringRepository.verifyTrayOwnership(trayId);
        if (!isMounted) return;
        if (!isOwner) {
          setStatus('UNAUTHORIZED');
          return;
        }

        const [feedData, telemetryData] = await Promise.all([
          monitoringRepository.getCameraFeed(trayId),
          monitoringRepository.getTrayTelemetry(trayId),
        ]);

        if (!isMounted) return;
        setFeed(feedData);
        setTelemetry(telemetryData);
        setStatus(feedData.status);
      } catch {
        if (isMounted) setStatus('ERROR');
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [trayId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatus('CONNECTING');
    await loadCameraData();
    setRefreshing(false);
  };

  const handleToggleLight = () => {
    setChamberLightOn((prev) => !prev);
    Alert.alert(
      'Điều khiển IoT',
      chamberLightOn
        ? 'Đã tắt đèn LED quang hợp trong buồng.'
        : 'Đã bật đèn LED quang hợp hỗ trợ quan sát.'
    );
  };

  const handleSnapshot = () => {
    Alert.alert(
      'Chụp ảnh lưu niệm',
      `Đã lưu ảnh chụp thời gian thực của Khay ${trayId} vào thư viện thiết bị của bạn.`
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header */}
      <AppHeader
        title="Camera trực tiếp"
        subtitle={`Giám sát thời gian thực • Khay ${trayId}`}
        showBack
        onBack={() => router.back()}
        rightAction={
          <AppIconButton
            icon={
              <Ionicons
                name="refresh"
                size={20}
                color={refreshing ? theme.colors.primary[500] : theme.colors.text.primary}
              />
            }
            onPress={handleRefresh}
            accessibilityLabel="Làm mới luồng camera"
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Camera View Surface */}
        <LiveCameraView
          trayId={trayId}
          feed={feed}
          telemetry={telemetry}
          status={status}
          onRetry={handleRefresh}
        />

        {/* Quick Remote Chamber Controls */}
        {status === 'ONLINE' && (
          <AppCard elevation="sm" style={styles.controlsCard}>
            <View style={styles.controlsHeader}>
              <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.primary[500]} />
              <AppText variant="label" weight="bold">
                Điều khiển buồng nuôi trồng từ xa
              </AppText>
            </View>

            <View style={styles.controlsGrid}>
              <AppButton
                title={chamberLightOn ? 'Tắt đèn buồng' : 'Bật đèn buồng'}
                variant={chamberLightOn ? 'primary' : 'outline'}
                size="sm"
                style={styles.controlBtn}
                leftIcon={
                  <Ionicons
                    name={chamberLightOn ? 'sunny' : 'sunny-outline'}
                    size={16}
                    color={chamberLightOn ? '#FFFFFF' : theme.colors.primary[500]}
                  />
                }
                onPress={handleToggleLight}
              />

              <AppButton
                title="Chụp ảnh khay"
                variant="secondary"
                size="sm"
                style={styles.controlBtn}
                leftIcon={
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={theme.colors.neutral[800]}
                  />
                }
                onPress={handleSnapshot}
              />
            </View>
          </AppCard>
        )}

        {/* IoT Sensor Gauges */}
        {telemetry && status === 'ONLINE' && (
          <TelemetryGaugeCard telemetry={telemetry} />
        )}

        {/* Chamber Info & Safety Notice */}
        <AppCard elevation="xs" variant="outlined" style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary[500]} />
            <View style={styles.noticeTextGroup}>
              <AppText variant="bodySmallMedium" weight="bold">
                Bảo mật & Giám sát riêng tư
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Luồng video được mã hóa đầu cuối và chỉ cung cấp quyền truy cập duy nhất cho chủ nhân khay {trayId}.
              </AppText>
            </View>
          </View>
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  controlsCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.paper,
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  controlBtn: {
    flex: 1,
  },
  noticeCard: {
    backgroundColor: theme.colors.neutral[50],
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  noticeTextGroup: {
    flex: 1,
    gap: 2,
  },
});
