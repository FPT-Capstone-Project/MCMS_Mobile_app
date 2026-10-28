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

export interface ImouPlayerConfiguration {
  cameraId: number;
  cameraName: string;
  deviceId: string;
  channelId: string;
  streamId: number;
  type: 1;
  kitToken: string;
}

export interface StopCameraLiveStreamResult {
  stopped: boolean;
  channelId: string;
  reason?: string;
}
