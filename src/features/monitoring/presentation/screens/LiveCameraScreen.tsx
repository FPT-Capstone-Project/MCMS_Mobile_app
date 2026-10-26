import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { ENV } from '../../../../core/config';
import { theme } from '../../../../core/theme';
import { useAuth } from '../../../auth';
import { cameraRepository } from '../../data/repositories/CameraRepository';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';

export const LiveCameraScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ cameraId?: string }>();
  const { isAdmin } = useAuth();
  const cameraId = useMemo(() => {
    const id = Number(params.cameraId || ENV.cameraId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }, [params.cameraId]);
  const player = useVideoPlayer(null);
  const { status: playbackStatus, error: playbackError } = useEvent(
    player,
    'statusChange',
    { status: player.status, error: undefined }
  );

  const [cameraName, setCameraName] = useState('Camera SmartMush');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    void (async () => {
      if (!cameraId) {
        setErrorMessage('Mã camera không hợp lệ. Kiểm tra EXPO_PUBLIC_CAMERA_ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setStreamUrl(null);
      try {
        const result = await cameraRepository.startLiveStream(cameraId);
        if (!isActive) return;
        setCameraName(result.cameraName || 'Camera SmartMush');
        setStreamUrl(result.stream.url);
      } catch (error: unknown) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể kết nối camera. Vui lòng thử lại.'
          );
        }
      } finally {
        if (isActive) setLoading(false);
      }
    })();

    return () => {
      isActive = false;
      player.pause();
    };
  }, [cameraId, retryKey, player]);

  useEffect(() => {
    let isActive = true;
    if (!streamUrl) return;

    void player.replaceAsync(streamUrl)
      .then(() => {
        if (isActive) player.play();
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể phát luồng camera.'
          );
        }
      });

    return () => {
      isActive = false;
      player.pause();
    };
  }, [player, streamUrl]);

  useFocusEffect(
    useCallback(() => {
      if (streamUrl) player.play();
      return () => player.pause();
    }, [player, streamUrl])
  );

  const handleStopStream = async () => {
    if (!cameraId || stopping) return;
    setStopping(true);
    setErrorMessage(null);
    try {
      const result = await cameraRepository.stopLiveStream(cameraId);
      player.pause();
      await player.replaceAsync(null);
      setStreamUrl(null);
      if (!result.stopped) {
        Alert.alert('Camera', 'Hiện không có phiên xem trực tiếp nào đang hoạt động.');
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể dừng phiên camera.'
      );
    } finally {
      setStopping(false);
    }
  };

  const handleRetry = () => setRetryKey((key) => key + 1);

  const currentError = errorMessage || (
    playbackStatus === 'error' ? playbackError?.message || 'Không thể phát luồng camera.' : null
  );

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
          {streamUrl ? (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls
              allowsPictureInPicture
            />
          ) : null}

          {loading ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <AppText variant="bodySmall" color="#FFFFFF">
                Đang kết nối camera...
              </AppText>
            </View>
          ) : null}

          {!loading && !currentError && streamUrl ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <AppText variant="captionMedium" weight="bold" color="#FFFFFF">TRỰC TIẾP</AppText>
            </View>
          ) : null}

          {!loading && !streamUrl ? (
            <View style={styles.overlay}>
              <Ionicons name="videocam-off-outline" size={38} color="#FFFFFF" />
              <AppText variant="bodySmall" color="#FFFFFF" align="center">
                {currentError || 'Luồng camera chưa được kết nối.'}
              </AppText>
              <AppButton title="Thử lại" variant="secondary" size="sm" onPress={handleRetry} />
            </View>
          ) : null}
        </View>

        {currentError && streamUrl ? (
          <AppCard elevation="xs" style={styles.errorCard}>
            <AppText variant="bodySmall" color={theme.colors.error.main} selectable>
              {currentError}
            </AppText>
            <AppButton title="Kết nối lại" variant="outline" size="sm" onPress={handleRetry} />
          </AppCard>
        ) : null}

        <AppCard elevation="xs" style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary[600]} />
            <AppText variant="label" weight="bold">Camera dùng chung</AppText>
          </View>
          <AppText variant="caption" color={theme.colors.text.secondary}>
            Đường truyền trực tiếp HLS từ camera {cameraId ?? '—'}. Khi rời màn hình, ứng dụng dừng
            phát trên thiết bị. Dừng phiên trên máy chủ chỉ dành cho quản trị viên.
          </AppText>
          {isAdmin ? (
            <AppButton
              title="Dừng phiên camera"
              variant="outline"
              size="sm"
              loading={stopping}
              disabled={!streamUrl || stopping}
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
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: '#0F172A',
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
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error.main,
  },
  errorCard: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error.light,
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
