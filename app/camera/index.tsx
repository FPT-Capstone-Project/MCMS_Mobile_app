import React from 'react';
import { Redirect } from 'expo-router';
import { ENV } from '../../src/core/config';

export default function CameraIndexRoute() {
  const targetCameraId = ENV.cameraId || '3';
  return <Redirect href={`/camera/${targetCameraId}`} />;
}

