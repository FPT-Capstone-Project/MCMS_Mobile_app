export interface CameraStreamSource {
  url: string;
  protocol: 'hls' | string;
  streamId: number;
}

export interface CameraLiveStream {
  cameraId: number;
  cameraName: string;
  channelId: string;
  stream: CameraStreamSource;
  streams: CameraStreamSource[];
}

export interface StopCameraLiveStreamResult {
  stopped: boolean;
  channelId: string;
  reason?: string;
}
