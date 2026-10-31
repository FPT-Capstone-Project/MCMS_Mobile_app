import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ENV } from '../../../../core/config';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { useAuth } from '../../../auth';
import { cameraRepository } from '../../data/repositories/CameraRepository';
import { CameraLiveStream } from '../../domain/entities/CameraStream';
import {
  NativeLivePlayer,
} from '../components/NativeLivePlayer';

export const LiveCameraScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ cameraId?: string }>();
  const { isAdmin, isFarmOperator } = useAuth();
  const canManageCamera = isAdmin || isFarmOperator;

  const cameraId = useMemo(() => {
    const id = Number(params.cameraId || ENV.cameraId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }, [params.cameraId]);

  const [cameraName, setCameraName] = useState('Camera SmartMush');
  const [liveStream, setLiveStream] = useState<CameraLiveStream | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!cameraId) {
        setErrorMessage('Mã camera không hợp lệ. Vui lòng kiểm tra cấu hình EXPO_PUBLIC_CAMERA_ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setPlaybackStarted(false);

      try {
        const result = await cameraRepository.startLiveStream(cameraId, selectedStreamId);
        if (!isActive) return;

        setCameraName(result.cameraName || 'Camera SmartMush');
        setLiveStream(result);
      } catch (error: unknown) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Không thể kết nối luồng camera. Vui lòng thử lại.'
          );
        }
      } finally {
        if (isActive) setLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [cameraId, selectedStreamId, retryKey]);

  const handleToggleQuality = () => {
    if (loading) return;
    const nextStreamId = selectedStreamId === 0 ? 1 : 0;
    setSelectedStreamId(nextStreamId);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleStopStream = async () => {
    if (!cameraId || stopping) return;
    setStopping(true);
    setErrorMessage(null);
    try {
      const result = await cameraRepository.stopLiveStream(cameraId);
      setLiveStream(null);
      setPlaybackStarted(false);
      if (!result.stopped) {
        Alert.alert('Camera', 'Hiện không có phiên xem trực tiếp nào đang hoạt động.');
      } else {
        Alert.alert('Camera', 'Đã dừng phiên camera trực tiếp.');
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể dừng phiên camera.'
      );
    } finally {
      setStopping(false);
    }
  };

  const handleRetry = () => {
    setRetryKey((key) => key + 1);
  };

  const currentStreamUrl = liveStream?.stream?.url;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <AppHeader
        title="Camera trực tiếp"
        subtitle={cameraName}
        showBack
        onBack={() => router.back()}
        rightAction={
          <AppIconButton
            icon={<Ionicons name="refresh" size={20} color={theme.colors.text.primary} />}
            onPress={handleRetry}
            accessibilityLabel="Kết nối lại camera"
          />
        }
      />

      <View style={styles.content}>
        <View style={styles.videoFrame}>
          {currentStreamUrl ? (
            <NativeLivePlayer
              streamUrl={currentStreamUrl}
              isMuted={isMuted}
              onReadyToPlay={() => setPlaybackStarted(true)}
              onPlaying={() => setPlaybackStarted(true)}
              onError={(errorMsg) => {
                setErrorMessage(errorMsg);
                setPlaybackStarted(false);
              }}
            />
          ) : null}

          {/* Loading Overlay */}
          {loading ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <AppText variant="bodySmall" color="#FFFFFF">
                Đang nhận luồng HLS trực tiếp...
              </AppText>
            </View>
          ) : null}

          {/* Error Overlay */}
          {!loading && errorMessage ? (
            <View style={styles.overlay}>
              <Ionicons name="videocam-off-outline" size={40} color={theme.colors.error.light} />
              <AppText variant="bodySmall" color="#FFFFFF" align="center">
                {errorMessage}
              </AppText>
              <AppButton title="Thử lại" variant="secondary" size="sm" onPress={handleRetry} />
            </View>
          ) : null}

          {/* Live Badge */}
          {!loading && !errorMessage && playbackStarted ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <AppText variant="captionMedium" weight="bold" color="#FFFFFF">
                TRỰC TIẾP
              </AppText>
            </View>
          ) : null}

          {/* Player Quick Controls (Top-Right) */}
          {!loading && !errorMessage && currentStreamUrl ? (
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={styles.controlPill}
                onPress={handleToggleQuality}
                activeOpacity={0.7}
                accessibilityLabel="Đổi chất lượng video"
              >
                <AppText variant="captionMedium" weight="bold" color="#FFFFFF">
                  {selectedStreamId === 0 ? 'HD' : 'SD'}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleToggleMute}
                activeOpacity={0.7}
                accessibilityLabel={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                <Ionicons
                  name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'}
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <AppCard elevation="xs" style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <Ionicons name="videocam-outline" size={20} color={theme.colors.primary[600]} />
            <AppText variant="label" weight="bold">
              Camera SmartMush
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Đang phát luồng video trực tiếp chuẩn HLS (Native) từ camera {cameraId ?? '—'}.
            Hỗ trợ tăng tốc phần cứng, chuyển đổi chất lượng HD/SD và tự động dừng khi chuyển trang.
          </AppText>

          {canManageCamera ? (
            <AppButton
              title="Dừng phiên camera"
              variant="outline"
              size="sm"
              loading={stopping}
              disabled={!liveStream || stopping}
              leftIcon={
                <Ionicons name="stop-circle-outline" size={18} color={theme.colors.error.main} />
              }
              onPress={handleStopStream}
            />
          ) : null}
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  videoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  liveBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error.main,
  },
  controlsBar: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    zIndex: 5,
  },
  controlPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[50],
  },
  infoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
