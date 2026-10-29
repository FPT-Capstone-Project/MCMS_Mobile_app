import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

export interface NativeLivePlayerRef {
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

export interface NativeLivePlayerProps {
  streamUrl: string;
  onReadyToPlay?: () => void;
  onPlaying?: () => void;
  onError?: (message: string) => void;
  isMuted?: boolean;
}

export const NativeLivePlayer = forwardRef<NativeLivePlayerRef, NativeLivePlayerProps>(
  ({ streamUrl, onReadyToPlay, onPlaying, onError, isMuted = true }, ref) => {
    const videoViewRef = useRef<VideoView | null>(null);

    useImperativeHandle(ref, () => ({
      enterFullscreen: () => {
        void videoViewRef.current?.enterFullscreen();
      },
      exitFullscreen: () => {
        void videoViewRef.current?.exitFullscreen();
      },
    }));

    const player = useVideoPlayer(streamUrl, (p) => {
      p.loop = true;
      p.muted = isMuted;
      p.play();
    });

    useEffect(() => {
      player.muted = isMuted;
    }, [player, isMuted]);

    useEffect(() => {
      const statusSub = player.addListener('statusChange', (payload) => {
        if (payload.status === 'readyToPlay') {
          onReadyToPlay?.();
        } else if (payload.status === 'error') {
          const errorMsg =
            payload.error?.message || 'Không thể phát luồng camera HLS từ máy chủ.';
          onError?.(errorMsg);
        }
      });

      const playingSub = player.addListener('playingChange', (payload) => {
        if (payload.isPlaying) {
          onPlaying?.();
        }
      });

      return () => {
        statusSub.remove();
        playingSub.remove();
      };
    }, [player, onReadyToPlay, onPlaying, onError]);

    useFocusEffect(
      useCallback(() => {
        player.play();
        return () => {
          player.pause();
        };
      }, [player])
    );

    return (
      <View style={StyleSheet.absoluteFill}>
        {/*
          nativeControls={true}: Bật controls gốc của iOS/Android.
          Trên iOS, AVPlayer tự động hiển thị nút fullscreen và nút "Done" (thu nhỏ)
          bên trong giao diện fullscreen — không cần custom button nữa.
          Các control tùy chỉnh (HD/SD, mute) vẫn nằm ngoài VideoView ở LiveCameraScreen.
        */}
        <VideoView
          ref={videoViewRef}
          style={StyleSheet.absoluteFill}
          player={player}
          allowsPictureInPicture
          contentFit="contain"
          nativeControls
        />
      </View>
    );
  }
);

NativeLivePlayer.displayName = 'NativeLivePlayer';
