import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { AppButton } from '../../../../shared/components/primitives/AppButton';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { TrayId } from '../../../tray/domain/entities/Tray';
import { CameraFeed, CameraStatus, TrayTelemetry } from '../../domain/entities/Monitoring';

export interface LiveCameraViewProps {
  trayId: TrayId | string;
  feed: CameraFeed | null;
  telemetry?: TrayTelemetry | null;
  status: CameraStatus;
  onRetry: () => void;
  aspectRatio?: number;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({
  trayId,
  feed,
  telemetry,
  status,
  onRetry,
  aspectRatio = 16 / 10,
}) => {
  // Live ticking timestamp for simulated camera stream
  const [clockTime, setClockTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )}`;
      const dateStr = `${pad(now.getDate())}/${pad(
        now.getMonth() + 1
      )}/${now.getFullYear()}`;
      setClockTime(`${dateStr} ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Loading / Connecting State
  if (status === 'CONNECTING') {
    return (
      <View style={[styles.container, { aspectRatio }]}>
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={theme.colors.primary[400]} />
          <AppText variant="body" color="#FFFFFF" weight="bold">
            Đang kết nối camera...
          </AppText>
          <AppText variant="caption" color={theme.colors.neutral[400]}>
            Khởi tạo luồng dữ liệu an toàn cho Khay {trayId}
          </AppText>
        </View>
      </View>
    );
  }

  // Unauthorized Error State
  if (status === 'UNAUTHORIZED') {
    return (
      <View style={[styles.container, styles.errorContainer, { aspectRatio }]}>
        <View style={styles.stateCenter}>
          <View style={styles.errorIconBadge}>
            <Ionicons name="lock-closed" size={32} color={theme.colors.error.main} />
          </View>
          <AppText variant="title" color="#FFFFFF" weight="bold" align="center">
            Quyền truy cập bị từ chối
          </AppText>
          <AppText
            variant="bodySmall"
            color={theme.colors.neutral[300]}
            align="center"
            style={styles.errorDescription}
          >
            Bạn chỉ có thể xem camera trực tiếp từ khay thuộc quyền sở hữu của bạn.
          </AppText>
        </View>
      </View>
    );
  }

  // Generic Connection Error State
  if (status === 'ERROR' || status === 'OFFLINE') {
    return (
      <View style={[styles.container, styles.errorContainer, { aspectRatio }]}>
        <View style={styles.stateCenter}>
          <View style={styles.errorIconBadge}>
            <Ionicons name="videocam-off-outline" size={32} color={theme.colors.warning.main} />
          </View>
          <AppText variant="title" color="#FFFFFF" weight="bold" align="center">
            Không thể kết nối camera
          </AppText>
          <AppText
            variant="bodySmall"
            color={theme.colors.neutral[300]}
            align="center"
            style={styles.errorDescription}
          >
            Hệ thống đang bảo trì tín hiệu hoặc mạng chập chờn. Vui lòng thử lại.
          </AppText>
          <AppButton
            title="Thử lại"
            variant="primary"
            size="sm"
            style={styles.retryButton}
            leftIcon={<Ionicons name="reload" size={16} color="#FFFFFF" />}
            onPress={onRetry}
          />
        </View>
      </View>
    );
  }

  // Active Live Camera Streaming Surface
  return (
    <View style={[styles.container, { aspectRatio }]}>
      {/* Chamber Background Visualizer Surface */}
      <View style={styles.chamberViewSurface}>
        {/* Grid lines simulating camera focus frame */}
        <View style={styles.focusFrameTopLeft} />
        <View style={styles.focusFrameTopRight} />
        <View style={styles.focusFrameBottomLeft} />
        <View style={styles.focusFrameBottomRight} />

        {/* Center Crosshair */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Simulated Mushroom Cluster Glow & IoT Chamber Environment */}
        <View style={styles.mushroomChamberIllumination}>
          <Ionicons name="leaf" size={64} color="rgba(74, 222, 128, 0.25)" />
          <AppText variant="caption" color="rgba(255, 255, 255, 0.4)">
            BUỒNG TRỒNG NẤM THÔNG MINH
          </AppText>
        </View>
      </View>

      {/* Top HUD: Live Badge + Tray ID + Fullscreen/Settings */}
      <View style={styles.topHud}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.livePulseDot} />
          <AppText variant="captionMedium" weight="heavy" color="#FFFFFF">
            TRỰC TIẾP
          </AppText>
        </View>

        <View style={styles.trayIdPill}>
          <Ionicons name="cube-outline" size={14} color="#FFFFFF" />
          <AppText variant="captionMedium" weight="bold" color="#FFFFFF">
            Khay {trayId}
          </AppText>
        </View>
      </View>

      {/* Bottom HUD: Live Clock + Sensor Overlay + Feed Info */}
      <View style={styles.bottomHud}>
        <View style={styles.hudLeft}>
          <AppText variant="caption" weight="medium" color="#FFFFFF" style={styles.hudMonoText}>
            🔴 {clockTime}
          </AppText>
          <AppText variant="caption" color={theme.colors.neutral[300]}>
            {feed?.chamberName || 'Buồng thông minh A1'}
          </AppText>
        </View>

        <View style={styles.hudRight}>
          <View style={styles.techPill}>
            <AppText variant="caption" color="#FFFFFF" style={styles.hudMonoText}>
              {feed?.resolution || '1080p'} • {feed?.fps || 30}fps
            </AppText>
          </View>
          {telemetry ? (
            <View style={styles.sensorHudPill}>
              <AppText variant="caption" color="#4ADE80" weight="bold">
                {Number(telemetry.temperature).toFixed(2)}°C • {Number(telemetry.humidity).toFixed(2)}%
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  errorContainer: {
    backgroundColor: '#1E293B',
  },
  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  errorIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxs,
  },
  errorDescription: {
    maxWidth: 280,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: theme.spacing.xs,
    minWidth: 120,
  },
  chamberViewSurface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusFrameTopLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  focusFrameTopRight: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  focusFrameBottomLeft: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  focusFrameBottomRight: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  crosshairH: {
    position: 'absolute',
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  mushroomChamberIllumination: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    zIndex: 2,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.xs,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  trayIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomHud: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 2,
  },
  hudLeft: {
    gap: 2,
  },
  hudRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  hudMonoText: {
    fontVariant: ['tabular-nums'],
  },
  techPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  sensorHudPill: {
    backgroundColor: 'rgba(22, 101, 52, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
});
