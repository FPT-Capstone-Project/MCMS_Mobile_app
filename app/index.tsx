import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth';
import { AppLoading } from '../src/shared/components';

/**
 * Root Entry Point
 * Redirects to /(tabs) if authenticated, or /(auth)/login if unauthenticated.
 */
export default function Index() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <AppLoading fullscreen message="Đang khởi tạo SmartMush..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
